var ui = "andromeda";
var nodes = [];
var sliders = [];

//store original position for nodes
// dict[].x, dict[].y original coordinate
// dict[].node.X, dict[].node.Y current coordinate
var dict = {};

//==========================================================
//Buttons
//==========================================================
//Deselect All: deselects all viewing and moved nodes
var deselectButton = d3.select("#deselect")
    .on("click", function() {
        dispatch.unhighlightAll();
        updateIndicators();
    });


//Update Layout: initiates an OLI update
var updateButton = d3.select("#update")
    .on("click", function() {

      var movedSize = Object.keys(movedNodes).length;
      var sampleSize = 3;
      samplePoints = {};
      var txt = "";

      if(movedSize >= 3) {
            txt = "moved " + movedSize + " points";
            console.log(txt);
            var needSample = checkDistance(movedSize);

            if (needSample) {
                samplePoints = randomSample(sampleSize, nodes.length);
            }
            else {
                sampleSize = 0;
            }

            socket.emit("update", {type: "oli"});

            //set sampling points' status back to false
            for (var n in samplePoints) {
                socket.emit('action', {type: "sample", state: false, id: n});
            }
            viewingNode();
        }
        // two points sceneria
        else if (movedSize == 2) {
            txt = "moved 2 points";
            console.log(txt);

            //random sampling
            samplePoints = randomSample(sampleSize, nodes.length);

            socket.emit("update", {type: "oli"});

            //set sampling points' status back to false
            for (var n in samplePoints) {
                socket.emit('action', {type: "sample", state: false, id: n});
            }

            viewingNode();

        }
        else {
            txt = "moved less than two points";
            console.log(txt);

            sampleSize = 0;

            alert("Please move at lease 2 nodes to update layout.");
        }

    });


//=============== helper function for random sampling =======================
//check if points come closer or separate apart.
function checkDistance(movedSize) {
    /* === check if points move closer to each other === */
    var ratioSum = movedSize * avgDistRatio;
    var separate = false;
    var closer = false;

    //check if any distance is smaller or larger than original distance.
    //if separate apart or come closer only, then return true for following sampling.
    //Update separate and closer
    for (var i = 0; i < Object.keys(movedNodes).length; i++) {
        var movedName = Object.keys(movedNodes)[i];

        for (var j = 0; j < Object.keys(movedNodes[movedName].distArr).length; j++) {
            var key = Object.keys(movedNodes[movedName].distArr)[j];
            if (!separate && movedNodes[movedName].distArr[key] > 1) {
                separate = true;
            }
            else if (!closer && movedNodes[movedName].distArr[key] < 1) {
                closer = true;
            }
            else if (separate && closer) break;
        }

        if (separate && closer) break;
    }

    if (ratioSum > movedSize) {
      var text = closer? "separate and closer" : "separate apart";
      console.log(text);

      if (!closer) return true;
    }
    else if (ratioSum < movedSize) {
      var text = separate? "separate and closer" : "come closer";
      console.log(text);

      if (!separate) return true;
    }
    else {
      console.log("equal");
    }

    return false;
}


//random select n points
//size: number of points inside of the nodes
function randomSample(n, size) {
    //select n random nodes
    var randomNodes = {};

    while (Object.keys(randomNodes).length < n) {
        var randomValue = Math.floor(Math.random() * size);
        var node = nodes[randomValue];
        if (!randomNodes[node.id] && !movedNodes[node.id]) {
            var logNode = {};
            logNode.id = node.id;
            logNode.oriX = node.X;
            logNode.oriY = node.Y;
            randomNodes[node.id] = logNode;

            //select sample points, change from gray points to blue points
            node.deselect = false;
            node.sample = true;

            socket.emit('action', {
                type: "sample",
                state: true,
                id: node.id
            });
        }
    }

    force.start();

    return randomNodes;
}


// Reset movedNodes to empty and avgDistRatio & tempAvgRatio to 0
function resetMovedNodes() {
    movedNodes = {};
    avgDistRatio = 0;
    tempAvgRatio = 0;
}


// After update, set moved nodes status: moved = false; viewing = true
function viewingNode() {
    for (var n in movedNodes) {
        var node = dict[n].node;

        // update node status
        node.moved = false;
        node.viewing = true;

        socket.emit('action', {type: "select", state: false, id: n});
    }

    resetMovedNodes();
    force.start();
}
//======== END helper function for random sampling =============


// Reset button that resets the whole pipeline
var resetButton = d3.select("#reset")
    .on("click", function() {
        socket.emit("reset");
    });


// Information button
var infoButton = d3.select("#info")
    .on("click", function() {
        window.open("http://infovis.cs.vt.edu/content/web-andromeda-instructions");
    });


//==========================================================
//OLI
//==========================================================
var oli = d3.select("#oli");

var oliDiv = d3.select("div#oliDiv");

// Dynamically determine the height of the OLI panel
oliDiv.style("height", function() {
        var totalHeight = Number(String(d3.select("html").node().clientHeight).replace("px", ""));
        var topRowHeight = Number(d3.select("div#topRow").style("height").replace("px", ""));
        var oliDivMargins = Number(oliDiv.style("margin-top").replace("px", "")) +
                Number(oliDiv.style("margin-bottom").replace("px", ""))*2;
        var oliDivHeight = totalHeight - topRowHeight - oliDivMargins;
        return oliDivHeight + "px";
    });

d3.select("div#groups")
        // If we want the Groups panel
//        .style("height", "150px")
//        .style("padding-top", "10px");

        // If we don't want the Groups panel
        .remove();

