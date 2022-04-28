/*Import packages required in package.json   */
/*Add these packages from the ../node_modules path*/
import express from "express";
import path from "path";
import favicon from "serve-favicon";  // Although not read, this line is important for when favicon added to /public
import logger from "morgan";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import Debug from "debug";
import {createServer} from "http";

/* The Socket.io WebSocket module */
import {Server} from "socket.io";

/* REST API routes */
import routes from "./routes/index.js"

// Following three lines conver "URL" to file path
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Our custom Nebula module handles the WebSocket synchronization
import Nebula from "./nebula.js";

/* Connect to the databases */
// TODO: Update these to import statements and verify connection to the database
//var mongo = require('mongodb');
//var monk = require('monk');
//var db = monk('localhost:27017/nodetest');
//var datasets = monk('localhost:27017/datasets');

const app = express();//Creates app from express class. (Baseline famework for an app. No web functionality).
const debug2 = Debug('Nebula:server');
const httpServer = createServer(app);
const clientio = new Server(httpServer);
// Variable 'nebula' never referenced in this file because the following line is used to connect nebula.js to app.js
const nebula = Nebula(clientio);

/* Set the port we want to run on */
var port = process.env.PORT || 4040;  // Port changed from 80 to 4040 due to 'Port 80 requires elevated priveleges' Error
app.set('port', port);

/* view engine setup, currently not used */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Uncomment following line after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

/* Expose everything in public/ through our web server */
app.use(express.static(path.join(__dirname, 'public')));
app.use("/", express.static(path.join(__dirname, 'Nebula-UIs')));

// TODO: After updating previous import statements for DB, use this following code to test connection
// Make our db accessible to our router
//app.use(function(req, res, next){
//    req.db = db;
//    req.datasets = datasets;
//    next();
//});


/* Initiate the REST API */
app.use("/nebulaRoute", routes.nebulaRoute)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

/**
 * Event listener for HTTP server "error" event.
 */
console.log("line 105");
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = (typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port);

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = httpServer.address();
  var bind = (typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port);
  debug2('Listening on ' + bind);
}

/**
 * Listen on provided port, on all network interfaces.
 */
httpServer.listen(port);
httpServer.on('error', onError);
httpServer.on('listening', onListening);
console.log("the end");
