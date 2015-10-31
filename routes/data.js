var express = require('express');
var router = express.Router();
var path = require('path');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.sendFile(path.join(__dirname, "../public/file.html"), function(err) {
      if (err) {
        console.log("Error: send file");
        console.log(err);   
      }
      else {
          console.log("Sent file file.html");
      }
  });
});

router.post('/upload', function(req, res, next) {
	console.log(req);
});

module.exports = router;

