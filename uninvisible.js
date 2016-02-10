'use strict';

import * as _ from 'underscore';
import EventEmitter from 'events';
import domready from "domready";
import * as setup from './setup.js';
import * as openClose from './open-close.js';
import * as matrix from './matrix.js';
import * as animations from './animations.js';
import * as caption from './caption.js';
import * as utils from './utils.js';

class UnInVisible extends EventEmitter {
	constructor(options) {
		super();
		this.options = _.extend(_.clone(UnInVisible.defaults), (options || {}));
		domready(this._init.bind(this));
	}
}

UnInVisible.defaults = {
	document: document,
	zoom: 'default',
	animationSpeed: 400,
	trackSpeed: 0.085
};

_.extend(UnInVisible.prototype, setup, openClose, matrix, animations, caption, utils);

module.exports = new UnInVisible();
// export default new UnInVisible(); // exports es6 module, but then in the browser you get UnInVisible = Object {default: UnInVisible, __esModule: true}




// var _ = require('underscore');
// var EventEmitter = require('events');
// var util = require('util');
// var domready = require("domready");

// function UnInVisible(options) {
// 	this.options = _.extend(_.clone(UnInVisible.defaults), (options || {}));
// 	domready(this._init.bind(this));
// }
//
// util.inherits(UnInVisible, EventEmitter);
//
// UnInVisible.defaults = {
// 	document: document,
// 	zoom: 'default',
// 	animationSpeed: 400,
// 	trackSpeed: 0.085
// };
//
// _.extend(UnInVisible.prototype,
// 	require('./src/setup.js'),
// 	require('./src/open-close.js'),
// 	require('./src/matrix.js'),
// 	require('./src/animations.js'),
// 	require('./src/caption.js'),
// 	require('./src/utils.js')
// );
//
// module.exports = new UnInVisible();
