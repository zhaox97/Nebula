// Width and height of the SVG
var width;
var height;

// Data to use
var sourceColorMappings = {"observation-data":"purple", "attribute-data": "deepskyblue"};
var openedNode;
var observationData = { forceLayout: null, svg: null, node: null, nodes: [], onDrag: null };
var attributeData = { forceLayout: null, svg: null, node: null, nodes: [], onDrag: null };

// Which version of TwoView to use
var prototype = 2;

// A variable to help track when a node has just been moved
var justMovedNode = false;

// A variable to help track what should be done upon receiving data from a "get" message
var savedGetResponseFunction;

// Buttons and search box div
var buttonRowDiv = d3.select("body").append("div").attr("class", "container-fluid");
var buttonDiv = buttonRowDiv.append("div").attr("class", "col-md-12");

if (ui === "centaurus") {
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
}

// Reset button that resets the whole pipeline
var resetButton = buttonDiv.append("input")
    .attr("type", "submit")
    .attr("value", "Reset")
    .attr("class", "btn btn-sm btn-default")
    .on("click", function() {
        socket.emit("reset");
    });

// Create a div for the SVGs
d3.select("body").append("br");
var svgRow = d3.select("body").append("div").attr("class", "container-fluid");

// Helper function to create the "Deselect Nodes" buttons
function addDeselectNodesButton(location, isObservation) {
    location.append("input")
        .attr("type", "button")
        .attr("value", "Deselect Nodes")
        .attr("class", "btn btn-sm btn-default deselectNodeBtn")
        .style("margin-bottom", "10px")
        .on("click", function() {

            // Deselect all nodes in specified SVG
            var buttonSVG = "#objSVGDiv";
            if (!isObservation) {
                buttonSVG = "#attrSVGDiv";
            }
            var selectedNodes = d3.selectAll(buttonSVG + " .node.selected");
            if (selectedNodes[0].length > 0) {
                selectedNodes.each(function(d) {
                        socket.emit('action', {type: "select", state: false, id: d.id}, isObservation);
                        d.selected = false;
                    });
                selectedNodes.classed("selected", false);
                updateLayout(isObservation);
            }
        });
}

// A helper function to create a check box to denote how much feedback should
// happen as part of the interaction
function createFeedbackCheckBox(location, isObservation) {
    var className = isObservation+"-feedback-check";
    location.append("input")
        .attr("type", "checkbox")
        .attr("class", className)
        .attr("checked", true)
        .style("margin", "0 10px 0 20px")
        .on("click", function() {
            var checked = this.checked;
            $("input."+isObservation+"-feedback-check").prop("checked", checked);
        });
    return label = location.append("p")
        .style("margin-top", "7px");
}

// A helper function to create a check box to denote whether SI foraging should
// happen as part of the interaction
function createForageCheckBox(location, isObservation) {
    var className = isObservation+"-forage-check";
    location.append("input")
        .attr("type", "checkbox")
        .attr("class", className)
        .attr("checked", true)
        .style("margin", "0 10px 0 20px")
        .on("click", function() {
            var checked = this.checked;
            $("input."+isObservation+"-forage-check").prop("checked", checked);
        });
    return label = location.append("p")
        .style("margin-top", "7px");
}

// Add place to put data contents when a node is double clicked
var dataRow = d3.select("body").append("div").attr("class", "container-fluid");
var dataContents = dataRow.append("div")
    .attr("class", "col-md-12")
    .attr("id", "dataContents")
    .style("height", height + "px")
    .style("min-height", "270px")
    .style("width", function () {
        return (this.parentNode.clientWidth - 60) + "px";
    })
    .style("margin", "0px 30px 0px 15px");

