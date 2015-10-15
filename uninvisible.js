var _ = require('underscore');
var EventEmitter = require('events');
var util = require('util');
var raf = require('raf');
var Touch = require('hammerjs');

function UnInVisible(options){
	this.options = options || {};

	this.isDevice = !!('ontouchstart' in window);

	this.sourceElement = null;
	this.url = null;
	this.image = null;
	this.dimensions = {
		scaledX: null,
		scaledY: null,
		xMargin: null,
		yMargin: null
	};
	this.sourceElement = null;

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

	_addClickListeners: function(target){
		var Uninvisible = this;

		document.addEventListener('click', _onClick);

		Uninvisible.on('destroy', function(){
			document.removeEventListener('click', _onClick);
		});

		function _onClick(e){
			if(e.target.classList.contains(target) && !e.target.classList.contains('uninvisible-open') && !e.target.dataset.nozoom){
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

		// // if img is in a link, don't open it
		// var node = img;
		// while(node != null){
		// 	if(node.tagName == 'A') return;
		// 	node = node.parentNode;
		// }

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
		var container = Uninvisible.container;

		container.addEventListener(Uninvisible.settings.clickEvent, closeImg);
		function closeImg(e){
			e.stopPropagation();
			e.preventDefault();
			Uninvisible.close.bind(Uninvisible)();
		}

		var xListener = function(){
			container.removeEventListener(Uninvisible.settings.clickEvent, closeImg);
			Uninvisible.removeListener('close', xListener);
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

		Uninvisible._setToImgLocation();
		Uninvisible.container.style.display = 'block';

		setTimeout(function(){
				Uninvisible._turnOnTransitions();
				Uninvisible._addAnimationCompleteListener(_onOpenComplete);
		},1);

		setTimeout(function(){
			Uninvisible._expand(options);
			if(Uninvisible.orientation > 1) Uninvisible._trackMovement();
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

			// if(typeof cb === 'function') cb();
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

			// if(typeof cb === 'function') cb();
		}
	},

	_expand: function(options){
		var Uninvisible = this;

		Uninvisible.emit('open:before');

		var containerW = window.innerWidth,
			containerH = window.innerHeight;

		var imgW = Uninvisible.image.naturalWidth,
			imgH = Uninvisible.image.naturalHeight;

		var imgSizeContain = options.contain || (Uninvisible.sourceElement ? Uninvisible.sourceElement.dataset.uninvisibleContain : Uninvisible.settings.contain);

		if(options.freeZoom || (Uninvisible.sourceElement && Uninvisible.sourceElement.dataset.uninvisibleFreeZoom) || Uninvisible.settings.freeZoom){
			Uninvisible.dimensions = {
				scaledX: imgW,
				scaledY: imgH,
				xMargin: containerW - imgW,
				yMargin: containerH - imgH
			}

			Uninvisible._setImagePositionCSS({
				left: (containerW - imgW) / 2,
				top: (containerH - imgH) / 2,
				width: imgW,
				height: imgH
			});
		} else if(imgSizeContain){
			Uninvisible.orientation = 1;
			 if(imgW < containerW && imgH < containerH){ // SMALLER THAN WINDOW
				 Uninvisible.dimensions = {
					 scaledX: imgW,
					 scaledY: imgH,
					 xMargin: containerW - imgW,
					 yMargin: containerH - imgH
				 }

				 Uninvisible._setImagePositionCSS({
	 				left: (containerW - imgW) / 2,
	 				top: (containerH - imgH) / 2,
	 				width: imgW,
	 				height: imgH
	 			});
			 } else if(imgW / imgH > containerW / containerH){ //..CONTAINED HORIZONTAL
				var heightScaled = imgH * (containerW / imgW);
				var yMargin = containerH - heightScaled;

				Uninvisible.dimensions = {
					scaledX: containerW,
					scaledY: heightScaled,
					xMargin: 0,
					yMargin: yMargin
				}

				Uninvisible._setImagePositionCSS({
					top: yMargin / 2,
					left: 0,
					width: containerW,
					height: heightScaled
				});
			} else { //..CONTAINED VERTICAL
				var widthScaled = imgW * (containerH / imgH);
				var xMargin = containerW - widthScaled;

				Uninvisible.dimensions = {
					scaledX: widthScaled,
					scaledY: containerH,
					xMargin: xMargin,
					yMargin: 0
				}

				Uninvisible._setImagePositionCSS({
					top: 0,
					left: xMargin / 2,
					height: containerH,
					width: widthScaled
				});
			}
		} else if(imgW < containerW || imgH < containerH){ // SMALL IMAGE..
			if(imgW > containerW || imgH > containerH){
				Uninvisible.orientation = imgW > containerW ? 2 : 3; //..LARGER HORIZONTALLY OR VERTICALLY
			} else {
				Uninvisible.orientation = 0; // ..SMALLER THAN WINDOW
			}

			Uninvisible.dimensions = {
				scaledX: imgW,
				scaledY: imgH,
				xMargin: containerW - imgW,
				yMargin: containerH - imgH
			}

			Uninvisible._setImagePositionCSS({
				left: (containerW - imgW) / 2,
				top: (containerH - imgH) / 2,
				width: imgW,
				height: imgH
			});

	} else { // LARGE IMAGE..
			if(imgW / imgH > containerW / containerH){
				Uninvisible.orientation = 4; //..HORIZONTAL
				var widthScaled = imgW * (containerH / imgH);
				var horizontalMargin = widthScaled - containerW;

				Uninvisible.dimensions = {
					scaledX: widthScaled,
					scaledY: containerH,
					xMargin: horizontalMargin,
					yMargin: 0
				}

				Uninvisible._setImagePositionCSS({
					top: 0,
					left: -horizontalMargin / 2,
					height: containerH,
					width: widthScaled
				});
			} else {
				Uninvisible.orientation = 5; //..VERTICAL
				var heightScaled = (imgH * (containerW / imgW));
				var verticalMargin = heightScaled - containerH;

				Uninvisible.dimensions = {
					scaledX: containerW,
					scaledY: heightScaled,
					xMargin: 0,
					yMargin: verticalMargin
				}

				Uninvisible._setImagePositionCSS({
					top: -verticalMargin / 2,
					left: 0,
					width: containerW,
					height: heightScaled
				});
			}
		}

		Uninvisible.container.style.opacity = 1;
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
		this.touch = window.Hammer = new Touch.Manager(document.body,{

		});

		var pinch = new Touch.Pinch();
		var rotate = new Touch.Rotate();

		this.touch.add([pinch, rotate]);

		this.touch.get('pinch').set({ enable: true });
		this.touch.get('rotate').set({ enable: true });
	},

	_trackMovement: function(){
		var Uninvisible = this;
		var imageElement = Uninvisible.imageElement;

		var orientation = Uninvisible.orientation;
		if(orientation < 2) return;

		var containerW = window.innerWidth,
			containerH = window.innerHeight;

		var imgW = Uninvisible.image.naturalWidth;
		var imgH = Uninvisible.image.naturalHeight;

		var scaledWidth = zoomedWidth = Uninvisible.dimensions.scaledX,
				scaledHeight = zoomedHeight = Uninvisible.dimensions.scaledY,
				horizontalMargin = Uninvisible.dimensions.xMargin,
				verticalMargin = Uninvisible.dimensions.yMargin;

		switch(orientation){
			case 0:
			case 1:
			case 2:
			case 3:
				break;
			case 4:
				horizontalMargin = -horizontalMargin;
				break;
			case 5:
				verticalMargin = -verticalMargin;
				break;
			case 6:
				break;
		}

		var xDestPercent = yDestPercent = 50,
			xDestPixel = containerW / 2,
			yDestPixel = containerH / 2,
			xPercent = yPercent = 50,
			followMouse,
			onTouchStart, onTouchEnd, handleTouchMove,
			isTouching = false,
			isZooming = false,
			zoomXStart, zoomYstart,
			zoomXDif = zoomYDif = 0,
			zoomX = zoomY = 0,
			diffXPercent, diffYPercent;
		var top, left;

		followMouse = _.throttle(function(e){
			if(Uninvisible.orientation < 2) return;

			xDestPercent = (e.clientX / containerW) * 100;
			yDestPercent = (e.clientY / containerH) * 100;
		}, 1000/30);

		onTouchStart = function(e){
			if(Uninvisible.orientation < 2) return;

			isTouching = true;
			var startXPercent = 100 - (e.pageX / containerW) * 100;
			var startYPercent = 100 - (e.pageY / containerH) * 100;

			diffXPercent = xPercent - startXPercent;
			diffYPercent = yPercent - startYPercent;
		};

		onTouchEnd = function(e){
			if(Uninvisible.orientation < 2) return;

			isTouching = false;
		};

		handleTouchMove = _.throttle(function(e){
			if(Uninvisible.orientation < 2 || isZooming === true) return;
			xDestPercent = ((100 - (e.pageX / containerW) * 100) + diffXPercent);
			yDestPercent = ((100 - (e.pageY / containerH) * 100) + diffYPercent);
		}, 1000/30);


		// this.touch.on('rotate', function(e){
		// 	console.log('rotate!!', e);
		// });

		this.touch.on('pinchstart', onPinchStart);
		function onPinchStart(e){
			Uninvisible.orientation = 6;
			isZooming = true;

			var difs = getZoomDif(e);
			zoomXStart = difs.x;
			zoomYStart = difs.y

			zoomX = zoomXDif + difs.x - zoomXStart;
			zoomY = zoomYDif + difs.y - zoomYStart;

			zoomedHeight = scaledHeight + zoomY;
			zoomedWidth = scaledWidth * (zoomedHeight / scaledHeight);

			xDestPercent = (e.center.x / zoomedWidth) * 100;

			verticalMargin = zoomedHeight > containerH ? zoomedHeight - containerH : containerH - zoomedHeight;
			horizontalMargin = zoomedWidth > containerW ? zoomedWidth - containerW : containerW - zoomedWidth;
		}

		this.touch.on('pinchmove', onPinchMove);
		function onPinchMove(e){

			var difs = getZoomDif(e);
			zoomX = (zoomXDif + difs.x - zoomXStart) * 2;
			zoomY = (zoomYDif + difs.y - zoomYStart) * 2;

			zoomedHeight = scaledHeight + zoomY;
			zoomedWidth = scaledWidth * (zoomedHeight / scaledHeight);

			xDestPercent = (e.center.x / zoomedWidth) * 100;

			verticalMargin = zoomedHeight > containerH ? zoomedHeight - containerH : containerH - zoomedHeight;
			horizontalMargin = zoomedWidth > containerW ? zoomedWidth - containerW : containerW - zoomedWidth;
		}

		this.touch.on('pinchend', onPinchEnd);
		function onPinchEnd(e){
			setTimeout(function(){ isZooming = false; }, 200);

			zoomXDif = zoomX;
			zoomYDif = zoomY;

			zoomXStart = zoomYstart = null;
		}

		function getZoomDif(e){
			var p1 = e.pointers[0],
					p2 = e.pointers[1];


			var difs = {
				x: p1.screenX > p2.screenX ? e.center.x - p2.screenX : e.center.x - p1.screenX,
				y: p1.screenY > p2.screenY ? e.center.y - p2.screenY : e.center.y - p1.screenY
			};

			return difs;
		}

		var SLIDE_SPEED = Uninvisible.settings.trackSpeed;
		function positionImage(){
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

					var expandByX;
					if(xPercent < 50){
						expandByX = -((50 - xPercent) / 1000) * horizontalMargin * 2;
					} else {
						expandByX = ((50 - (100 - xPercent)) / 1000) * horizontalMargin * 2;
					}

					yPercent = yPercent + ((yDestPercent - yPercent) * SLIDE_SPEED);
					if(yPercent < 0 && !isTouching) yDestPercent = (yDestPercent * SLIDE_SPEED);
					if(yPercent > 100 && !isTouching) yDestPercent = yDestPercent + ((100 - yDestPercent) * SLIDE_SPEED);

					var expandByY;
					if(yPercent < 50){
						expandByY = -((50 - yPercent) / 1000) * verticalMargin * 2;
					} else {
						expandByY = ((50 - (100 - yPercent)) / 1000) * verticalMargin * 2;
					}

					if(zoomedWidth > containerW){
						left = -(expandByX + (horizontalMargin - (horizontalMargin - (horizontalMargin * (xPercent / 100)) )) );
					} else {
						left = (expandByX + ((horizontalMargin - (horizontalMargin * (xPercent / 100)) )) );
					}

					if(zoomedHeight > containerH){
						top = -(expandByY + (verticalMargin - (verticalMargin - (verticalMargin * (yPercent / 100)) )) );
					} else {
						top = (expandByY + ((verticalMargin - (verticalMargin * (yPercent / 100)) )) );
					}

					Uninvisible._setImagePositionCSS({
						top: top,
						left: left,
						width: zoomedWidth,
						height: zoomedHeight
					});

					break;
			}
		}

		imageElement.addEventListener("touchstart", onTouchStart);
		imageElement.addEventListener("touchend", onTouchEnd);
		imageElement.addEventListener("touchmove", handleTouchMove);
		addEventListener('mousemove', followMouse);

		var looper;
		function loop(){
			looper = raf(loop);
			positionImage();
		}
		loop();

		var xListener = function(){
			raf.cancel(looper);
			removeEventListener('mousemove', followMouse);
			imageElement.removeEventListener("touchmove", handleTouchMove);
			Uninvisible.removeListener('close', xListener);

			Uninvisible.touch.off('pinchstart', onPinchStart);
			Uninvisible.touch.off('pinchmove', onPinchMove);
			Uninvisible.touch.off('pinchend', onPinchEnd);
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
