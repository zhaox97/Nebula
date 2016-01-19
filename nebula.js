var spawn = require('child_process').spawn;
var async = require('async');

var monk = require('monk');
var db = monk('localhost:27017/nodetest');
var datasets = monk('localhost:27017/datasets');

module.exports = Nebula;

function Nebula(io) {
	if (!(this instanceof Nebula)) { 
		return new Nebula(io);
	}
	this.rooms = {};
	
	var self = this;
	io.on('connection', function(socket) {
		socket.on('disconnect', function() {
			console.log('Disconnected');
			if (self.rooms[socket.room] && self.rooms[socket.room].count) {
				self.rooms[socket.room].count -= 1;
				if (self.rooms[socket.room] <= 0) {
					console.log("Room " + socket.room + " now empty");
				}
			}
		});
		
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
		
		socket.on('action', function(data) {
			handleAction(data, self.rooms[socket.room]);
			socket.broadcast.to(socket.room).emit('action', data);
		});
		
		socket.on('update', function(data) {
			handleUpdate(data, self.rooms[socket.room], function(err, response) {
				if (err) {
					console.log(err);
				}
				io.to(socket.room).emit('update', response);
			});
		});
	});
}

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
		var dataCollection = datasets.get(datasetName);
		dataCollection.find({}, function(err, docs) {
			if (err) {
				console.log(err);
				callback(err);
				return;
			}
			for (var i=0; i < docs.length; i++) {
				var point = {id: docs[i]._id, label: docs[i].label, pos: {x: 0, y: 0, z: 0}};
				point.highD = docs[i].dimensions.slice();
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

var handleUpdate = function(data, room, callback) {
	console.log("Handle update called");
	var collection = db.get('jobs');
	var master = datasets.get('master');
	
	var dataset = datasets.get(room.dataset);
	var mdsRequest = {};
	mdsRequest.points = {};
	
	async.map(Array.from(room.points.values()), function(item, callback) {
		dataset.findById(item.id, function(err, p) {
			callback(err, p);
		});
	}, function(err, results) {
		if (err) {
			console.log(err);
			callback(err);
		}
		mdsRequest.highDimensions = results[0].dimensions.length;
		for (var i=0; i < results.length; i++) {
			var p = {};
			p.highD = results[i].dimensions;
			mdsRequest.points[results[i]._id] = p;
		}
		mds(mdsRequest, function(err, response) {
			if (err) {
				console.log(err);
			}
			for (var j=0; j < response.points.length; j++) {
				var point = response.points[j];
				if (room.points.has(point.id)) {
					room.points.get(point.id).pos = point.pos;
				}
				else {
					console.log("Couldn't find point after MDS");
				}
			}
			
			callback(err, response);
		});
			
	});	
};

var mds = function(obj, callback) {
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
		var response = {};
		response.points = [];
		var ret = JSON.parse(body);
		for (var key in ret) {
			var obj = {};
			obj.id = key;
			obj.pos = {x: ret[key][0], y: ret[key][1], z: 0};
			response.points.push(obj);
		}
		callback(null, response);
	});
	
	mds.stdin.write(JSON.stringify(obj));
};

var sendRoom = function(room) {
	var modRoom = {};
	modRoom.jobId = room.jobId;
	modRoom.points = Array.from(room.points.values());
	return modRoom;
};