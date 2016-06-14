var spawn = require('child_process').spawn;
var async = require('async');
var zerorpc = require("zerorpc");

/* Load the databases we need */
//var monk = require('monk');
//var db = monk('localhost:27017/nodetest');
//var datasets = monk('localhost:27017/datasets');

/* Export the Nebula class */
module.exports = Nebula;

var pipelines = {andromeda: [ 
                             "Nebula-Pipeline/andromeda.py",
                             "5555",
                             "Nebula-Pipeline/Animal_Data_small.csv"
                             ],
				 cosmos: [
				          "Nebula-Pipeline/cosmos.py",
				          "5555",
				          "Nebula-Pipeline/crescent tfidf.csv",
				          "Nebula-Pipeline/crescent_raw"
				          ],
				 composite: [
							 "Nebula-Pipeline/composite.py",
							 "5555",
							 "Nebula-Pipeline/crescent tfidf.csv",
							 "Nebula-Pipeline/crescent_raw"
				             ],
				 loadtest: [
				            "Nebula-Pipeline/cosmos.py",
				            "5555",
				            "Nebula-Pipeline/data10000x1000.csv",
				            "Nebula-Pipeline/crescent_raw"
				            ]
};

/* Nebula class constructor */
function Nebula(io, pipelineAddr) {
	/* This allows you to use "Nebula(obj)" as well as "new Nebula(obj)" */
	if (!(this instanceof Nebula)) { 
		return new Nebula(io);
	}
	
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
		socket.on('join', function(roomName, user, pipeline, args) {
			console.log('Join called!');
			socket.roomName = roomName;
			socket.user = user;
			socket.join(roomName);
			
			if (!self.rooms[roomName]) {
				var room = {};
				room.count = 1;
				room.points = new Map();
				
				/* Create a pipeline client for this room */
				if (!pipelineAddr) {
					var pythonArgs = ["-u"];
					if (pipeline in pipelines)
						pythonArgs = pythonArgs.concat(pipelines[pipeline]);
					else
						pythonArgs = pythonArgs.concat(pipelines.cosmos);
					for (var key in args) {
						if (args.hasOwnProperty(key)) {
							pythonArgs.push("--" + key);
							pythonArgs.push(args[key]);
						}
					}
					console.log(pythonArgs);
					
					var pipelineInstance = spawn("python2.7", pythonArgs, {stdout: "inherit"});
					
					pipelineInstance.stdout.on("data", function(data) {
						console.log("Pipeline: " + data.toString());
					});
					pipelineInstance.stderr.on("data", function(data) {
						console.log("Pipeline error: " + data.toString());
					});
				}
				
				pipelineAddr = pipelineAddr || "tcp://127.0.0.1:5555";
				room.pipelineClient = new zerorpc.Client();
				room.pipelineClient.connect(pipelineAddr);
				room.pipelineClient.on("error", function(error) {
					console.error("RPC client error:", error);
				});
				room.pipelineClient.invoke("reset", function(err) {
					if (err) {
						console.log("Error resetting pipeline");
						console.log(err);
						return;
					}
					
					self.handleUpdate({type: "none"}, room, function(err, res) {
						if (err) {
							console.log(err);
							return;
						}
						socket.emit('update', sendRoom(room));
					});
				});
				
				self.rooms[roomName] = socket.room = room;
			}
			else {
				var room = self.rooms[roomName];
				room.count += 1;
				console.log(room.count + " people now in room " + roomName);
				socket.emit('update', sendRoom(room));
			}
		});
		
		/* Listens for actions from the clients, tracking them and then
		 * broadcasting them to all other clients within the room.
		 */
		socket.on('action', function(data) {
			if (socket.room) {
				self.handleAction(data, socket.room);
				socket.broadcast.to(socket.roomName).emit('action', data);
			}
		});
		
		/* Listens for update requests from the client, executing the update
		 * and then sending the results to all clients.
		 */
		socket.on('update', function(data) {
			if (socket.room) {
				self.handleUpdate(data, socket.room, function(err, res) {
					if (err) {
						console.log(err);
						return;
					}
					io.to(socket.roomName).emit('update', res);
				});
			}
		});
		
		/* Listens for get requests to get information about the underlying data,
		 * such as the original text of the document or the type.
		 */
		socket.on('get', function(data) {
			console.log(data);
			if (socket.room) {
				socket.room.pipelineClient.invoke("get", data, function(err, res) {
					if (err) {
						console.log(err);
						return;
					}
					socket.emit('get', res);
				});
			}
		});
		
		/* Resets the pipeline. */
		socket.on('reset', function() {
			socket.room.pipelineClient.invoke("reset", function(err) {
				if (err) {
					console.log("Error resetting pipeline");
					console.log(err);
				}
				socket.room.points = new Map();
				io.to(socket.roomName).emit('reset');
			});
		});
	});
}

/* Handles an action received by the client, updating the state of the room
 * as necessary.
 */
Nebula.prototype.handleAction = function(action, room) {
	if (action.type === "move") {
		if (room.points.has(action.id)) {
			room.points.get(action.id).pos = action.pos;
		}
		else {
			console.log("Point not found in room for move");
		}
	}
	else if (action.type === "select") {
		if (room.points.has(action.id)) {
			room.points.get(action.id).selected = action.state;
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
				obj.type = doc.type;
				obj.relevance = doc.doc_relevance;
				update.points.push(obj);
			}
		}
		if (res.similarity_weights) {
			update.similarity_weights = res.similarity_weights;
		}
		updateRoom(room, update);
		callback(null, update);
	};
	
	if (data.type === "oli") {
		room.pipelineClient.invoke("update", {interaction: "oli", type: "classic", points: oli(room)}, updateCallback);			
	}
	else if (data.type === "search") {
		room.pipelineClient.invoke("update", {interaction: "search", query: data.query}, updateCallback);
	}
	else if (data.type === "change_relevance") {
		console.log(data);
		room.pipelineClient.invoke("update", {interaction: "change_relevance", id: data.id, relevance: data.relevance}, updateCallback);
	}
	else if (data.type === "delete") {
		room.pipelineClient.invoke("update", {interaction: "delete", id: data.id}, updateCallback);
	}
	else if (data.type === "none") {
		room.pipelineClient.invoke("update", {interaction: "none"}, updateCallback);
	}
};

var updateRoom = function(room, update) {
	for (var i=0; i < update.points.length; i++) {
		var point = update.points[i];
		if (room.points.has(point.id)) {
			if (point.pos)
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

var sendRoom = function(room) {
	var modRoom = {};
	modRoom.points = Array.from(room.points.values());
	return modRoom;
};