//// Create interaction feedback check boxes
//var checkLabelWidth = "365px";
//var feedbackCheckBoxesDiv = dataContents.append("div");
//var obsFeedbackCheckLabel = createFeedbackCheckBox(feedbackCheckBoxesDiv.append("div")
//        .style("float", "left")
//        .style("width", checkLabelWidth),
//    true);
//obsFeedbackCheckLabel.append("tspan").text("Provide ");
//obsFeedbackCheckLabel.append("tspan").style("font-weight", "bold").text("Observation");
//obsFeedbackCheckLabel.append("tspan").style("font-weight", "bold").text(" Feedback");
//obsFeedbackCheckLabel.append("tspan").text(" After Interaction");
//var attrFeedbackCheckLabel = createFeedbackCheckBox(feedbackCheckBoxesDiv.append("div")
//        .style("float", "left")
//        .style("width", checkLabelWidth),
//    false);
//attrFeedbackCheckLabel.append("tspan").text("Provide ");
//attrFeedbackCheckLabel.append("tspan").style("font-weight", "bold").text("Attribute");
//attrFeedbackCheckLabel.append("tspan").style("font-weight", "bold").text(" Feedback");
//attrFeedbackCheckLabel.append("tspan").text(" After Interaction");
//
//// Create SI forage check boxes
//dataContents.append("br");
//var forageCheckBoxesDiv = dataContents.append("div").style("float", "none");
//var obsForageCheckLabel = createForageCheckBox(forageCheckBoxesDiv.append("div")
//        .style("float", "left")
//        .style("width", checkLabelWidth),
//    true);
//obsForageCheckLabel.append("tspan").text("Enable ");
//obsForageCheckLabel.append("tspan").style("font-weight", "bold").text("Foraging");
//obsForageCheckLabel.append("tspan").text(" on ");
//obsForageCheckLabel.append("tspan").style("font-weight", "bold").text("Observations");
//obsForageCheckLabel.append("tspan").text(" After Interaction");
//var attrForageCheckLabel = createForageCheckBox(forageCheckBoxesDiv.append("div")
//        .style("float", "left")
//        .style("width", checkLabelWidth),
//    false);
//attrForageCheckLabel.append("tspan").text("Enable ");
//attrForageCheckLabel.append("tspan").style("font-weight", "bold").text("Foraging");
//attrForageCheckLabel.append("tspan").text(" on ");
//attrForageCheckLabel.append("tspan").style("font-weight", "bold").text("Attributes");
//attrForageCheckLabel.append("tspan").text(" After Interaction");

// Add relevance slider
var dataRelevance = dataContents.append("form")
    .attr("class", "form-inline");

dataRelevance = dataRelevance.append("div")
    .attr("class", "form-group")
    .style("width", "100%");

dataRelevance.append("label")
    .attr("id", "relevanceLabel")
    .attr("for", "dataRelevance")
    .attr("disabled", "disabled")
    .style("float", "left")
    .style("vertical-align", "middle")
    .style("margin", "15px 2px 5px 2px")
    .text("Importance");

dataRelevance = dataRelevance.append("input")
    .attr("id", "dataRelevance")
    .attr("type", "range")
    .attr("disabled", "disabled")
    .attr("min", 0)
    .attr("max", 1)
    .attr("value", 0)
    .attr("step", .01)
    .attr("class", "form-control data")
    .style("width", function () {
        var totalWidth = this.parentNode.clientWidth;
        var labelWidth = document.getElementById("relevanceLabel").offsetWidth;
        return (totalWidth - labelWidth - 10) + "px";
    })
    .style("margin", "10px 2px 5px 2px")
    .on("change", function() {
        var newRelevance = this.value;
        var isObservation = true;
        if (observationData.nodes.indexOf(openedNode) < 0) {
           isObservation = false;
        }
        
        // Capture whether observation feedback and/or attribute feedback should
        // be enabled
        var obsFeedback = $("input.true-feedback-check").prop("checked");
        var attrFeedback = $("input.false-feedback-check").prop("checked");
        
        // Capture whether observation foraging and/or attribute foraging should
        // be enabled
        var obsForage = $("input.true-forage-check").prop("checked");
        var attrForage = $("input.false-forage-check").prop("checked");
        
        socket.emit("update", {type: "change_relevance", id: openedNode.id, relevance: newRelevance, view: isObservation, prototype: prototype, obsFeedback: obsFeedback, attrFeedback: attrFeedback, obsForage: obsForage, attrForage: attrForage});
    });

// Add data field
var mainDataDiv = dataContents.append("div")
    .attr("class", "data container-fluid")
    .style("padding", "0px");
    
