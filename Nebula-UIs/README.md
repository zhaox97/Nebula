# Overview

This project contains all the web interfaces available for the Nebula project. The current interfaces are:

## Andromeda

**Andromeda.html** uses **Andromeda.js** and **Andromeda.css**. This client creates a layout with one panel showing similarities between all data points using WMDS, with a side panel displaying the attributes and their weights. When data points are moved or attributes weights are manipulated, the layout is updated with re-calculated similarities.

This visualization is a newer version of the original **AndromedaClassic.html** (and its associated **AndromedaClassic.js**).

## CosmosD3

**CosmosD3.html** uses **CosmosD3.js** and **Cosmos.css**. It implements a layout with one panel for a WMDS projection of documents (similar to Andromeda), with a side panel for further information about a selected document. Text queries (i.e., explicit queries) can be used to bring in data. OLI updates and interactions with the information panel (i.e., implicit queries) can also bring new data into the visualization automatically.

### Related Deprecated Visualizations

A number of 3D and immersive visualizations as well as a Twitter visualization have been developed that are no longer being actively used. However, we have kept these visualizations and retained at least some basic functionality/connectivity in case we decide to develop these further.

#### \[Deprecated\] Cosmos Twitter

**CosmosTwitter.html** uses **CosmosTwitter.js** and **Cosmos.css**. While the visualization is very similar to CosmosD3, it loads the Twitter pipeline to enable integration with Twitter data. The access and consumer tokens must be set in the Twitter pipeline for this to function properly.

To make this visualization work properly again, the TwitterDataController in the Nebula-Pipeline module must be updated.

#### \[Deprecated\] Oculus with Pipeline

This visualization only needs **Oculus with Pipeline.html** to display an immersive 3D version of the CosmosD3 visualization compatible with the Oculus.

#### \[Deprecated\] Photon2

This visualization only needs **Photon2.html** to display a 3D version of the CosmosD3 visualization using X3DOM.

##### \[Deprecated\] Photon
This visualization only needs **Photon.html** to display a 3D version of the CosmosD3 visualization using X3DOM. This visualization is the predecessor to Photon2.

#### \[Deprecated\] Andromeda X3DDOM
**andromeda - x3dom.html** uses **andromeda - x3dom.js** to display a 3D version of CosmosD3 using X3DOM.

## Cosmos Elasticsearch

**Elasticsearch.html** uses **Elasticsearch.js** and **Cosmos.css**. The layout looks nearly identical to CosmosD3, but the Data Controller connects to an Elasticsearch database. Currently, implicit querying is not yet implemented.

This visualization can appear laggy or unresponsive if the Elasticsearch database has performed too much indexing. If this is the case, then the Nebula-Elasticsearch module should be reset to remove these extra indices and then restarted. An easy way to do this is to delete and then reinstall the Nebula-Elasticsearch module.

## [Buggy] Cosmos Radar

