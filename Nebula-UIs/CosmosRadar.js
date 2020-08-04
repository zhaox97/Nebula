// Width and height of the SVG
var width;
var height;

// Data to use
var nodes = [];
var sourceColorMappings = {"Tweet":"deepskyblue", "News":"red", "attribute": "yellow"};
var openedNode;

// The name of the UI that is used by InitializeSession.js and nebula.js to
// join rooms/sessions and initialize the pipeline appropriately
var ui = "radar";

// Buttons and search box div
var buttonRowDiv = d3.select("body").append("div").attr("class", "container-fluid");
var buttonDiv = buttonRowDiv.append("div").attr("class", "col-md-12");

// Search bar
var searchText = buttonDiv.append("input")
    .attr("id", "searchText")
    .attr("type", "text")
    .attr("placeholder", "Search for term")
    .attr("maxlength", 30)
    .attr("class", "form-control")
    .style("width", "200px");
var searchButton = buttonDiv.append("input")
    .attr("type", "submit")
    .attr("value", "Search")
    .attr("class", "btn btn-sm btn-default")
    .on("click", function() {
    	var searchTerm = document.getElementById("searchText").value;
        if(document.getElementById("searchText").value.length > 0) {
            document.getElementById("searchText").value = "";
            searchForTerm(searchTerm);
    	}
    });

// Reset button that resets the whole pipeline
var resetButton = buttonDiv.append("input")
    .attr("type", "submit")
    .attr("value", "Reset")
    .attr("class", "btn btn-sm btn-default")
    .on("click", function() {
        
        socket.emit("reset");
        //nodes = getNodes();
        //numNodes = nodes.length;

        // Recreate the all SVG elements with the original data
        // This allows the nodes to return to their original size
        // This may not be necessary in the real implementation since all nodes will be removed
        //d3.select("svg").selectAll("*").remove();
        //node = svg.selectAll(".node");
        //resetDataInfo();
        //updateLayout();
    });

// Update initiates an OLI update
var updateButton = buttonDiv.append("input")
    .attr("type", "submit")
    .attr("value", "Update Layout")
    .attr("class", "btn btn-sm btn-default")
    .on("click", function() {
    	var numSelectedNodes = 0;
     	for (i = 0; i < nodes.length; i++) {
            if(nodes[i].selected==true) {
                numSelectedNodes++;
            }		
        }
     	
     	if(numSelectedNodes >= 3) {
            socket.emit("update", {type: "oli"});
            var i;
            for (i = 0; i < nodes.length; i++) {
                nodes[i].selected = false;
                nodes[i].moved = false;
                socket.emit('action', {type: "select", state: nodes[i].selected, id: nodes[i].id});
            }
            force.start();
            resetDataInfo();
        }
    });

d3.select("body").append("br");
var dataRow = d3.select("body").append("div").attr("class", "container-fluid");

// Initialize SVG
var svgCol = dataRow.append("div").attr("class", "col-md-8");
var svg = svgCol.append("svg")
    // Set SVG width to 100% of column width
    .style("width", "100%")
    // Set SVG height to equal column width
    .style("height", function() {
        width = this.clientWidth;
        height = width * 0.6;
        return height;
    })
    .on("contextmenu", function() {
        d3.event.preventDefault();
    });
    
// Translate polar coordinates to cartesian
function polarToCartesian(radius, angleInRadians) {
    return {
        x: -(radius * Math.cos(angleInRadians)),
        y: (radius * Math.sin(angleInRadians))
    };
}

function cartesianToPolar(x, y) {
    return {
        r: Math.sqrt(x * x + y * y),
        angleInRadians: Math.atan2(-y, x)
    };
}

var transg = svg.append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
var arcg = transg.append("g");
var lineg = transg.append("g");
var nodeg = transg.append("g");

var arcs = [height / 8, height / 8 * 2, height / 8 * 3, height / 8 * 4, height / 8 * 5, height / 8 * 6];

var arc = d3.svg.arc()
    .startAngle(-Math.PI / 6 * 5)
    .endAngle(Math.PI / 6 * 5)
    .innerRadius(function(d) { return d; })
    .outerRadius(function(d) { return d; });

//centerG = svg.selectAll(".arcs")
//	.data(arcs)
//	.enter().append("g")
//	.attr("class", "arcs")
//	.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")
	
