var spawn = require('child_process').spawn;
var async = require('async');
var zmq = require('zmq');

/* Load the databases we need */
//var monk = require('monk');
//var db = monk('localhost:27017/nodetest');
//var datasets = monk('localhost:27017/datasets');

/* Export the Nebula class */
module.exports = Nebula;

/* The pipelines available to use */
var pipelines = {andromeda: [ 
                             "pipelines/andromeda.py",
                             "5555",
                             "data/Animal_Data_small.csv"
                             ],
				 cosmos: [
				          "pipelines/cosmosdynamic.py",
				          "5555",
				          "data/crescent tfidf.csv",
				          "data/crescent_raw"
				          ],
				 twitter: [
				           "pipelines/twitter.py",
				           "5555"
				          ],
				 composite: [
							 "pipelines/composite.py",
							 "5555",
							 "data/crescent tfidf.csv",
							 "data/crescent_raw"
				             ],
				 loadtest: [
				            "pipelines/cosmos.py",
				            "5555",
				            "data/data10000x1000.csv",
				            "data/crescent_raw"
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
	this.io = io;
	
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
				room.name = roomName;
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
					
					pipelineInstance.on("error", function(err) {
						console.log("python2.7.exe not found. Trying python.exe");
						pipelineInstance = spawn("python", pythonArgs, {stdout: "inherit"});
						
						pipelineInstance.stdout.on("data", function(data) {
							console.log("Pipeline: " + data.toString());
						});
						pipelineInstance.stderr.on("data", function(data) {
							console.log("Pipeline error: " + data.toString());
						});
					});
					
					pipelineInstance.stdout.on("data", function(data) {
						console.log("Pipeline: " + data.toString());
					});
					pipelineInstance.stderr.on("data", function(data) {
						console.log("Pipeline error: " + data.toString());
					});
				}
				
				pipelineAddr = pipelineAddr || "tcp://127.0.0.1:5555";
				room.pipelineSocket = zmq.socket('pair');
				room.pipelineSocket.connect(pipelineAddr);
				
				room.pipelineSocket.on('message', function (msg) {
					self.handleMessage(room, msg);
				});

				self.rooms[roomName] = socket.room = room;
				invoke(room.pipelineSocket, "reset");
			}
			else {
				socket.room = self.rooms[roomName];
				socket.room.count += 1;
				console.log(socket.room.count + " people now in room " + roomName);
				socket.emit('update', sendRoom(socket.room));
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
				if (data.type === "oli") {
					invoke(socket.room.pipelineSocket, "update", 
							{interaction: "oli", type: "classic", points: oli(socket.room)});			
				}
				else {
					data.interaction = data.type;
					invoke(socket.room.pipelineSocket, "update", data);
				}
			}
		});
		
		/* Listens for get requests to get information about the underlying data,
		 * such as the original text of the document or the type.
		 */
		socket.on('get', function(data) {
			if (socket.room) {
				invoke(socket.room.pipelineSocket, "get", data);
			}
		});
		
		/* Resets the pipeline. */
		socket.on('reset', function() {
			if (socket.room) {
				invoke(socket.room.pipelineSocket, "reset");
				socket.room.points = new Map();
			}
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
			console.log("Point not found in room for move: " + action.id);
		}
	}
	else if (action.type === "select") {
		if (room.points.has(action.id)) {
			room.points.get(action.id).selected = action.state;
		}
		else {
			console.log("Point not found in room for select: " + action.id);
		}
	}
};

Nebula.prototype.handleMessage = function(room, msg) {
	var obj = JSON.parse(msg.toString());
	if (obj.func) {
		if (obj.func === "update") {
			this.handleUpdate(room, obj.contents);
		} else if (obj.func === "get") {
			this.io.to(room.name).emit("get", obj.contents);
		} else if (obj.func === "set") {
			this.io.to(room.name).emit("set", obj.contents);
		} else if (obj.func === "reset") {
			this.io.to(room.name).emit("reset");
			invoke(room.pipelineSocket, "update", {interaction: "none"});
		}
	}
};

/* Handles updates received by the client, running the necessary processes
 * and updating the room as necessary.
 */
Nebula.prototype.handleUpdate = function(room, res) {
	console.log("Handle update called");

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
	this.io.to(room.name).emit('update', update);
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
			room.points.set(point.id, point);
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

var invoke = function(socket, func, data) {
	var obj = {"func": func, "contents": data};
	socket.send(JSON.stringify(obj));
};