var express = require('express');
var router = express.Router();
var path = require('path');
var spawn = require('child_process').spawn;

router.post('/init', function(req, res, next) {
	var db = req.db;
	var datasets = req.datasets;
	var collection = db.get('jobs');
	var master = datasets.get('master');
	var points = [];
	master.find({}, function(err, docs) {
		if (err) {
			console.log(err);
		}
		var datasetName = docs[0].name;
		var dataCollection = datasets.get(datasetName);
		dataCollection.find({}, function(err, docs) {
			if (err) {
				console.log(err);
			}
			for (var i=0; i < docs.length; i++) {
				var point = {id: docs[i]._id, label: docs[i].label, pos: {x: 0, y: 0, z: 0}};
				points.push(point);
			}
			collection.insert({points: points, dataset: datasetName}, function(err, doc) {
				if (err) {
					console.log(err);
					res.sendStatus(500);
				}
				if (doc) {
					var data = {jobId: doc._id, points: points};
					res.json(data);
				}
			});
		});
	});
});

router.post('/new', function(req, res, next) {
	var db = req.db;
	var collection = db.get('jobs');
	
	var id = Math.floor(Math.random() * 100000);
	var x = Math.random() * 2 - 1;
	var y = Math.random() * 2 - 1;
	var point = {id: id.toString(), pos: {x: x, y: y, z: 0}};
	var data = {points: []};
	data.points.push(point);
	
	collection.update({_id: req.body.jobId}, {$push: {points: point}}, function(err) {
		if (err) {
			throw err;
		}
		console.log("Updated job " + req.body.jobId + "!");
		collection.findById(req.body.jobId, function(err, data) {
			if (err) {
				throw err;
			}
			console.log(data);
		});
	});
	
	res.json(data);
});

router.post('/randomize', function(req, res, next) {
	var db = req.db;
	var collection = db.get('jobs');
	
	collection.findById(req.body.jobId, function(err, doc) {
		for (var i=0; i < doc.points.length; i++) {
			doc.points[i].pos.x = Math.random() * 2 - 1;
			doc.points[i].pos.y = Math.random() * 2 - 1;
		}
		collection.update({_id: req.body.jobId}, {$set: {points: doc.points}}, function(err){
			if (err) {
				throw err;
			}
		});
		res.json(doc);
	});
});

var mds = function(obj, res, next) {
	var mds = spawn('java', ['-jar', 'java/test.jar']);
	var body = '';
	
	mds.stdout.setEncoding('utf8');
		
	mds.stdout.on('data', function(data) {
		console.log(data.toString());
		body += data;
	});
	
	mds.stderr.on('data', function(data) {
		console.log(data.toString());
		res.sendStatus(500);
	});
	
	mds.on('close', function(code) {
		console.log("MDS child processed closed");
		res.json(JSON.parse(body));
	});
	
	mds.stdin.write(JSON.stringify(obj));
};

router.post('/mds', function(req, res, next) {
	mds(req.body, res, next);
});

router.post('/mds/:jobId', function(req, res, next) {
	var db = req.db;
	var collection = db.get('jobs');
	console.log(req.params.jobId);
	collection.findById(req.params.jobId, function(err, doc) {
		var mdsRequest = {};
		
		
		for (var i=0; i < doc.points.length; i++) {
			
		}
	});
});

router.post('/invmds', function(req, res, next) {
	var mds = spawn('java', ['-jar', 'java/test.jar']);
	var body = '';
	
	mds.stdout.setEncoding('utf8');
	
	mds.stdout.on('data', function(data) {
		console.log(data);
		body += data;
	});
	
	mds.stderr.on('data', function(data) {
		console.log(data.toString());
		res.sendStatus(500);
	});
	
	mds.on('close', function(code) {
		console.log("MDS child processed closed");
		res.json(JSON.parse(body));
	});
	
	mds.stdin.write(JSON.stringify(req.body));
});

module.exports = router;