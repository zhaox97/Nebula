var spawn = require('child_process').spawn;
var async = require('async');

/* Load the databases we need */
var monk = require('monk');
var db = monk('localhost:27017/nodetest');
var datasets = monk('localhost:27017/datasets');

/* Export the Nebula class */
module.exports = Nebula;

/* Nebula class constructor */
function Nebula(io) {
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
		socket.on('join', function(room, user) {
			console.log('Join called!');
			socket.room = room;
			socket.user = user;
			socket.join(room);
			
			if (!self.rooms[room]) {
				self.rooms[room] = {};
				self.rooms[room].count = 1;
				initRoom(self.rooms[room], function(err) {
					if (err) {
						console.log(err);
					}
					socket.emit('update', sendRoom(self.rooms[room]));
				});
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
				handleAction(data, self.rooms[socket.room]);
				socket.broadcast.to(socket.room).emit('action', data);
			}
		});
		
		/* Listens for update requests from the client, executing the update
		 * and then sending the results to all clients.
		 */
		socket.on('update', function(data) {
			if (socket.room) {
				handleUpdate(data, self.rooms[socket.room], function(err) {
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

/* Initializes a room. Currently loads the default dataset stored in the
 * database. The created room is then stored in the database. This will
 * need some major overhaul to allow choosing different datasets (or the
 * whole dataset or however we implement it). Also, the support for storing
 * current rooms in the database is somewhat limited and doesn't really get
 * updated.
 */
var initRoom = function(room, callback) {
	var collection = db.get('jobs');
	var master = datasets.get('master');
	var points = [];
	master.find({}, function(err, docs) {
		if (err) {
			console.log(err);
			callback(err);
			return;
		}
		var datasetName = docs[0].name;
		room.dimensionNames = docs[0].dimensions;
		room.dimensions = docs[0].dimensions.length;
		room.weights = [];
		for (var i=0; i < room.dimensions; i++) {
			room.weights[i] = 1.0 / room.dimensions;
		}
		var dataCollection = datasets.get(datasetName);
		var dimensions = 0;
		dataCollection.find({}, function(err, docs) {
			if (err) {
				console.log(err);
				callback(err);
				return;
			}
			for (var i=0; i < docs.length; i++) {
				var point = {id: docs[i]._id, label: docs[i].label, pos: {x: 0, y: 0, z: 0}};
				point.highD = docs[i].dimensions;
				points.push(point);
			}
			collection.insert({points: points, dataset: datasetName}, function(err, doc) {
				if (err) {
					console.log(err);
					callback(err);
					return;
				}
				if (doc) {
					room.jobId = doc._id;
					room.points = new Map();
					for (var j=0; j < points.length; j++) {
						room.points.set(String(points[j].id), points[j]);
					}
					room.dataset = datasetName;
					callback(null);
				}
			});
		});
	});
};

/* Handles an action received by the client, updating the state of the room
 * as necessary.
 */
var handleAction = function(action, room) {
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
var handleUpdate = function(data, room, callback) {
	console.log("Handle update called");

	var mdsCallback = function(err, response) {
		if (err) console.log(err);
		var update = {};
		update.points = [];
		for (var key in response) {
			if (response.hasOwnProperty(key)) {
				var obj = {};
				obj.id = key;
				obj.pos = {x: response[key][0], y: response[key][1], z: 0};
				update.points.push(obj);
			}
		}
		
		for (var j=0; j < update.points.length; j++) {
			var point = update.points[j];
			if (room.points.has(point.id)) {
				room.points.get(point.id).pos = point.pos;
			}
			else {
				console.log("Couldn't find point after MDS");
			}
		}
		
		callback(err, update);
	};
	
	if (data.type === "mds") {
		mds(room, mdsCallback);
	}
	else if (data.type === "invmds") {
		mds(room, {inverse: true}, function(err, response) {
			if (err) {
				console.log(err);
				return;
			}
			room.weights = response.weights;
			mds(room, mdsCallback);
		});
	}
};

/* Runs MDS or Inverse MDS on the points in a room. For inverse MDS,
 * only the selected points are included in the algorithm. This spawns
 * a Java process with the accompanying jar file to run the algorithm.
 */
var mds = function(room, options, callback) {
	if (!callback) {
		callback = options;
		options = {};
	}
	if (!options.inverse) options.inverse = false;
	
	
	var mdsRequest = {};
	mdsRequest.points = {};
	var pointCount = 0;

	mdsRequest.highDimensions = room.dimensions;
	mdsRequest.lowDimensions = 2;
	if (options.inverse) mdsRequest.inverse = true;
	for (var key of room.points.keys()) {
		var point = room.points.get(key);
		if (!mdsRequest.inverse || point.selected) {
			var p = {};
			p.highD = point.highD;
			p.lowD = [point.pos.x, point.pos.y];
			mdsRequest.points[key] = p;
			pointCount += 1;
		}
	}
	
	if (mdsRequest.inverse && pointCount <= 2) {
		callback("Not enough points");
		return;
	}
	
	if (room.weights) {
		mdsRequest.weights = room.weights;
	}
	
	var mds = spawn('java', ['-jar', 'java/test.jar']);
	var body = '';
	
	mds.stdout.setEncoding('utf8');
		
	mds.stdout.on('data', function(data) {
		body += data;
	});
	
	mds.stderr.on('data', function(data) {
		console.log(data.toString());
		callback(data.toString());
	});
	
	mds.on('close', function(code) {
		var ret = JSON.parse(body);
		callback(null, ret);
	});
	
	mds.stdin.write(JSON.stringify(mdsRequest));
};

/* Returns a copy of a room with the necessary details to send to the client
 * on an update.
 */
var sendRoom = function(room) {
	var modRoom = {};
	if (room.weights) modRoom.weights = room.weights;
	modRoom.jobId = room.jobId;
	modRoom.points = Array.from(room.points.values());
	return modRoom;
};