arcg.selectAll(".path").data(arcs)
    .enter().append("path")
    .attr("class", "path")
    .attr("d", arc)
    .attr("stroke", "lightgray")
    .attr("stroke-width", 2);

var line1 = polarToCartesian(height / 8 * 6, -Math.PI / 6 * 5 - Math.PI / 2);
var line2 = polarToCartesian(height / 8 * 6, Math.PI / 6 * 5 - Math.PI / 2);

lineg.append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", line1.x)
    .attr("y2", line1.y)
    .attr("stroke-width", 2)
    .attr("stroke", "gray");

lineg.append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", line2.x)
    .attr("y2", line2.y)
    .attr("stroke-width", 2)
    .attr("stroke", "gray");

// Initialize force layout
var force = d3.layout.force()
    .gravity(0)
    .friction(0)
    .charge(0)
    .nodes(nodes);

// Catch the drag events
var drag = force.drag()
    .on("dragstart", dragstart)
    .on("drag", dragmove)
    .on("dragend", dragend);

// Initialize force layout actions
var node = nodeg.selectAll(".node");

//I believe we don't need it anymore
//updateLayout();

// Add place to put data contents when a node is double clicked
var dataContents = dataRow.append("div")
    .attr("class", "col-md-4")
    .attr("id", "dataContents")
    .style("height", height + "px");

// Add data label
var dataLabel = dataContents.append("input")
    .attr("id", "dataLabel")
    .attr("class", "data")
    .attr("type", "text")
    .attr("disabled", "disabled")
    .attr("placeholder", "Data Label")
    .attr("maxlength", 30)
    .attr("class", "form-control")
    .style("margin", "10px 2px 5px 2px");
dataContents.append("input")
    .attr("id", "dataLabelBtn")
    .attr("class", "data")
    .attr("type", "button")
    .attr("value", "Update Label")
    .attr("disabled", "disabled")
    .attr("class", "btn btn-sm btn-default")
    .style("margin", "10px 2px 5px 2px")
    .on("click", function() {
    	 var newLabel = document.getElementById("dataLabel").value;
         
         //get the index of the old datalabel
         var nodeIndex = nodes.indexOf(openedNode);
         
         //update nodes array with the new label value
         nodes[nodeIndex].label = newLabel;
         
         // Update label
         d3.selectAll(".node").selectAll("text").transition().ease("linear").duration(1000)
             .text(function(d) { return d.label; });
         
         // Update tooltip
         d3.selectAll(".node").selectAll("circle").selectAll("title")
             .transition().ease("linear").duration(1000)
             .text(function(d) { return d.label; });
    });

// Set text input width dynamically
dataLabel.style("width", function () {
    var totalWidth = this.clientWidth;
    var labelBtnWidth = document.getElementById("dataLabelBtn").offsetWidth;
    return (totalWidth - labelBtnWidth - 7) + "px";
});

// Add relevance indicator
var dataRelevance = dataContents.append("form")
    .attr("class", "form-inline");

dataRelevance = dataRelevance.append("div")
    .attr("class", "form-group")
    .style("width", "100%");

dataRelevance.append("label")
    .attr("for", "dataRelevance")
    .attr("disabled", "disabled")
    .style("float", "left")
    .style("vertical-align", "middle")
    .style("margin", "15px 5px 5px 2px")
    .text("Relevance");

dataRelevance = dataRelevance.append("input")
    .attr("id", "dataRelevance")
    .attr("class", "data")
    .attr("type", "range")
    .attr("disabled", "disabled")
    .attr("min", 0)
    .attr("max", 1)
    .attr("value", 0)
    .attr("step", .01)
    .attr("class", "form-control")
    .style("margin", "10px 5px 5px 2px")
    .style("width", function() {
        var fullWidth = this.parentNode.clientWidth;
        var label = d3.select(this.parentNode).select("label");
        var labelWidth = label[0][0].clientWidth;
        var thisMargin = d3.select(this).style("margin-left");
        thisMargin = Number(thisMargin.substring(0, thisMargin.length - 2));
        var thisPadding = d3.select(this).style("padding-left");
        thisPadding = Number(thisPadding.substring(0, thisPadding.length - 2));
        return (fullWidth - labelWidth - thisPadding - thisMargin*2) + "px";
    })
    .on("change", function()  {
    	var newRelevance = this.value;
        socket.emit("update", {type: "change_relevance", id: openedNode.id, relevance: newRelevance});
    });

