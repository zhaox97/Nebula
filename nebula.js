var spawn = require('child_process').spawn;
var async = require('async');
var zerorpc = require("zerorpc");

/* Load the databases we need */
var monk = require('monk');
var db = monk('localhost:27017/nodetest');
var datasets = monk('localhost:27017/datasets');

/* Export the Nebula class */
module.exports = Nebula;

/* Nebula class constructor */
function Nebula(io, pipeline) {
	/* This allows you to use "Nebula(obj)" as well as "new Nebula(obj)" */
	if (!(this instanceof Nebula)) { 
		return new Nebula(io);
	}
	
	pipeline = pipeline || "tcp://127.0.0.1:5555";
	this.pipelineClient = new zerorpc.Client();
	this.pipelineClient.connect(pipeline);
	this.pipelineClient.on("error", function(error) {
		console.error("RPC client error:", error);
	});
	this.pipelineClient.invoke("reset", function(err) {
		if (err) {
			console.log("Error resetting pipeline");
			console.log(err);
		}
	});
	
	/* The group of rooms currently active, each with a string identifier
	 * Each room represents an instance of a visualization that can be shared
	 * among clients.
	 */
	this.rooms = {};
	
	/* For proper use in callback functions */
	var self = this;
	
	/* Accept new WebSocket clients */
	io.on('connection', function(socket) {
		
		/* When clients disconnect, remove them from the room. If the room is
		 * now empty, delete it.
		 */
		socket.on('disconnect', function() {
			console.log('Disconnected');
			if (self.rooms[socket.room] && self.rooms[socket.room].count) {
				self.rooms[socket.room].count -= 1;
				if (self.rooms[socket.room] <= 0) {
					console.log("Room " + socket.room + " now empty");
				}
			}
		});
		
		/* Lets a client join a room. If the room doesn't next exist yet,
		 * initiate it and send the new room to the client. Otherwise, send
		 * the client the current state of the room.
		 */
		socket.on('join', function(room, user) {
			console.log('Join called!');
			socket.room = room;
			socket.user = user;
			socket.join(room);
			
			if (!self.rooms[room]) {
				self.rooms[room] = {};
				self.rooms[room].count = 1;
				self.rooms[room].points = new Map();
				socket.emit('update', sendRoom(self.rooms[room]));
			}
			else {
				self.rooms[room].count += 1;
				console.log(self.rooms[room].count + " people now in room " + room);
				socket.emit('update', sendRoom(self.rooms[room]));
			}
		});
		
		/* Listens for actions from the clients, tracking them and then
		 * broadcasting them to all other clients within the room.
		 */
		socket.on('action', function(data) {
			if (socket.room) {
				self.handleAction(data, self.rooms[socket.room]);
				socket.broadcast.to(socket.room).emit('action', data);
			}
		});
		
		/* Listens for update requests from the client, executing the update
		 * and then sending the results to all clients.
		 */
		socket.on('update', function(data) {
			if (socket.room) {
				self.handleUpdate(data, self.rooms[socket.room], function(err) {
					if (err) {
						console.log(err);
						return;
					}
					io.to(socket.room).emit('update', sendRoom(self.rooms[socket.room]));
				});
			}
		});
		
		/* Returns the current set of weights for the client's room */
		socket.on('weights', function() {
			if (socket.room) {
				socket.emit('weights', socket.room.weights);
			}
		});
	});
}

/* Handles an action received by the client, updating the state of the room
 * as necessary.
 */
Nebula.prototype.handleAction = function(action, room) {
	if (action.type === "move") {
		if (room.points.has(action.pointId)) {
			room.points.get(action.pointId).pos = action.pos;
		}
		else {
			console.log("Point not found in room for move");
		}
	}
	else if (action.type === "select") {
		if (room.points.has(action.pointId)) {
			room.points.get(action.pointId).selected = action.state;
		}
		else {
			console.log("Point not found in room for select");
		}
	}
};

/* Handles updates received by the client, running the necessary processes
 * and updating the room as necessary.
 */
Nebula.prototype.handleUpdate = function(data, room, callback) {
	console.log("Handle update called");

	var updateCallback = function(err, res) {
		if (err) {
			console.log(err);
			callback(err);
			return;
		}
		var update = {};
		update.points = [];
		if (res.documents) {
			for (var i=0; i < res.documents.length; i++) {
				var doc = res.documents[i];
				var obj = {};
				obj.id = doc.doc_id;
				obj.pos = doc.low_d;
				obj.relevance = doc.doc_relevance;
				update.points.push(obj);
			}
		}
		
		updateRoom(room, update);
		callback(null);
	};
	
	if (data.type === "oli") {
		this.pipelineClient.invoke("update", {interaction: "oli", type: "classic", points: oli(room)}, updateCallback);			
	}
	else if (data.type === "search") {
		this.pipelineClient.invoke("update", {interaction: "search", query: data.query}, updateCallback);
	}
	else if (data.type === "none") {
		this.pipelineClient.invoke("update", {interaction: "none"}, updateCallback);
	}
};

var updateRoom = function(room, update) {
	for (var i=0; i < update.points.length; i++) {
		var point = update.points[i];
		if (room.points.has(point.id)) {
			room.points.get(point.id).pos = point.pos;
			if (point.relevance)
				room.points.get(point.id).relevance = point.relevance;
		}
		else {
			room.points.set(String(point.id), point);
		}
	}
};

/* Runs MDS or Inverse MDS on the points in a room. For inverse MDS,
 * only the selected points are included in the algorithm. This spawns
 * a Java process with the accompanying jar file to run the algorithm.
 */
var oli = function(room) {
	var points = {};
	for (var key of room.points.keys()) {
		var point = room.points.get(key);
		if (point.selected) {
			var p = {};
			p.lowD = point.pos;
			points[key] = p;
		}
	}
	return points;
};

/* Returns a copy of a room with the necessary details to send to the client
 * on an update.
 */
var sendRoom = function(room) {
	var modRoom = {};
	if (room.weights) modRoom.weights = room.weights;
	if (room.jobId) modRoom.jobId = room.jobId;
	modRoom.points = Array.from(room.points.values());
	return modRoom;
};