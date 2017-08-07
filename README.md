# Overview
This project acts as the visualization controller. It is a Node.js server that makes use of WebSockets to synchronize actions across multiple clients. The logical flow is as follows: clients submit a `join` message to the room they wish to join. This room is a string specifying different instances of visualizations to connect to. Currently, the client automatically connects to a room called `default`. If the room the client connects to already exists, the client will be synch'd with the current state of the visualization. Otherwise, the room will be created and initialized as an empty visualization.

# Installation
Some dependencies must be installed which are different for each platform. Instructions for installing the pipeline (Nebula-Pipeline submodule) are provided as well. You may choose to install the pipeline separately following its own instructions. In this case, ignore all instructions for Python and the pipeline.

For all platforms, Python 2.7 must be installed for Nebula-Pipeline to work. It can be installed from their website [here](https://www.python.org/downloads/release/python-2712/). This install should come with pip, the Python package manager. If you can run pip from the command line, you are ready to proceed. If pip isn't found, you can install it by following the instructions [here](https://pip.pypa.io/en/stable/installing/). Make sure pip is updated to the latest version by running:

``pip install --upgrade pip``

Similarly, Java must be installed for the project to run correctly. It can be installed from [here](https://www.java.com/en/download/).

## Windows
Install the Node.js from their website [here](nodejs.org). Select the LTS version.

NOTE: Any LTS version at or below 4.4.7 will not work correctly. As soon as a new version is released, the rest of the install instructions should work fine, but as of this writing a new version has not been released. To fix this issue, you must run `npm install -g npm`, and then go into your `~\AppData\Roaming\npm\node_modules\npm` directory and run the command `npm install node-gyp@3.4.0`. With this, the remaining instructions should work. Any LTS Node.js version after 4.4.7 should not need to the aforementioned steps.

Install the Visual C++ Build Tools, found [here](http://landinghub.visualstudio.com/visual-cpp-build-tools). Then tell the Node package manager to use this version by running:

``npm config set msvs_version 2015``

Finally, for the Nebula-Pipeline to work, the Python packages numpy and scipy must be installed before running the setup below. One option is to use a Python distribution that has these packages preinstalled, such as [Anaconda](https://www.continuum.io/downloads). If you already have the traditional Python distribution installed, the best way to install these packages is by downloading them from the site [here](http://www.lfd.uci.edu/~gohlke/pythonlibs/). Download the files `numpy-1.11.1+mkl-cp27-cp27m-win_amd64.whl` and `scipy-0.17.1-cp27-cp27m-win_amd64.whl` (or the 32-bit version if that's the Python version you're running), and run the following commands in the directory these files are in:

``pip install numpy-1.11.1+mkl-cp27-cp27m-win_amd64.whl``

``pip install scipy-0.17.1-cp27-cp27m-win_amd64.whl``

## OS X
Install [HomeBrew](http://brew.sh/). Then use HomeBrew to install zeromq and pkg-config:

``brew install zeromq pkg-config``

## Debian/Ubuntu
Install the libzmq-dev, npm, and nodejs-legacy packages:

``sudo apt-get install libzmq-dev npm nodejs-legacy``

## All Platforms
Once these platform specific dependencies have be installed, you can install all the required Node.js modules using:

``npm install``

Note: on Linux and OS X you may need to use ``sudo``.

With this, all the Node dependencies should be installed. 

Next, you can install all the pipeline dependencies with the command:

``pip install ./path/to/Nebula-Pipeline`` (if you are going to develop you can use ``pip install -e ./path/to/Nebula-Pipeline``)

Again, you may need to use `sudo`.

## Docker Installation
For a guide on how to install and run this project using Docker, visit the Readme in the `Cosmos-Dockerized` repository.

# User Guide

You can launch the Node.js server by running `npm start` from the root directory. This will start the server (default listening on port 8081). All accessible web clients are located in the CosmosD3 folder. The files in this folder are exposed in the web server through the `/cosmos` URI. For example, the CosmosTwitter client can be accessed via `/cosmos/CosmosTwitter.html`. Navigating to the root page at `localhost:8081/` will return the default client, `/cosmos/CosmosD3.html`.

Multiple clients of the same type can be opened simultaneously, and all clients will be synched together. However, currently only one type of client can be opened at a time. While improving this would not take much work, it is something that we never got around to. In order to switch to try a different client, the server will have to be restarted. 

When the first client is loaded from the server, it can specify which pipeline to load, which are described below. This pipeline is then started by the Node.js server, by spawning a Python instance. Each pipeline gets started on port 5555, and the server automatically connects to it once it is started. Because each is run on the same port, only one pipeline can currently be run. Again, this simply enables us to test each client, and could easily be modified for more robust use.

Currently, the labels for each document view is set to the four strongest words associated with each document. While there may be some repeats, the labels are meant to give the user a brief understanding of what each document may be about without having to make an interaction with it. 
# Developer Notes

When initialing cloning from git, be sure to either run `git clone` with the `--recursive` command, or run `git submodule init` followed by `git submodule update` to pull in the CosmosD3 submodule that contains the web client code.

## Structure
This project is organized as a Nodeclipse project. The core pieces are as follows:

### package.json
This is the configuration file for the project. It contains project configuration parameters and the project dependencies that get installed with `npm install`.

### app.js
This is the main entry point of the server. It creates a server listening on port 8081.

### nebula.js
The core WebSocket logic. It listens for incoming WebSocket connections on the web server, and handles tracking of rooms and clients and synching messages between them. It is loaded as a module from app.js.

### CosmosD3
A Git submodule for accessing the CosmosD3 project. This contains all the HTML, Javascript, and CSS files necessary for the web visualization clients. See the CosmosD3 project for more information.

### pipelines/
This folder contains all the pipeline instances currently implemented. The `cosmos` pipeline contains an ActiveSetModel and a SimilarityModel, and works with both the CosmosD3 and CosmosRadar clients. The `composite` pipeline works with these visualizations as well, adding in the features described in the Nebula-Pipeline README. The `twitter` pipeline works with the CosmosTwitter client, and the access and consumer tokens must be set for this to work, see [here](https://dev.twitter.com/oauth/overview) for instructions on creating these keys.

### data/
This folder contains the data to be used by any of the aforementioned pipelines.

### public/
This folder contains any files intended for the client. Anything in this folder is accessible from the web server. Currently not really used for anything, as all the important exposed files are in the CosmosD3 folder.

### routes/
Contains all REST logic, which currently only forwards the root path to `/cosmos/CosmosD3.html`.

## nebula Module
The `nebula` Node.js module contains the heart of the logic pertaining to the visualizations and pipelines. While it is currently necessary in the way all the current examples are structured, it includes only the minimum necessary logic to allow us to test our visualizations and pipelines. The ports to run the pipeline on and the data to be visualized for each pipeline are hard coded within this module. 

The current logical flow of the application can be described as follows:

* A client initiates a Socket.io connection to the server, handled by the `io.on('connection')` callback.
* The client requests to join a room, providing a room name and a pipeline run in that room. This is handled by the `socket.on('join')` callback.
* If the room does not exist, create it, and spawn an Python instance of the specified pipeline, using the arguments hard coded for that pipeline at the top of `nebula.js`.
    * If the room does exist, add this user to that room and do not start any new pipeline. If this room uses a different visualization or pipeline than what the new user expected, results are undefined.
* A connection is initiated with the new pipeline instance, currently done through ZeroMQ sockets using JSON messages.
* The server then listens to certain messages from the client, as described below.

There are four types of message the server listens for from clients:

* `action`: this is the only message that is not forwarded to the pipeline. `action` messages represents interactions that occur within the visualization that should be sent to any other web clients if multiple are open in the same room. Examples of this include moving or selecting a point, neither of which currently qualify is an interaction a pipeline would care about.
* `update`: this message is what triggers an iteration of the pipeline to occur. Information about the type of interaction that occurred is passed with this message and forwarded on to the pipeline.
* `get`: this message is directly forwarded to the pipeline, and its behavior is described in the pipeline documentation.
* `reset`: same as the `get` message, but any state stored on the server for the room is cleared as well.

# Tools

Created with [Nodeclipse](https://github.com/Nodeclipse/nodeclipse-1)
 ([Eclipse Marketplace](http://marketplace.eclipse.org/content/nodeclipse), [site](http://www.nodeclipse.org))   

Nodeclipse is free open-source project that grows with your contributions.