// Add data field
dataContents.append("textarea")
    .attr("id", "dataContent")
    .attr("class", "data")
    .attr("placeholder", "Data content")
    .attr("disabled", "disabled")
    .style("width", "100%")
    // Set height dynamically
    .style("height", function() {
        var totalHeight = this.parentElement.offsetHeight;
        var btnHeight = document.getElementById("dataLabelBtn").offsetHeight + 20;
        var heightInBtns = 4 * btnHeight;
        return ((totalHeight - heightInBtns)*0.7) + "px";
    });

// Add notes field
dataContents.append("textarea")
    .attr("id", "dataNotes")
    .attr("class", "data")
    .attr("placeholder", "Data notes")
    .attr("disabled", "disabled")
    .style("width", "100%")
    // Set height dynamically
    .style("height", function() {
        var totalHeight = this.parentElement.offsetHeight;
        var btnHeight = document.getElementById("dataLabelBtn").offsetHeight + 20;
        var heightInBtns = 4 * btnHeight;
        return ((totalHeight - heightInBtns)*0.3) + "px";
    });
dataContents.append("input")
    .attr("id", "dataNotesBtn")
    .attr("class", "data")
    .attr("type", "button")
    .attr("value", "Save Notes")
    .attr("disabled", "disabled")
    .attr("class", "btn btn-sm btn-default")
    .style("float", "right")
    .on("click", function() {
        // Save user notes
        var newNotes = document.getElementById("dataNotes").value;
        var nodeIndex = nodes.indexOf(openedNode);
        nodes[nodeIndex].notes = newNotes;
     
    });

dataContents.append("br");

// Add delete button
dataContents.append("input")
    .attr("id", "dataDelete")
    .attr("class", "data")
    .attr("type", "button")
    .attr("value", "Delete Node")
    .attr("disabled", "disabled")
    .attr("class", "btn btn-sm btn-danger")
    // Center button in div dynamically
    .style("margin", function() {
       var totalWidth = this.parentElement.offsetWidth;
       var sideMargin = (totalWidth - this.offsetWidth - 14)/2.0;
       return "0px " + sideMargin + "px";
    })
    .on("click", function() {
    	socket.emit("update", {"type": "delete", "id": openedNode.id});
    	
    	// Remove node from data array
        var nodeIndex = nodes.indexOf(openedNode);
        nodes.splice(nodeIndex, 1);
        openedNode = null;

        // Resest Document View info
        resetDataInfo();
        
        // Update layout
        updateLayout();
    });

// Function when force layout updates
// Updates points on screen and smoothly transitions them to their new location
force.on("tick", function() {
    node.attr("transform", function(d) { return "translate(" + d.X + "," + d.Y + ")"; })
        .classed("selected", function(d) { return d.selected; });
    force.stop();
});

function updateLayout() {
    // Give data to SVG
    node = node.data(nodes, function(d) {return d.id;});
    
    // Remove any documents that no longer exist
    node.exit().remove();
        
    // Create the group node who's transform servers as the position of the
    // node and have new nodes come in from (0, 0)
    var g = node.enter().append("g")
        .attr("class", "node")
        .classed("selected", function(d) { return d.selected; })
        .call(drag);
    
    // Add a circle for the point of the node
    g.append("circle")
        .attr("class", "point")
        .append("title").text(function(d) { return d.label; });
    
    // Add a label for the point to the right
    g.append("text")
        .attr("class", "text")
        .attr("dx", 10)
        .attr("dy", ".35em")
        .text(function(d) { return d.label; })
        .style("stroke", "gray");
    
    // Select/deselect node on click
//    g.on("click", function(d) {
//    	if (d.type !== "attribute") {
//            d.selected = d.moved || !d.selected;
//    	}
//    });
    
    // Show document label, relevance, contents, and notes on double click
    g.on("dblclick", function(d) {
        if (d.type !== "attribute") {
            if (openedNode !== null) {
                d3.select(".opened").classed("opened", false);
            }
            openedNode = d;
            this.setAttribute("class", this.getAttribute("class") + " opened");
            if (!d.content) {
                socket.emit("get", {"type": "raw", "id": d.id});
            }
            updateDataPanel();
        }
    });
    
    // Force layout running screws up the transition
    force.stop();
    
    // Transition the nodes to their new positions
    node.transition().ease("linear").duration(1000)
        .attrTween("transform", function(d, i, a) {
            return d3.interpolateTransform(a, "translate(" + d.X + "," + d.Y + ")");
        });
        
    // Transition each node to it's new size based on it's relevance
    d3.selectAll("circle").transition().ease("linear").duration(1000)
        .style("fill", function(d) { return sourceColorMappings[d.type]; })
        .attr("r", function(d) {
           return 5 + 5*d.relevance; 
        });
}

