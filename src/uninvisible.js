/*
 * UnInVisible
 * (c) 2015 Beneath the Ink, Inc.
 * MIT License
 * Version 0.0.0
 */

var _ = require('underscore');
var Backbone = require('backbone');
// require('node-touch')();

function UnInVisible(options){
	this.options = options || {};
	this.images = [];
	this.isDevice = window.isTouchDevice;
	this.createView();
}

module.exports = UnInVisible;
window.UnInVisible = UnInVisible;

_.extend(UnInVisible.prototype, Backbone.Events, {
	createView: function(){
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
	},

	destroy: function(){
		var self = this;
		if(this.currentImage){
			this.currentImage.close({
				done: destroy
			});
		} else {
			destroy();
		}

		function destroy(){
			_.each(self.images, function(img){
				img.destroy();
			});

			self.imageViewer.parentNode.removeChild(self.imageViewer);
		}
	},

	initImage: function(img, options){
		if(img.tagName != 'IMG') throw new Error("Expecting an image element.");

		options = options || {};

		var image = new UnInVisibleImage(img, this, options);
		this.images.push(image);

		return image;
	},

	closeImage: function(){
		this.trigger('close');
	},
});


function UnInVisibleImage(img, uninvisible, options){
	if(img.tagName != 'IMG'){
		throw new Error("Expecting an image element.");
	}

	var self = this;
	this.Uninvisible = uninvisible;
	this.options = options = options || {};
	this.sourceImage = img;
	this.isAnimating = false;

	function openImg(e){
		e.stopPropagation();
		self.open();
	}

	img.addEventListener('click', openImg);
	img.classList.add('uninvisible');

	this.on('destroy', function(){
		img.removeEventListener('click', openImg);
	});
}

