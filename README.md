# Overview
This project acts as the UI controller. It is a Node.js server that makes use of WebSockets to synchronize actions across multiple clients. The logical flow is as follows: clients submit a `join` message to the room they wish to join. This room is a string specifying different instances of visualizations to connect to. Currently, the client automatically connects to a room called `default`. If the room the client connects to already exists, the client will be synch'd with the current state of the visualization. Otherwise, the room will be created and initialized as an empty visualization.

From here, clients can send two main types of messages to the server. `action` messages are simple things like a point moved or was selected, that should be indicated in other clients, but shouldn't necessarily initiate a query for new documents. `update` messages are intended to initiate queries based on an explicit search or some implicit interaction. The API's for each of these messages are still under development.

In addition to sending messages, clients should also be listening for these messages as well. Received `action` messages reflect another client as performed some action that should be taken into account in the current client, and operate on single points. `update` messages typically are for updating the entire display, such as from the result of a query, and include the position and state of every single point currently visible.


# Installing and Running
The first requirement is to have git installed on your machine. You must have your public keys set up with git and the GitLab where the project is hosted (git.it.vt.edu) so that SSH can be used to download the submodules.

This project is built using Node.js, and uses the CosmosD3 and Nebula-Pipeline repositories as submodules. To make sure these submodules get pulled in correctly, either clone this repo using the `--recursive` flag or if you have already cloned the repo, pull in the submodules using:

``git submodule init``

``git submodule update``

For all platforms, Python 2.7 must be installed. It can be installed from their website [here](https://www.python.org/downloads/release/python-2712/). This install should come with pip, the Python package manager. If you can run pip from the command line, you are ready to proceed. If pip isn't found, you can install it by following the instructions [here](https://pip.pypa.io/en/stable/installing/). Make sure pip is updated to the latest version by running:

``pip install --upgrade pip``

Next, some dependencies must be installed which are different for each platform. Instructions for installing the pipeline (Nebula-Pipeline submodule) are provided as well.

## Windows
Install the Node.js from their website [here](nodejs.org). Select the LTS version.

Install the Visual C++ Build Tools, found [here](http://landinghub.visualstudio.com/visual-cpp-build-tools). Then tell the Node package manager to use this version by running:

``npm config set msvs_version 2015``

Finally, to work with the pipeline, the Python packages numpy and scipy must be installed before running the setup below. One option is to use a Python distribution that has these packages installed, such as [Anaconda](https://www.continuum.io/downloads). If you already have the traditional Python distribution installed, the best way to install these packages is by downloading them from the site [here](http://www.lfd.uci.edu/~gohlke/pythonlibs/). Download the files `numpy-1.11.1+mkl-cp27-cp27m-win_amd64.whl` and `scipy-0.17.1-cp27-cp27m-win_amd64.whl` (or the 32-bit version if that's the Python version you're running), and run the following commands in the directory these files are in:

``pip install numpy-1.11.1+mkl-cp27-cp27m-win_amd64.whl``

``pip install scipy-0.17.1-cp27-cp27m-win_amd64.whl``

## Mac
Install [HomeBrew](http://brew.sh/). Then use HomeBrew to install zeromq and pkg-config:

``brew install zeromq pkg-config``

## Debian/Ubuntu
Install the libzmq-dev, npm, and nodejs-legacy packages:

``sudo apt-get install libzmq-dev npm nodejs-legacy``

## All Platforms
Once these platform specific dependencies have be installed, you can install all the required Node.js modules using:

``npm install``

With this, all the Node dependencies should be installed. 

Next, you can install all the pipeline dependecies with the command:

``pip install -e Nebula-Pipeline``

--------------------------------------------------------------------------------------

You can then launch the Node.js server by running `npm start` from the root directory. This will start the server listening (default on port 8081).

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
