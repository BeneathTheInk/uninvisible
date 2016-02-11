var _ = require('underscore');
var EventEmitter = require('events');
var util = require('util');
var domready = require("domready");

// TODO rebuild animation speed options
// TODO fix weird momentum scrolling
// TODO fix resizing when scrolling
// TODO customizable speeds, colors, cursor,..
// TODO slideshow


function UnInVisible(options) {
	this.options = _.extend(_.clone(UnInVisible.defaults), (options || {}));
	domready(this._init.bind(this));
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