//update DataPanel based on user selecting
function updateDataPanel() {
    if (!openedNode) {
        return;
    }
	
    var dataLabel = document.getElementById("dataLabel");
    dataLabel.value = openedNode.label;
    dataLabel.removeAttribute("disabled");
    
    document.getElementById("dataLabelBtn").removeAttribute("disabled");
    
    var dataRelevance = document.getElementById("dataRelevance");
    dataRelevance.value = openedNode.relevance;
    dataRelevance.removeAttribute("disabled");
    
    var dataContent = document.getElementById("dataContent");
    if (openedNode.content) {
    	dataContent.value = openedNode.content;
        dataContent.scrollTop = 0;
    }

    var dataNotes = document.getElementById("dataNotes");
    dataNotes.value = openedNode.notes;
    dataNotes.removeAttribute("disabled");
    
    document.getElementById("dataNotesBtn").removeAttribute("disabled");
    
    document.getElementById("dataDelete").removeAttribute("disabled");
}


//update the nodes array(working set) by either updating the position of nodes/ add nodes / remove nodes
function update(data) {
    /* Update format:
     * points: [
     * 	{
     * 	id: <string>,
     * 	label: <string>,
     * 	pos: [],
     * 	selected: <boolean>,
     * 	relevance: <float [0, 1]>
     * }
     */
    if (data.points) {
        for (var i = 0; i < data.points.length; i++) {
            var point = data.points[i];
            var id = point.id;
            var pos = null;

            // Very inefficient, use a Map instead
            for (var j = 0; j < nodes.length; j++) {
                if (nodes[j].id === id) {
                    if (!point.relevance) {
                        point.relevance = nodes[j].relevance;
                    }
                    if (point.pos && point.relevance) {
                        pos = {};
                        // Each dimension is in [-1, 1];
                        pos = polarToCartesian(((1 - point.relevance) * 0.9 + .1) * height / 2, point.pos[0] * Math.PI * 5 / 6 - Math.PI / 2);
                    }

                    // Found node, update it
                    if (pos) {
                        // We got a new position, so update the position
                        nodes[j].X = pos.x;
                        nodes[j].Y = pos.y;
                    }
                    
                    // Update the relevance if we received it
                    if ("relevance" in point) {
                        nodes[j].relevance = point.relevance;
                    }
                    
                    // Update the selected status if we received it
                    if ("selected" in point) {
                        nodes[j].selected = point.selected;
                    }
                    
                    // Let the point be deselected
                    nodes[j].moved = false;
                    break;
                }
            }

            // If the point wasn't found, create and add it
            if (j === nodes.length) {
                if (point.pos && point.relevance) {
                    pos = {};
                    // Each dimension is in [-1, 1];
                    pos = polarToCartesian(((1 - point.relevance) * 0.9 + .1) * height / 2, point.pos[0] * Math.PI * 5 / 6 - Math.PI / 2);
                }

                var label = point.label || point.id;
                var newNode = {
                    id: point.id,
                    label: label,
                    type: point.type || "News",
                    selected: point.selected,
                    relevance: point.relevance || 0,
                    notes: ""
                };
                
                if (pos) {
                    newNode.X = pos.x;
                    newNode.Y = pos.y;
                }
                
                nodes.push(newNode);
            }
        }
    }
    updateLayout();
    updateDataPanel();
}


/*
 * Called when a node starts to be dragged
 */
function dragstart(d) {
    var old = d.selected;
 
    // Toggle the selected status, unless the node has been moved
    d.selected = !d.selected || (d3.event.sourceEvent.button === 0 && d.moved);
    if (d.selected != old) {
        // If the selected status has changed, broadcast it and update the
        // layout.
        socket.emit('action', {type: "select", state: d.selected, id: d.id});
        force.start();
    }
}


/*
 * Called when a point is dragged.
 */
