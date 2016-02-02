# Purpose
This project acts as the UI controller. It is a Node.js server that makes use of WebSockets to synchronize actions across multiple clients. The logical flow is as follows: clients submit a `join` message to the room they wish to join. This room is a string specifying different instances of visualizations to connect to. Currently, the client automatically connects to a room called `default`. If the room the client connects to already exists, the client will be synch'd with the current state of the visualization. Otherwise, the room will be created and initialized as an empty visualization.

From here, clients can send two main types of messages to the server. `action` messages are simple things like a point moved or was selected, that should be indicated in other clients, but shouldn't necessarily initiate a query for new documents. `update` messages are intended to initiate queries based on an explicit search or some implicit interaction. The API's for each of these messages are still under development.

In addition to sending messages, clients should also be listening for these messages as well. Received `action` messages reflect another client as performed some action that should be taken into account in the current client, and operate on single points. `update` messages typically are for updating the entire display, such as from the result of a query, and include the position and state of every single point currently visible.


# Installing and Running
To run this code, move into the root directory of the project and run `npm install`. This will install all the dependencies required by the project. You can then start the server by running `npm start`. Then simply open up a browser and go to http://localhost:8081 to load the X3DOM client.


# Structure
This project is organized as a Nodeclipse project. The core pieces are as follows:

## package.json
This is essentially the manifest file for the project. It contains some project configuration parameters and the project dependencies that get installed with `npm install`.

## app.js
This is the main entry point of the server. It creates a server listening on port 8081 and initiates the other pieces.

## nebula.js
The core WebSocket logic. It listens for incoming WebSocket connections on the web server, and handles tracking of rooms and clients and synching messages between them. It is loaded as a module from app.js.

## public/
This folder contains the files intended for the client. Anything in this folder is accessible from the web server.

### public/x3dom.html
The current X3DOM client compatible with the Nebula WebSocket server.

### public/javascripts/nebula-client.js
A Javascript library created for the X3DOM client to help with point management.

## java/
This folder contains the Java files to support the Java implementations of MDS and inverse MDS. A Java process is spawned by the web server to run these algorithms, and communicates with it via JSON strings sent over stdin and stdout.

## routes/
These define the REST API accessible from the web server. Currently there are some API calls setup to run any kind of MDS or inverse MDS on an appropriately structured JSON object. This should be expanded to include the database retrieval functionality we need.

## bin/ and views/
Not currently used and likely to be deleted soon.


# Tools

Created with [Nodeclipse](https://github.com/Nodeclipse/nodeclipse-1)
 ([Eclipse Marketplace](http://marketplace.eclipse.org/content/nodeclipse), [site](http://www.nodeclipse.org))   

Nodeclipse is free open-source project that grows with your contributions.
