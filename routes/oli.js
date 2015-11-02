var express = require('express');
var router = express.Router();
var path = require('path');
var spawn = require('child_process').spawn;

router.post('/init', function(req, res, next) {
	var db = req.db;
	var collection = db.get('jobs');
	collection.insert({}, function(err, doc) {
		if (err) {
			console.log(err);
			res.sendStatus(500);
		}
		if (doc) {
			console.log(doc);
			var data = {jobId: doc._id};
			res.json(data);
		}
	});
});

router.post('/new', function(req, res, next) {
	console.log(req.body);
	res.sendStatus(200);
});

router.post('/mds', function(req, res, next) {
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
	
	mds.stdin.write(JSON.stringify(req.body));
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