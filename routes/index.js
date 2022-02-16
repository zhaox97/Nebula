var express = require('express');
var router = express.Router();
var path = require('path');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.sendFile(path.join(__dirname, "../Nebula-UIs/index.html"), function(err) {
      if (err) {
        console.log("Error: send file");
        console.log(err);   
      }
  });
});

module.exports = router;
// export router;
