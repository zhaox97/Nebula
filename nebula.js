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
var pipelines = {
    andromeda: { 
        file: "pipelines/andromeda.py",
        args: ["data/Animal_Data_study.csv"]
     },
     cosmos: {
        file: "pipelines/cosmos.py",
        args: ["data/crescent tfidf.csv",
            "data/crescent_raw"]
     },    
     sirius: {
        file: "pipelines/TwoView.py",
        args: ["data/crescent tfidf.csv",
            "data/crescent_raw"]
     },
     twitter: {
        file: "pipelines/twitter.py",
        args: []
     },
     composite: {
        file: "pipelines/composite.py",
        args: ["data/crescent tfidf.csv",
            "data/crescent_raw"]
     },
     elasticsearch: {
        file: "pipelines/espipeline.py",
        args: []
     }
};

var port = 5555;

var nextSessionNumber = 0;
var usedSessionNumbers = [];

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

        /* When a client requests the list of rooms, send them the list */
        socket.on('list.rooms',function() {
            socket.emit('list.rooms.repose',socket.rooms,io.sockets.adapter.rooms);
            socket.emit('list.rooms.session',socket.rooms);
        });

        /* When clients disconnect, remove them from the room. If the room is
         * now empty, delete it.
         */
        socket.on('disconnect', function() {
            var name = socket.roomName;
            var roomData = self.rooms[name];
            console.log('Client disconnecting from ' + socket.roomName);

            if (roomData && roomData.count) {
                console.log("Count of room: " + roomData.count);
                roomData.count -= 1;
                if (roomData.count <= 0) {
                    console.log("Room " + name + " now empty");
                    
                    // Get the session number of the current session
                    var sessionNumber;
                    var index = name.length - 1;
                    var sessionNumberFound = false;
                    while (!sessionNumberFound && index >= 0) {
                        var number = Number(name.substring(index, name.length));
                        if (Number.isNaN(number)) {
                            sessionNumber = Number(name.substring(index+1, name.length))
                            sessionNumberFound = true;
                        }
                        index--;
                    }
                    
                    // Remove the room number associated with this room from
                    // usedSessionNumbers
                    var sessionNumIndex = usedSessionNumbers.indexOf(sessionNumber);
                    var usedSessionNums1 = usedSessionNumbers.slice(0, sessionNumIndex);
                    var usedSessionNums2 = usedSessionNumbers.slice(sessionNumIndex+1, usedSessionNumbers.length);
                    usedSessionNumbers = usedSessionNums1.concat(usedSessionNums2);
                    
                    // Kill the Python script associated with the empty room
                    roomData.pipelineInstance.stdin.pause();
                    roomData.pipelineInstance.kill('SIGKILL');
                    
                    // Remove the empty room from the list of rooms
                    delete self.rooms[name];
                }
            }
        }); 


        // Use the csvFilePath to store the name of a user-defined CSV file
        var csvFilePath = null;
        
        /* When the client sends a "setData" message with the data and room name,
         * generate a new file using the room name that contains the given data.
         * Set the csvFilePath variable appropriately
         */
        socket.on('setData', function(data, room) {
            // Create the csvFilePath
            csvFilePath = "data/" + room + "_data.csv";

            // Set exec to be a function that calls the command line
            var exec = require('child_process').exec;

            // Initialize errors to be an empty array to capture any errors
            var errors = [];
            // Create the command to use on the command line
            var command = "echo \"" + data + "\" > " + csvFilePath; 
            
            // Execute the command and cature any errors or printouts
            exec(command, "-e",
                function (error, stdout, stderr) {
                    // Print out any stdout captured to the console
                    if (stdout) {
                        console.log('stdout: ' + stdout);
                    }
                    
                    // Put any errors in the errors array
                    if (error) {
                        errors.push(error);
                    }
                    
                    // Put any errors in the errors array and print them out to
                    // the console
                    if (stderr) {
                        console.log('stderr: ' + stderr);
                        errors.push(error);
                    }
                    
                    // Only print out non-null errors
                    if (error !== null) {
                         console.log('exec error: ' + error);
                    }
                });
                
            // Only emit the "csvDataReady" message to the client if no errors
            // were encountered while attempting to create the custom CSV file
            if (errors.length == 0) {
                socket.emit("csvDataReady");
            }                        
        });
        
        socket.on("setCSV", function(csvName) {
            csvFilePath = "data/" + csvName;
            socket.emit("csvDataReady");
        });

        /* 
         * Allows the server to be in control of session names
         */
        socket.on("getSessionName", function(ui) {
            // Create the new session name and send it back to the UI
            var sessionName = ui + nextSessionNumber;
            socket.emit("receiveSessionName", sessionName);
            
            // Keep track of used session numbers
            usedSessionNumbers.push(nextSessionNumber);
            
            // Determine the next session number. If we're getting too close to
            // the MAX_VALUE, start looking at old session numbers to see if an
            // old number can be used
            if (nextSessionNumber == Number.MAX_VALUE || (nextSessionNumber+1) > Number.MAX_VALUE) {
                
                // Start back at 0 and check for session numbers that are no
                // longer being used. 0 would be the oldest session number, and
                // therefore is the most likely to no longer be used. Continue
                // incrementing until an unused session number is found or we
                // reach MAX_VALUE again
                // NOTE: THERE IS NO PROTECTION AGAINST NOT BEING ABLE TO FIND
                // A NEW SESSION NUMBER
                nextSessionNumber = 0;
                while (usedSessionNumber.indexOf(nextSessionNumber) >= 0 &&
                  nextSessionNumber < Number.MAX_VALUE) {
                    nextSessionNumber++;
                }
            }
            else {
                nextSessionNumber++;                
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
            var pipelineArgsCopy = [];

            if (!self.rooms[roomName]) {
                var room = {};
                room.name = roomName;
                room.count = 1;
                room.points = new Map();
                room.similarity_weights = new Map();

                /* Create a pipeline client for this room */
                if (!pipelineAddr) {
                    var pythonArgs = ["-u"];
                    if (pipeline in pipelines) {
                        if (pipelines[pipeline].args.length > 0) {
                            
                            // Iterate through the pipeline's arguments. If there
                            // is a CSV file defined and csvFilePath is not null,
                            // put the csvFilePath in the pipelineArgsCopy.
                            // Otherwise, just copy the pipeline arg into
                            // pipelineArgsCopy. This supports both a custom CSV
                            // file and a default CSV file
                            var pipelineArgs = pipelines[pipeline].args;
                            var i;
                            for (i = 0; i < pipelineArgs.length; i++) {
                                if (pipelineArgs[i].indexOf(".csv") > -1 && csvFilePath) {
                                    pipelineArgsCopy.push(csvFilePath);
                                }
                                else {
                                    pipelineArgsCopy.push(pipelineArgs[i]);
                                }
                            }
                        }
                        pythonArgs.push(pipelines[pipeline].file);
                        pythonArgs.push(port.toString());
                        pythonArgs = pythonArgs.concat(pipelineArgsCopy);
                    }
                    else {
                        pythonArgs.push(pipelines.cosmos.file);
                        pythonArgs.push(port.toString());
                        pythonArgs = pythonArgs.concat(pipelines.cosmos.args);
                    }
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
                    
                    room.pipelineInstance = pipelineInstance;
                }

                /* Connect to the pipeline */
                pipelineAddr = pipelineAddr || "tcp://127.0.0.1:" + port.toString();
                room.pipelineSocket = zmq.socket('pair');
                room.pipelineSocket.connect(pipelineAddr);

                pipelineAddr = null;
                port += 1;

                /* Listens for messages from the pipeline */
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
                
                // TODO: Tell the UI which view/panel to update here by replacing true
                // with isObservation or by repeating this line with false to
                // send this message to the other UI as well
                socket.emit('update', sendRoom(socket.room), true);
            }
            
            // Reset the csvFilePath to null for future UIs
            csvFilePath = null;
        });

        /* Listens for actions from the clients, tracking them and then
         * broadcasting them to all other clients within the room.
         */
        // TODO: send isObservation to the handleAction function to tell the
        // pipeline which data blob to use
        socket.on('action', function(data, isObservation) {
            if (socket.room) {
                self.handleAction(data, socket.room);
                socket.broadcast.to(socket.roomName).emit('action', data, isObservation);
            }
        });

        /* Listens for update requests from the client, executing the update
         * and then sending the results to all clients.
         */
        // TODO: use isObservation to tell the pipeline which data blob to use.
        // isObservation will be null when a search is done
        socket.on('update', function(data, isObservation) {
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
        // TODO: send isObservation to the pipeline to tell it which data blob
        // to use
        socket.on('get', function(data, isObservation) {
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

/* Handles a message from the pipeline, encapsulated in an RPC-like fashion */
// TODO: get isObservation from the pipeline to pass it on to the UI to tell the
// UI which view/panel to update. true is stubbed in for now
Nebula.prototype.handleMessage = function(room, msg) {
    var obj = JSON.parse(msg.toString());
    if (obj.func) {
        if (obj.func === "update") {
            this.handleUpdate(room, obj.contents);
        } else if (obj.func === "get") {
            this.io.to(room.name).emit("get", obj.contents, true);
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
// TODO: get isObservation from the pipeline to tell the UI which view/panel
// should be updated
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
    
    // Tell the UI which view/panel to update here by replacing true with isObservation
    this.io.to(room.name).emit('update', update, true);
};

/* Updates our state for each room upon an update from the pipeline */
var updateRoom = function(room, update) {
    if (update.points) {
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
    }
    if (update.similarity_weights) {
        for (var i=0; i < update.similarity_weights.length; i++) {
            var weight = update.similarity_weights[i];
            if (room.similarity_weights.has(weight.id)) {
                room.similarity_weights.get(weight.id).weight = weight.weight;
            }
            else {
                room.similarity_weights.set(weight.id, weight);
            }
        }
    }
};

/* Runs inverse MDS on the points in a room. For inverse MDS,
 * only the selected points are included in the algorithm. 
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

/* Copies the room details we want to send to the client to a new object */
var sendRoom = function(room) {
    var modRoom = {};
    modRoom.points = Array.from(room.points.values());
    modRoom.similarity_weights = Array.from(room.similarity_weights.values());
    return modRoom;
};

/* Sends a message to a pipeline, enscapsulating it in an RPC-like fashion */
var invoke = function(socket, func, data) {
    var obj = {"func": func, "contents": data};
    socket.send(JSON.stringify(obj));
};
