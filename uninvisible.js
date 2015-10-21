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

	domready(function() {
		this._createView();
		this._addTouch();
		this._setupDocument();
	}.bind(this));
}

util.inherits(UnInVisible, EventEmitter);

UnInVisible.defaults = {
	document: document,
	contains: false,
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
			if(target) self.open(target);
		};

		doc.addEventListener("click", onClick);

		self.once('destroy', function() {
				doc.removeEventListener("click", onClick);
		});
	},

	_createView: function(){
		if(this.imageElement) return;

		var container = this.container = document.createElement('div');
		container.classList.add('uninvisible-container');

		var imageElement = this.imageElement = document.createElement('img');
		imageElement.classList.add('uninvisible-image');

		var captionContainer = this.captionContainer = document.createElement( 'figcaption' );
		captionContainer.classList.add('caption-container');

		var captionTitle = this.captionTitle = this.isDevice === false ? document.createElement( 'h1' ) : document.createElement('h2');
		captionTitle.classList.add('caption-title');
		captionContainer.appendChild( captionTitle );

		var captionText = this.captionText = this.isDevice === false ? document.createElement( 'div' ) : document.createElement('h4');
		captionText.classList.add('caption-text');
		captionContainer.appendChild(captionText);

		container.appendChild(imageElement);
		container.appendChild(captionContainer);
	},

	_renderView: function(){
		document.body.appendChild(this.container);
	},

	_removeView: function(){
		if(this.container && this.container.parentNode) this.container.parentNode.removeChild(this.container);
	},

	open: function(img, options, cb){
		var Uninvisible = this;

		if(Uninvisible.isAnimating || Uninvisible.isOpen) return;

		if(typeof img !== 'string' && img.nodeType === 1){
			if(closest(img, '[data-uninvisible-nozoom]', true)) return;
		}

		if(options){
			if(typeof options === 'function' && cb == null){
				cb = options;
				options = {};
			}
		}
		options = options || {};

		Uninvisible._setupImage(img, options, function(){
			Uninvisible.setCaption(options);
			Uninvisible._renderView();
			Uninvisible._open(options);
			Uninvisible._setupCloseListener();
		});
	},

	_setupImage: function(img, options, cb){
		var Uninvisible = this;
		var dataUrl;

		Uninvisible.sourceElement = img;

		if(typeof img === 'string'){
			Uninvisible.sourceElement = null;
			Uninvisible.url = img;

			var newImg = Uninvisible.image = new Image();
			newImg.src = Uninvisible.imageElement.src = Uninvisible.url = img;

			newImg.addEventListener('load', function(){
				cb();
			});
		} else if(img.nodeType === 1 && img.tagName !== 'IMG'){
			Uninvisible.image = img;
			dataUrl = options.url || img.dataset.uninvisibleUrl;

			if(dataUrl == null && img.style.backgroundImage != null){
				dataUrl = img.style.backgroundImage.substring(4, img.style.backgroundImage.length - 1);
			};

			var newImg = Uninvisible.image = new Image();
			newImg.src = Uninvisible.imageElement.src = Uninvisible.url = dataUrl;

			newImg.addEventListener('load', function(){
				cb();
			});
		} else if(img.nodeType === 1 && img.tagName === 'IMG') {
			Uninvisible.image = img;

			if(options.url || img.dataset.uninvisibleUrl){
				var newImg = Uninvisible.image = new Image();
				newImg.src = Uninvisible.imageElement.src = Uninvisible.url = options.url || img.dataset.uninvisibleUrl;

				newImg.addEventListener('load', function(){
					cb();
				});
			} else {
				Uninvisible.imageElement.src = img.src;
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
		};

		Uninvisible.on('close:start', xListener);
	},

	close: function(options, cb){
		if(this.isAnimating) return;

		// if(options){
		// 	if(typeof options === 'function' && cb == null){
		// 		cb = options;
		// 		options = {};
		// 	}
		// }
		// options = options || {};

		this._close();
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

		UnInVisible.isAnimating = true;
		Uninvisible.emit('open:start');

		Uninvisible._transformImage({
			origin: '50% 50%'
		});

		Uninvisible._setToImgLocation();
		Uninvisible.container.style.display = 'block';

		setTimeout(function(){
				Uninvisible._turnOnTransitions();
				Uninvisible._addAnimationCompleteListener(_onOpenComplete);
		},1);

		setTimeout(function(){
			Uninvisible._expand(options);
		},10);


		if(Uninvisible.sourceElement){
			Uninvisible.sourceElement.classList.add('uninvisible-open');
		}

		function _onOpenComplete(){
			Uninvisible.isAnimating = false;
			Uninvisible.isOpen = true;
			document.body.style.overflow = 'hidden';

			Uninvisible._removeAnimationCompleteListener(_onOpenComplete);
			Uninvisible._turnOffTransitions();

			if(Uninvisible.isDevice){
				Uninvisible._initTrackingTouch();
			} else {
				Uninvisible._initTrackingMouse();
			}

			Uninvisible.emit('open');
		}
	},

	_close: function(){
		var Uninvisible = this;
		Uninvisible._turnOnTransitions();
		Uninvisible.isAnimating = true;
		this.emit('close:start');

		Uninvisible._addAnimationCompleteListener(_onCloseComplete);
		Uninvisible._setToImgLocation();

		// FIXES BUG WHERE ANIMATION LISTENER DOESNT FIRE WHEN NOT RETURNING TO AN ELEMENT ON THE PAGE
		setTimeout(function(){
			if(Uninvisible.isAnimating === true) _onCloseComplete();
		}, Uninvisible.options.animationSpeed);

		function _onCloseComplete(){
			Uninvisible.isAnimating = false;
			Uninvisible.isOpen = false;

			if(Uninvisible.sourceElement){
				Uninvisible.sourceElement.classList.remove('uninvisible-open');
			}

			document.body.style.overflow = '';
			document.body.style.cursor = 'auto';

			Uninvisible.container.style.display = 'none';
			Uninvisible.clearCaption();
			Uninvisible.sourceElement = null;

			Uninvisible._turnOffTransitions();
			Uninvisible._removeAnimationCompleteListener(_onCloseComplete);

			Uninvisible._removeView();

			Uninvisible.emit('close');
		}
	},

	_expand: function(options){
		var Uninvisible = this;
		var imageElement = Uninvisible.imageElement;

		var containerW = window.innerWidth,
			containerH = window.innerHeight;

		var imgW = Uninvisible.image.naturalWidth,
			imgH = Uninvisible.image.naturalHeight;

		var scale, scaledHeight, scaledWidth;

		if(!Uninvisible.isDevice){
			Uninvisible._setImagePosition({
				left: (containerW - imgW) / 2,
				top: (containerH - imgH) / 2,
				width: imgW,
				height: imgH
			});

			Uninvisible._transformImage({
				scale: 1
			});

			var imgSizeContain = options.contain || (Uninvisible.sourceElement ? Uninvisible.sourceElement.dataset.uninvisibleContain : Uninvisible.options.contain);

			if(options.freeZoom || (Uninvisible.sourceElement && Uninvisible.sourceElement.dataset.uninvisibleFreeZoom) || Uninvisible.options.freeZoom){
				Uninvisible.orientation = 6;
			} else if(imgSizeContain){
				Uninvisible.orientation = 1;
				 if(imgW < containerW && imgH < containerH){ // SMALLER THAN WINDOW

				 } else if(imgW / imgH > containerW / containerH){ //..CONTAINED HORIZONTAL
					 scale = Uninvisible.dimensions.scale = (containerW / imgW);

					 Uninvisible._transformImage({
						 scale: scale
					 });
				} else { //..CONTAINED VERTICAL
					scale = Uninvisible.dimensions.scale = containerH / imgH;

					Uninvisible._transformImage({
						scale: scale
					});
				}
			} else if(imgW < containerW || imgH < containerH){ // SMALL IMAGE..
				if(imgW > containerW || imgH > containerH){
					Uninvisible.orientation = imgW > containerW ? 2 : 3; //..LARGER HORIZONTALLY OR VERTICALLY
				} else {
					Uninvisible.orientation = 0; // ..SMALLER THAN WINDOW
				}
		} else { // LARGE IMAGE..
				if(imgW / imgH > containerW / containerH){
					Uninvisible.orientation = 4; //..HORIZONTAL

					scale = Uninvisible.dimensions.scale = containerH / imgH;

					Uninvisible._transformImage({
						scale: scale
					});
				} else {
					Uninvisible.orientation = 5; //..VERTICAL

					scale = Uninvisible.dimensions.scale = containerW / imgW;

					Uninvisible._transformImage({
						scale: scale
					});
				}
			}
		} else { // DEVICE
			scale = Uninvisible.dimensions.scale = 1;
			Uninvisible.orientation = 6;
			imageElement.style.transform = 'scale(1)';

			if(imgW / imgH > containerW / containerH){ //..CONTAINED HORIZONTAL
				scaledHeight = Uninvisible.dimensions.initialHeight = (containerW / imgW) * imgH;
				Uninvisible.dimensions.initialWidth = containerW;

				Uninvisible._setImagePosition({
					left: 0,
					top: (containerH - scaledHeight) / 2,
					width: containerW,
					height: scaledHeight
				});
		 } else { //..CONTAINED VERTICAL
			 scaledWidth = Uninvisible.dimensions.initialWidth = (containerH / imgH) * imgW;
			 Uninvisible.dimensions.initialHeight = containerH;

			 Uninvisible._setImagePosition({
 				left: (containerW - scaledWidth) / 2,
 				top: 0,
 				width: (containerH / imgH) * imgW,
 				height: containerH
 			});
		 }
		}

		Uninvisible.container.style.opacity = 1;
	},

	_transformImage: function(p){
		var img = this.imageElement;

		if(p.scale) img.style.transform = 'scale(' + p.scale + ')';
		if(p.origin) img.style.transformOrigin = p.origin;
	},

	_setImagePosition: function(p){
		var img = this.imageElement;

		if(p.top || p.top === 0) img.style.top = p.top + 'px';
		if(p.left || p.left === 0) img.style.left = p.left + 'px';
		if(p.width) img.style.width = p.width + 'px';
		if(p.height) img.style.height = p.height + 'px';
	},

	_setToImgLocation: function(){
		var Uninvisible = this;

		var containerW = window.innerWidth,
			containerH = window.innerHeight;

		var position;
		if(Uninvisible.sourceElement) position = Uninvisible.sourceElement.getBoundingClientRect();

		// will also be null if the source element has been removed
		if(position == null){
			position = {
				left: (containerW - Uninvisible.image.naturalWidth) / 2,
				top: (containerH - Uninvisible.image.naturalHeight) / 2,
				width: Uninvisible.image.naturalWidth,
				height: Uninvisible.image.naturalHeight
			};
		}

		Uninvisible._setImagePosition({
			top: position.top,
			left: position.left,
			width: position.width,
			height: position.height
		});

		Uninvisible.container.style.opacity = 0;
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
		container.style.webkitTransition = 'none';
		container.style.oTransition = 'none';
		container.style.mozTransition = 'none';
		container.style.msTransition = 'none';
		container.style.transition = 'none';
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

		var containerW = window.innerWidth,
				containerH = window.innerHeight;

		var imgW = Uninvisible.image.naturalWidth,
				imgH = Uninvisible.image.naturalHeight;

		var horizontalMargin = containerW - imgW,
				verticalMargin = containerH - imgH;

		var xDestPercent = yDestPercent = 50,
				xPercent = yPercent = 50,
				followMouse,
				expandByX, expandByY;

		followMouse = _.throttle(function(e){
			if(Uninvisible.orientation < 2) return;

			xDestPercent = (e.clientX / containerW) * 100;
			yDestPercent = (e.clientY / containerH) * 100;
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
		}

		function positionX(){
			xPercent = xPercent + ((xDestPercent - xPercent) * SLIDE_SPEED);
			if(xPercent < 0) xDestPercent = (xDestPercent * SLIDE_SPEED);
			if(xPercent > 100) xDestPercent = xDestPercent + ((100 - xDestPercent) * SLIDE_SPEED);

			if(xPercent < 50){
				expandByX = ((50 - xPercent) / 100) * 50;
			} else {
				expandByX = -((50 - (100 - xPercent)) / 100) * 50;
			}

			Uninvisible._setImagePosition({
				left: expandByX + (horizontalMargin - (horizontalMargin - (horizontalMargin * (xPercent / 100))))
			});
		}

		function positionY(){
			yPercent = yPercent + ((yDestPercent - yPercent) * SLIDE_SPEED);
			if(yPercent < 0) yDestPercent = (yDestPercent * SLIDE_SPEED);
			if(yPercent > 100) yDestPercent = yDestPercent + ((100 - yDestPercent) * SLIDE_SPEED);

			if(yPercent < 50){
				expandByY = ((50 - yPercent) / 100) * 50;
			} else {
				expandByY = -((50 - (100 - yPercent)) / 100) * 50;
			}

			Uninvisible._setImagePosition({
				top: expandByY + (verticalMargin - (verticalMargin - (verticalMargin * (yPercent / 100))))
			});
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

		var matrix = Uninvisible.matrix = new Paper.Matrix();
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

		// snap scale to 1 if is smaller
		if(matrix.a < 1){
			matrix.a = 1;
			matrix.b = 0;
			matrix.c = 0;
			matrix.d = 1;
			matrix.tx = 0;
			matrix.ty = 0;
		}

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

	destroy: function(){
		if(this.isOpen) this.closeViewerImmediately();
		this._removeView();
		this.emit('destroy');
	},
});

var U = module.exports = new UnInVisible();
