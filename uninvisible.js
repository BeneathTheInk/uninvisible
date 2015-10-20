var _ = require('underscore');
var EventEmitter = require('events');
var util = require('util');
var raf = require('raf');
var Touch = require('hammerjs');
var Paper = require("./vendor/paper");

function UnInVisible(options){
	options = options || {};
	this.options = options;

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
	this.settings = {
		contain: false, // all images will be contained within the view, no zoom.
		animationSpeed: options.animationSpeed || 400,
		trackSpeed: options.trackSpeed ? Math.max(Math.min(options.trackSpeed, 1), 0.01) : 0.5,
		clickEvent: options.clickEvent || 'click'
	};

	this._createView();
	if(options.target !== false) this._addClickListeners(options.target || 'uninvisible');
	this._addTouch();
}
util.inherits(UnInVisible, EventEmitter);

_.extend(UnInVisible.prototype, {
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

	_addClickListeners: function(){
		var Uninvisible = this;
		var e = Uninvisible.settings.clickEvent;

		var targets = document.querySelectorAll('[data-uninvisible]');
		for(var i = 0; i < targets.length; i++){
			targets[i].addEventListener(e, _onClick);
		}

		Uninvisible.on('destroy', function(){
				for(var i = 0; i < targets.length; i++){
					targets[i].removeEventListener(e, _onClick);
				}
		});

		function _onClick(e){
			if(!e.target.classList.contains('uninvisible-open') && !e.target.dataset.uninvisibleNozoom && !e.target.dataset.nozoom){
				Uninvisible.open(e.target);
			}
		}
	},

	open: function(img, options, cb){
		var Uninvisible = this;

		if(Uninvisible.isAnimating || Uninvisible.isOpen) return;

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

		Uninvisible.on('close', xListener);
	},

	close: function(options, cb){
		if(this.isAnimating) return;

		this.emit('close:before');

		if(options){
			if(typeof options === 'function' && cb == null){
				cb = options;
				options = {};
			}
		}
		options = options || {};

		this._close();
	},

	closeViewerImmediately: function(){
		this.emit('close');
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
		Uninvisible.emit('open');

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
			Uninvisible._trackMovement();
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

			Uninvisible.emit('open:after');
		}
	},

	_close: function(){
		var Uninvisible = this;
		Uninvisible._turnOnTransitions();
		Uninvisible.isAnimating = true;
		this.emit('close');

		Uninvisible._addAnimationCompleteListener(_onCloseComplete);
		Uninvisible._setToImgLocation();

		// FIXES BUG WHERE ANIMATION LISTENER DOESNT FIRE WHEN NOT RETURNING TO AN ELEMENT ON THE PAGE
		setTimeout(function(){
			if(Uninvisible.isAnimating === true) _onCloseComplete();
		}, Uninvisible.settings.animationSpeed);

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

			Uninvisible.emit('close:after');
		}
	},

	_expand: function(options){
		var Uninvisible = this;
		var imageElement = Uninvisible.imageElement;

		Uninvisible.emit('open:before');

		var containerW = window.innerWidth,
			containerH = window.innerHeight;

		var imgW = Uninvisible.image.naturalWidth,
			imgH = Uninvisible.image.naturalHeight;

		var scale, scaledHeight, scaledWidth;

		if(!Uninvisible.isDevice){
			Uninvisible._setImagePositionCSS({
				left: (containerW - imgW) / 2,
				top: (containerH - imgH) / 2,
				width: imgW,
				height: imgH
			});

			Uninvisible._transformImage({
				scale: 1
			});

			var imgSizeContain = options.contain || (Uninvisible.sourceElement ? Uninvisible.sourceElement.dataset.uninvisibleContain : Uninvisible.settings.contain);

			if(options.freeZoom || (Uninvisible.sourceElement && Uninvisible.sourceElement.dataset.uninvisibleFreeZoom) || Uninvisible.settings.freeZoom){
				console.log('freeZoom, 6');
				Uninvisible.orientation = 6;
			} else if(imgSizeContain){
				Uninvisible.orientation = 1;
				 if(imgW < containerW && imgH < containerH){ // SMALLER THAN WINDOW
					 console.log('contain, smaller than window, 1');

				 } else if(imgW / imgH > containerW / containerH){ //..CONTAINED HORIZONTAL
					 console.log('contained, horizontal, 1');

					 scale = Uninvisible.dimensions.scale = (containerW / imgW);

					 Uninvisible._transformImage({
						 scale: scale
					 });
				} else { //..CONTAINED VERTICAL
					console.log('contained, vertical, 1');

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
				console.log('small image: ', Uninvisible.orientation);
		} else { // LARGE IMAGE..
				if(imgW / imgH > containerW / containerH){
					console.log('large, horizontal, 4');
					Uninvisible.orientation = 4; //..HORIZONTAL

					scale = Uninvisible.dimensions.scale = containerH / imgH;

					Uninvisible._transformImage({
						scale: scale
					});
				} else {
					console.log('large, vertical, 5');
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

				Uninvisible._setImagePositionCSS({
					left: 0,
					top: (containerH - scaledHeight) / 2,
					width: containerW,
					height: scaledHeight
				});
		 } else { //..CONTAINED VERTICAL
			 scaledWidth = Uninvisible.dimensions.initialWidth = (containerH / imgH) * imgW;
			 Uninvisible.dimensions.initialHeight = containerH;

			 Uninvisible._setImagePositionCSS({
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

	_setImagePositionCSS: function(p){
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

		Uninvisible._setImagePositionCSS({
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
		var speed = (this.settings.animationSpeed / 1000) + 's';

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
		var rotate = new Touch.Rotate();
		var tap = new Touch.Tap();

		this.touch.add([pinch, rotate, tap]);

		this.touch.get('pinch').set({ enable: true });
		this.touch.get('rotate').set({ enable: true });
	},

	_trackMovement: function(){
		var Uninvisible = this;
		var imageElement = Uninvisible.imageElement;

		var orientation = Uninvisible.orientation;

		var containerW = window.innerWidth,
				containerH = window.innerHeight;

		var imgW = Uninvisible.image.naturalWidth;
		var imgH = Uninvisible.image.naturalHeight;

		var scale = Uninvisible.dimensions.scale;
		var minScale = imgW / imgH > containerW / containerH ? (containerW / imgW) * 0.8 : (containerH / imgH) * 0.8;

		var horizontalMargin = containerW - imgW,
				verticalMargin = containerH - imgH;
		var scaledMarginX,
				scaledMarginY;

				var xDestPercent = yDestPercent = 50,
					xPercent = yPercent = 50,
					x = xDest = containerW / 2,
					y = yDest = containerH / 2,
					startXTouch, startYTouch,
					followMouse;
				var onTouchStart, onTouchEnd, handleTouchMove,
					isTouching = false,
					isZooming = false,
					zoomXStart, zoomYstart,
					zoomXDif = zoomYDif = 0,
					zoomX = zoomY = 0,
					newScale;

				var origXMargin = (containerW - imgW),
						origYMargin = (containerH - imgH),
						startLeft, startTop,
						leftDest, topDest;

				var location = imageElement.getBoundingClientRect();

				var left = location.left;
	      var top = location.top;

				var currentImageWidth = Uninvisible.dimensions.initialWidth;
				var currentImageHeight = Uninvisible.dimensions.initialHeight;



		followMouse = _.throttle(function(e){
			if(Uninvisible.orientation < 2) return;

			xDestPercent = (e.clientX / containerW) * 100;
			yDestPercent = (e.clientY / containerH) * 100;
		}, 1000/30);

		onTouchStart = function(e){
			// if(Uninvisible.orientation < 2) return;

			isTouching = true;

			startXTouch = e.pageX;
			startYTouch = e.pageY;

			startLeft = left;
			startTop = top;
		};

		handleTouchMove = _.throttle(function(e){
			if(isZooming === true) return;
			//
			left = (e.pageX - startXTouch) + startLeft;
			top = (e.pageY - startYTouch) + startTop;
		}, 1000/30);

		onTouchEnd = function(e){
			isTouching = false;
		};


		// this.touch.on('rotate', function(e){
		// 	console.log('rotate!!', e);
		// });


		var currentZoom,
				startX, startY,
				originX, originY,
				scale,
				deltaX, deltaY,
				distance_to_origin_x, distance_to_origin_y;
		var zoom = 1;
		var panX = 0;
		var panY = 0;

		var previousDeltaX, previousDeltaY;
		var previousOriginX = previousOriginY = 0;
		var previousScale = 1;
		var screenCenterX = containerW / 2;
		var screenCenterY = containerH / 2;
		var relCenterX, relCenterY;

		var matrix = new Paper.Matrix();
		var panOrigin;

		function onPinchStart(e){
			isZooming = true;
			panOrigin = screenToImage(matrix, e.center.x, e.center.y);
		}

		function onPinchMove(e){
			applyToMatrix(matrix.clone(), e);
		}

		function onPinchEnd(e){
			setTimeout(function(){ isZooming = false; }, 200);
			applyToMatrix(matrix, e);
		}

		function screenToImage(matrix, x, y) {
			if (typeof x === "object") {
				y = x.y;
				x = x.x;
			}

			return matrix.inverseTransform(new Paper.Point(x - screenCenterX, y - screenCenterY));
		}

		function applyToMatrix(matrix, e) {
			var center = screenToImage(matrix, e.center.x, e.center.y);
			matrix.translate(center.x - panOrigin.x, center.y - panOrigin.y);
			matrix.scale(e.scale, panOrigin);
			var t = [ matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty ].join(",");
			imageElement.style.transform = "matrix(" + t + ")";
		}

		// var dif, diffs;
		// function setScale(e){
		// 	console.log(e);
		// 	diffs = getZoomDif(e);
		//
		// 	var dif = Math.sqrt(Math.pow(diffs.x, 2), Math.pow(diffs.y, 2));
		//
		// 	scale = Math.max(scale + (dif * (scale / 100)), 0.9);
		// }
		//
		// function getZoomDif(e){
		// 	var p1 = e.pointers[0],
		// 			p2 = e.pointers[1];
		// 	var difs = {
		// 		x: e.center.x - Math.sqrt(Math.pow(p1.screenX, 2), Math.pow(p2.screenX, 2)),
		// 		y: e.center.y - Math.sqrt(Math.pow(p1.screenY, 2), Math.pow(p2.screenY, 2)),
		// 	};
		// 	// var difs = {
		// 	// 	x: p1.screenX > p2.screenX ? e.center.x - p2.screenX : e.center.x - p1.screenX,
		// 	// 	y: p1.screenY > p2.screenY ? e.center.y - p2.screenY : e.center.y - p1.screenY
		// 	// };
		//
		// 	return difs;
		// }


		function positionImageDevice(){
			return;
			switch(Uninvisible.orientation){
				case 0:
				case 1:
					break;
				// HORIZONTAL
				case 2:
				case 4:

					imageElement.style.left = left + 'px';
					break;
				// VERTICAL
				case 3:
				case 5:
					imageElement.style.top = top + 'px';
					break;
				// FREE SCROLL
				case 6:
					// scaledMarginX = containerW - (imgW * scale);
					// scaledMarginY = containerH - (imgH * scale);

					// left = Math.min(Math.max(left, scaledMarginX - (imgW - (imgW * scale))), scaledMarginX + (imgW - (imgW * scale)));
					// left = Math.max(left, (origXMargin - (origXMargin - (scaledMarginX))));

					imageElement.style.left = left + 'px';
					imageElement.style.top = top + 'px';
					break;
			}
		}




		var SLIDE_SPEED = Uninvisible.settings.trackSpeed;

		function positionImageDesktop(){
			switch(Uninvisible.orientation){
				case 0:
				case 1:
					break;
				// HORIZONTAL
				case 2:
				case 4:
					xPercent = xPercent + ((xDestPercent - xPercent) * SLIDE_SPEED);
					if(xPercent < 0 && !isTouching) xDestPercent = (xDestPercent * SLIDE_SPEED);
					if(xPercent > 100 && !isTouching) xDestPercent = xDestPercent + ((100 - xDestPercent) * SLIDE_SPEED);

					var expandBy;
					if(xPercent < 50){
						expandBy = -((50 - xPercent) / 1000) * horizontalMargin * 2;
					} else {
						expandBy = ((50 - (100 - xPercent)) / 1000) * horizontalMargin * 2;
					}

					Uninvisible._setImagePositionCSS({
						left: expandBy + (horizontalMargin - (horizontalMargin - (horizontalMargin * (xPercent / 100))))
					});
					break;
				// VERTICAL
				case 3:
				case 5:
					yPercent = yPercent + ((yDestPercent - yPercent) * SLIDE_SPEED);
					if(yPercent < 0 && !isTouching) yDestPercent = (yDestPercent * SLIDE_SPEED);
					if(yPercent > 100 && !isTouching) yDestPercent = yDestPercent + ((100 - yDestPercent) * SLIDE_SPEED);

					var expandBy;
					if(yPercent < 50){
						expandBy = -((50 - yPercent) / 1000) * verticalMargin * 2;
					} else {
						expandBy = ((50 - (100 - yPercent)) / 1000) * verticalMargin * 2;
					}

					Uninvisible._setImagePositionCSS({
						top: expandBy + (verticalMargin - (verticalMargin - (verticalMargin * (yPercent / 100))))
					});
					break;
				// FREE SCROLL
				case 6:
					xPercent = xPercent + ((xDestPercent - xPercent) * SLIDE_SPEED);
					if(xPercent < 0 && !isTouching) xDestPercent = (xDestPercent * SLIDE_SPEED);
					if(xPercent > 100 && !isTouching) xDestPercent = xDestPercent + ((100 - xDestPercent) * SLIDE_SPEED);

					var expandBy;
					if(xPercent < 50){
						expandBy = -((50 - xPercent) / 1000) * horizontalMargin * 2;
					} else {
						expandBy = ((50 - (100 - xPercent)) / 1000) * horizontalMargin * 2;
					}

					Uninvisible._setImagePositionCSS({
						left: expandBy + (horizontalMargin - (horizontalMargin - (horizontalMargin * (xPercent / 100))))
					});

					yPercent = yPercent + ((yDestPercent - yPercent) * SLIDE_SPEED);
					if(yPercent < 0 && !isTouching) yDestPercent = (yDestPercent * SLIDE_SPEED);
					if(yPercent > 100 && !isTouching) yDestPercent = yDestPercent + ((100 - yDestPercent) * SLIDE_SPEED);

					var expandBy;
					if(yPercent < 50){
						expandBy = -((50 - yPercent) / 1000) * verticalMargin * 2;
					} else {
						expandBy = ((50 - (100 - yPercent)) / 1000) * verticalMargin * 2;
					}

					Uninvisible._setImagePositionCSS({
						top: expandBy + (verticalMargin - (verticalMargin - (verticalMargin * (yPercent / 100))))
					});
					break;
			}
		}




		var looper;

		function loopDesktop(){
			looper = raf(loopDesktop);
			positionImageDesktop();
		}

		function loopDevice(){
			looper = raf(loopDevice);
			positionImageDevice();
		}

		if(Uninvisible.isDevice){
			loopDevice();
		} else {
			loopDesktop();
		}


		if(Uninvisible.isDevice){ // DEVICE
			this.touch.on('pinchstart', onPinchStart);
			this.touch.on('pinchmove', onPinchMove);
			this.touch.on('pinchend', onPinchEnd);
			imageElement.addEventListener("touchstart", onTouchStart);
			imageElement.addEventListener("touchend", onTouchEnd);
			imageElement.addEventListener("touchmove", handleTouchMove);

		} else { // DESKTOP
			addEventListener('mousemove', followMouse);
		}



		var xListener = function(){
			raf.cancel(looper);
			Uninvisible.removeListener('close', xListener);

			if(Uninvisible.isDevice){
				imageElement.removeEventListener("touchmove", handleTouchMove);
				Uninvisible.touch.off('pinchstart', onPinchStart);
				Uninvisible.touch.off('pinchmove', onPinchMove);
				Uninvisible.touch.off('pinchend', onPinchEnd);

				delete neo;
			} else {
				removeEventListener('mousemove', followMouse);
			}
		};

		Uninvisible.on('close', xListener);
	},

	destroy: function(){
		if(this.isOpen) this.closeViewerImmediately();
		this._removeView();
		this.emit('destroy');
	},
});


module.exports = UnInVisible;
