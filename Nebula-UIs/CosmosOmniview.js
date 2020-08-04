// Width and height of the SVG
var width;
var height;

// Data to use
var nodes = [];
var sourceColorMappings = {"Tweet":"deepskyblue", "News":"red", "attribute":"yellow"};
var openedNode;

// The name of the UI that is used by InitializeSession.js and nebula.js to
// join rooms/sessions and initialize the pipeline appropriately
var ui = "omniview";

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
        document.getElementById("searchText").value = "";
        searchForTerm(searchTerm);
    });

// Reset button that resets the whole pipeline
var resetButton = buttonDiv.append("input")
    .attr("type", "submit")
    .attr("value", "Reset")
    .attr("class", "btn btn-sm btn-default")
    .on("click", function() {
        // TODO: Reset data/layout
        // Stub: Working line commented out; reset to preset data and update layout
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
        // TODO: OLI update function; send only moved/selected points to backend?
        // Stub: Working line commented out; randomize node placement instead
        socket.emit("update", {type: "oli"});
        var i;
        for (i = 0; i < nodes.length; i++) {
            nodes[i].selected = false;
            nodes[i].moved = false;
        }
        resetDataInfo();
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
var node = svg.selectAll(".node");
updateLayout();

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
        var nodeIndex = nodes.indexOf(openedNode);
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
var dataRelevance = dataContents.append("input")
    .attr("id", "dataRelevance")
    .attr("class", "data")
    .attr("type", "text")
    .attr("disabled", "disabled")
    .attr("placeholder", "Document Relevance")
    .attr("maxlength", 10)
    .attr("class", "form-control")
    .style("margin", "10px 2px 5px 2px");
dataContents.append("input")
    .attr("id", "dataRelevanceBtn")
    .attr("class", "data")
    .attr("type", "button")
    .attr("value", "Update Relevance")
    .attr("disabled", "disabled")
    .attr("class", "btn btn-sm btn-default")
    .style("margin", "10px 2px 5px 2px")
    .on("click", function() {
        // Get and parse user input
        var newRelevanceStr = document.getElementById("dataRelevance").value;
        var newRelevance = parseFloat(newRelevanceStr);

        // Ensure user input is a valid number
        if (!isNaN(newRelevance) && !isNaN(Number(newRelevanceStr))) {

            // Ensure user input is between 0 and 1 (inclusive)
            if (newRelevance >= 0 && newRelevance <= 1) {
                var nodeIndex = nodes.indexOf(openedNode);
                //nodes[nodeIndex].relevance = newRelevance;
                socket.emit("update", {type: "change_relevance", id: openedNode.id, relevance: newRelevance});
                //updateLayout();
            }

            // If user input is not between 0 and 1, alert them and reset input
            else {
                alert("Relevance must be between 0 and 1 (inclusive)!");
                document.getElementById("dataRelevance").value = openedNode.relevance;
            }
        }

        // If user input is not a valid number, alert them and reset the input
        else {
            alert("Relevance must be a valid number!");
            document.getElementById("dataRelevance").value = openedNode.relevance;
        }
});

// Set text input width dynamically
dataRelevance.style("width", function () {
    var totalWidth = this.clientWidth;
    var relevanceBtnWidth = document.getElementById("dataRelevanceBtn").offsetWidth;
    return (totalWidth - relevanceBtnWidth - 7) + "px";
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
        .attr("r", 5)
        .append("title").text(function(d) { return d.label; });

    // Add a label for the point to the right
    g.append("text")
        .attr("class", "text")
        .attr("dx", 10)
        .attr("dy", ".35em")
        .text(function(d) { return d.label; })
        .style("stroke", "gray");

    // Select/deselect node on click
    g.on("click", function(d) {
    	if (d.type !== "attribute") {
    		d.selected = d.moved || !d.selected;
    	}
    });

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
        .style("fill", function(d) { console.log(d);return d.col; })
        .attr("r", function(d) { return 5 + 5*d.relevance; });

}

function updateDataPanel() {
	if (!openedNode)
		return;

	var dataLabel = document.getElementById("dataLabel");
    dataLabel.value = openedNode.label;
    dataLabel.removeAttribute("disabled");

    document.getElementById("dataLabelBtn").removeAttribute("disabled");

    var dataRelevance = document.getElementById("dataRelevance");
    dataRelevance.value = openedNode.relevance;
    dataRelevance.removeAttribute("disabled");

    document.getElementById("dataRelevanceBtn").removeAttribute("disabled");

	var dataContent = document.getElementById("dataContent");
    if (openedNode.content) {
    	dataContent.value = openedNode.content;
    }

    var dataNotes = document.getElementById("dataNotes");
    dataNotes.value = openedNode.notes;
    dataNotes.removeAttribute("disabled");

    document.getElementById("dataNotesBtn").removeAttribute("disabled");

    document.getElementById("dataDelete").removeAttribute("disabled");

}

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
	console.log(data);
	if (data.points) {
		for (var i = 0; i < data.points.length; i++) {
			var point = data.points[i];
	        var id = point.id;
	        var pos = null;
	        if (point.pos) {
	        	pos = {};
	        	width = svg.style("width").replace("px", "");
	        	height = svg.style("height").replace("px", "");
	        	// Each dimension is in [-1, 1];
                    //
                console.log('point.pos:')
                console.log(point.pos)
		        pos.x = ((point.pos[0] + 1) / 2 * width * 0.9) + width / 20;
		        pos.y = ((-point.pos[1] + 1) / 2 * height * 0.9) + height / 20;
	        }

	        // Very inefficient, use a Map instead
			for (var j = 0; j < nodes.length; j++) {
				if (nodes[j].id === id) {
					// Found node, update it
					if (pos) {
						// We got a new position, so update the position
						nodes[j].X = pos.x;
						nodes[j].Y = pos.y;
					}
					// Update the relevance if we received it
					if (point.relevance) {
		            	nodes[j].relevance = point.relevance;
		            }
					// Update the selected status if we received it
					if (point.selected) {
						nodes[j].selected = point.selected;
					}
                    // Update the color
                    if (point.col) {
                        nodes[j].col = point.col;
                    }
					// Let the point be deselected
					nodes[j].moved = false;
					break;
				}
			}

			// If the point wasn't found, create and add it
	        if (j === nodes.length) {
            var label = point.label || point.displayTitle;
	    var ast = '*';
	    //if (point.id >= 50) {
	    //	label = point.id
	    //}
            if (point.id < 50) {
                label = ast.concat(label)
            }
          var noise = getGaussRand();
        	var newNode = {
	        		id: point.id,
	        		label: label,
	        		type: point.type || "News",
	        		X: pos.x+(noise.x*15),
	        		Y: pos.y+(noise.y*15),
                    col: point.col,
	        		selected: point.selected,
	        		relevance: point.relevance || 0,
	        		notes: ""
	        	};
	        	nodes.push(newNode);
	        }
		}

		// Remove any points not in the update
		for (var i = 0; i < nodes.length; i++) {
			var id = nodes[i].id;

			// See if this point was in the update
			for (var j = 0; j < data.points.length; j++) {
				if (data.points[j].id === id) {
					break;
				}
			}

			if (j === data.points.length) {
				// This point wasn't in the update, so remove it
				nodes.splice(i, 1);
			}
		}
	}
	if (data.similarity_weights) {
	}
	updateLayout();
	updateDataPanel();

    //update the word cloud
    if (data.cloud) {
        d3.select('#wordcloud').remove();
        d3.select('#wordcloud').remove();
        var topicCloud = wordCloud('body', 'regular_size');
        showNewWords(topicCloud, []);
        showNewWords(topicCloud, data.cloud);
        var diffCloud = wordCloud('body', 'diff_size');
        showNewWords(diffCloud, []);
        showNewWords(diffCloud, data.cloud);
    }
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
	// Make sure this point stays selected until the layout is updated
	d.moved = true;
	d.X += d3.event.dx;
    d.Y += d3.event.dy;
	// Broadcast the moved event
	socket.emit('action', {type: "move", pos: [d.X / width * 2 - 1, -(d.Y / height * 2 - 1)], id: d.id});
}

// What to do when a dragged node is released
function dragend(d, i) {
    // Make sure the layout updates properly
    force.resume();
}

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
                    console.log("Changing position to (" + data.pos[0] + "," + data.pos[1] + ")");
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

    socket.on('update', function(data) {
            resetDataInfo();
            update(data);
    });

    socket.on('get', function(data) {
            console.log(data);
            if (!data || !data.type) return;
            if (data.type === "raw") {
                    for (var i=0; i < nodes.length; i++) {
                            if (nodes[i].id === data.id) {
                                    nodes[i].content = data.value;
                                    console.log("Setting content to " + data.value);
                                    break;
                            }
                    }
                    updateDataPanel();
            }
    });

    socket.on('reset', function() {
            console.log('Reseting!');
            nodes.length = 0;
            resetDataInfo();
            updateLayout();
    });
}

// Join the default room for now.
// Set the fourth parameter to "cosmos" for the default data and visualization,
// or to "composite" to add in the composite matrix functionality for visualizating
// attributes.
//socket.emit('join', 'elasticsearch', socket.id, "elasticsearch");

function resetDataInfo() {
	if (openedNode)
		d3.select(".opened").classed("opened", false);

	openedNode = null;

    // Reset data info
    var dataLabel = document.getElementById("dataLabel");
    dataLabel.value = "";
    //dataLabel.removeAttribute("value");
    dataLabel.setAttribute("disabled", "disabled");

    document.getElementById("dataLabelBtn").setAttribute("disabled", "disabled");

    var dataRelevance = document.getElementById("dataRelevance");
    dataRelevance.value = "";
    //dataRelevance.removeAttribute("value");
    dataRelevance.setAttribute("disabled", "disabled");

    document.getElementById("dataRelevanceBtn").setAttribute("disabled", "disabled");

    var dataContent = document.getElementById("dataContent");
    dataContent.value = "";

    var dataNotes = document.getElementById("dataNotes");
    dataNotes.value = "";
    dataNotes.setAttribute("disabled", "disabled");

    document.getElementById("dataNotesBtn").setAttribute("disabled", "disabled");

    document.getElementById("dataDelete").setAttribute("disabled", "disabled");
}

//Pulls two random numbers from a Normal Dist (mean 0, std 1)
//Box-Muller, adapted from Knuth
function getGaussRand()
{
	do {
   	x = 2.0 * Math.random() - 1.0;
   	y = 2.0 * Math.random() - 1.0;
   	z = x*x + y*y;
        } while ( z >= 1.0 );

        z = Math.sqrt(( -2.0 * Math.log(z)) / z);
        xr = x * z;
        yr = y * z;
        return {
		        x:xr,
           	y:yr
        };
}

// Encapsulate the word cloud functionality
function wordCloud(selector, wc_type) {

    var fill = d3.scale.category20();

    //Construct the word cloud's SVG element
    var svg = d3.select(selector).append("svg")
        .attr("width", 500)
        .attr("height", 500)
        .attr("id", "wordcloud")
        .append("g")
        .attr("transform", "translate(250,250)");


    //Draw the word cloud
    function draw(words) {
        var cloud = svg.selectAll("g text")
                        .data(words, function(d) { return d.id; })

        //Entering words
        cloud.enter()
            .append("text")
            .style("font-family", "Impact")
            .style("fill", function(d, i) { return d.color; })
            .attr("text-anchor", "middle")
            .attr('font-size', 1)
            .on('click', function(d, i) {searchForTerm(d.text);})
            .text(function(d) { return d.text; });

        //Entering and existing words
        cloud
            .transition()
                .duration(600)
                .style("font-size", function(d) { return d.size + "px"; })
                .attr("transform", function(d) {
                    return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                })
                .style("fill-opacity", 1);

        //Exiting words
        cloud.exit()
            .transition()
                .duration(200)
                .style('fill-opacity', 1e-6)
                .attr('font-size', 1)
                .remove();
    }


    //Use the module pattern to encapsulate the visualisation code. We'll
    // expose only the parts that need to be public.
    return {

        //Recompute the word cloud for a new set of words. This method will
        // asycnhronously call draw when the layout has been computed.
        //The outside world will need to call this function, so make it part
        // of the wordCloud return value.
        update: function(words) {
            d3.layout.cloud().size([500, 500])
                .words(words)
                .padding(5)
                .rotate(function() { return ~~(Math.random() * 2) * 90; })
                .font("Impact")
                .fontSize(function(d) { if (wc_type === 'regular_size') {
                    return d.regular_size;
                } else if (wc_type === 'diff_size') {
                    return d.diff_size;
                } else {
                    console.log('Invalid Size Argument in word cloud formation')
                }; })
                .on("end", draw)
                .start();
        }
    }

}

//This method tells the word cloud to redraw with a new set of words.
function showNewWords(vis, new_words) {
    vis.update(new_words)
}

//Create the word clouds
var topicCloud = wordCloud('body', 'regular_size');
var diffCloud = wordCloud('body', 'diff_size');
