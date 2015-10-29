var _ = require('underscore');
var EventEmitter = require('events');
var util = require('util');
var raf = require('raf');
var Touch = require('hammerjs');
var Paper = require("./vendor/paper");
var domready = require("domready");
var closest = require("closest");

function UnInVisible(options) {
	this.options = _.clone(UnInVisible.defaults);

	this.isDevice = !!('ontouchstart' in window);

	this.sourceElement = null;
	this.url = null;
	this.image = null;
	this.dimensions = {
		scale: 1,
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

_.extend(UnInVisible.prototype, {
	setOptions: function(options) {
		_.extend(this.options, options);
		return this;
	},

	_setupDocument: function(doc) {
		if(doc) this.options.document = doc;
		doc = doc || document;

		// find all links in the document and add click events
		var self = this;

		function onClick(e){
			var target = closest(e.target, '[data-uninvisible]', true);
			if(target){
				e.preventDefault();
				self.open(target);
			}
		}

		doc.addEventListener("click", onClick);

		self.once('destroy', function() {
				doc.removeEventListener("click", onClick);
		});
	},

	_createView: function(){
		if(this.imageElement) return;

		var container = this.container = document.createElement('div');
		container.classList.add('uninvisible-container');

		var imageDiv = this.imageDiv = this.imageElement = document.createElement('div');
    	imageDiv.classList.add('uninvisible-image');

			imageDiv.style.webkitTransition = 'opacity .2s';
			imageDiv.style.oTransition = 'opacity .2s';
			imageDiv.style.mozTransition = 'opacity .2s';
			imageDiv.style.msTransition = 'opacity .2s';
			imageDiv.style.transition = 'opacity .2s';

		var captionContainer = this.captionContainer = document.createElement( 'figcaption' );
		captionContainer.classList.add('caption-container');

		var captionTitle = this.captionTitle = this.isDevice === false ? document.createElement( 'h1' ) : document.createElement('h2');
		captionTitle.classList.add('caption-title');
		captionContainer.appendChild( captionTitle );

		var captionText = this.captionText = this.isDevice === false ? document.createElement( 'div' ) : document.createElement('h4');
		captionText.classList.add('caption-text');
		captionContainer.appendChild(captionText);

		var loadingSpinner = this.loadingSpinner = document.createElement('div');
		loadingSpinner.classList.add('spinner');

		container.appendChild(imageDiv);
		container.appendChild(captionContainer);
		container.appendChild(loadingSpinner);
	},

	_renderView: function(){
		document.body.appendChild(this.container);
	},

	_removeView: function(){
		if(this.container && this.container.parentNode) this.container.parentNode.removeChild(this.container);
	},

	open: function(img, options){
		var Uninvisible = this;

		if(Uninvisible.isAnimating || Uninvisible.isOpen) return;

		if(typeof img !== 'string' && img.nodeType === 1){
			if(closest(img, '[data-uninvisible-nozoom]', true)) return;
		}

		options = Uninvisible.currentImageOptions = options || {};

		// Uninvisible.container.style.opacity = 0;
		Uninvisible.container.style.display = 'block';
		Uninvisible.imageDiv.style.opacity = 0;
		Uninvisible.loadingSpinner.classList.remove('done-loading');

		Uninvisible._setupImage(img, options, function(){
			Uninvisible.imageDiv.style.opacity = 1;
			Uninvisible.loadingSpinner.classList.add('done-loading');
			Uninvisible._open(options);

			setTimeout(function(){
					Uninvisible._turnOnTransitions();
					Uninvisible._addAnimationCompleteListener(_onOpenComplete);
			},1);

			setTimeout(function(){
				Uninvisible._expand(options);
				// Uninvisible.container.style.opacity = 1;
			},10);
		});
			Uninvisible._open(options);
			Uninvisible.setCaption(options);
			Uninvisible._renderView();
			Uninvisible._setupCloseListener();
			setTimeout(function(){
				// Uninvisible._expand(options);
				Uninvisible.container.style.opacity = 1;
			},10);

			function _onOpenComplete(){
				Uninvisible.isAnimating = false;
				Uninvisible.isOpen = true;
				document.body.style.overflow = 'hidden';

				Uninvisible._removeAnimationCompleteListener(_onOpenComplete);
				Uninvisible._turnOffTransitions();

				if(Uninvisible.isDevice && !(options.zoom === "contain" || (Uninvisible.sourceElement && Uninvisible.sourceElement.dataset.uninvisibleZoom === "contain") || Uninvisible.options.zoom === "contain")){
					Uninvisible._initTrackingTouch();
				} else {
					Uninvisible._initTrackingMouse();
				}

				Uninvisible.emit('open');
				if(typeof options.onOpen === 'function') options.onOpen();
			}
	},

	_setupImage: function(img, options, cb){
		var Uninvisible = this;
		var dataUrl, newImg;
		Uninvisible.mapPin.status = false;
		Uninvisible.imageDiv.style.backgroundSize = "100%";

		Uninvisible.sourceElement = img;

		if(typeof img === 'string'){
			Uninvisible.sourceElement = null;
			Uninvisible.url = img;

			newImg = Uninvisible.image = new Image();
			newImg.src = Uninvisible.imageElement.src = Uninvisible.url = img;

			Uninvisible.imageDiv.style.backgroundImage = "url(" + newImg.src + ")";

			newImg.addEventListener('load', function(){
				cb();
			});
		} else if(img.nodeType === 1 && img.tagName !== 'IMG'){
			Uninvisible.image = img;
			dataUrl = options.url || img.dataset.uninvisibleUrl;

			if(dataUrl == null && img.style.backgroundImage != null){
				dataUrl = img.style.backgroundImage.substring(4, img.style.backgroundImage.length - 1);
			}

			newImg = new Image();
			newImg.src = Uninvisible.imageElement.src = Uninvisible.url = dataUrl;
			Uninvisible.image = newImg;

			if(img.dataset.uninvisiblePin !== undefined){
				Uninvisible.mapPin.status = true;
				Uninvisible.imageDiv.style.backgroundImage = "url('Maps/pin.PNG'),url('" + dataUrl + "')";
				Uninvisible.mapPin.x = Uninvisible.pins[img.dataset.uninvisiblePin].x;
				Uninvisible.mapPin.y = Uninvisible.pins[img.dataset.uninvisiblePin].y;
				Uninvisible.imageDiv.style.backgroundPosition = Uninvisible.mapPin.x + "px " + Uninvisible.mapPin.y + "px,left top";
				Uninvisible.imageDiv.style.backgroundSize = "5%, 100%";
			}

			newImg.addEventListener('load', function(){
				cb();
			});
		} else if(img.nodeType === 1 && img.tagName === 'IMG') {

			if(options.url || img.dataset.uninvisibleUrl){
				newImg = new Image();
				newImg.src = Uninvisible.imageElement.src = Uninvisible.url = options.url || img.dataset.uninvisibleUrl;
				Uninvisible.image = newImg;

				Uninvisible.imageDiv.style.backgroundImage="url(" + newImg.src + ")";

				newImg.addEventListener('load', function(){
					cb();
				});
			} else {
				Uninvisible.imageDiv.style.backgroundImage="url(" + img.src + ")";
				Uninvisible.imageElement.src = img.src;
				Uninvisible.image = img;
				cb();
			}
		} else {
			return null;
		}
	},

	_setupCloseListener: function(){
		var Uninvisible = this;

		this.touch.on('tap', closeImg);

		function closeImg(e){
			e.srcEvent.stopPropagation();
			e.preventDefault();
			Uninvisible.close.bind(Uninvisible)();
		}

		var xListener = function(){
			this.touch.off('tap', closeImg);
			Uninvisible.removeListener('close:start', xListener);
		};

		Uninvisible.on('close:start', xListener);
	},

	close: function(options){
		if(this.isAnimating) return;

		options = options || {};

		this._close(options);
	},

	closeViewerImmediately: function(){
		this.emit('close:start');
		this.container.style.display = 'none';
		this.clearCaption();
	},

	setCaption: function(options){
		var Uninvisible = this;

		var title = options.title || (Uninvisible.sourceElement != null ? Uninvisible.sourceElement.dataset.uninvisibleTitle : null);
		var text = options.text || (Uninvisible.sourceElement != null ?  Uninvisible.sourceElement.dataset.uninvisibleText : null);

		if(title || text) Uninvisible.captionContainer.style.display = 'block';
		if(title && title.trim().length){
			Uninvisible.captionTitle.innerHTML = title;
			Uninvisible.captionTitle.style.display = 'block';
		}
		if(text && text.trim().length){
			Uninvisible.captionText.innerHTML = text;
			Uninvisible.captionText.style.display = 'block';
		}
	},

	clearCaption: function(){
		this.captionContainer.style.display = 'none';

		this.captionTitle.style.display = 'none';
		this.captionTitle.innerHTML = '';

		this.captionText.style.display = 'none';
		this.captionText.innerHTML = '';
	},

	_open: function(options){
		var Uninvisible = this;
		if(Uninvisible.isAnimating) return;
		Uninvisible.isAnimating = true;
		Uninvisible.emit('open:start');

		Uninvisible._resetMatrix();
		Uninvisible._setToImgLocation();
		// Uninvisible.container.style.display = 'block';

		// setTimeout(function(){
		// 		Uninvisible._turnOnTransitions();
		// 		Uninvisible._addAnimationCompleteListener(_onOpenComplete);
		// },1);
// Uninvisible.container.style.opacity = 1;
		// setTimeout(function(){
		// 	Uninvisible._expand(options);
		// 	Uninvisible.container.style.opacity = 1;
		// },10);

		// function _onOpenComplete(){
		// 	Uninvisible.isAnimating = false;
		// 	Uninvisible.isOpen = true;
		// 	document.body.style.overflow = 'hidden';
		//
		// 	Uninvisible._removeAnimationCompleteListener(_onOpenComplete);
		// 	Uninvisible._turnOffTransitions();
		//
		// 	if(Uninvisible.isDevice && !(options.zoom === "contain" || (Uninvisible.sourceElement && Uninvisible.sourceElement.dataset.uninvisibleZoom === "contain") || Uninvisible.options.zoom === "contain")){
		// 		Uninvisible._initTrackingTouch();
		// 	} else {
		// 		Uninvisible._initTrackingMouse();
		// 	}
		//
		// 	Uninvisible.emit('open');
		// 	if(typeof options.onOpen === 'function') options.onOpen();
		// }
	},

	_close: function(options){
		var Uninvisible = this;
		Uninvisible._turnOnTransitions();
		Uninvisible.isAnimating = true;
		this.emit('close:start');

		Uninvisible._addAnimationCompleteListener(_onCloseComplete);
		Uninvisible._setToImgLocation();
		Uninvisible.container.style.opacity = 0;

		// FIXES BUG WHERE ANIMATION LISTENER DOESNT FIRE WHEN NOT RETURNING TO AN ELEMENT ON THE PAGE
		setTimeout(function(){
			if(Uninvisible.isAnimating === true) _onCloseComplete();
		}, Uninvisible.options.animationSpeed);

		function _onCloseComplete(){
			Uninvisible.isAnimating = false;
			Uninvisible.isOpen = false;

			document.body.style.overflow = '';
			document.body.style.cursor = 'auto';

			Uninvisible.container.style.display = 'none';
			Uninvisible.imageDiv.style.opacity = 0;
			Uninvisible.clearCaption();
			Uninvisible.sourceElement = null;
			Uninvisible.image = null;

			Uninvisible._turnOffTransitions();
			Uninvisible._removeAnimationCompleteListener(_onCloseComplete);

			Uninvisible._removeView();

			if(typeof options.onClose === 'function') options.onClose();
			if(typeof Uninvisible.currentImageOptions.onClose === 'function') Uninvisible.currentImageOptions.onClose();
			Uninvisible.currentImageOptions = {};

			Uninvisible.emit('close');
		}
	},

	_expand: function(options){
		var Uninvisible = this;
		var imageElement = Uninvisible.imageElement;
		var matrix = this.matrix;

		var containerW = window.innerWidth,
			containerH = window.innerHeight;

		var imgW = Uninvisible.image.naturalWidth,
			imgH = Uninvisible.image.naturalHeight;

		var scale, scaledHeight, scaledWidth;

		if(!Uninvisible.isDevice){
			if(options.zoom === "contain" || (Uninvisible.sourceElement && Uninvisible.sourceElement.dataset.uninvisibleZoom === "contain") || Uninvisible.options.zoom === "contain"){
				Uninvisible.orientation = 1;
				if (imgW < containerW && imgH < containerH){
					if(imgW / imgH >= containerW / containerH){
						setToNaturalWidth(true);
					} else {
						setToNaturalHeight(true);
					}
				} else {
					if(imgW / imgH >= containerW / containerH){
						setToContainHorizontal(false);
					} else {
						setToContainVertical(false);
					}
				}
			} else if (imgW < containerW || imgH < containerH){
				if(imgW / imgH >= containerW / containerH){
					Uninvisible.orientation = imgW > containerW ? 2 : 0; //..LARGER HORIZONTALLY or smaller than window
					setToNaturalWidth(true);
				} else {
					Uninvisible.orientation = imgH > containerH ? 3 : 0; //..LARGER VERTICALLY or smaller than window
					setToNaturalHeight(true);
				}
			} else if (options.zoom === "free" || (Uninvisible.sourceElement && Uninvisible.sourceElement.dataset.uninvisibleZoom === "free") || Uninvisible.options.zoom === "free"){
				Uninvisible.orientation = 6;
				if(imgW / imgH > containerW / containerH){ //..CONTAINED HORIZONTAL
					setToNaturalWidth(true);
			 } else { //..CONTAINED VERTICAL
				 setToNaturalHeight(true);
			 }
			} else if(imgW / imgH > containerW / containerH){ //..CONTAINED HORIZONTAL
				Uninvisible.orientation = 4;
				setToContainHorizontal(true);
		 } else { //..CONTAINED VERTICAL
			 Uninvisible.orientation = 5;
			 setToContainVertical(true);
		 }
		} else { // DEVICE
			scale = Uninvisible.dimensions.scale = 1;
			if(options.zoom === "contain" || (Uninvisible.sourceElement && Uninvisible.sourceElement.dataset.uninvisibleZoom === "contain") || Uninvisible.options.zoom === "contain"){
				Uninvisible.orientation = 1;
			} else {
				Uninvisible.orientation = 6;
			}

			if(imgW / imgH > containerW / containerH){ //..CONTAINED HORIZONTAL
				setToContainHorizontal(false);
		 } else { //..CONTAINED VERTICAL
			 setToContainVertical(false);
		 }
		}

		function setToNaturalWidth(transform){
			scaledHeight = Uninvisible.dimensions.initialHeight = (containerW / imgW) * imgH;
			Uninvisible.dimensions.initialWidth = containerW;

			Uninvisible._setImagePosition({
				left: 0,
				top: (containerH - scaledHeight) / 2,
				width: containerW,
				height: scaledHeight
			});

			if(transform){
				scale = Uninvisible.dimensions.scale = imgW / containerW;
				matrix.scale(scale);
				Uninvisible._transform([ matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty ]);
			}
		}

		function setToNaturalHeight(transform){
			Uninvisible.dimensions.initialHeight = containerH;
			scaledWidth = Uninvisible.dimensions.initialWidth = (containerH / imgH) * imgW;

			Uninvisible._setImagePosition({
				left: (containerW - scaledWidth) / 2,
				top: 0,
				width: scaledWidth,
				height: containerH
			});
			if(transform){
				scale = Uninvisible.dimensions.scale = imgH / containerH;
				matrix.scale(scale);
				Uninvisible._transform([ matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty ]);
			}
		}

		function setToContainHorizontal(transform){
			Uninvisible.dimensions.initialWidth = containerW;
			scaledHeight = Uninvisible.dimensions.initialHeight = (containerW / imgW) * imgH;

			Uninvisible._setImagePosition({
				left: 0,
				top: (containerH - scaledHeight) / 2,
				width: containerW,
				height: scaledHeight
			});

			if(transform){
				scale = Uninvisible.dimensions.scale = containerH / scaledHeight;
				matrix.scale(scale);
				Uninvisible._transform([ matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty ]);
			}
		}

		function setToContainVertical(transform){
			scaledWidth = Uninvisible.dimensions.initialWidth = (containerH / imgH) * imgW;
			Uninvisible.dimensions.initialHeight = containerH;

			Uninvisible._setImagePosition({
			 left: (containerW - scaledWidth) / 2,
			 top: 0,
			 width: scaledWidth,
			 height: containerH
		 });

		 if(transform){
		 	scale = Uninvisible.dimensions.scale = containerW / scaledWidth;
 			matrix.scale(scale);
 			Uninvisible._transform([ matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty ]);
		 }
		}
	},

	_setImagePosition: function(p){
		var img = this.imageElement;

		if(p.top || p.top === 0) img.style.top = p.top + 'px';
		if(p.left || p.left === 0) img.style.left = p.left + 'px';
		if(p.width) img.style.width = p.width + 'px';
		if(p.height) img.style.height = p.height + 'px';

		if(this.mapPin.status){
			this.mapPin.sX = (this.mapPin.x - 100) * (p.width / 4300);
	    this.mapPin.sY = (this.mapPin.y - 70) * (p.height / 2950);
	    this.imageDiv.style.backgroundPosition = this.mapPin.sX + "px " + this.mapPin.sY + "px,left top";
		}
	},

	_setToImgLocation: function(){
		var Uninvisible = this;

		var containerW = window.innerWidth,
			containerH = window.innerHeight;

		var position;
		if(Uninvisible.sourceElement) position = Uninvisible.sourceElement.getBoundingClientRect();

		// will also be null if the source element has been removed
		if(position == null && Uninvisible.image){
			position = {
				left: (containerW - Uninvisible.image.naturalWidth) / 2,
				top: (containerH - Uninvisible.image.naturalHeight) / 2,
				width: Uninvisible.image.naturalWidth,
				height: Uninvisible.image.naturalHeight
			};
		} else if (position == null) {
			position = {
				left: 0,
				top: 0,
				width: containerW,
				height: containerH
			};
		}

		Uninvisible._setImagePosition({
			top: position.top,
			left: position.left,
			width: position.width,
			height: position.height
		});

		// Uninvisible.container.style.opacity = 0;
	},

	_turnOnTransitions: function(){
		var imageElement = this.imageElement;
		var container = this.container;
		var speed = (this.options.animationSpeed / 1000) + 's';

		imageElement.style.webkitTransition = 'top ' + speed +', height ' + speed + ', width ' + speed + ', left ' + speed + ', opacity ' + speed;
		imageElement.style.oTransition = 'top ' + speed +', height ' + speed + ', width ' + speed + ', left ' + speed + ', opacity ' + speed;
		imageElement.style.mozTransition = 'top ' + speed +', height ' + speed + ', width ' + speed + ', left ' + speed + ', opacity ' + speed;
		imageElement.style.msTransition = 'top ' + speed +', height ' + speed + ', width ' + speed + ', left ' + speed + ', opacity ' + speed;
		imageElement.style.transition = 'top ' + speed +', height ' + speed + ', width ' + speed + ', left ' + speed + ', opacity ' + speed;
		// container.style.webkitTransition = 'opacity ' + speed;
		// container.style.oTransition = 'opacity ' + speed;
		// container.style.mozTransition = 'opacity ' + speed;
		// container.style.msTransition = 'opacity ' + speed;
		// container.style.transition = 'opacity ' + speed;
	},

	_turnOnContainerTransitions: function(){
		var container = this.container;
		var speed = (this.options.animationSpeed / 1000) + 's';

		container.style.webkitTransition = 'opacity ' + speed;
		container.style.oTransition = 'opacity ' + speed;
		container.style.mozTransition = 'opacity ' + speed;
		container.style.msTransition = 'opacity ' + speed;
		container.style.transition = 'opacity ' + speed;
	},

	_turnOffTransitions: function(){
		var imageElement = this.imageElement;
		var container = this.container;

		imageElement.style.webkitTransition = 'none';
		imageElement.style.oTransition = 'none';
		imageElement.style.mozTransition = 'none';
		imageElement.style.msTransition = 'none';
		imageElement.style.transition = 'none';
		// container.style.webkitTransition = 'none';
		// container.style.oTransition = 'none';
		// container.style.mozTransition = 'none';
		// container.style.msTransition = 'none';
		// container.style.transition = 'none';
	},

	_addAnimationCompleteListener: function(fn){
		var imageElement = this.imageElement;

		imageElement.addEventListener("webkitTransitionEnd", fn);
		imageElement.addEventListener("oanimationend", fn);
		imageElement.addEventListener("transitionend", fn);
	},

	_removeAnimationCompleteListener: function(fn){
		var imageElement = this.imageElement;

		imageElement.removeEventListener("webkitTransitionEnd", fn);
		imageElement.removeEventListener("oanimationend", fn);
		imageElement.removeEventListener("transitionend", fn);
	},

	_addTouch: function(){
		this.touch = window.Hammer = new Touch.Manager(this.container, {});

		var pinch = new Touch.Pinch();
		// var rotate = new Touch.Rotate();
		var tap = new Touch.Tap();
		// pinch.recognizeWith(rotate);

		this.touch.add([pinch, tap]);

		this.touch.get('pinch').set({ enable: true });
		// this.touch.get('rotate').set({ enable: true });
	},

	_initTrackingMouse: function(){
		var Uninvisible = this;

		var matrix = this.matrix;
		var clone = matrix.clone();
		var origTx = clone.tx;
		var origTy = clone.ty;

		var imgW = Uninvisible.dimensions.initialWidth,
				imgH = Uninvisible.dimensions.initialHeight;

		var scaledHeight, scaledWidth;

		var xDestPercent = 50, yDestPercent = 50,
				xPercent = 50, yPercent = 50,
				followMouse,
				expandByX, expandByY;

		var currTx = 0,
				currTy = 0;
		var newTx = currTx,
				newTy = currTy;
		var x = 0, y = 0;

		followMouse = _.throttle(function(e){
			if(Uninvisible.orientation < 2) return;

			xDestPercent = (e.clientX / window.innerWidth) * 100;
			yDestPercent = (e.clientY / window.innerHeight) * 100;
		}, 1000/30);

		var SLIDE_SPEED = Math.max(Math.min(this.options.trackSpeed, 1), 0.01);
		function positionImage(){
			switch(Uninvisible.orientation){
				case 0:
				case 1:
					break;
				// HORIZONTAL
				case 2:
				case 4:
					positionX();
					break;
				// VERTICAL
				case 3:
				case 5:
					positionY();
					break;
				// FREE SCROLL
				case 6:
					positionX();
					positionY();
					break;
				}

				matrix.translate(x, y);
				Uninvisible._transform([ matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty ]);
		}

		function positionX(){
			xPercent = xPercent + ((xDestPercent - xPercent) * SLIDE_SPEED);
			if(xPercent < 0) xDestPercent = (xDestPercent * SLIDE_SPEED);
			if(xPercent > 100) xDestPercent = xDestPercent + ((100 - xDestPercent) * SLIDE_SPEED);

			if(xPercent < 50){
				expandByX = (50 - xPercent) / 100 * window.innerWidth / 2;
			} else {
				expandByX = -(50 - (100 - xPercent)) / 100 * window.innerWidth / 2;
			}

			scaledWidth = imgW * matrix.a;

			newTx = (window.innerWidth / 2) - (((scaledWidth + expandByX) / 2) - ((scaledWidth - window.innerWidth) * (xPercent / 100)));
			newTx /= matrix.a;

			x = currTx - newTx;

			currTx = newTx;
		}

		function positionY(){
			yPercent = yPercent + ((yDestPercent - yPercent) * SLIDE_SPEED);
			if(yPercent < 0) yDestPercent = (yDestPercent * SLIDE_SPEED);
			if(yPercent > 100) yDestPercent = yDestPercent + ((100 - yDestPercent) * SLIDE_SPEED);

			if(yPercent < 50){
				expandByY = (50 - yPercent) / 100 * window.innerHeight / 2;
			} else {
				expandByY = -(50 - (100 - yPercent)) / 100 * window.innerHeight / 2;
			}

			scaledHeight = imgH * matrix.a;
			newTy = (window.innerHeight / 2) - (((scaledHeight + expandByY) / 2) - ((scaledHeight - window.innerHeight) * (yPercent / 100)));
			newTy /= matrix.a;

			y = currTy - newTy;

			currTy = newTy;
		}

		addEventListener('mousemove', followMouse);
		loopDesktop();

		var looper;
		function loopDesktop(){
			looper = raf(loopDesktop);
			positionImage();
		}

		var xListener = function(){
			Uninvisible.removeListener('close:start', xListener);
			removeEventListener('mousemove', followMouse);
			raf.cancel(looper);
		};

		Uninvisible.on('close:start', xListener);
	},

	_initTrackingTouch: function(){
		var Uninvisible = this;

		var onTouchStart, onTouchEnd, handleTouchMove,
			isTouching = false,
			isZooming = false,
			startXTouch, startYTouch;

		var relCenterX, relCenterY;

		var matrix = this.matrix;

		var panOrigin;

		function onPinchStart(e){
			isZooming = true;
			panOrigin = Uninvisible._screenToImage(matrix, e.center.x, e.center.y);
		}

		function onPinchMove(e){
			// applied to a clone of the matrix so the next move resets
			Uninvisible._applyToMatrix(matrix.clone(), panOrigin, e.center.x, e.center.y, e.scale);
		}

		function onPinchEnd(e){
			setTimeout(function(){ isZooming = false; }, 200);

			// applied to the actual matrix so the next zoom applies on top
			Uninvisible._applyToMatrix(matrix, panOrigin, e.center.x, e.center.y, e.scale);
			panOrigin = null;

			Uninvisible._checkLocation();
		}

		onTouchStart = function(e){
			if(isZooming === true) return;
			isTouching = true;

			panOrigin = Uninvisible._screenToImage(matrix, e.pageX, e.pageY);
		};

		handleTouchMove = _.throttle(function(e){
			if(isZooming === true) return;

			// applied to a clone of the matrix so the next move resets
			Uninvisible._applyToMatrix(matrix.clone(), panOrigin, e.pageX, e.pageY, null);
		}, 1000/30);

		onTouchEnd = function(e){
			if(isZooming === true) return;

			// applied to the actual matrix so the next zoom applies on top
			Uninvisible._applyToMatrix(matrix, panOrigin, e.pageX, e.pageY, null);
			panOrigin = null;

			isTouching = false;

			Uninvisible._checkLocation();
		};

		this.touch.on('pinchstart', onPinchStart);
		this.touch.on('pinchmove', onPinchMove);
		this.touch.on('pinchend', onPinchEnd);
		this.imageElement.addEventListener("touchstart", onTouchStart);
		this.imageElement.addEventListener("touchend", onTouchEnd);
		this.imageElement.addEventListener("touchmove", handleTouchMove);

		var xListener = function(){
			Uninvisible.removeListener('close:start', xListener);
			Uninvisible.imageElement.removeEventListener("touchmove", handleTouchMove);
			Uninvisible.touch.off('pinchstart', onPinchStart);
			Uninvisible.touch.off('pinchmove', onPinchMove);
			Uninvisible.touch.off('pinchend', onPinchEnd);
		};

		Uninvisible.on('close:start', xListener);
	},


	// converts a point on the screen to a point on the image
	// origin of image is the center, not the top-left corner like the window
	_screenToImage: function(matrix, x, y) {
		var containerW = window.innerWidth,
				containerH = window.innerHeight;

		var screenCenterX = containerW / 2;
		var screenCenterY = containerH / 2;

		if (typeof x === "object") {
			y = x.y;
			x = x.x;
		}

		return matrix.inverseTransform(new Paper.Point(x - screenCenterX, y - screenCenterY));
	},

	// transform a matrix according to an event
	_applyToMatrix: function(matrix, panOrigin, x, y, scale) {
		// normalize the touch point relative to the image
		var center = this._screenToImage(matrix, x, y);

		// translate the image by the amount moved
		if(panOrigin) matrix.translate(center.x - panOrigin.x, center.y - panOrigin.y);

		// scale the image by the amount scaled
		// this is relative to the origin point, not the current touch location
		if(scale) matrix.scale(scale, panOrigin);

		// rasterize the matrix and apply it
		var t = [ matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty ].join(",");
		// imageElement.style.transform = "matrix(" + t + ")";
		this._transform(t);
	},

	_transform: function(t){
		if(typeof t === 'array'){
			t = t.join(",");
		}

		this.imageElement.style.transform = "matrix(" + t + ")";
	},

	_checkLocation: function(){
		var matrix = this.matrix;

		if(matrix.a < 1) this._resetMatrix();
		var containerW = window.innerWidth,
				containerH = window.innerHeight;

		var scaledWidth = this.dimensions.initialWidth * matrix.a,
				scaledHeight = this.dimensions.initialHeight * matrix.a;

		var fromLeft = (scaledWidth / 2) - (matrix.tx + (containerW / 2));
		var fromRight = fromLeft - (scaledWidth - containerW);

		if((fromLeft < 0 && fromRight < 0 && scaledWidth >= containerW) || (fromLeft > 0 && fromRight > 0 && scaledWidth < containerW)) matrix.tx += fromLeft;
		if((fromLeft < 0 && fromRight < 0 && scaledWidth < containerW) || (fromLeft > 0 && fromRight > 0 && scaledWidth >= containerW)) matrix.tx += fromRight;

		var fromTop = (scaledHeight/ 2) - (matrix.ty + (containerH / 2));
		var fromBottom = fromTop - (scaledHeight - containerH);

		if((fromTop < 0 && fromBottom < 0 && scaledHeight >= containerH) || (fromBottom > 0 && fromTop > 0 && scaledHeight < containerH)) matrix.ty += fromTop;
		if((fromTop < 0 && fromBottom < 0 && scaledHeight < containerH) || (fromBottom > 0 && fromTop > 0 && scaledHeight >= containerH)) matrix.ty += fromBottom;

		this._transform([matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty]);
	},

	_resetMatrix: function(m){
		var matrix = this.matrix;
		m = m || [];

		matrix.a = m[0] || 1;
		matrix.b = m[1] || 0;
		matrix.c = m[2] || 0;
		matrix.d = m[3] || 1;
		matrix.tx = m[4] || 0;
		matrix.ty = m[5] || 0;

		this._transform([matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty]);
	},

	destroy: function(){
		if(this.isOpen) this.closeViewerImmediately();
		this._removeView();
		this.emit('destroy');
	},
});

var U = module.exports = new UnInVisible();
