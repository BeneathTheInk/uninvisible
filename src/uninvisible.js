'use strict';

import clone from 'lodash/clone';
import extend from 'lodash/extend';
import EventEmitter from 'backbone-events-standalone';
import domready from "domready";
import * as setup from './setup.js';
import * as openClose from './open-close.js';
import * as matrix from './matrix.js';
import * as animations from './animations.js';
import * as caption from './caption.js';
import * as utils from './utils.js';

// TODO rebuild animation speed options
// TODO fix weird momentum scrolling
// TODO fix resizing when scrolling
// TODO customizable speeds, colors, cursor,..
// TODO slideshow

class UnInVisible{
	constructor(options) {
		this.options = extend(clone(UnInVisible.defaults), (options || {}));
		domready(this._init.bind(this));
	}
}

UnInVisible.defaults = {
	document: document,
	zoom: 'default',
	animationSpeed: 400,
	trackSpeed: 0.085
};

extend(UnInVisible.prototype, setup, openClose, matrix, animations, caption, utils, EventEmitter);

// module.exports = new UnInVisible();
export default new UnInVisible(); // exports es6 module, but then in the browser you get UnInVisible = Object {default: UnInVisible, __esModule: true}