d3.select("div#attributes")
        // Dynamically determine the height of the attribute div
        .style("height", function() {
            // Initially, make the attribute div height equal to the
            // OLI div
            var attrDivHeight = Number(oliDiv.style("height").replace("px", ""));

            // If the groups panel is displayed, subtract the height of it from
            // the height of the OLI div
            var groupsDiv = d3.select("div#groups");
            if (groupsDiv.node()) {
                var groupsDivHeight = Number(groupsDiv.style("height").replace("px", ""));
                var groupsDivMargins = Number(groupsDiv.style("margin-top").replace("px", "")) +
                        Number(groupsDiv.style("margin-bottom").replace("px", ""));
                attrDivHeight -= groupsDivHeight + groupsDivMargins;
            }

            // Set the height of the attribute div
            return attrDivHeight + "px";
        })
        // Dynamically determine the height of the attribute scrolling div
        .select("div").style("height", function() {
            // Get the height of the OLI panel
            var totalHeight = Number(oliDiv.style("height").replace("px", ""));

            // Get the height of the groups panel, if it exists
            var groupsHeight = 0;
            var groupsDiv = d3.select("div#groups");
            if (groupsDiv.node()) {
                var groupsDivHeight = Number(groupsDiv.style("height").replace("px", ""));
                var groupsDivMargins = Number(groupsDiv.style("margin-top").replace("px", "")) +
                        Number(groupsDiv.style("margin-bottom").replace("px", ""));
                groupsHeight = groupsDivHeight + groupsDivMargins;
            }

            // Get the height of the header components of the attribute panel
            var attributeDiv = d3.select(this.parentNode);
            var header = attributeDiv.select("p");
            var headerHeight = Number(header.style("line-height").replace("px", ""));
            var headerMargin = Number(header.style("margin-top").replace("px", "")) +
                    Number(header.style("margin-bottom").replace("px", ""));
            var attributeDivMargin = Number(d3.select(this).style("margin-bottom").replace("px", ""));

            // Calculate and return what the height of the attribute panel
            // should be
            var attributeListDivHeight = totalHeight - headerHeight -
                    headerMargin - attributeDivMargin - groupsHeight;
            return attributeListDivHeight + "px";
        });


//==========================================================
//Add distance line Legend in OLI
//==========================================================

var dlScale = oli.append("g")
                .attr("class", "dlScale")
                .attr("transform", function() {
                    var oliHeight = d3.select("#oli").node().clientHeight;
                    return "translate(10," + (oliHeight - 50) + ")";
                });

var dlTitle = dlScale.append("text")
                    .attr("class", "dlTitle")
                    .attr("font-weight", "bold")
                    .text("Relative Distance");

var dlBar = dlScale.append("g")
                    .attr("class", "dlBar")
                    .attr("transform", "translate(0,25)");

var barWidth = d3.range(0, 200, 2);
dlBar.selectAll(".dlBar")
      .data(barWidth)
      .enter()
      .append("rect")
      .attr("class", "dlBar")
      .attr("x", function(d) {
          return d;
      })
      .attr("width", 2)
      .attr("height", 15)
      .attr("fill", function(d) {
          var w = d / 100;
          var c = colorDistanceLine(w);
          var color = d3.rgb(c[0], c[1], c[2]);
          color.opacity = c[3];
          return color;
      });

var dlLine = d3.range(0, 201, 100);
dlScale.selectAll(".dlLine")
      .data(dlLine)
      .enter()
      .append("line")
      .attr("class", "dlLine")
      .attr("x1", function(d) {
          return d;
      })
      .attr("y1", 20)
      .attr("x2", function(d) {
          return d;
      })
      .attr("y2", 25)
      .attr("stroke-width", 1)
      .attr("stroke", "black");;

var dlText = ["smaller", "equal", "larger"];
dlScale.selectAll(".dlText")
      .data(dlText)
      .enter()
      .append("text")
      .attr("class", "dlText")
      .attr("dx", function(d, i) {
          var dist = dlLine[i];
          if (i != 0) {
            dist = dist - 15;
          }
          return dist;
      })
      .attr("dy", 15)
      .text(function(d) {
          return d;
      });

d3.select(".dlScale").style("opacity", 0);
//==========================================================
//Force layout and drag
//==========================================================
var force = d3.layout.force()
		.gravity(0)
		.friction(0)
		.charge(0)
		.nodes(nodes);


//Create the drag and drop behavior
var drag = force.drag()
			 .on("dragstart",dragstart)
			 .on("drag", dragmove)
			 .on("dragend", dragend);


//store current positions of all moved points
var movedNodes = {};
var avgDistRatio;
var tempAvgRatio;


//=============== helper function for dragging =======================

// ======= 1. foreground and background ===========
function getForeground(d) {
    if (!d.moved && d3.select(".deselect")[0][0]) {
        d.deselect = true;
    }
    else if (d.moved && d.deselect) {
        d.deselect = false;
    }

    // first dragging point, change all other points to deselect
    if (d3.select(".moved")[0][0] && !d3.select(".deselect")[0][0]) {
        for (i = 0; i < nodes.length; i++) {
            if(nodes[i].viewing) {
                nodes[i].viewing = false;
            }
            if(nodes[i].sample) {
                nodes[i].sample = false;
            }
            if(!nodes[i].moved) {
                nodes[i].deselect = true;
            }
        }
    }
    // last point change from moved to normal, then change all deselect points (gray point) to normal (blue point)
    else if (!d3.select(".moved")[0][0] && d3.select(".deselect")[0][0]) {
        for (i = 0; i < nodes.length; i++) {
            nodes[i].deselect = false;
        }
    }
}


