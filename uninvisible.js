var _ = require('underscore');
var EventEmitter = require('events');
var util = require('util');
var raf = require('raf');

function UnInVisible(options){
	this.options = options || {};

	this.isDevice = !!('ontouchstart' in window);

	this.sourceImage = null;

	this.isAnimating = false;
	this.isOpen = false;

	this.clickEvent = options.clickEvent || 'click';

	this._createView();
}

util.inherits(UnInVisible, EventEmitter);

_.extend(UnInVisible.prototype, {
	_createView: function(){
		if(this.imageViewer) return;

		var imageViewer = this.imageViewer = document.createElement('div');
		imageViewer.classList.add('uninvisible-view');

		var captionContainer = this.captionContainer = document.createElement( 'figcaption' );
		captionContainer.classList.add('caption-container');

		var captionTitle = this.captionTitle = this.isDevice === false ? document.createElement( 'h1' ) : document.createElement('h2');
		captionTitle.classList.add('caption-title');
		captionContainer.appendChild( captionTitle );

		var captionText = this.captionText = this.isDevice === false ? document.createElement( 'div' ) : document.createElement('h4');
		captionText.classList.add('caption-text');
		captionContainer.appendChild(captionText);

		imageViewer.appendChild(captionContainer);
	},

	_renderView: function(){
		document.body.appendChild(this.imageViewer);
	},

	_removeView: function(){
		if(this.imageViewer && this.imageViewer.parentNode) this.imageViewer.parentNode.removeChild(this.imageViewer);
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

		// if img is in a link, don't open it
		var node = img;
		while(node != null){
			if(node.tagName == 'A') return;
			node = node.parentNode;
		}

		Uninvisible._renderView();
		var imageViewer = Uninvisible.imageViewer;

		Uninvisible.sourceImage = img;

		var imgContain = options.imgContain || img.dataset.imgContain;
		imgContain = typeof imgContain === 'string' ? (imgContain === 'true') : imgContain;

		if(img.tagName !== 'IMG'){
			if(img.style.backgroundImage == null) return;

			var newImg = new Image();
			var src = img.style.backgroundImage.substring(4, img.style.backgroundImage.length - 1);

			newImg.src = src;

			newImg.addEventListener('load', function(){
				img = newImg;
				initializeImageViewer(false);
			});
		} else {
			initializeImageViewer(true);
		}



		// find img dimensions and determine the ideal positioning
		function initializeImageViewer(fromImg){

			Uninvisible.emit('open:before');

			var viewFullScreen,
				isHorizontal;
			var containerW = window.innerWidth,
				containerH = window.innerHeight;

			var imgW = img.naturalWidth,
				imgH = img.naturalHeight;

			if(imgW < containerW || imgH < containerH){
				imageViewer.style.backgroundPosition = '50% 50%';
				if(imgW > containerW || imgH > containerH) viewFullScreen = true;
			} else {
				imageViewer.style.backgroundSize = 'cover';
				isHorizontal = imgW / imgH > containerW / containerH ? true : false;
				viewFullScreen = true;
			}

			imageViewer.style.backgroundImage = fromImg ? 'url("' + img.src + '")' : Uninvisible.sourceImage.style.backgroundImage;
			if(imgContain) imageViewer.style.backgroundSize = 'contain';

			Uninvisible.setCaption(options);
			Uninvisible._animate(true, cb);
			if(viewFullScreen) Uninvisible._initMove(isHorizontal);
		}

		imageViewer.addEventListener(Uninvisible.clickEvent, closeImg);
		function closeImg(e){
			e.stopPropagation();
			e.preventDefault();
			Uninvisible.close.bind(Uninvisible)();
		}

		var xListener = function(){
			imageViewer.removeEventListener(Uninvisible.clickEvent, closeImg);
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

		this._animate(false, cb);
	},

	closeViewerImmediately: function(){
		this.emit('close');
		this.imageViewer.style.display = 'none';
		this.resetCaption();
	},

	setCaption: function(options){
		var Uninvisible = this;
		var title = options.captionTitle || Uninvisible.sourceImage.dataset.captionTitle;
		var text = options.captionText || Uninvisible.sourceImage.dataset.captionText;

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

	resetCaption: function(){
		this.captionContainer.style.display = 'none';

		this.captionTitle.style.display = 'none';
		this.captionTitle.innerHTML = '';

		this.captionText.style.display = 'none';
		this.captionText.innerHTML = '';
	},

	_animate: function(isOpening, cb){
		var Uninvisible = this;
		UnInVisible.isAnimating = true;

		var imageViewer = Uninvisible.imageViewer;

		if(isOpening){
			this.emit('open');
			setToImgLocation();
			imageViewer.style.display = 'block';

			turnOnTransitions();
			addAnimationCompleteListener(onOpenComplete);
			setTimeout(function(){setToFullscreen();},10);
		} else {
			this.emit('close');
			addAnimationCompleteListener(onCloseComplete);
			setToImgLocation();
		}


		function onOpenComplete(){
			Uninvisible.isAnimating = false;
			Uninvisible.isOpen = true;
			document.body.style.overflow = 'hidden';

			removeAnimationCompleteListener(onOpenComplete);

			Uninvisible.emit('open:after');

			if(typeof cb === 'function') cb();
		}

		function onCloseComplete(){
			Uninvisible.isAnimating = false;
			Uninvisible.isOpen = false;

			document.body.style.overflow = '';
			document.body.style.cursor = 'auto';

			imageViewer.style.display = 'none';
			Uninvisible.resetCaption();
			Uninvisible.sourceImage = null;

			turnOffTransitions();
			removeAnimationCompleteListener(onCloseComplete);

			Uninvisible._removeView();

			Uninvisible.emit('close:after');

			if(typeof cb === 'function') cb();
		}

		function setToFullscreen(){
			imageViewer.style.top = 0 + '%';
			imageViewer.style.bottom = 0 + '%';
			imageViewer.style.left = 0 + '%';
			imageViewer.style.right = 0 + '%';
			imageViewer.style.opacity = 1;
		}

		function setToImgLocation(){
			var containerW = window.innerWidth,
				containerH = window.innerHeight;

			var position = Uninvisible.sourceImage.getClientRects()[0];

			// this is in case the DOM has changed while the image was full screen
			// try to refind the image, or still look nice with the closing
			if(position == null){
				var img = Uninvisible.sourceImage;
				var targetEl;

				if(img.id != null && img.id.trim() != ''){
					targetEl = document.getElementById(img.id);
				} else if(img.classList.length) {
					var els = document.body.querySelectorAll('.' + img.classList[0]);
					var tag = img.tagName;
					targetEl = _.find(els, function(el){
						if(tag === 'IMG') {
							return el.src === img.src;
						} else if (tag === 'DIV') {
							return el.style.backgroundImage === img.style.backgroundImage;
						}
					});
				}

				position = targetEl != null ? targetEl.getClientRects()[0]
				: {
					top: containerH * 0.3,
					bottom: containerH * 0.7,
					left: containerW * 0.3,
					right: containerW * 0.7
				};
			}

			imageViewer.style.top = (position.top / containerH * 100) + '%';
			imageViewer.style.bottom = ((containerH - position.bottom) / containerH * 100) + '%';
			imageViewer.style.left = (position.left / containerW * 100) + '%';
			imageViewer.style.right = ((containerW - position.right) / containerW * 100) + '%';
			imageViewer.style.opacity = 0;
		}

		function turnOnTransitions(){
			imageViewer.style.webkitTransition = 'top 0.4s, right 0.4s, bottom 0.4s, left 0.4s, opacity 0.3s';
			imageViewer.style.oTransition = 'top 0.4s, right 0.4s, bottom 0.4s, left 0.4s, opacity 0.3s';
			imageViewer.style.mozTransition = 'top 0.4s, right 0.4s, bottom 0.4s, left 0.4s, opacity 0.3s';
			imageViewer.style.msTransition = 'top 0.4s, right 0.4s, bottom 0.4s, left 0.4s, opacity 0.3s';
			imageViewer.style.transition = 'top 0.4s, right 0.4s, bottom 0.4s, left 0.4s, opacity 0.3s';
		}

		function turnOffTransitions(){
			imageViewer.style.webkitTransition = 'none';
			imageViewer.style.oTransition = 'none';
			imageViewer.style.mozTransition = 'none';
			imageViewer.style.msTransition = 'none';
			imageViewer.style.transition = 'none';
		}

		function addAnimationCompleteListener(fn){
			imageViewer.addEventListener("webkitTransitionEnd", fn);
			imageViewer.addEventListener("oanimationend", fn);
			imageViewer.addEventListener("transitionend", fn);
		}

		function removeAnimationCompleteListener(fn){
			imageViewer.removeEventListener("webkitTransitionEnd", fn);
			imageViewer.removeEventListener("oanimationend", fn);
			imageViewer.removeEventListener("transitionend", fn);
		}
	},

	_initMove: function(isHorizontal){
		var Uninvisible = this;
		var imageViewer = Uninvisible.imageViewer;

		var containerW = window.innerWidth,
			containerH = window.innerHeight;

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

		var SLIDE_SPEED = 0.08;
		function positionImage(){
			if(isHorizontal){
				x = x + ((xDest - x) * SLIDE_SPEED);
				if(x < 0 && !isTouching) xDest = (xDest * SLIDE_SPEED);
				if(x > 100 && !isTouching) xDest = xDest + ((100 - xDest) * SLIDE_SPEED);
			} else {
				y = y + ((yDest - y) * SLIDE_SPEED);
				if(y < 0 && !isTouching) yDest = (yDest * SLIDE_SPEED);
				if(y > 100 && !isTouching) yDest = yDest + ((100 - yDest) * SLIDE_SPEED);
			}


			imageViewer.style.backgroundPosition = x + '% ' + y + '%';
		}

		imageViewer.addEventListener("touchstart", onTouchStart);
		imageViewer.addEventListener("touchend", onTouchEnd);
		imageViewer.addEventListener("touchmove", handleTouchMove);
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
			imageViewer.removeEventListener("touchmove", handleTouchMove);
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