mainDataDiv.append("textarea")
    .attr("id", "dataContent")
    .attr("placeholder", "Details")
    .attr("disabled", "disabled")
    .style("width", function() {
        var parentWidth = this.parentNode.clientWidth;
        return (parentWidth * 0.6 - 5) + "px";
    })
    .style("height", function() {
        return "250px";
    });

// Add notes field
mainDataDiv.append("textarea")
    .attr("id", "dataNotes")
    .attr("placeholder", "Data notes")
    .attr("disabled", "disabled")
    .style("margin-left", "10px")
    .style("width", function() {
        var parentWidth = this.parentNode.clientWidth;
        return (parentWidth * 0.4 - 5) + "px";
    })
    .style("height", function() {
        // Set height equal to the Data Context rext area
        return d3.select("#dataContent").style("height");
    });
dataContents.append("input")
    .attr("id", "closeNodeBtn")
    .attr("type", "button")
    .attr("value", "Close Node")
    .attr("disabled", "disabled")
    .attr("class", "btn btn-sm btn-default data")
    .style("float", "left")
    .on("click", function() {
            // "Close" the opened node
            d3.selectAll(".node.opened").classed("opened", false);

            // Reset the savedGetResponseFunction
            savedGetResponseFunction = null;

            // Update the proper layout to change the nodes back to their original
            // appearance
            var isObservation = true;
            if (openedNode.type == "attribute") {
                isObservation = false;
            }
            openedNode = null;
            updateLayout(!isObservation);

            // Clear the data panel and disable all text areas and buttons
            resetDataInfo();
        });

dataContents.append("input")
    .attr("id", "dataNotesBtn")
    .attr("type", "button")
    .attr("value", "Save Notes")
    .attr("disabled", "disabled")
    .attr("class", "btn btn-sm btn-default data")
    .style("float", "right")
    .style("margin-bottom", "10px")
    .on("click", function() {
        // Save user notes in the proper data object
        var newNotes = document.getElementById("dataNotes").value;
        var nodeIndex = observationData.nodes.indexOf(openedNode);
        if (observationData.nodes.indexOf(openedNode) >= 0) {
           observationData.nodes[nodeIndex].notes = newNotes;
        }
        else {
            nodeIndex = attributeData.nodes.indexOf(openedNode);
            attributeData.nodes[nodeIndex].notes = newNotes;
        }
    });

dataContents.append("br");

// Add data label
var dataLabel = dataContents.append("input")
    .attr("id", "dataLabel")
    .attr("type", "text")
    .attr("disabled", "disabled")
    .attr("placeholder", "Data Label")
    .attr("maxlength", 30)
    .attr("class", "form-control data")
    .style("margin", "10px 2px 5px 2px");
dataContents.append("input")
    .attr("id", "dataLabelBtn")
    .attr("type", "button")
    .attr("value", "Update Label")
    .attr("disabled", "disabled")
    .attr("class", "btn btn-sm btn-default data")
    .style("margin", "10px 0px 5px 4px")
    .on("click", function() {
        var newLabel = document.getElementById("dataLabel").value;
        var nodeIndex = observationData.nodes.indexOf(openedNode);
        
        // Grab the proper SVG in which the label will be updated and update the
        // nodes data with the new label
        var svg;
        if (nodeIndex >= 0) {
           observationData.nodes[nodeIndex].label = newLabel;
           svg = observationData.svg;
        }
        else {
            nodeIndex = attributeData.nodes.indexOf(openedNode);
            attributeData.nodes[nodeIndex].label = newLabel;
            svg = attributeData.svg;
        }

        // Update label
        svg.selectAll(".node").selectAll("text").transition().ease("linear").duration(1000)
            .text(function(d) { return d.label; });

        // Update tooltip
        svg.selectAll(".node").selectAll("circle").selectAll("title")
            .transition().ease("linear").duration(1000)
            .text(function(d) { return d.label; });
    });

// Set text input width dynamically
dataLabel.style("width", function () {
    var totalWidth = this.clientWidth;
    var labelBtnWidth = document.getElementById("dataLabelBtn").offsetWidth;
    return (totalWidth - labelBtnWidth - 7) + "px";
});

