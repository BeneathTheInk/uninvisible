/*
 * UnInVisible
 * (c) 2015 Beneath the Ink, Inc.
 * MIT License
 * Version 0.0.0
 */

var ramjet = require('ramjet');
require('node-touch')();
var Backbone = require('backbone');
var _ = require('underscore');

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

	this.Uninvisible = uninvisible;
	this.options = options = options || {};

	this.sourceImage = img;

	var self = this;

	function openImg(e){
		e.stopPropagation();
		self.open();
	}

	img.addEventListener('tap', openImg);
	img.classList.add('uninvisible');

	this.on('destroy', function(){
		img.removeEventListener('tap', openImg);
	});
}

_.extend(UnInVisibleImage.prototype, Backbone.Events, {
	open: function(options){
		var self = this;
		var img = this.sourceImage;
		if(!img.offsetParent) return; // Ramjet will break if no offsetParent

		var Uninvisible = this.Uninvisible;
		var imageViewer = Uninvisible.imageViewer;

		var viewFullScreen,
			horizontalOrientation;
		var containerW = window.innerWidth,
			containerH = window.innerHeight;

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

		// make sure values are good for for proper copying of elements
		this.revealElements();

		try{
			ramjet.transform(img, imageViewer, {
				done: function(){
					img.style.visibility = 'hidden';
					imageViewer.style.visibility = 'visible';

					if(typeof options.done === 'function') options.done();
				}
			});
		} catch (e){
			console.log('error opening: ', e.stack);
			return;
		}

		// hide elements during animation
		this.hideElements();

		function setInitialPosition(){
			var imgW = img.naturalWidth;
			var imgH = img.naturalHeight;

			if((imgW < 325 && containerW > 900) || (imgH < 325 && containerH > 900)){
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

		imageViewer.addEventListener('tap', closeImg);
		this.on('close', function(){
			removeEventListener('mousemove', followMouse);
			imageViewer.removeEventListener('tap', closeImg);
			imageViewer.removeEventListener("touchmove", handleTouchMove);
			Uninvisible.currentImage = null;
		});
	},

	close: function(options){
		var Uninvisible = this.Uninvisible;
		var imageViewer = Uninvisible.imageViewer;
		var img = this.sourceImage;

		if(!img.offsetParent) return this.closeViewerImmediately();

		options = options || {};

		// make sure values are good for for proper copying of elements
		this.revealElements();

		try{
			ramjet.transform(imageViewer, img, {
				done: function(){
					img.style.visibility = 'visible';
					imageViewer.style.visibility = 'hidden';
					imageViewer.style.display = 'none';
					resetCaption();
					Uninvisible.currentImage = null;
					if(typeof options.done === 'function') options.done();
				}
			});
		} catch (e) {
			console.log('error closing: ', e.stack);
			this.closeViewerImmediately();
		}

		// hide elements during animation
		this.hideElements();

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

	revealElements: function(){
		var Uninvisible = this.Uninvisible;
		var imageViewer = Uninvisible.imageViewer;
		var img = Uninvisible.currentImage.sourceImage;

		imageViewer.style.display = 'block';
		imageViewer.style.visibility = 'visible';
		if(Uninvisible.isDevice === false){
			img.style.visibility = 'visible';
			img.style.display = 'block';
		} else {
			// mobile was not displaying correctly, this looks smoother
			img.style.visibility = 'hidden';
			img.style.display = 'block';
		}
	},

	hideElements: function(){
		var Uninvisible = this.Uninvisible;
		Uninvisible.currentImage.sourceImage.style.visibility = 'hidden';
		Uninvisible.imageViewer.style.visibility = 'hidden';
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