_.extend(UnInVisibleImage.prototype, Backbone.Events, {
	open: function(options){
		if(this.isAnimating) return;
		this.isAnimating = true;
		var self = this;
		var img = this.sourceImage;

		var Uninvisible = this.Uninvisible;
		var imageViewer = Uninvisible.imageViewer;

		var viewFullScreen,
			horizontalOrientation;
		var containerW = window.innerWidth,
			containerH = window.innerHeight;
		var pageX = window.scrollX,
			pageY = window.scrollY;

		options = options || {};

		var currentImage = Uninvisible.currentImage;
		if(currentImage) return currentImage.close({
			done: function(){
				self.open();
			}
		});

		Uninvisible.currentImage = this;

		setInitialPosition();

		imageViewer.style.backgroundImage = 'url("' + img.src + '")';


		// create caption
		// check for caption passed in, then check options from when image was initialized, then look to the data-* attribute of element, finally if none found don't display
		var title = options.captionTitle || this.options.captionTitle || img.dataset.captionTitle;
		var text = options.captionText || this.options.captionText || img.dataset.captionText;

		if(title || text) Uninvisible.captionContainer.style.display = 'block';
		if(title){
			Uninvisible.captionTitle.innerHTML = title;
			Uninvisible.captionTitle.style.display = 'block';
		}
		if(text){
			Uninvisible.captionText.innerHTML = text;
			Uninvisible.captionText.style.display = 'block';
		}

		imageViewer.style.display = 'block';
		imageViewer.classList.add('no-transition');
		var position = img.getClientRects()[0];

		imageViewer.style.top = (position.top / containerH * 100) + '%';
		imageViewer.style.bottom = ((containerH - position.bottom) / containerH * 100) + '%';
		imageViewer.style.left = (position.left / containerW * 100) + '%';
		imageViewer.style.right = ((containerW - position.right) / containerW * 100) + '%';

		// timoout
		setTimeout(function(){
			imageViewer.classList.remove('no-transition');
			imageViewer.style.top = 0 + '%';
			imageViewer.style.bottom = 0 + '%';
			imageViewer.style.left = 0 + '%';
			imageViewer.style.right = 0 + '%';
			imageViewer.style.opacity = 1;
		},10);

		setTimeout(function(){
			self.isAnimating = false;
			document.body.classList.add('no-scrolling');
			if(typeof options.done === 'function') options.done();
		},410);



		function setInitialPosition(){
			var imgW = img.naturalWidth;
			var imgH = img.naturalHeight;

			if((imgW / containerW < 0.21 && containerW > 800) || (imgH / containerH < 0.21 && containerH > 800)){

				// image is small, and will probably look bad when full screen, so don't display full screen
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
				horizontalOrientation = imgW / imgH > containerW / containerH ? true : false;
				viewFullScreen = true;
			}
		}

		// if the image is large enough to view full screen, init scrolling animation
		if(viewFullScreen === true){
			var xDest = yDest = 50,
				x = y = 50;

			function followMouse(e){
				xDest = (e.clientX / containerW) * 100;
				yDest = (e.clientY / containerH) * 100;
			}

			function handleTouchMove(e){
				xDest = 100 - (e.pageX / containerW) * 100;
				yDest = 100 - (e.pageY / containerH) * 100;
			}

			function positionImage(){
				if(horizontalOrientation === true){
					x = x + ((xDest - x) * 0.13);
				} else {
					y = y + ((yDest - y) * 0.13);
				}
				imageViewer.style.backgroundPosition = x + '% ' + y + '%';
			}

			imageViewer.addEventListener("touchmove", handleTouchMove);
			addEventListener('mousemove', followMouse);

			self.start(positionImage);
		}

		var closeImg = function(e){
			e.stopPropagation();
			self.close.bind(self)();
		};

		imageViewer.addEventListener('click', closeImg);
		this.on('close', function(){
			removeEventListener('mousemove', followMouse);
			imageViewer.removeEventListener('click', closeImg);
			imageViewer.removeEventListener("touchmove", handleTouchMove);
			Uninvisible.currentImage = null;
		});

		this.on('reset-page', function(){
			document.body.classList.remove('no-scrolling');
			window.scrollTo(pageX, pageY);
		});
	},

	close: function(options){
		if(this.isAnimating) return;
		this.isAnimating = true;

		var Uninvisible = this.Uninvisible;
		var imageViewer = Uninvisible.imageViewer;
		var img = this.sourceImage;
		var self = this;
		this.trigger('reset-page');

		options = options || {};

		var position = img.getClientRects()[0];
		var containerW = window.innerWidth,
			containerH = window.innerHeight;

		imageViewer.style.top = (position.top / containerH * 100) + '%';
		imageViewer.style.bottom = ((containerH - position.bottom) / containerH * 100) + '%';
		imageViewer.style.left = (position.left / containerW * 100) + '%';
		imageViewer.style.right = ((containerW - position.right) / containerW * 100) + '%';
		imageViewer.style.opacity = 0;
		setTimeout(function(){
			imageViewer.style.display = 'none';
			resetCaption();
			self.isAnimating = false;
			if(typeof options.done === 'function') options.done();
		},400);


		function resetCaption(){
			Uninvisible.captionContainer.style.display = 'none';

			Uninvisible.captionTitle.style.display = 'none';
			Uninvisible.captionTitle.innerHTML = '';

			Uninvisible.captionText.style.display = 'none';
			Uninvisible.captionText.innerHTML = '';
		}

		document.body.style.cursor = 'auto';

		this.trigger('close');
		this.stop();
	},

	closeViewerImmediately: function(){
		var imageViewer = this.Uninvisible.imageViewer;
		this.trigger('close');
		imageViewer.style.visibility = 'hidden';
		imageViewer.style.display = 'none';
		this.stop();
	},

	start: function(fn){
		var self = this;
		var loop = self.loop = function(){
			self.looper = requestAnimFrame(loop);
			fn();
		};
		loop();
	},

	stop: function(){
		cancelRequestAnimFrame(this.looper);
	},

	setCaption: function(options){
		if(options.captionTitle) this.options.captionTitle = options.captionTitle;
		if(options.captionText) this.options.captionText = options.captionText;
		return this;
	},

	destroy: function(e){
		this.trigger('destroy');
		this.sourceImage.classList.remove('uninvisible');
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