var nodeActionsDiv = dataContents.append("div")
    .attr("class", "container-fluid")
    .style("padding", "70px 0px 10px");

if (ui === "centaurus") {
    // Add delete button
    nodeActionsDiv.append("input")
        .attr("id", "dataDelete")
        .attr("type", "button")
        .attr("value", "Delete Node")
        .attr("disabled", "disabled")
        .attr("class", "btn btn-sm btn-danger data")
        .style("margin", "0px 40px")
        .style("float", "left")
        .on("click", function() {

            // Determine whether the node originated from the observation view/panel
            // or the attribute view/panel
            var isObservation = true;
            if (observationData.nodes.indexOf(openedNode) < 0) {
                isObservation = false;
            }

            // Capture whether observation feedback and/or attribute feedback should
            // be enabled
            var obsFeedback = $("input.true-feedback-check").prop("checked");
            var attrFeedback = $("input.false-feedback-check").prop("checked");

            // Tell the pipeline that this node is being removed from the UI
            socket.emit("update", {"type": "delete", "id": openedNode.id, prototype: prototype, view: isObservation, obsFeedback: obsFeedback, attrFeedback: attrFeedback});

            // Remove node from proper data array
            if (isObservation) {
               var nodeIndex = observationData.nodes.indexOf(openedNode);
               observationData.nodes.splice(nodeIndex, 1);
            }
            else {
                var nodeIndex = attributeData.nodes.indexOf(openedNode);
                attributeData.nodes.splice(nodeIndex, 1);
            }
            openedNode = null;

            // Resest Document View info
            resetDataInfo();

            // Update both layouts
            updateLayout(true);
            updateLayout(false);
        });
    }

// Initialize SVGs
var objSvgCol = svgRow.append("div").attr("class", "col-md-6")
    .attr("id", "objSVGDiv")
    .style("padding", "0px");
var isObservation = true;
createAndromedaSVG(objSvgCol, isObservation);

var attrSvgCol = svgRow.append("div").attr("class", "col-md-6")
    .attr("id", "attrSVGDiv")
    .style("padding", "0px");
isObservation = false;
createAndromedaSVG(attrSvgCol, isObservation);