// ======= 2. distance line arrow ===========
//outward arrow - start
oli.append("svg:defs").append("svg:marker")
    .attr("id", "outwardStart")
    .attr("refX", 20)
    .attr("refY", 6)
    .attr("markerWidth", 50)
    .attr("markerHeight", 50)
    .attr("markerUnits","userSpaceOnUse")
    .attr("orient", "auto-start-reverse")
    .append("path")
    .attr("d", "M 0 0 12 6 0 12 3 6")
    .style("fill", "#F18D9E");

//outward arrow - end
oli.append("svg:defs").append("svg:marker")
    .attr("id", "outwardEnd")
    .attr("refX", 20)
    .attr("refY", 6)
    .attr("markerWidth", 50)
    .attr("markerHeight", 50)
    .attr("markerUnits","userSpaceOnUse")
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M 0 0 12 6 0 12 3 6")
    .style("fill", "#F18D9E");

//inward arrow - start
oli.append("svg:defs").append("svg:marker")
    .attr("id", "inwardStart")
    .attr("refX", 20)
    .attr("refY", 6)
    .attr("markerWidth", 50)
    .attr("markerHeight", 50)
    .attr("markerUnits","userSpaceOnUse")
    .attr("orient", "auto-start-reverse")
    .append("path")
    .attr("d", "M 12 0 0 6 12 12 9 6")
    .style("fill", "#5BC8AC");

//endward arrow - end
oli.append("svg:defs").append("svg:marker")
    .attr("id", "inwardEnd")
    .attr("refX", 20)
    .attr("refY", 6)
    .attr("markerWidth", 50)
    .attr("markerHeight", 50)
    .attr("markerUnits","userSpaceOnUse")
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M 12 0 0 6 12 12 9 6")
    .style("fill", "#5BC8AC");


// ======= 3. deselect moved node, remove from movedNodes dictionary ===========
function removeMovedNode(d) {
    delete movedNodes[d.id];

    //Update average distance ratio
    var movedSize = Object.keys(movedNodes).length;
    if (movedSize > 1) {
        var ratioSum = avgDistRatio * (movedSize + 1) * movedSize / 2.0;

        //update ratioSum: substract deselect nodes distance ratio from ratioSum
        for (var i = 0; i < movedSize; i++) {
            var movedName = Object.keys(movedNodes)[i];
            var xDiff = (d.X - movedNodes[movedName].x);
            var yDiff = (d.Y - movedNodes[movedName].y);
            var currDist = Math.sqrt(xDiff * xDiff + yDiff * yDiff);

            var oriXDist = dict[d.id].x - dict[movedName].x;
            var oriYDist = dict[d.id].y - dict[movedName].y;
            var oriDist = Math.sqrt(oriXDist * oriXDist + oriYDist * oriYDist);

            ratioSum = ratioSum - currDist / oriDist;

            //delete the distance ratio of other moved nodes with node d
            delete movedNodes[movedName].distArr[d.id];
        }

        //update average relative distance ratio
        avgDistRatio = ratioSum / (movedSize * (movedSize - 1) / 2.0);
    }
    else { // no moved node, or only one moved node left
        avgDistRatio = 0;
        if (Object.keys(movedNodes)[0]) { //one moved node left
            var movedName = Object.keys(movedNodes)[0];
            //delete the distance ratio of moved node with node d
            delete movedNodes[movedName].distArr[d.id];
        }
    }
}


// ======= 4. Select moved node, add into movedNodes dictionary ===========
//d: the moved point
//dragging: boolean value, if the point is in dragging (true in dragmove function)
function addMovedNode(d, dragging, currNode = null) {
    //Calculate the average distance ratio
    var movedSize = Object.keys(movedNodes).length;
    var ratioSum;
    if (movedSize > 1) {
        ratioSum = avgDistRatio * (movedSize * (movedSize - 1) / 2.0);
    }
    else ratioSum = 0;

    for (var i = 0; i < Object.keys(movedNodes).length; i++) {
        var movedName = Object.keys(movedNodes)[i];
        var xDiff = (d.X - movedNodes[movedName].x);
        var yDiff = (d.Y - movedNodes[movedName].y);
        var currDist = Math.sqrt(xDiff * xDiff + yDiff * yDiff);

        var oriXDist = dict[d.id].x - dict[movedName].x;
        var oriYDist = dict[d.id].y - dict[movedName].y;
        var oriDist = Math.sqrt(oriXDist * oriXDist + oriYDist * oriYDist);

        ratioSum = ratioSum + currDist / oriDist;

        if (dragging) {
            //update distance ratio of current moving node and ith node in movedNodes dictionary
            movedNodes[movedName].distRatio = currDist / oriDist;
        }
        else {
            //add distance ratio to point d and points in movedNodes dictionary
            movedNodes[movedName].distArr[d.id] = currDist / oriDist;
            currNode.distArr[movedName] = currDist / oriDist;
        }
    }

    if (dragging) {
        tempAvgRatio = (movedSize > 0)? ratioSum / ((movedSize + 1) * movedSize / 2.0) : 0;
    }
    else {
        avgDistRatio = (movedSize > 0)? ratioSum / ((movedSize + 1) * movedSize / 2.0) : 0;
    }

}


