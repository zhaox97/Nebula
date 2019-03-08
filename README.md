# Overview
This project acts as the visualization controller. It is a Node.js server that makes use of WebSockets to synchronize actions across multiple clients. The logical flow is as follows: clients submit a `join` message to the room they wish to join. This room is a string specifying different instances of visualizations to connect to. Currently, the client automatically connects to a room called `default`. If the room the client connects to already exists, the client will be synch'd with the current state of the visualization. Otherwise, the room will be created and initialized as an empty visualization.

# Installation
There are two different installation strategies: Using Docker or following more traditional installation strategies. Docker lets you get a new machine up and running within minutes, but it can require rebuilding Docker images to see changes reflected in one of our UIs, depending on what you're changing and how you're running your Docker containers.

Regardless of which method you choose, you first need to **clone this repository (and the CosmosD3 and Nebula-Pipeline repositories)** onto your local machine. When initialing cloning from git, be sure to either run `git clone` with the `--recursive` flag (recommended), or run `git submodule init` followed by `git submodule update` to pull in the CosmosD3 and Nebula-Pipeline submodules.

## Docker Installation
Make sure you have a version of **Docker** installed from [the official website](https://docs.docker.com/install/) (look to the menu on the left to get a version installed for your OS, making sure to double check your system requirements and installing the older Docker Toolbox if necessary). Just about any version of Docker should do; we are just using *images* and *containers*, not *services*, *networks*, or any other Docker features.

Before you can do much with Docker, you may have to get a *Docker daemon* running. To get the default daemon running, these commands can be helpful (when in doubt, you can run all 3 in this order; more information is available [here](https://stackoverflow.com/questions/21871479/docker-cant-connect-to-docker-daemon)):
* `docker-machine start` # Start virtual machine for docker
* `docker-machine env`  # Get environment variables
* `eval "$(docker-machine env default)"` # Set environment variables

Next, **`cd` into the directory** where your cloned repository lives. You should see a Dockerfile there, which specifies what a Docker image should look like (including all dependencies) and what it should do on startup (as defined by CMD). To **build your Docker image**, run

`docker build -t imageName .`

For example, I call my image `nebulaserver`. The `.` simply specifies your current directory as the location of the desired Dockerfile is located. Make sure you don't have any errors or warnings in building your image (aside from deprecation warnings; these are to be expected). Assuming everything went smoothly, you now have a Docker image ready.

Your docker image is not yet running. To run it, you need to use `docker run -p hostPort:containerPort imageName`. This **runs the given image (e.g., `nebulaserver`) within a container**, where the image is running the given application on `containerPort` (which for us is `8081`, as defined in app.js; this port is then "exposed" to the host machine with the `EXPOSE` command in the Dockerfile). This container port is then mapped to the given host port, which can be any unused port you want it to be (e.g, `80`). Your app should now be ready for you to use. You will see in your console printout from within your container print to the terminal window that you launched your container in. Note, however, that your container will be unresponsive to any keyboard input from this terminal window (including the typical `CTRL+C` to stop the Node.js server).

Note: I recommend you run a longer command to start your container... See below for details:

`docker run -v "$(pwd)"/CosmosD3:/www/CosmosD3/ -v "$(pwd)"/Nebula-Pipeline:/www/Nebula-Pipeline/ -p 80:8081 --name nebula_runner1  nebulaserver`

To figure out how to **connect to your app**, you need to know which IP address your Docker container is running on. Docker containers run on the IP address associated with the daemon that it's being run on. To figure out what that IP address is, run

`docker-machine ip default`

in a different terminal window (which will tell you the IP address associated with your default daemon; if you've specified a different one, replace `default` with the name of your other daemon). For some machines, this may be `127.0.0.1` (i.e., localhost), whereas others (particularly those that use the older Docker Toolbox), this may be `192.168.99.100`. For example, for a machine running Docker Toolbox that has mapped the host port `4000` to the container's port, you would access Andromeda through the URL `192.168.99.100:4000/cosmos/andromeda.html`.

### Other Useful Docker Commands

#### Additional Options for Running Containers
As previously mentioned, you can add more to your `docker run` command to make it do even more powerful things for you. Here's a few of available options:
* `--name containerName` : You specify the container's name yourself as `containerName`. Otherwise, a randomly generated name will be assigned to it. Specifying the name yourself is useful since it means you will know what your container's name is, making it easier to stop or restart the container later (as described below). In the example above, I use `--name nebula_runner1`. Note that the specified `containerName` must be unique. (See below to remove existing containers, which may have the same name as the name you're trying to use.)
* `-v /full/path/to/hostDir:/full/path/to/container/dir` : The specified directory in your host machine will be mounted to the specified directory in your container. Since your container is running a static image, this means that traditionally you would have to rebuild your image to see any changes reflected in how your container operates. By instead mounting a host directory, you can make changes to things in your host machine and see those changes instantly reflected in your container. Note that this doesn't change your image, however, so rebuilding your image regularly is still a good idea. Additionally, don't try to mount the entire Nebula directory as the node_modules directory contained within will conflict with the node_modules directory that your container tries to make to let the Node.js server run properly. The result will be that the process will crash, causing your container to automatically stop running. (It's not very useful to mount the Node.js files anyways since you would have to restart the npm process to see those changes. But if that process stops, then the container stops, so you might as well rebuild the image and start a new container.) In the example above, I mount both the Nebula-Pipeline and CosmosD3 directories from my host machine to the container to let me make and see changes easily.
* `-d` : You can run your Docker container run in a detached state. According to the official [docs](https://docs.docker.com/engine/reference/run/#detached--d), "by design, containers started in detached mode exit when the root process used to run the container exits." Therefore, using this detached state may be useful if you want your Docker container to continue after the main process (dictated by CMD) terminates. However, it does mean that the container's output will no longer be printed out to your host's terminal.

#### Stopping, Starting, and Removing Containers
To stop a container, you need the container's name. If you forgot it or didn't specify a name, you can get the information by running `docker ps`. Then, run `docker stop containerName`. Following my examples above, I would run `docker stop nebula_runner1`.

Note, however, that this doesn't completely remove the container; it has merely stopped running. Using `docker ps -a` will show you all containers, including those that aren't currently running. What this lets you do is run `docker start containerName` to restart the same, previously defined container. If you no longer want the container (e.g., because you want to define a new container with the same name as an existing container), you can remove it using `docker container rm containerID#` (where the `containerID#` is obtained from `docker ps -a`).

Have a ton of extra images or containers you want to get rid of? One of these commands may help you (with more information available [here](https://linuxize.com/post/how-to-remove-docker-images-containers-volumes-and-networks/):
* `docker container rm containerID#` : Removes the container with the specified `containerID#`
* `docker container prune` : Removes all stopped containers
* `docker image prune` : Removes all dangling images
* `docker system prune` : Removes all stopped containers, all dangling images, and all unused networks

#### Executing a Command Within a Container
If you want to execute a command within a container, use `docker exec -it containerID /container/path/to/bash`. This will allow you to execute whatever commands you want from within the container with the specified ID number (which you can obtain using `docker ps`). Type `exit` when you are ready to return to your host machine (just like when using ssh). For our project, the path to bash is simply `/bin/bash`.

## Traditional Installation
Some dependencies must be installed which are different for each platform. Instructions for installing the pipeline (Nebula-Pipeline submodule) are provided as well. You may choose to install the pipeline separately following its own instructions. In this case, ignore all instructions for Python and the pipeline.

For all platforms, **Python 2.7** must be installed for Nebula-Pipeline to work. It can be installed from their website [here](https://www.python.org/downloads/release/python-2712/). This install should come with **pip**, the Python package manager. If you can run pip from the command line, you are ready to proceed. If pip isn't found, you can install it by following the instructions [here](https://pip.pypa.io/en/stable/installing/). Make sure pip is updated to the latest version by running:

``pip install --upgrade pip``

Similarly, **Java** must be installed for the project to run correctly. It can be installed from [here](https://www.java.com/en/download/).

### Windows
Install the **Node.js** from their website [here](nodejs.org). Select the LTS version.

NOTE: Any LTS version at or below 4.4.7 will not work correctly.  As of this writing, the newest version is 8.11.1 LTS, with which the rest of the instructions should work fine. To fix this issue, you must run `npm install -g npm`, and then go into your `~\AppData\Roaming\npm\node_modules\npm` directory and run the command `npm install node-gyp@3.4.0`. With this, the remaining instructions should work. Any LTS Node.js version after 4.4.7 should not need to the aforementioned steps.

Install the **Visual C++ Build Tools**, found [here](http://landinghub.visualstudio.com/visual-cpp-build-tools). Then tell the Node package manager to use this version by running:

``npm config set msvs_version 2015``

Finally, for the Nebula-Pipeline to work, the Python 2.7 packages **numpy and scipy** must be installed before running the setup below. If you already have the traditional Python distribution installed, the best way to install these packages is by downloading them from the site [here](http://www.lfd.uci.edu/~gohlke/pythonlibs/). Download the files `numpy-1.13.1+mkl-cp27-cp27m-win_amd64.whl` and `scipy-1.0.1-cp27-cp27m-win_amd64.whl` (or the 32-bit version if that's the Python version you're running), and run the following commands in the directory these files are in:

``pip install numpy-1.13.1+mkl-cp27-cp27m-win_amd64.whl``

``pip install scipy-1.0.1-cp27-cp27m-win_amd64.whl``

One option is to use a Python distribution that has these packages preinstalled, such as [Anaconda](https://www.continuum.io/downloads); this is not recommended as it can lead to problems with Node.js finding the correct executable file, especially if you use both Python 2.7 and 3.5. 


### OS X
Install **[HomeBrew]**(http://brew.sh/). Then use HomeBrew to install zeromq and pkg-config:

``brew install zeromq pkg-config``

### Debian/Ubuntu
Install the **libzmq-dev, npm, and nodejs-legacy packages**:

``sudo apt-get install libzmq-dev npm nodejs-legacy``

### All Platforms
Once these platform specific dependencies have be installed, you can install all the required **Node.js modules** using:

``npm install``

Note: on Linux and OS X you may need to use ``sudo``.

With this, all the Node dependencies should be installed. 

Next, you can install all the **pipeline dependencies** with the command:

``pip install ./path/to/Nebula-Pipeline`` (if you are going to develop you can use ``pip install -e ./path/to/Nebula-Pipeline``)

Again, you may need to use `sudo`.

## User Guide

You can launch the Node.js server by running `npm start` from the root directory. This will start the server (default listening on port 8081). All accessible web clients are located in the CosmosD3 folder. The files in this folder are exposed in the web server through the `/cosmos` URI. For example, the CosmosTwitter client can be accessed via `/cosmos/CosmosTwitter.html`. Navigating to the root page at `localhost:8081/` will return the default client, `/cosmos/CosmosD3.html`.

Multiple clients of the same type can be opened simultaneously, and all clients will be synched together. However, currently only one type of client can be opened at a time. While improving this would not take much work, it is something that we never got around to. In order to switch to try a different client, the server will have to be restarted. 

When the first client is loaded from the server, it can specify which pipeline to load, which are described below. This pipeline is then started by the Node.js server, by spawning a Python instance. Each pipeline gets started on port 5555, and the server automatically connects to it once it is started. Because each is run on the same port, only one pipeline can currently be run. Again, this simply enables us to test each client, and could easily be modified for more robust use.

# Developer Notes

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
