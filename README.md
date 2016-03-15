# Overview
This project acts as the UI controller. It is a Node.js server that makes use of WebSockets to synchronize actions across multiple clients. The logical flow is as follows: clients submit a `join` message to the room they wish to join. This room is a string specifying different instances of visualizations to connect to. Currently, the client automatically connects to a room called `default`. If the room the client connects to already exists, the client will be synch'd with the current state of the visualization. Otherwise, the room will be created and initialized as an empty visualization.

From here, clients can send two main types of messages to the server. `action` messages are simple things like a point moved or was selected, that should be indicated in other clients, but shouldn't necessarily initiate a query for new documents. `update` messages are intended to initiate queries based on an explicit search or some implicit interaction. The API's for each of these messages are still under development.

In addition to sending messages, clients should also be listening for these messages as well. Received `action` messages reflect another client as performed some action that should be taken into account in the current client, and operate on single points. `update` messages typically are for updating the entire display, such as from the result of a query, and include the position and state of every single point currently visible.


# Installing and Running
This project is built using Node.js, and uses the CosmosD3 and Nebula-Pipeline repositories as submodules. To make sure these submodules get pulled in correctly, either clone this repo using the `--recursive` flag:

```git clone --recursive git@git.it.vt.edu:gd/Nebula.git```

Or if you have already cloned the repo, pull in the submodules using:

```git submodule init```
```git submodule update```

The next requirement is to download and install Node.js. See their website [here](nodejs.org) for instructions on doing so. Next, if you are running on Windows, you must install the Visual C++ Build Tools, found [here](https://www.microsoft.com/en-us/download/details.aspx?id=49983). Then you can install the Node dependencies by running the following command in the root directory of the project:

```node install --msvs_version=2015```

Note: Mac instructions coming soon.

With this, all the Node depedencies should be installed. Now we only need to install the Python packages required for the Pipeline. If you do not have Python installed, first install Python 2.7 from their website [here](https://www.python.org/downloads/release/python-2711/). This should come with pip, the Python package manager. If you can run pip from the command line, you are ready to proceed. If pip isn't found, you can install if by following the instructions [here](https://pip.pypa.io/en/stable/installing/). With pip installed, you can install the required packages by running the commands:

```pip install zerorpc```
```pip install numpy```
```pip install sklearn```
```pip install scipy```

Note: the last command likely won't work on Windows. If it fails, download the Scipy Windows installer found [here](https://github.com/scipy/scipy/releases/download/v0.16.0/scipy-0.16.0-win32-superpack-python2.7.exe)

The first requirement is to install Node.js (nodejs.org). With this installed, move into the root directory of the project and run `npm install`. This will install all the dependencies required by the project. Next you need to make sure that the CosmosD3 submodule has been pulled in. This can be done by passing the `--recursive` flag when cloning the Nebula repository, or by running the commands `git submodule init` followed by `git submodule update` in the root directory of the project. You can then launch the Node.js server by running `npm start` from the root directory. This will start the server listening (default on port 8081), with the CosmosD3.html file being the default file sent when the website is accessed.

This Node.js server expects the Nebula Pipeline to be running, currently locally defaulting to port 5555. See the Nebula-Pipeline project for details on starting that up.

# Structure
This project is organized as a Nodeclipse project. The core pieces are as follows:

## package.json
This is essentially the manifest file for the project. It contains some project configuration parameters and the project dependencies that get installed with `npm install`.

## app.js
This is the main entry point of the server. It creates a server listening on port 8081 and initiates the other pieces.

## nebula.js
The core WebSocket logic. It listens for incoming WebSocket connections on the web server, and handles tracking of rooms and clients and synching messages between them. It is loaded as a module from app.js.

## CosmosD3
A Git submodule for accessing the CosmosD3 project. The CosmosMDS.js file is copied to the public/javascripts file on running `npm start`, and the default index file for the server is currently CosmosD3/CosmosD3.html.

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