// ============== 5. graph distance lines ==============
//d: the moved point
//dragging: boolean value, if the point is in dragging (true in dragmove function)
function graphDistLine(d, dragging) {
    // diferentiate dragstart (dragging = false) and dragmove (dragging = true)
    var avgRatio = dragging? tempAvgRatio : avgDistRatio;

    //add distance line between moving node and nodes in movedNodes dictionary
    for (var i = 0; i < Object.keys(movedNodes).length; i++) {
        var movedName = Object.keys(movedNodes)[i];
        var currRatio = dragging? movedNodes[movedName].distRatio : movedNodes[movedName].distArr[d.id];

        oli.append("line")
               .attr("x1", movedNodes[movedName].x)
               .attr("y1", movedNodes[movedName].y)
               .attr("x2", d.X)
               .attr("y2", d.Y)
               .attr("stroke", function() {

                    var weight = currRatio / avgRatio;
                    var c = colorDistanceLine(weight);
                    var color = d3.rgb(c[0], c[1], c[2]);
                    color.opacity = c[3];

                    return color;


               })
               .attr("stroke-width", 2)
               .attr("pointer-events", "none")
               .attr("marker-start", function() {
                    if (currRatio > avgRatio) {
                        return "url(#outwardStart)";
                    }
                    else if (currRatio < avgRatio) {
                        return "url(#inwardStart)";
                    }
                    else return "";
               })
               .attr("marker-end", function() {
                    if (currRatio > avgRatio) {
                        return "url(#outwardEnd)";
                    }
                    else if (currRatio < avgRatio) {
                        return "url(#inwardEnd)";
                    }
                    else return "";
               })    //"url(#inwardEnd)"
               .classed("arrowLine", true);
    }
}


// Not used (for graphDistLine version 3)
function colorDistanceLine(weight) {
    // color 1 : Black
    var color1 = [0, 0, 0, 1];

    // color 2: Blue
    var color2 = [0, 0, 255, 1];

    // color 3: Green
    var color3 = [102, 255, 153, 1];

    // color 4: Yellow
    var color4 = [255, 255, 204, 1];

    // return color
    var mix = [0, 0, 0, 1]; // R, G, B, alpha

    if (weight <= 0.5) {
        var e = 0.5;
        mix[0] = color1[0] + (color2[0] - color1[0]) * weight / e;
        mix[1] = color1[1] + (color2[1] - color1[1]) * weight / e;
        mix[2] = color1[2] + (color2[2] - color1[2]) * weight / e;
        mix[3] = 1;
    }
    else if (weight <= 1) {
        var s = 0.5;
        var e = 1;
        mix[0] = color2[0] + (color3[0] - color2[0]) * (weight - s) / (e - s);
        mix[1] = color2[1] + (color3[1] - color2[1]) * (weight - s) / (e - s);
        mix[2] = color2[2] + (color3[2] - color2[2]) * (weight - s) / (e - s);
        mix[3] = 1;
    }
    else if (weight <= 1.5) {
        var s = 1;
        var e = 1.5;
        mix[0] = color3[0] + (color4[0] - color3[0]) * (weight - s) / (e - s);
        mix[1] = color3[1] + (color4[1] - color3[1]) * (weight - s) / (e - s);
        mix[2] = color3[2] + (color4[2] - color3[2]) * (weight - s) / (e - s);
        mix[3] = 1;
    }
    else {
        mix = color4;
        mix[3] = 1;
    }

    return mix;
}


//======== END helper function for dragging =============


//when a node is clicked
function dragstart(d, i){
    d3.event.sourceEvent.stopPropagation();

    //Toggle the moved status (single click will also be defined as moved)
    d.moved = !d.moved;
    d.moving = false;
    d.viewing = false;
    d.sample = false;
    d3.select(this).classed("moved", d.moved);
    d3.select(this).classed("viewing", d.viewing);
    d3.select(this).classed("sample", d.sample);

    getForeground(d);
    d3.select(this).classed("deselect", d.deselect);


    //remove existing arrows and lines
    if (d3.select(".arrowLine")[0][0]) {
        d3.selectAll(".arrowLine").remove();
    }

    //deselect moved node, remove from movedNodes dictionary
    if (!d.moved && movedNodes[d.id]) {
        removeMovedNode(d);
    }
    //if node is selected as "moved" and node is not in movedNodes
    else if (d.moved && !movedNodes[d.id]) {
        //define current moving node for later pushing into movedNodes dictionary
        var currNode = {};
        currNode.id = d.id;
        currNode.x = d.X;
        currNode.y = d.Y;
        currNode.node = d;
        currNode.distRatio = 0; //store dynamically distance ratio when dragging
        currNode.distArr = {}; //store distance ratio (curr/ori) of currNode with all other movedNodes


        addMovedNode(d, false, currNode);

        if (Object.keys(movedNodes).length > 0) {
            graphDistLine(d, false);

        }

        //push moved node into movedNodes dictionary
        movedNodes[d.id] = currNode;
    }


    // add distance line legend if distance line exists
    if (d3.select(".arrowLine")[0][0]) {
        d3.select(".dlScale").style("opacity", 1);
    }



    socket.emit('action', {
        type: "select",
        state: d.moved,
        id: d.id
    });

}

