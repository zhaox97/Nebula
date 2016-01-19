/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var NEBULA = NEBULA || {};

NEBULA.Images = ["Cube.jpg", "Hard Hat.jpg", "Occulus.jpg", "Study.jpg"];
NEBULA.Icons = ["news.png", "spread.png", "twit.png"];

NEBULA.DATUM_STATUS_NONE = 0;
NEBULA.DATUM_STATUS_SELECTED = 1;
NEBULA.DATUM_STATUS_HIGHLIGHTED = 2;

NEBULA.DATUM_STYLE_SELECTED = 1;
NEBULA.DATUM_STYLE_HIGHLIGHTED = 2;

NEBULA.Datum = function (parent, id, label, eventHandler) {
    this.parent = parent;
    this.id = id;
    this.status = 0;

    var template = document.getElementById("datum_template");
    var clone = document.importNode(template.content, true);
    
    this.group = clone.querySelector("#group");
    this.group.setAttribute("id", "group" + this.id);
    
    this.sensor = this.group.querySelector("#sensor");
    this.sensor.setAttribute("id", "sensor" + this.id);
    this.sensor.onoutputchange = eventHandler;
    
    this.transform = this.group.querySelector("#transform");
    this.transform.setAttribute("id", "transform" + this.id);
    this.transform.onclick = eventHandler;
    
    this.type_switch = this.group.querySelector("#type_switch");
    this.type_switch.setAttribute("id", "type_switch" + this.id);
    var type = Math.floor(Math.random() * 2);
    this.type_switch.setAttribute("whichChoice", 0);
    
    this.style_switches = this.group.querySelectorAll(".style_switch");
    
    this.imageScale = this.group.querySelector(".image_scale");
    this.imageTex = this.group.querySelector("#image");
    var icon = Math.floor(Math.random() * NEBULA.Images.length);
    
    // Load the image and get it's size to scale to the appropriate aspect
    // ratio
    this.image = new Image();
    this.image.onload = $.proxy(function() {
    	var aspect = this.image.width / this.image.height;
    	console.log(aspect);
    	
    	if (aspect > 1) {
    		this.imageScale.setAttribute("scale", aspect + " 1 1");
    	}
    	else {
    		this.imageScale.setAttribute("scale", "1 " + (1 / aspect) + " 1");
    	}
    	this.imageTex.setAttribute("url", this.image.src);
    }, this);
    
    this.labels = this.group.querySelectorAll(".datum_label");
    for (var i=0; i < this.labels.length; i++) {
     	this.labels[i].setAttribute("string", label);
    }
    
    this.interpolator = this.group.querySelector("#pi");
    this.interpolator.setAttribute("id", "pi" + this.id);

    var timerRoute = this.group.querySelector("#timer_route");
    timerRoute.setAttribute("id", "timer_route" + this.id);
    timerRoute.setAttribute("fromNode", "timer");
    timerRoute.setAttribute("toNode", "pi" + this.id);

    var piRoute = this.group.querySelector("#pi_route");
    piRoute.setAttribute("id", "pi_route" + this.id);
    piRoute.setAttribute("fromNode", "pi" + this.id);
    piRoute.setAttribute("toNode", "transform" + this.id);

    this.insert();
};

NEBULA.processSensor = function (event) {
    if (event.type === "outputchange" && event.fieldName === "translation_changed") {
        var target = event.target;
        var id = target.getAttribute("id").substring(6);
        var transform = document.getElementById("transform" + id);
        transform.setAttribute("translation", event.value);
    }
    else if (event.type === "click") {
        console.log(event.target);
    }
};

NEBULA.Datum.prototype.getId = function() {
    return this.id;
};

NEBULA.Datum.prototype.getPosition = function() {
    return this.transform.getAttribute("translation");
};

NEBULA.Datum.prototype.setPosition = function (position) {
    this.sensor.setAttribute("offset", position);
    this.transform.setAttribute("translation", position);
};

NEBULA.Datum.prototype.getInterpolatedPosition = function() {
    return this.interpolator.getAttribute("value_changed");
};

NEBULA.Datum.prototype.setInterpolatorPositions = function(positions) {
    this.interpolator.setAttribute("keyValue", positions);
};

NEBULA.Datum.prototype.insert = function() {
    this.parent.appendChild(this.group);
};

NEBULA.Datum.prototype.remove = function() {
    this.group.parentNode.removeChild(this.group);
};

NEBULA.Datum.prototype.toggleSelect = function() {
    this.status ^= NEBULA.DATUM_STATUS_SELECTED;
    this.updateStyle();
};

NEBULA.Datum.prototype.selected = function() {
	return (this.status & NEBULA.DATUM_STATUS_SELECTED) !== 0;
};

NEBULA.Datum.prototype.select = function(bool) {
	if (bool) {
		this.status |= NEBULA.DATUM_STATUS_SELECTED;
	}
	else {
		this.status &= ~NEBULA.DATUM_STATUS_SELECTED;
	}
    this.updateStyle();
};

NEBULA.Datum.prototype.toggleHighlight = function() {
    this.status ^= NEBULA.DATUM_STATUS_HIGHLIGHTED;
    this.updateStyle();
};

NEBULA.Datum.prototype.highlighted = function() {
	return (this.status & NEBULA.DATUM_STATUS_HIGHLIGHTED) !== 0;
};

NEBULA.Datum.prototype.highlight = function(bool) {
    if (bool) {
    	this.status |= NEBULA.DATUM_STATUS_HIGHLIGHTED;
    }
    else {
    	this.status &= ~NEBULA.DATUM_STATUS_HIGHLIGHTED;
    }
    this.updateStyle();
};

NEBULA.Datum.prototype.updateStyle = function() {
    var style = 0;
    if (this.status & NEBULA.DATUM_STATUS_SELECTED) {
        style = NEBULA.DATUM_STYLE_SELECTED;
    }
    else if (this.status & NEBULA.DATUM_STATUS_HIGHLIGHTED) {
        style = NEBULA.DATUM_STYLE_HIGHLIGHTED;
    }
    
    for (var i=0; i < this.style_switches.length; i++) {
        this.style_switches[i].setAttribute("whichChoice", style);
    }
};

NEBULA.DatumSet = function() {
    this.map = new Map();
};

NEBULA.DatumSet.prototype.add = function(datum) {
    if (this.map.has(datum.getId())) {
        console.log("Adding an existing ID to datum set");
    }
    this.map.set(datum.getId(), datum);
};

NEBULA.DatumSet.prototype.get = function(id) {
    return this.map.get(id);
};

NEBULA.DatumSet.prototype.has = function(id) {
    return this.map.has(id);
};

NEBULA.DatumSet.prototype.remove = function(id) {
    return this.map.remove(id);
};

NEBULA.DatumSet.prototype.keys = function() {
    return this.map.keys();
};

/*
 * Iterates up the target's parents until a group node is found. The ID of the
 * group node is then extracted and searched for in the list of nodes.
 */
NEBULA.DatumSet.prototype.find = function(target) {
    while (target.nodeName !== "GROUP") {
        target = target.parentElement;
        if (target === null) {
            return null;
        }
    }
    
    var id = target.getAttribute("id").substring(5);
    if (!this.map.has(id)) {
        console.log("Object not found in datum set");
        return null;
    }
    
    return this.map.get(id);
};