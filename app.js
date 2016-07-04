var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

/* REST API routes */
var routes = require('./routes/index');
var data = require('./routes/data');
var oli = require('./routes/oli');

/* Connect to the databases */
//var mongo = require('mongodb');
//var monk = require('monk');
//var db = monk('localhost:27017/nodetest');
//var datasets = monk('localhost:27017/datasets');

/* The HTTP request handler */
var app = express();
var debug = require('debug')('Nebula:server');
var http = require('http').Server(app);

/* The Socket.io WebSocket module */
var io = require('socket.io')(http);

/* Our custom Nebula module handles the WebSocket synchronization */
var nebula = require('./nebula')(io);

/* Set the port we want to run on */
var port = process.env.PORT || 8081;
app.set('port', port);

/* view engine setup, currently not used */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

/* Expose everything in public/ through our web server */
app.use(express.static(path.join(__dirname, 'public')));
app.use("/cosmos", express.static(path.join(__dirname, 'CosmosD3')));

// Make our db accessible to our router
//app.use(function(req, res, next){
//    req.db = db;
//    req.datasets = datasets;
//    next();
//});

/* Initiate the REST API */
app.use('/', routes);
//app.use('/oli', oli);
app.use('/data', data);

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

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

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
  var addr = http.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

/**
 * Listen on provided port, on all network interfaces.
 */
http.listen(port);
http.on('error', onError);
http.on('listening', onListening);