//when a node is dragging
function dragmove(d, i){
	d.moved = true;
	d.moving = true;
	d.viewing = false;
  d.deselect = false;
  d3.select(this).classed("deselect", d.deselect);

  //transform node to new position
	d.X += d3.event.dx;
	d.Y += d3.event.dy;
	d3.select(this).attr("transform", function(d){
		return "translate(" + d.X + "," + d.Y + ")";
	});


  //remove existing arrows and lines
  if (d3.select(".arrowLine")[0][0]) {
      d3.selectAll(".arrowLine").remove();
  }

  //remove node from movedNodes dictionary if exist
  if (movedNodes[d.id]) {
      removeMovedNode(d);

  }


  //update distance arrows and lines if exist at least one moved point
  if (Object.keys(movedNodes).length == 1) {
      //only one movedNodes (except the dragging one, ie. two selected points), then add distance line based on absolute distance
      var movedName = Object.keys(movedNodes)[0];

      //calculate original absolute distance
      var oriXDist = dict[d.id].x - dict[movedName].x;
      var oriYDist = dict[d.id].y - dict[movedName].y;
      var oriDist = Math.sqrt(oriXDist * oriXDist + oriYDist * oriYDist);

      //calculate current absolute distance
      var xDiff = (d.X - movedNodes[movedName].x);
      var yDiff = (d.Y - movedNodes[movedName].y);
      var currDist = Math.sqrt(xDiff * xDiff + yDiff * yDiff);

      oli.append("line")
             .attr("x1", movedNodes[movedName].x)
             .attr("y1", movedNodes[movedName].y)
             .attr("x2", d.X)
             .attr("y2", d.Y)
             .attr("stroke", function() {

                var weight = currDist / oriDist;
                var c = colorDistanceLine(weight);
                var color = d3.rgb(c[0], c[1], c[2]);
                color.opacity = c[3];

                return color;
             })
             .attr("stroke-width", 2)
             .attr("pointer-events", "none")
             .attr("marker-start", function() {
                  if (currDist > oriDist) {
                      return "url(#outwardStart)";
                  }
                  else if (currDist < oriDist) {
                      return "url(#inwardStart)";
                  }
                  else return "";
             })
             .attr("marker-end", function() {
                  if (currDist > oriDist) {
                      return "url(#outwardEnd)";
                  }
                  else if (currDist < oriDist) {
                      return "url(#inwardEnd)";
                  }
                  else return "";
             })
             .classed("arrowLine", true);

      addMovedNode(d, true);

  }
  //more than one nodes in movedNodes dictionary
  else if (Object.keys(movedNodes).length > 1) {
      addMovedNode(d, true);

      graphDistLine(d, true);

  }


  // add distance line legend if distance line exists
  if (d3.select(".arrowLine")[0][0]) {
      d3.select(".dlScale").style("opacity", 1);
  }


	// Broadcast the moved event
    socket.emit('action', {
        type: "move",
        pos: [d.X / width * 2 - 1, -(d.Y / height * 2 - 1)],
        id: d.id
    });
}


//when a node is released
function dragend(d, i){

    //push moved node into movedNodes dictionary
    if (!movedNodes[d.id] && tempAvgRatio && tempAvgRatio != 0 || d.moving) {
        avgDistRatio = tempAvgRatio;
        tempAvgRatio = 0;

        var currNode = {};
        currNode.id = d.id;
        currNode.x = d.X;
        currNode.y = d.Y;
        currNode.node = d;
        currNode.distArr = {};

        //update currNode.distArr
        for (var i = 0; i < Object.keys(movedNodes).length; i++) {
            var movedName = Object.keys(movedNodes)[i];
            //add distance ratio to point d and points in movedNodes dictionary
            movedNodes[movedName].distArr[d.id] = movedNodes[movedName].distRatio;
            currNode.distArr[movedName] = movedNodes[movedName].distRatio;
        }

        movedNodes[d.id] = currNode;

    }

    d.moving = false;
    d3.select(this).classed("viewing", d.viewing);
    d3.select(this).classed("moved", d.moved);

    getForeground(d);
    d3.select(this).classed("deselect", d.deselect);

    //remove existing arrows and lines when releasing the dragging point
    if (d3.select(".arrowLine")[0][0]) {
        d3.selectAll(".arrowLine").remove();
        d3.select(".dlScale").style("opacity", 0);
    }

    socket.emit('action', {
        type: "select",
        state: d.moved,
        id: d.id
    });

    force.start();
}


//==========================================================
//Multi-select drag
//==========================================================

var box; // multiselect box
var startx, starty; // multiselect start drag box coordinate
var endx, endy; // multiselect end drag box coordinate

function multiStart(event) {

    box = oli.append("rect")
             .attr("x", d3.mouse(this)[0])
             .attr("y", d3.mouse(this)[1])
             .attr("width", 0)
             .attr("height", 0)
             .attr("stroke", "#9999FF")
             .classed("selectBox", true);

    startx = d3.mouse(this)[0];
    starty = d3.mouse(this)[1];

}

function multiDrag(event) {

    var xoffset = 0;
    var yoffset = 0;

    var boxx = d3.mouse(this)[0] - startx;
    var boxy = d3.mouse(this)[1] - starty;

    if (boxx < 0) {
      xoffset = boxx;
      boxx = -1 * boxx;
    }

    if (boxy < 0) {
      yoffset = boxy;
      boxy = -1 * boxy;
    }

    box.attr("transform", function() {
      return "translate(" + xoffset + "," + yoffset + ")";
    })
    .attr("width", boxx)
    .attr("height", boxy)
    .attr("fill", "none");

    endx = d3.mouse(this)[0];
    endy = d3.mouse(this)[1];

}

function multiEnd(event) {

    box.remove();

    //remove existing arrows and lines
    if (d3.select(".arrowLine")[0][0]) {
        d3.selectAll(".arrowLine").remove();
    }

    //get the bounding of multiselect box
    var rangex1, rangex2, rangey1, rangey2;
    if (startx <= endx) {
        rangex1 = startx;
        rangex2 = endx;
    }
    else {
        rangex1 = endx;
        rangex2 = startx;
    }

    if (starty <= endy) {
        rangey1 = starty;
        rangey2 = endy;
    }
    else {
        rangey1 = endy;
        rangey2 = starty;
    }

    //check points those are intersected with multiselect box
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].X + 8 > rangex1 && nodes[i].X - 8 < rangex2 &&
            nodes[i].Y + 8 > rangey1 && nodes[i].Y - 8 < rangey2) {
              //points those are selected
              nodes[i].viewing = false;
              nodes[i].moved = true;
              nodes[i].hover = false;
              nodes[i].deselect = false;
              nodes[i].sample = false;

              //define current selected node for later pushing into movedNodes dictionary
              var currNode = {};
              currNode.id = nodes[i].id;
              currNode.x = nodes[i].X;
              currNode.y = nodes[i].Y;
              currNode.node = nodes[i];
              currNode.distRatio = 0;
              currNode.distArr = {};

              addMovedNode(nodes[i], false, currNode);

              movedNodes[nodes[i].id] = currNode;


              socket.emit('action',
                          {
                           type: "select",
                           state: nodes[i].moved,
                           id: nodes[i].id
               });
        }
        else {
            if (!nodes[i].moved) {
                nodes[i].viewing = false;
                nodes[i].sample = false;
                nodes[i].moved = false;
                nodes[i].hover = false;
                nodes[i].deselect = true;
            }
        }
        force.start();
    }

}

