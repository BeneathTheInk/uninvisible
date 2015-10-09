var _ = require('underscore');
var EventEmitter = require('events');
var util = require('util');
var raf = require('raf');

function UnInVisible(options){
	this.options = options || {};

	this.isDevice = !!('ontouchstart' in window);

	this.sourceElement = null;
	this.url = null;
	this.image = null;

	this.isAnimating = false;
	this.isOpen = false;
	this.orientation = null;
		// 0 = image is smaller than window
		// 1 = image is contained within window
		// 2 = image height smaller, horizontal width larger than window
		// 3 = image width smaller, vertical height larger than window
		// 4 = fullscreen horizontal
		// 5 = fullscreen vertical
		// 6 = fullscreen
	this.settings = {
		contain: false, // all images will be contained within the view, no zoom.
		animationSpeed: options.animationSpeed || '0.4s',
		trackSpeed: options.animationSpeed || 0.08
	};

	this.clickEvent = options.clickEvent || 'click';

	this._createView();
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
		imageElement.appendChild(captionContainer);
	},

	_renderView: function(){
		document.body.appendChild(this.container);
	},

	_removeView: function(){
		if(this.container && this.container.parentNode) this.container.parentNode.removeChild(this.container);
	},

	open: function(img, options, cb){ // !! return a promise and nodeify
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
			cb();
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
			Uninvisible.imageElement.src = Uninvisible.url = options.url || img.src;
			cb();
		} else {
			return null;
		}
	},

	_setupCloseListener: function(){
		var Uninvisible = this;
		var container = Uninvisible.container;

		container.addEventListener(Uninvisible.clickEvent, closeImg);
		function closeImg(e){
			e.stopPropagation();
			e.preventDefault();
			Uninvisible.close.bind(Uninvisible)();
		}

		var xListener = function(){
			container.removeEventListener(Uninvisible.clickEvent, closeImg);
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
		var title = options.captionTitle || Uninvisible.sourceElement.dataset.captionTitle;
		var text = options.captionText || Uninvisible.sourceElement.dataset.captionText;

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

		Uninvisible._turnOnTransitions();

		Uninvisible._addAnimationCompleteListener(_onOpenComplete);

		setTimeout(function(){
			Uninvisible._expand(options);
			if(Uninvisible.orientation > 1) Uninvisible._trackMovement();
		},10);


		function _onOpenComplete(){
			// console.log('onOpenComplete');
			Uninvisible.isAnimating = false;
			Uninvisible.isOpen = true;
			document.body.style.overflow = 'hidden';

			Uninvisible._removeAnimationCompleteListener(_onOpenComplete);
			Uninvisible._turnOffTransitions();

			Uninvisible.emit('open:after');

			if(typeof cb === 'function') cb();
		}
	},

	_close: function(){
		var Uninvisible = this;
		Uninvisible._turnOnTransitions();
		UnInVisible.isAnimating = true;
		this.emit('close');

		Uninvisible._addAnimationCompleteListener(_onCloseComplete);
		Uninvisible._setToImgLocation();

		function _onCloseComplete(){
			Uninvisible.isAnimating = false;
			Uninvisible.isOpen = false;

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
		// console.log('expand!!!');
		var Uninvisible = this;

		Uninvisible.emit('open:before');

		var containerW = window.innerWidth,
			containerH = window.innerHeight;

		var imgW = Uninvisible.image.naturalWidth,
			imgH = Uninvisible.image.naturalHeight;

		var imgSizeContain = options.contain || Uninvisible.sourceElement.dataset.uninvisibleContain || Uninvisible.settings.contain;
// !!!!!!!!
		if(imgSizeContain){
			Uninvisible.orientation = 1;
			if(imgW / imgH > containerW / containerH){ //..CONTAINED HORIZONTAL
				var yMargin = (imgH * (imgW / containerW)) / 2;
				Uninvisible._setImagePositionCSS({
					top: yMargin,
					left: 0,
					width: null
				});
			} else { //..CONTAINED VERTICAL
				var yMargin = (imgW * (imgH / containerH)) / 2;

				Uninvisible._setImagePositionCSS({
					top: 0,
					left: yMargin,
					height: null
				});
			}
		} else if(imgW < containerW || imgH < containerH){ // SMALL IMAGE..
			if(imgW > containerW || imgH > containerH){
				Uninvisible.orientation = imgW > containerW ? 2 : 3; //..LARGER HORIZONTALLY OR VERTICALLY
			} else {
				Uninvisible.orientation = 0; // ..SMALLER THAN WINDOW
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
				var widthScaled = (imgW * (containerH / imgH));
				var horizontalMargin = (widthScaled - containerW) / 2;

				Uninvisible._setImagePositionCSS({
					top: 0,
					left: -horizontalMargin,
					height: containerH,
					width: widthScaled
				});
			} else {
				Uninvisible.orientation = 5; //..VERTICAL
				var heightScaled = (imgH * (containerW / imgW));

				var verticalMargin = (heightScaled - containerH) / 2;

				Uninvisible._setImagePositionCSS({
					top: -verticalMargin,
					left: 0,
					width: containerW,
					height: heightScaled
				});
			}
		}

		console.log("Uninvisible orientation: ", Uninvisible.orientation);
		Uninvisible.container.style.opacity = 1;
	},

	_setImagePositionCSS: function(p){
		var img = this.imageElement;
		console.log(p)

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

// !!!!!!!!!
		// will also be null if the source element has been removed
		if(position == null){
			position = {
				left: (containerW - Uninvisible.image.naturalWidth) / 2,
				top: (containerH - Uninvisible.image.naturalHeight) / 2,
				width: imgW,
				height: imgH
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
		// console.log('turnOnTransitions');
		var imageElement = this.imageElement;
		var container = this.container;

		imageElement.style.webkitTransition = 'top 0.4s, height 0.4s, width 0.4s, left 0.4s, opacity 0.3s';
		imageElement.style.oTransition = 'top 0.4s, height 0.4s, width 0.4s, left 0.4s, opacity 0.3s';
		imageElement.style.mozTransition = 'top 0.4s, height 0.4s, width 0.4s, left 0.4s, opacity 0.3s';
		imageElement.style.msTransition = 'top 0.4s, height 0.4s, width 0.4s, left 0.4s, opacity 0.3s';
		imageElement.style.transition = 'top 0.4s, height 0.4s, width 0.4s, left 0.4s, opacity 0.3s';
		container.style.webkitTransition = 'opacity 0.3s';
		container.style.oTransition = 'opacity 0.3s';
		container.style.mozTransition = 'opacity 0.3s';
		container.style.msTransition = 'opacity 0.3s';
		container.style.transition = 'opacity 0.3s';
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

	_trackMovement: function(){
		var Uninvisible = this;
		var imageElement = Uninvisible.imageElement;

		var orientation = Uninvisible.orientation;
		if(orientation < 2) return;

		var containerW = window.innerWidth,
			containerH = window.innerHeight;

		var imgW = Uninvisible.image.naturalWidth;
		var imgH = Uninvisible.image.naturalHeight;
		var wRatio,
				hRatio,
				scaledWidth,
				scaledHeight,
				horizontalMargin,
				verticalMargin;

		switch(orientation){
			case 0:
			case 1:
				break;
			case 2:
			case 3:
				horizontalMargin = containerW - imgW;
				verticalMargin = containerH - imgH;
				break;
			case 4:
				scaledWidth = (imgW * (containerH / imgH));
				horizontalMargin = -(scaledWidth - containerW);
				break;
			case 5:
				scaledHeight = (imgH * (containerW / imgW));
				verticalMargin = -(scaledHeight - containerH);
				break;
			case 6:
				break;
		}

		var xDest = yDest = 50,
			x = y = 50,
			followMouse,
			onTouchStart, onTouchEnd, handleTouchMove,
			isTouching = false,
			diffX, diffY;

		followMouse = _.throttle(function(e){
			xDest = (e.clientX / containerW) * 100;
			yDest = (e.clientY / containerH) * 100;
		}, 1000/30);

		onTouchStart = function(e){
			isTouching = true;
			var startX = 100 - (e.pageX / containerW) * 100;
			var startY = 100 - (e.pageY / containerH) * 100;

			diffX = x - startX;
			diffY = y - startY;
		};

		onTouchEnd = function(e){
			isTouching = false;
		};

		handleTouchMove = _.throttle(function(e){
			xDest = ((100 - (e.pageX / containerW) * 100) + diffX);
			yDest = ((100 - (e.pageY / containerH) * 100) + diffY);
		}, 1000/30);

		var SLIDE_SPEED = Uninvisible.settings.trackSpeed;
		function positionImage(){
			switch(orientation){
				case 0:
				case 1:
					break;
				// HORIZONTAL
				case 2:
				case 4:
					x = x + ((xDest - x) * SLIDE_SPEED);
					if(x < 0 && !isTouching) xDest = (xDest * SLIDE_SPEED);
					if(x > 100 && !isTouching) xDest = xDest + ((100 - xDest) * SLIDE_SPEED);
					Uninvisible._setImagePositionCSS({
						left: (horizontalMargin - (horizontalMargin - (horizontalMargin * (x / 100))))
					});
					break;
				// VERTICAL
				case 3:
				case 5:
					y = y + ((yDest - y) * SLIDE_SPEED);
					if(y < 0 && !isTouching) yDest = (yDest * SLIDE_SPEED);
					if(y > 100 && !isTouching) yDest = yDest + ((100 - yDest) * SLIDE_SPEED);
					Uninvisible._setImagePositionCSS({
						top: (verticalMargin - (verticalMargin - (verticalMargin * (y / 100))))
					});
					break;
				// FREE SCROLL
				case 6:
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
		};

		Uninvisible.on('close', xListener);
	},

	destroy: function(){
		if(this.isOpen) this.closeViewerImmediately();
		this._removeView();
	},
});


module.exports = UnInVisible;
