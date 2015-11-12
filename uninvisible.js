var _ = require('underscore');
var EventEmitter = require('events');
var util = require('util');
var Paper = require("./vendor/paper");
var domready = require("domready");


function UnInVisible(options) {
	options = options || {};

	this.options = _.extend(_.clone(UnInVisible.defaults), options);

	this.isDevice = !!('ontouchstart' in window);

	this.sourceElement = null;
	this.image = null;
	this.imageUrl = null;
	this.dimensions = {
		initialScale: 1,
		initialWidth: null,
		initialHeight: null
	};

	this.matrix = new Paper.Matrix();

	this.isAnimating = false;
	this.isOpen = false;
	this.orientation = null;
		// 0 = image is smaller than window
		// 1 = image is contained within window
		// 2 = image height smaller, horizontal width larger than window
		// 3 = image width smaller, vertical height larger than window
		// 4 = fullscreen horizontal
		// 5 = fullscreen vertical
		// 6 = fullscreen free scroll

	this.mapPin = window.mapPin || {
		status: false,
		sX: null,
		sY: null,
		x: null,
		y: null
	};

	this.pins = window.pins || {
		x: null,
		y: null
	};

	domready(function() {
		this._createView();
		this._addTouch();
		this._setupDocument();
		this._turnOnContainerTransitions();
	}.bind(this));
}

util.inherits(UnInVisible, EventEmitter);

UnInVisible.defaults = {
	document: document,
	zoom: 'default',
	animationSpeed: 400,
	trackSpeed: 0.085
};

_.extend(UnInVisible.prototype,
	require('./src/setup.js'),
	require('./src/open-close.js'),
	require('./src/matrix.js'),
	require('./src/animations.js'),
	require('./src/caption.js'),
	require('./src/utils.js')
);

module.exports = new UnInVisible();

	// TODO preloadImages?
	// preloadImages: function(){
	//
	// }