oli.call(d3.behavior.drag()
           .on("dragstart", multiStart)
           .on("drag", multiDrag)
           .on("dragend", multiEnd)
           );

//==========================================================
//End Multi-select drag
//==========================================================




var dispatch = d3.dispatch('unhighlightAll', 'toggle')
    .on('unhighlightAll', function() {
        for (var i = 0; i < nodes.length; i++) {
           nodes[i].viewing = false;
           nodes[i].sample = false;
           nodes[i].moved = false;
           nodes[i].hover = false;
           nodes[i].deselect = false;
           socket.emit('action',
                       {
                        type: "select",
                        state: nodes[i].moved,
                        id: nodes[i].id
            });
        }
        force.start();
        d3.selectAll('.viewing').classed('viewing', false);
        d3.selectAll('.sample').classed('sample', false);
        d3.selectAll('.moved').classed('moved', false);
        d3.selectAll('.hover').classed('hover', false);
        d3.selectAll('.deselect').classed('deselect', false);

        d3.selectAll(".arrowLine").remove();
        d3.selectAll(".selectBox").remove();

        //reset movedNodes and avgDistRatio
        resetMovedNodes();
    })
    .on('toggle', function(d) {
        d3.select(d).classed('viewing', function() {
            updateIndicators();
            return !d3.select(d).classed('viewing');
        });
        d3.select(d).classed('moved', function() {
            updateIndicators();
            return !d3.select(d).classed('moved');
        });
        updateIndicators();
    });


// Initialize force layout actions
var node = oli.selectAll(".node").data(nodes);
updateLayout();


//Slider
var svg2 = d3.select("#pi");

var width = 175;

var slider = svg2.selectAll(".slider").data(sliders);

var x = d3.scale.linear()
    .domain([0, 1])
    .range([15, width])   // position of attribute lines in "Attributes" svg
    .clamp(true);
var x2 = d3.scale.linear()
    .domain([0, 1])
    .range([0.33, 1])   // width of attribute lines, original is 0.33, can extend to 1
    .clamp(true);
updateSlider();


// Updates points on screen and smoothly transitions them to their new location
force.on("tick", function() {
    node.attr("transform", function(d) {
            return "translate(" + d.X + "," + d.Y + ")";
        })

        //viewing node will not be considered by the algorithm,
        //only keep highlight after updating layout (for easy tracking)
        .classed("viewing", function(d) {
            return d.viewing;
        })
        //true during node moving
        .classed("moving", function(d) {
            return d.moving;
        })
        //moved means node will be considered by algorithm
        .classed("moved", function(d) {
            return d.moved;
        })
        .classed("hover", function(d) {
            return d.hover;
        })
        .classed("deselect", function(d) {
            return d.deselect;
        })
        .classed("sample", function(d) {
            return d.sample;
        });

    updateIndicators();
    force.stop();
});


function updateLayout() {
    // Give data to SVG
    node = node.data(nodes, function(d) {
        return d.id;
    });

    // Remove any documents that no longer exist
    node.exit().remove();

    // Create the group node who's transform servers as the position of the
    // node and have new nodes come in from (0, 0)
    var g = node.enter().append("g")
        .attr("class", "node")
        .on('mouseover', function(d) {
            for (var i = 0; i < nodes.length; i++) {
                nodes[i].hover = false;
            }
            d3.selectAll(".node").select("circle")
                .style('fill', null);
            if (!d3.select(".moving")[0][0]) {
                d.hover = true;
                d3.select(this).select("circle")
                    .style("fill", "yellow");
                getAttributes(d);
                force.start();
            }
        })
        .on('mouseout', function(d) {
            if (!d3.select(".moving")[0][0]) {
                d.hover = false;
                for (var i = 0; i < nodes.length; i++) {
                    nodes[i].hover = false;
                }
                d3.select(this).select("circle")
                    .style('fill', null);
                force.start();
            }
        })
        .on("click", function(d) {
            getAttributes(d);
            updateIndicators();
        })
        .call(drag);

    // Add a circle for the point of the node on initial load out
    g.append("circle")
        .attr("class", "point")
        .attr("r", 20)
        .attr("id", "inner")
        .append("title").text(function(d) {
            return d.label;
        });

    // Add a label for the point to the right
    g.append("text")
        .attr("class", "text")
        .attr("dx", 10)
        .attr("dy", ".35em")
        .text(function(d) {
            return d.label;
        });


    // Force layout running screws up the transition
    force.stop();

    // Transition the nodes to their new positions
    node.transition().ease("linear").duration(1000)
        .attrTween("transform", function(d, i, a) {
            return d3.interpolateTransform(a, "translate(" + d.X + "," + d.Y + ")");
        });

    // Transition each node to it's new size based on it's relevance and is what sets the size of each
    //node when seen initially

    d3.selectAll("circle.point").transition().ease("linear").duration(1000)
        .attr("r", function(d) {
            return 8 + 10 * d.relevance;
        });



    dict = {};

    for (var i = 0; i < nodes.length; i++) {
        //update node dictionary
        var oriNode = {};
        oriNode.id = nodes[i].id;
        oriNode.x = nodes[i].X;
        oriNode.y = nodes[i].Y;
        oriNode.node = nodes[i];
        oriNode.index = i;
        dict[oriNode.id] = oriNode;

        //remove "moved"/"deselect" nodes
        nodes[i].moved = false;
        nodes[i].hover = false;
        nodes[i].deselect = false;

    }

    //reset movedNodes and avgDistRatio
    resetMovedNodes();


    d3.selectAll('.moved').classed('moved', false);
    d3.selectAll('.hover').classed('hover', false);
    d3.selectAll('.deselect').classed('deselect', false);
    d3.selectAll(".arrowLine").remove();

}


