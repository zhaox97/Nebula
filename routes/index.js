var express = require('express');
var router = express.Router();
var path = require('path');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.sendFile(path.join(__dirname, "../public/x3dom.html"), function(err) {
      if (err) {
        console.log("Error: send file");
        console.log(err);   
      }
      else {
          console.log("Sent file x3dom.html");
      }
  });
});

module.exports = router;