**CosmosRadar.html** uses **CosmosRadar.js** and **Cosmos.css**. The layout produced is a modification of CosmosD3 so that document similarity is mapped in only one dimension, an angular component, and the document relevance is mapped to the distance from the center. This visualization is based on the [Intent Radar by Ruotsalo et al.](https://dl.acm.org/doi/abs/10.1145/2505515.2505644?casa_token=1k3Jd-8nGbwAAAAA:dKv-EAAXkXJS3s3s-Lxz0vXEoNXthtRB69TjEuaydyw3zabiKh4-Us15nt0a6rDI-yDirPUIvwuL)

This visualization does not properly account for document relevance when performing OLI. The inverse function(s) of one or more modules would need to be updated to fix this.

## [Buggy] Cosmos Composite

**CosmosComposite.html** uses **CosmosComposite.js** and **Cosmos.css**. The layout produced is a modification of CosmosD3 in which extracted entities are mapped into the same WMDS projection as the documents themselves. This visualization is based on the [Data Context Map by Mueller et al.](https://ieeexplore.ieee.org/abstract/document/7194836?casa_token=sis8-ae8g74AAAAA:id-TgCxD_N-gj0nAN4k-yx0J9lHt4ni84zIZUxu2YDwrsDGpJ5n8kIYxRo01zm5PLsGNDACuZw)

Currently, interaction with the attributes is broken. Attempting to do so may result in an error that crashes the pipeline.

## SIRIUS

This visualization is similar to Andromeda in terms of the underlying math that is used in the Models. However, the visualization simultaneously displays both observations and attributes in separate panels. The same interactions are afforded in each panel.

## Centaurus

This visualization is based on SIRIUS but includes the ability to forage for more data using both keyword search foraging and automated foraging (similar to CosmosD3).

## Establishing Server and Pipeline Communications

Most of the above clients use **InitializeSession.js** to manage sessions/rooms, such as uploading custom data files or initializing a new pipeline. Much of this is accomplished using socket.io to send messages from each of the above interfaces to the nebula.js server. Additional details behind this communication is detailed below.


# Code Hygiene

It is generally expected that new development in any of these existing interfaces or in a new interface will follow these practices:

- **HTML file**: Contains the skeleton code to generate the desired visualization as well as references/links to any necessary JavaScript or CSS files. These HTML files should be very basic and relatively empty; anything that needs to be dynamic in any way should probably be defined in the associated JavaScript file. Generally, this file MUST reference InitilizeSession.js to establish its connection with the server and any associated pipeline. NO CSS styles should be defined in this file.
- **CSS file**: Contains the CSS styles that are generally or commonly used in the visualization.
- **InitializeSession.js**: Generally, all code pertaining to initializing a new pipeline or connecting to an existing pipeline should be contained in this file. This includes telling the server that which pipeline the client wants to connect to (whether it’s an existing pipeline or a new pipeline) or uploading a custom dataset.
- **JavaScript file(s)**: Contains the code to render any dynamic portions of the visualization and handle the interactions therein. This file must establish an initial connection with the server by calling:
   ```javascript
   var socket = io.connect();
   ```

   Additionally, it should define a global variable called `ui` to define what type of pipeline should be constructed to match this interface. All other code pertaining to user interactions or dynamic pieces of the visualization should be defined here. As explained below, this includes code to communicate user interactions with the server (via `socket.emit(...)` and `socket.on(...)`).


# Using Socket.io to Communicate with the Server

Here we describe all the necessary pieces to establish your interface as a new client and to communicate with the server and pipeline.

All communication with the server is done through a WebSocket connection. This connection is created by first including the socket client script by including the following within the HTML file for the given interface:
```javascript
<script src="/socket.io/socket.io.js"></script>
```

Then a connection can be initiated in the associated JavaScript file by calling:
```javascript
var socket = io.connect();
```
Note that this line of code **CANNOT** be in InitializeSession.js due to how Socket.io establishes its connection to your interface.

Then, you must tell the server that you want to join and room. This is done by emitting the `join` message, which includes the name of the room you wish to join (called “default” in the example below), your user ID (typically the ID of the socket), the name of the pipeline you want to run, and any additional arguments for that pipeline. For example, to create or join a room using the `cosmos` pipeline (which does not need any additional arguments), you would call
```javascript
socket.emit('join', 'default', socket.id, 'cosmos');
```
If you created a 3D client and wanted the cosmos pipeline to output positions in 3D (which does require additional arguments), you can indicate that with:
```javascript
socket.emit('join', 'default', socket.id, 'cosmos', {'low_dimensions': 3});
```
The arguments available are dependent on the pipeline you are running. However, this code **ALWAYS** should be in InitializeSession.js.

You can then inform the server of simpler user interactions (e.g., selecting a datapoint) using `action` messages, inform the server of more complicated interactions (e.g., OLI) using the `update` message, request raw data directly from the data controller using the `get` message, or reset the pipeline using the `reset` message. (More details on these messages are provided in the Nebula and Nebula-Pipeline documentation.) Each of these messages are sent to the server using the same `emit` function in Socket.io, which takes the name of the message as its first parameter and any additional parameters passed as necessary. For example, initiating a text query in the `cosmos` pipeline would be done by calling:
```javascript
socket.emit('update', {type: "search", query: <search query>});
```
Note that since these `emit` functions are based on user interactions, they should **ALWAYS** be used in the associated JavaScript file for the interface (i.e., **NOT** InitializeSession.js). The server then handles this message as necessary.

If the server responds to one of the above messages, you must create callbacks to receive the server's response. This is accomplished through the same four types of messages described above using the `on` function in Socket.io:
```javascript
socket.on('action', function(data) {...});
socket.on('update', function(data) {...});
socket.on('get', function(data) {...});
socket.on('reset', function() {...});
```
Note that since these `on` functions are meant to respond to user interactions, they should **ALWAYS** be used in the associated JavaScript file for the interface (i.e., **NOT** InitializeSession.js).