function updateSlider() {
    slider = slider.data(sliders, function(d) {
        return d.id;
    });

    slider.exit().remove();

    var g = slider.enter().append("g")
        .attr("class", "slider")
        .attr("transform", function(d) {
            return "translate(0," + (d.order + 1) * 25 + ")"
        });

    g.append("line")
        .attr("class", "track")
        .attr("x1", x.range()[0])
        .attr("x2", x(x2(0)))
        .select(function() {
            return this.parentNode.appendChild(this.cloneNode(true));
        })
        .attr("class", "halo");

    g.append("line")
        .attr("class", "zero")
        .attr("x1", x(x2(0)))
        .attr("x2", x(x2(0)))
        .attr("y1", -10)
        .attr("y2", 10);

    //==============bind text with pi circle handle=========================

    var handle = g.append("g")
        .on("mouseover", function(d) {
            attrId = d.id;
            for (var i = 0; i < d3.selectAll("circle.point")[0].length; i++) {
                var point = d3.selectAll("circle.point")[0][i];
                var id = point.textContent;
                var attrVal = dict[id].node.attributes[attrId];
                var r = 8 + 10 * attrVal;
                d3.select(point).attr("r", r);
            }
        })
        .on("mouseout", function(d) {
            d3.selectAll("circle.point").attr("r", 8);
        })
        .call(d3.behavior.drag()
            .on("dragstart", function() {
                d3.selectAll(".arrowLine").remove();
              })
            .on("drag", function() {
                d3.select(this.children[0])
                    .attr("cx", x(x.invert(d3.event.x)));
                d3.select(this.children[1])
                    .attr("x", x(x.invert(d3.event.x))+15);
            })
            .on("dragend", function(d) {
                var value = x2.invert(x.invert(d3.select(this.children[0])
                    .attr("cx")));

                socket.emit("update", {
                    type: "pi",
                    param: d.id,
                    value: value

                });
            }));

    handle.append("circle")
        .attr("class", "handle")
        .attr("r", 9)
        .on('mouseover', function(d) {
            tempColor = this.style.fill;
            d3.select(this)
                .style('fill', '#C5CAE9')
        })
        .on('mouseout', function(d) {
            d3.select(this)
                .style('opacity', 1)
                .style('fill', tempColor)
        })


    handle.append("text")
        .attr("class", "text")
        .attr('x', x(x2(0))+15)
        .attr("dy", ".33em")
        .text(function(d) {
            return d.id;
        })
        .style("stroke", "gray");
//============================================

    // Transition the nodes to their new positions
    slider.transition().ease("linear").duration(1000)
        .attrTween("transform", function(d, i, a) {
            return d3.interpolateTransform(a, "translate(0," + (d.order + 1) * 25 + ")");
        });

    slider.selectAll(".track, .halo").transition().ease("linear").duration(1000)
        .attr("x2", function(d) {
            return x(x2(d.weight));
        });

    slider.select(".handle").transition().ease("linear").duration(1000)
        .attr("cx", function(d) {
            return x(x2(d.weight));
        });

    //text move with handle circle
    slider.select(".text").transition().ease("linear").duration(1000)
        .attr("x", function(d) {
            return x(x2(d.weight))+15;
        });

    //Resize svg
    if (sliders.length != 0) {
        var sliderArr = d3.selectAll(".slider")[0];
        var length = sliderArr.length;
        var lastSlider = sliderArr[length-1];
        var transformVal = lastSlider.getAttribute("transform");
        var transformY = parseInt((transformVal.replace (/,/g, " ").split(" "))[1]);

        if(piheight != 0) {
            svg2.attr("height", piheight);
        }
        else {
            piheight = transformY+15;
            svg2.attr("height", piheight);
        }
    }

}


function getAttributes(d) {
	if (!d.attributes) {
        socket.emit("get", {
            type: "attributes",
            id: d.id
        });
    }
}