function createAndromedaSVG(location, isObservation) {
    // Initialize variables that need to be copied to the right data object
    var svg;
    var force;
    var drag;
    var nodes = [];
   
    // Initialize the SVG
    svg = location.append("div").attr("class", "container-fluid").append("svg")
        // Set SVG width to 100% of column width
        .style("width", "100%")
        // Set SVG height to equal column width
        .style("height", function() {
            if (!height) {
                var paddingRight = Number(d3.select(this.parentNode).style("padding-right").replace("px", ""));
                var paddingLeft = Number(d3.select(this.parentNode).style("padding-left").replace("px", ""));
                width = this.parentNode.clientWidth - paddingRight - paddingLeft;
                height = width;
            }
            return height;
        })
        .on("contextmenu", function() {
            d3.event.preventDefault();
        });
    
    // Initialize force layout
    force = d3.layout.force()
        .gravity(0)
        .friction(0)
        .charge(0)
        .nodes(nodes);

    // Catch the drag events
    var dragstart = dragStartWrapper(isObservation);
    var dragmove = dragMoveWrapper(isObservation);
    var dragend = dragEndWrapper(isObservation);
    drag = force.drag()
        .on("dragstart", dragstart)
        .on("drag", dragmove)
        .on("dragend", dragend);

    // Initialize the node varable
    var node = svg.selectAll(".node");
    
    // Give all created data to the appropriate data object
    if (isObservation) {
        observationData.svg = svg;
        observationData.forceLayout = force;
        observationData.onDrag = drag;
        observationData.nodes = nodes;
        observationData.node = node;        
    }
    else {
        attributeData.svg = svg;
        attributeData.forceLayout = force;
        attributeData.onDrag = drag;
        attributeData.nodes = nodes;
        attributeData.node = node;
    }

    // Update the layout
    updateLayout(isObservation);

    // Initialize force layout actions

    // Function when force layout updates
    // Updates points on screen and smoothly transitions them to their new location
    force.on("tick", function() {
        // Change the node data for the proper data object
        if (isObservation) {
            observationData.node.attr("transform", function(d) { return "translate(" + d.X + "," + d.Y + ")"; })
                .classed("selected", function(d) { return d.selected; });
        }
        else {
            attributeData.node.attr("transform", function(d) { return "translate(" + d.X + "," + d.Y + ")"; })
                .classed("selected", function(d) { return d.selected; });
        }
        
        force.stop();
    });
     
     
    // Update initiates an OLI update
    var interactionDiv = location.append("div")
        .attr("class", "container-fluid")
        .style("margin", "10px 0px");
    var updateButton = interactionDiv.append("input")
        .attr("type", "submit")
        .attr("value", "Update Layout")
        .attr("class", "btn btn-sm btn-default")
        .on("click", function() {
            // This code ensures that at least 3 nodes are selected in the proper
            // view before allowing a message to be sent to nebula.js
            var numNodesSelected = 0;
            if(isObservation) {
     	      for (i = 0; i < observationData.nodes.length; i++) {
     		if(observationData.nodes[i].selected == true) {
                    numNodesSelected++;
                }
     	      }
     	    }
            else {
     	      for (i = 0; i < attributeData.nodes.length; i++) {
     		if(attributeData.nodes[i].selected == true) {
                    numNodesSelected++;
                }
     	      }
     	    }
            
            // Only do something if at least 3 nodes are selected
            if (numNodesSelected >= 3) {
                
                // Capture whether observation feedback and/or attribute feedback
                // should be enabled
                var obsFeedback = $("input.true-feedback-check").prop("checked");
                var attrFeedback = $("input.false-feedback-check").prop("checked");
                
                // Capture whether observation foraging and/or attribute foraging
                // should be enabled
                var obsForage = $("input.true-forage-check").prop("checked");
                var attrForage = $("input.false-forage-check").prop("checked");
                
                socket.emit("update", {type: "oli"}, isObservation, prototype, obsFeedback, attrFeedback, obsForage, attrForage);
      
                // Deselect and dehighlight all points on both UIs
                var i;
                for (i = 0; i < observationData.nodes.length; i++) {
                    observationData.nodes[i].selected = false;
                    observationData.nodes[i].moved = false;

                    socket.emit('action', {type: "select", state: observationData.nodes[i].selected, id: observationData.nodes[i].id}, true);
                }

                for (i = 0; i < attributeData.nodes.length; i++) {
                    attributeData.nodes[i].selected = false;
                    attributeData.nodes[i].moved = false;

                    socket.emit('action', {type: "select", state: attributeData.nodes[i].selected, id: attributeData.nodes[i].id}, false);
                }
                force.start();
                resetDataInfo();
            }
        });
        
    addDeselectNodesButton(interactionDiv, isObservation);
    
    // Create the check boxes
    createFeedbackCheckBox(interactionDiv, isObservation)
        .text("Provide Feedback After Interaction");
    if (ui === "centaurus") {
        createForageCheckBox(interactionDiv, isObservation)
            .text("Enable Foraging After Interaction").style("float", "left");
    }
}