function dragmove(d) {
    if (!d.selected) {
        // If the point wasn't selected, select it and broadcast it
        d.selected = true;
        socket.emit('action', {type: "select", state: d.selected, id: d.id});
        force.start();
    }
    
    var coord = cartesianToPolar(d.X + d3.event.dx, d.Y + d3.event.dy);
    coord.r /= (height / 2);
    coord.angleInRadians -= (Math.PI / 2);
    if (coord.angleInRadians < -Math.PI) {
        coord.angleInRadians += (2 * Math.PI);
    }
    
    if (Math.abs(coord.angleInRadians) > (Math.PI * 5 / 6)) {
        return;
    }

    // Make sure this point stays selected until the layout is updated
    d.moved = true;
    d.X += d3.event.dx;
    d.Y += d3.event.dy;
	
    // Broadcast the moved event
    socket.emit('action', {type: "move", pos: [coord.angleInRadians / (Math.PI * 5 / 6)], id: d.id});
}


// What to do when a dragged node is released
function dragend(d, i) {
/*	if (d.selected || d.moved)
	{ 
		d.selected= false;
		d.moved = false;
		socket.emit('action', {type: "select", state: d.selected, id: d.id});
		socket.emit('action', {type: "move", state: d.moved, id: d.id});
	}*/
	// Make sure the layout updates properly
    force.resume();
}


//searching for terms
function searchForTerm(term) {
    // Submit a text search update
    socket.emit('update', {type: "search", query: term});
}



var socket = io.connect({reconnection:false});

function createUISocketCallbacks() {
    socket.on('action', function(data) {
        if (data.type === "move") {
            /* Data format:
             * id: <string>,
             * pos: [] (each [0, 1])
             */

            var x = (data.pos[0] + 1) / 2 * width;
            var y = (-data.pos[1] + 1) / 2 * height;
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i].id === data.id) {
                    // Found node, update it
                    nodes[i].X = x;
                    nodes[i].Y = y;

                    break;
                }
            }
            force.start();
        }
        else if (data.type === "select") {
            /* Data format:
             * id: <string>,
             * state: <boolean>
             */
            for (var i=0; i < nodes.length; i++) {
                if (nodes[i].id === data.id) {
                    nodes[i].selected = data.state;
                }
            }
            force.start();
        }
    });


    /*function called in response to emit("update") from the server 
     * which reponses to search/delete/update/silder movement actions
     * it initially resets svg then update call update function to add nodes to nodes array and plot nodes on screen
     */
    socket.on('update', function(data) {
        resetDataInfo();
        update(data);
    });


    //this function is called when a node is double clicked to get data about it
    socket.on('get', function(data) {
        if (!data || !data.type) return;
        if (data.type === "raw") {
            for (var i=0; i < nodes.length; i++) {
                if (nodes[i].id === data.id) {
                    nodes[i].content = data.value;
                    break;
                }
            }
            updateDataPanel();
        }
    });


    // this function is called twice => after joining room or when user hits reset button
    socket.on('reset', function() {
        nodes.length = 0;
        resetDataInfo();
        updateLayout();
    });
}


// Join the default room for now.
// Set the fourth parameter to "cosmos" for the default data and visualization,
// or to "composite" to add in the composite matrix functionality for visualizating
// attributes.
//socket.emit('join', 'default', socket.id, "cosmos");


//disable all the notes(save/delete button) /relevence mode
// disable the DataPanel
function resetDataInfo() {
    if (openedNode) {
        d3.select(".opened").classed("opened", false);
    }

    openedNode = null;
	
    // Reset data info
    var dataLabel = document.getElementById("dataLabel");
    dataLabel.value = "";
    //dataLabel.removeAttribute("value");
    dataLabel.setAttribute("disabled", "disabled");

    document.getElementById("dataLabelBtn").setAttribute("disabled", "disabled");

    var dataRelevance = document.getElementById("dataRelevance");
    dataRelevance.value = 0;
    //dataRelevance.removeAttribute("value");
    dataRelevance.setAttribute("disabled", "disabled");

    var dataContent = document.getElementById("dataContent");
    dataContent.value = "";

    var dataNotes = document.getElementById("dataNotes");
    dataNotes.value = "";
    dataNotes.setAttribute("disabled", "disabled");

    document.getElementById("dataNotesBtn").setAttribute("disabled", "disabled");

    document.getElementById("dataDelete").setAttribute("disabled", "disabled");
}