function updateIndicators() {
    var nameStuff = {};

    var viewing = d3.selectAll('.viewing').select(function(d) {
        if (d.hover) {
            return;
        }
        if (d.attributes) {
            for (var attr in d.attributes) {
            	if (!nameStuff[attr]) {
                    nameStuff[attr] = [];
                }

                var obj = {};
                obj.id = d.id;
                obj.value = d.attributes[attr];
                obj.indViewing = true;

                nameStuff[attr].push(obj);
            }
        }
        else {
            getAttributes(d);
        }
    });

    var hover = d3.select('.hover').select(function(d) {
        if (d.attributes) {
            for (var attr2 in d.attributes) {
                if (!nameStuff[attr2]) {
                    nameStuff[attr2] = [];
                }
                var obj2 = {};
                obj2.id = d.id;
                obj2.value = d.attributes[attr2];
                obj2.indHover = true;

                nameStuff[attr2].push(obj2);
            }
        }
        else {
            getAttributes(d);
        }
    });

    var moved = d3.selectAll('.moved').select(function(d) {
        if (d.attributes) {
            for (var attr3 in d.attributes) {
                if (!nameStuff[attr3]) {
                    nameStuff[attr3] = [];
                }
                var obj3 = {};
                obj3.id = d.id;
                obj3.value = d.attributes[attr3];
                obj3.indMoved = true;

                nameStuff[attr3].push(obj3);
            }
        }
        else {
            getAttributes(d);
        }
    });


    slider.select(function(d) {
        if (!nameStuff[d.id]) {
            d.indicator = d3.select(this).selectAll(".indicator").data([], function (d) {
                return "";
            });
            d.indicator.exit().remove();
        }
        else {
            d.indicator = d3.select(this).selectAll(".indicator").data(nameStuff[d.id], function (d) {
                return d.id;
            });

            d.indicator.exit().remove();

            d.indicator.enter().append("circle")
                .attr("class", "indicator")
                .attr("r", 4.5)
                .attr("cx", function (d2) {
                    // d.weight: attribute weight in model;
                    // d2.value: attribute weight value for animal
                    // x2(d.weight): original length for weight line is 0.33, if drag, scale its weight to 0.33:1
                    // x(..): scale attribute weight value of animal in the range of weight line
                    return x(x2(d.weight) * d2.value);
                });

            d.indicator
                .classed("indHover", function (d) {
                    return d.indHover;
                })
                .classed("indViewing", function (d) {
                    return d.indViewing;
                })
                .classed("indMoved", function(d) {
                    return d.indMoved;
                });

            // Make sure the indHover indicator is always on top
            d.indicator.select(function (d) {
                if (d.indHover) {
                    this.parentNode.appendChild(this);
                }
            });
        }
    });

    slider.select(function(d) {
        if (d.indicator) {
            d.indicator.transition().ease("linear").duration(1000)
                .attr("cx", function(d2) {;
                    return x(x2(d.weight) * d2.value);
                });
        }
    });
}



function update(data) {
    /* Update format:
     * points: [
     *  {
     *  id: <string>,
     *  label: <string>,
     *  pos: [],
     *  selected: <boolean>,
     *  relevance: <float [0, 1]>
     * }
     */

    if (data.points) {
        for (var i = 0; i < data.points.length; i++) {
            var point = data.points[i];
            var id = point.id;
            var pos = null;
            if (point.pos) {
                pos = {};
                width = Number(oli.style("width").replace("px", ""));
                height = Number(oli.style("height").replace("px", ""));
                // Each dimension is in [-1, 1];

                var size;
                var xShift;
                var yshift;
                if (width < height) {
                    size = width;
                    xShift = 0;
                    yshift = (height-width)/2.0;
                }
                else {
                    size = height;
                    xShift = (width-height)/2.0;
                    yshift = 0;
                }
                var usableScale = 0.9;
                var unusableScaleSize = (1-usableScale)*size;
                var scaleSize = usableScale*size;
                pos.x = (point.pos[0] + 1) / 2.0 * scaleSize + xShift;
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
                    if (point.relevance) {
                        nodes[j].relevance = point.relevance;
                    }

                    // Update the selected status if we received it
                    if (point.selected) {
                        nodes[j].moved = point.selected;  /*in "nebula.js", room.points.selected*/
                    }

                    break;
                }
            }

            // If the point wasn't found, create and add it
            if (j === nodes.length) {
                var label = "";
                if (point.type === "attribute") {
                    label = attributes[parseInt(point.id)];
                }
                else {
                    label = point.label || point.id;
                }

                var newNode = {
                    id: point.id,
                    label: label,
                    type: point.type || "News",
                    X: pos.x,
                    Y: pos.y,
                    moved: point.moved,
                    relevance: point.relevance || 0,
                    notes: ""
                };
                nodes.push(newNode);
            }
        }
        updateLayout();
    }

    if (data.similarity_weights) {
        /*id: "Final Fantasy 4",

            weight: 0.5,
            order: 0,

            values: []*/
        for (var i = 0; i < data.similarity_weights.length; i++) {
            var attribute = data.similarity_weights[i];

            for (var j = 0; j < sliders.length; j++) {
                if (sliders[j].id === attribute.id) {
                    sliders[j].weight = attribute.weight;
                    break;
                }
            }

            if (j === sliders.length) {
                var obj = {};
                obj.id = attribute.id;
                obj.weight = attribute.weight;
                obj.values = [];

                sliders.push(obj);
            }
        }

        sliders.sort(function(a, b) {
            if (a.weight < b.weight) {
                return 1;
            }
            else if (a.weight > b.weight) {
                return -1;
            }
            else if (a.id < b.id) {
                return -1;
            }
            else if (a.id > b.id) {
                return 1;
            }
            else {
                return 0;
            }
        });

        for (var i = 0; i < sliders.length; i++) {
            sliders[i].order = i;
        }

        updateSlider();
        updateIndicators();
    }

    //Add attributes to each node in nodes
    for (var i = 0; i < nodes.length; i++) {
        getAttributes(nodes[i]);
    }
}


var socket = io.connect({reconnection:false});

function createUISocketCallbacks() {
    socket.on('connect', function() {
    });


    socket.on('disconnect', function() {
    });


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
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i].id === data.id) {
                    nodes[i].moved = data.state;
                }
            }
            force.start();
        }
    });


    socket.on('update', function(data) {
        update(data);
    });


    socket.on('get', function(data) {
        if (!data || !data.type) {
            return;
        }

        if (data.type === "attributes" && data.id) {
            dict[data.id].node.attributes = data.value;
            updateIndicators();
        }
        else if (data.type === "raw") {
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i].id === data.id) {
                    nodes[i].content = data.value;
                    break;
                }
            }
        }
    });


    socket.on('reset', function() {
        nodes.length = 0;
        sliders.length = 0;
        piheight = 0;
        updateLayout();
        updateSlider();
        updateIndicators();
    });

    socket.emit('get', {
        type: 'attributes'
    });
}
