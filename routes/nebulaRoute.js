// var express = require('express');
// import express from "express";
import {Router} from "express";
// var router = express.Router();
const router = Router();
// var path = require('path');
import path from "path";

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



/* GET home page. */
router.get('/', function(req, res, next) {
  res.sendFile(path.join(__dirname, "../Nebula-UIs/index.html"), function(err) {
      if (err) {
        console.log("Error: send file");
        console.log(err);   
      }
  });
});

export default router;

// module.exports = router;