function updateLayout(isObservation) {

    // Get data from the appropriate data object
    var node;
    var nodes;
    var drag;
    var svg;
    var force;
    if (isObservation) 
    {
        node = observationData.node;
        nodes = observationData.nodes;
        drag = observationData.onDrag;
        svg = observationData.svg;
        force = observationData.forceLayout;
    }
    else {
        node = attributeData.node;
        nodes = attributeData.nodes;
        drag = attributeData.onDrag;
        svg = attributeData.svg;
        force = attributeData.forceLayout;
    }
    
    // Give data to proper SVG
    node = node.data(nodes, function(d) {return d.id;});

    // Remove any documents that no longer exist
    node.exit().remove();

    // Create the group node who's transform servers as the position of the
    // node and have new nodes come in from (0, 0)
    var g = node.enter().append("g")
        .attr("class", function() {
            var nodeClass = "node " + isObservation;
            if (ui === "centaurus") {
                nodeClass += " new unopened";
            }
            return nodeClass;
        })
        .classed("selected", function(d) { return d.selected; })
        .call(drag);

    // Add a circle for the point of the node
    g.append("circle")
        .attr("class", "point")
        .attr("r", 5);
    
    // Add a tooltip for the node
    g.append("title").text(function(d) { return d.label; });

    // Add a label for the point to the right
    g.append("text")
        .attr("class", "text")
        .attr("dx", 10)
        .attr("dy", ".35em")
        .text(function(d) {
            if (d.label.length <= 30) {
                return d.label;
            }
            else {
                return d.label.substring(0, 27) + "...";
            }
        })
        .style("stroke", "gray");

    // Select/deselect node on click
    g.on("click", function(d) {
        if (d.type !== "attribute-v") {
            // If we just moved a node, prevent a "click" action from being
            // registered. (2 click actions are registered for every drag.)
            if (!justMovedNode) {
                d.selected = !d.selected;
                socket.emit('action', {type: "select", state: d.selected, id: d.id}, isObservation);
            }
            else {
                justMovedNode = false;
            }
        }
    });

    // Show document label, relevance, contents, and notes on double click
    g.on("dblclick", function(d) {
        if (d.type !== "attribute-v") {
            
            if (openedNode !== null) {
                d3.selectAll(".node.opened").classed("opened", false);
            }
            var shouldUpdateOwnSVG = false;
            if (openedNode && openedNode.type != d.type) {
                shouldUpdateOwnSVG = true;
            }
            openedNode = d;
            this.setAttribute("class", this.getAttribute("class") + " opened");
            d3.select(this).classed("opened", true)
                .classed("unopened", false);
            d3.select(this).select("circle").style("stroke", null)
                .style("stroke-width", null);
            
            savedGetResponseFunction = getResponseFunction(isObservation, shouldUpdateOwnSVG);
            
            if (!d.content) {
                socket.emit("get", {"type": "raw", "id": d.id}, isObservation);
            }
            else {
                updateDataPanel();
            }
            
            if (!d.values) {
                socket.emit("get", {"type": "attributes", "id": d.id}, isObservation);
            }
            else {
                updateLayout(!isObservation);

                if (shouldUpdateOwnSVG) {
                    updateLayout(isObservation);
                }
            }
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
    // The g element's data must be used instead of the circle since the circle's
    // data binding is based on whatever the original data given to it on creation
    // and is not updated by D3
    svg.selectAll("circle").transition().ease("linear").duration(1000)
        .attr("r", function(d) { return 8 + 15 * d.relevance; })
        .attr("opacity", function(d) {
            var relevance = d.relevance;
            var opacityRange = 0.6;
            return opacityRange*Math.log((relevance+0.1)/0.1)/Math.log(1.1/0.1) + (1-opacityRange/1.25) - 0.2;
        })
        .style("stroke", function(d) {
            if (openedNode && ((openedNode.type == "observation" && svg[0][0].parentNode.parentNode.id == "attrSVGDiv") ||
                   (openedNode.type == "attribute" && svg[0][0].parentNode.parentNode.id == "objSVGDiv"))) {            
                return sourceColorMappings[d.type + "-data"];
            }
            else {
                return null;
            }
        })
        .style("stroke-width", function(d) {
            if (openedNode && ((openedNode.type == "observation" && svg[0][0].parentNode.parentNode.id == "attrSVGDiv") ||
                   (openedNode.type == "attribute" && svg[0][0].parentNode.parentNode.id == "objSVGDiv"))) {            
                return 10 * openedNode.values[d.id];
            }
            else {
                return null;
            }
        });

    // Copy changes to the data to the appropriate data object
    if (isObservation) {
        observationData.node = node;
        observationData.nodes = nodes;
        observationData.svg = svg;
    }
    else {
        attributeData.node = node;
        attributeData.nodes = nodes;
        attributeData.svg = svg;
    }
}

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
        
        // Parse the node's content unless we have raw text data to show
        var nodeContent = openedNode.content;
        if (typeof(nodeContent) === "object") {
            var keys = Object.keys(openedNode.content).sort();
            var nodeContent = "Normalized Data:\n\n";
            for (i = 0; i < keys.length; i++) {
                nodeContent += keys[i] + ":\t\t" + openedNode.content[keys[i]] +"\n";
            }
        }
        dataContent.value = nodeContent;
        dataContent.scrollTop = 0;
    }
    
    document.getElementById("closeNodeBtn").removeAttribute("disabled");

    var dataNotes = document.getElementById("dataNotes");
    dataNotes.value = openedNode.notes;
    dataNotes.removeAttribute("disabled");

    document.getElementById("dataNotesBtn").removeAttribute("disabled");

    if (ui === "centaurus") {
        document.getElementById("dataDelete").removeAttribute("disabled");
    }

}

function update(data, isObservation) {
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
    
    // Grab the proper data from the right data object and remove the "new"
    // class from all nodes
    var nodes;
    if (isObservation) {
        nodes = observationData.nodes;
        if (ui === "centaurus") {
            d3.select("#objSVGDiv").selectAll("g.node.new").classed("new", false);
        }
    }
    else {
        nodes = attributeData.nodes;
        if (ui === "centaurus") {
            d3.select("#attrSVGDiv").selectAll("g.node.new").classed("new", false);
        }
    }
    
    if (data.points) {
        for (var i = 0; i < data.points.length; i++) {
            var point = data.points[i];
            var id = point.id;
            var pos = null;
            if (point.pos) {
                pos = {};
                var w = Number(observationData.svg.style("width").replace("px", ""));
                var h = Number(observationData.svg.style("height").replace("px", ""));

                // Each dimension is in [-1, 1]. We need to translate
                // this into x and y coordinates to map the points into
                // the svg. Additionally, we should make sure that we
                // project into a square area so that we don't
                // distort the projection by stretching it in any
                // direction
                // We start by determining whether the width or height
                // of the svg is smaller to start making our square
                var size;
                var xShift;
                var yshift;
                if (w < h) {
                    size = w;
                    xShift = 0;
                    yshift = (h-w)/2.0;
                }
                else {
                    size = h;
                    xShift = (w-h)/2.0;
                    yshift = 0;
                }

                // Now that we know how to map our points onto the
                // square, we should project them. However, we should
                // only use 90% of the space so that points don't lie
                // on the svg boundaries
                var usableScale = 0.9;
                var unusableScaleSize = (1-usableScale)*size;
                var scaleSize = usableScale*size;

                // Do the final x- and y-coordinate calculations
                pos.x = (point.pos[0] + 1) / 2.0 * scaleSize + unusableScaleSize/2 + xShift;
                pos.y = (-point.pos[1] + 1) / 2.0 * scaleSize + unusableScaleSize/2 + yshift;
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
                var label = point.label || point.id;
                var newNode = {
                    id: point.id,
                    label: label,
                    type: point.type || "News",
                    X: pos.x,
                    Y: pos.y,
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
                i--;
            }
        }
    }
    
    // Copy changes to the data back to the proper data object
    if (isObservation) {
        observationData.nodes = nodes;
    }
    else {
        attributeData.nodes = nodes;
    }
    
    updateDataPanel();
    updateLayout(isObservation);
}

/*
 * Called when a node starts to be dragged
 */
function dragStartWrapper(isObservation) {
    return function(d) {
                
        // Call the force.start() function for the view/panel that the
        // selected/dragged node belongs to
        if (isObservation) {
            observationData.forceLayout.start();
        }
        else {
            attributeData.forceLayout.start();
        }
    }
}

/*
 * Called when a point is dragged.
 */
function dragMoveWrapper(isObservation) {
    return function(d) {
        if (!d.selected) {
            // If the point wasn't selected, select it and broadcast it
            d.selected = true;
            socket.emit('action', {type: "select", state: d.selected, id: d.id}, isObservation);

            // Call the force.start() function for the view/panel that the
            // selected/dragged node belongs to
            if (isObservation) {
                observationData.forceLayout.start();
            }
            else {
                attributeData.forceLayout.start();
            }
        }
        
        // Track the movement of the node
        d.moved = true;
        justMovedNode = true;
        d.X += d3.event.dx;
        d.Y += d3.event.dy;
        
        // Broadcast the moved event
        socket.emit('action', {type: "move", pos: [d.X / width * 2 - 1, -(d.Y / height * 2 - 1)], id: d.id}, isObservation);
    }
}

// What to do when a dragged node is released
function dragEndWrapper(isObservation) {
    return function(d, i) {
        // Make sure the layout updates properly by calling the correct resume()
        if (isObservation) {
            observationData.forceLayout.resume();
        }
        else {
            attributeData.forceLayout.resume();
        }
    }
}

function searchForTerm(term) {
    // Capture whether observation foraging and/or attribute foraging should
    // be enabled
    var obsForage = $("input.true-forage-check").prop("checked");
    var attrForage = $("input.false-forage-check").prop("checked");
    
    // Submit a text search update
    socket.emit('update', {type: "search", query: term, prototype: prototype, obsForage: obsForage, attrForage: attrForage}, null);
}

function resetDataInfo() {
    if (openedNode) {
        d3.select(".opened").classed("opened", false);
    }
    
    openedNode = null;
	
    // Reset data info
    var dataLabel = document.getElementById("dataLabel");
    dataLabel.value = "";
    dataLabel.setAttribute("disabled", "disabled");

    document.getElementById("dataLabelBtn").setAttribute("disabled", "disabled");

    var dataRelevance = document.getElementById("dataRelevance");
    dataRelevance.value = 0;
    dataRelevance.setAttribute("disabled", "disabled");

    var dataContent = document.getElementById("dataContent");
    dataContent.value = "";

    document.getElementById("closeNodeBtn").setAttribute("disabled", "disabled");

    var dataNotes = document.getElementById("dataNotes");
    dataNotes.value = "";
    dataNotes.setAttribute("disabled", "disabled");

    document.getElementById("dataNotesBtn").setAttribute("disabled", "disabled");

    if (ui === "centaurus") {
        document.getElementById("dataDelete").setAttribute("disabled", "disabled");
    }
}

var socket = io.connect({reconnection:false});

function createUISocketCallbacks() {
    socket.on('action', function(data, isObservation) {
        // Grab relevant observation or attribute data from the proper data object
        var nodes;
        var force;
        if (isObservation) {
            nodes = observationData.nodes;
            force = observationData.forceLayout;
        }
        else {
            nodes = attributeData.nodes;
            force = attributeData.forceLayout;
        }

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

        // Copy back the changes made to nodes back to the proper data object
        if (isObservation) {
            observationData.nodes = nodes;
        }
        else {
            attributeData.nodes = nodes;
        }
    });


    socket.on('update', function(data, isObservation) {
        console.log("UPDATE MESSAGE RECEIVED");
        console.log(data);
        resetDataInfo();

        // NOTE: isObservation may not be necessary if both observation data and
        // attribute data are always being sent to the UI. true and false can be
        // used instead
        update(data, isObservation);
     });

    socket.on('get', function(data, isObservation) {
        savedGetResponseFunction(data, isObservation);
    });

    socket.on('reset', function() {
        // Reset the nodes objects for both views/panels
        observationData.nodes = [];
        attributeData.nodes = [];

        resetDataInfo();

        // Have both SVGs update
        updateLayout(true);
        updateLayout(false);
    });
}

function getResponseFunction(isObservation, shouldUpdateOwnSVG) {
    return function(data) {
        
        // Grab the nodes from the proper data object
        var nodes;
        if (isObservation) {
            nodes = observationData.nodes;
        }
        else {
            nodes = attributeData.nodes;
        }

        if (!data || !data.type) {
            return;
        }

        // If we're getting raw data, update the data panel
        if (data.type === "raw") {
            for (var i=0; i < nodes.length; i++) {
                if (nodes[i].id === data.id) {
                    nodes[i].content = data.value;
                    break;
                }
            }
            updateDataPanel();
        }

        // If we're getting attribute data, update the layout(s) accordingly
        else if (data.type === "attributes") {
            for (var i=0; i < nodes.length; i++) {
                if (nodes[i].id === data.id) {
                    nodes[i].values = data.value;
                    break;
                }
            }

            updateLayout(!isObservation);

            if (shouldUpdateOwnSVG) {
                updateLayout(isObservation);
            }
        }

        // Copy the changes made to nodes back to the proper data object
        if (isObservation) {
            observationData.nodes = nodes;
        }
        else {
            attributeData.nodes = nodes;
        }
    }
}