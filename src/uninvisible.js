/*
 * UnInVisible
 * (c) 2015 Beneath the Ink, Inc.
 * MIT License
 * Version 0.0.0
 */

var _ = require('underscore');
var Events = require('./events');
var Promise = require('lie');
if(!global.Tap) require('tapjs');

function UnInVisible(options){
	this.options = options || {};

	this.isDevice = !!('ontouchstart' in window);

	this.sourceImage = null;

	this.isAnimating = false;
	this.isOpen = false;
}

module.exports = UnInVisible;

_.extend(UnInVisible.prototype, Events, {
	_createView: _.once(function(){
		var imageViewer = this.imageViewer = document.createElement('div');
		imageViewer.classList.add('uninvisible-view');
		document.body.appendChild(imageViewer);

		var captionContainer = this.captionContainer = document.createElement( 'figcaption' );
		captionContainer.classList.add('caption-container');

		var captionTitle = this.captionTitle = this.isDevice === false ? document.createElement( 'h1' ) : document.createElement('h2');
		captionTitle.classList.add('caption-title');
		captionContainer.appendChild( captionTitle );

		var captionText = this.captionText = this.isDevice === false ? document.createElement( 'div' ) : document.createElement('h4');
		captionText.classList.add('caption-text');
		captionContainer.appendChild(captionText);

		imageViewer.appendChild(captionContainer);
	}),

	open: function(img, options, cb){ // !! return a promise and nodeify
		var Uninvisible = this;

		if(Uninvisible.isAnimating || Uninvisible.isOpen) return;

		this.trigger('open:before');

		if(options){
			if(typeof options === 'function' && cb == null){
				cb = options;
				options = {};
			}
		}
		options = options || {};

		Uninvisible._createView();
		Uninvisible.sourceImage = img;

		var viewFullScreen,
			isHorizontal;
		var containerW = window.innerWidth,
			containerH = window.innerHeight;

		var imageViewer = Uninvisible.imageViewer;
		initializeImageViewer();
		Uninvisible.setCaption(options);

		Uninvisible._animate(true, cb);

		if(viewFullScreen) Uninvisible._initMove(isHorizontal);


		// find img dimensions and determine the ideal positioning
		function initializeImageViewer(){
			var containerW = window.innerWidth,
				containerH = window.innerHeight;

			var imgW = img.naturalWidth,
				imgH = img.naturalHeight;

			// check to see if image is relatively small, if so don't display full screen
			if((imgW / containerW < 0.21 && containerW > 800) || (imgH / containerH < 0.21 && containerH > 800)){

				var wDif = imgW / containerW * 100;
				var hDif = imgH / containerH * 100;

				var SIZE = 83;
				if(wDif > hDif){
					hDif = (SIZE / wDif) * hDif;
					wDif = SIZE;
				} else {
					wDif = (SIZE / hDif) * wDif;
					hDif = SIZE;
				}

				imageViewer.style.backgroundSize = wDif  + '% ' + hDif  + '%';
				imageViewer.style.backgroundPosition = '50% 50%';

				viewFullScreen = false;
			} else {
				imageViewer.style.backgroundSize = 'cover';
				isHorizontal = imgW / imgH > containerW / containerH ? true : false;
				viewFullScreen = true;
			}

			imageViewer.style.backgroundImage = 'url("' + img.src + '")';
		}

		imageViewer.addEventListener('tap', closeImg);
		function closeImg(e){
			e.stopPropagation();
			e.preventDefault();
			Uninvisible.close.bind(Uninvisible)();
		}

		Uninvisible.on('close', function(){
			imageViewer.removeEventListener('tap', closeImg);
		});
	},

	close: function(options, cb){// !! return a promise and nodeify
		if(this.isAnimating) return;

		this.trigger('close:before');

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
		this.trigger('close');
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

		var imageViewer = this.imageViewer;
		if(isOpening){
			this.trigger('open');
			setToImgLocation();
			imageViewer.style.display = 'block';

			turnOnTransitions();
			addAnimationCompleteListener(onOpenComplete);
			setTimeout(function(){setToFullscreen();},10);
			// setToFullscreen();
		} else {
			this.trigger('close');
			addAnimationCompleteListener(onCloseComplete);
			setToImgLocation();
		}


		function onOpenComplete(){
			Uninvisible.isAnimating = false;
			Uninvisible.isOpen = true;
			document.body.style.overflow = 'hidden';

			removeAnimationCompleteListener(onOpenComplete);

			Uninvisible.trigger('open:after');

			if(typeof cb === 'function') cb();
		}

		function onCloseComplete(){
			Uninvisible.isAnimating = false;
			Uninvisible.isOpen = false;

			document.body.style.overflow = 'visible';
			document.body.style.cursor = 'auto';

			imageViewer.style.display = 'none';
			Uninvisible.resetCaption();
			Uninvisible.sourceImage = null;

			turnOffTransitions();
			removeAnimationCompleteListener(onCloseComplete);

			Uninvisible.trigger('close:after');

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
			followMouse, handleTouchMove;

		followMouse = _.throttle(function(e){
			xDest = (e.clientX / containerW) * 100;
			yDest = (e.clientY / containerH) * 100;
		}, 1000/30);

		handleTouchMove = _.throttle(function(e){
			xDest = 100 - (e.pageX / containerW) * 100;
			yDest = 100 - (e.pageY / containerH) * 100;
		}, 1000/30);

		var SLIDE_SPEED = 0.05;
		function positionImage(){
			if(isHorizontal){
				x = x + ((xDest - x) * SLIDE_SPEED);
			} else {
				y = y + ((yDest - y) * SLIDE_SPEED);
			}
			imageViewer.style.backgroundPosition = x + '% ' + y + '%';
		}

		imageViewer.addEventListener("touchmove", handleTouchMove);
		addEventListener('mousemove', followMouse);

		var looper;
		function loop(){
			looper = requestAnimFrame(loop);
			positionImage();
		}
		loop();

		Uninvisible.on('close', function(){
			cancelRequestAnimFrame(looper);
			removeEventListener('mousemove', followMouse);
			imageViewer.removeEventListener("touchmove", handleTouchMove);
		});
	},

	destroy: function(){
		if(this.isOpen) this.closeViewerImmediately();
		this.imageViewer.parentNode.removeChild(this.imageViewer);
	},
});

window.requestAnimFrame = (function(){
	return window.requestAnimationFrame       	||
		window.webkitRequestAnimationFrame 		||
		window.mozRequestAnimationFrame    		||
		function( callback ){
		window.setTimeout(callback, 100);
	};
})();

window.cancelRequestAnimFrame = ( function() {
	return window.cancelAnimationFrame          	||
		window.webkitCancelRequestAnimationFrame    ||
		window.mozCancelRequestAnimationFrame       ||
		window.oCancelRequestAnimationFrame     	||
		window.msCancelRequestAnimationFrame        ||
	clearTimeout;
})();
