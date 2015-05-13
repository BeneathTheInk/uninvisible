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

function Uninvisible(options){
	this.options = options || {};
	this.images = [];
	this.isDevice = window.isTouchDevice;
	this.createView();
}

module.exports = Uninvisible;

_.extend(Uninvisible.prototype, Backbone.Events, {
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
		if(this.currentImage){
			currentImage.close({
				done: destroy
			});
		} else {
			destroy();
		}

		function destroy(){
			viewCtrl.imageViewer.parentNode.removeChild(imageViewer);
		}
	},

	initImage: function(img, options){
		if(img.tagName != 'IMG') throw new Error("Expecting an image element.");

		options = options || {};

		var image = new UnInvImage(img, this, options);
		this.images.push(image);

		return image;
	},
});


function UnInvImage(img, uninvisible, options){
	if(img.tagName != 'IMG'){
		throw new Error("Expecting an image element.");
	}

	this.Uninvisible = uninvisible;
	this.options = options = options || {};

	this.sourceImage = img;

	var self = this;
	img.addEventListener('tap', function(e){
		e.stopPropagation();
		self.open();
	});
	img.classList.add('uninvisible');
}

_.extend(UnInvImage.prototype, Backbone.Events, {
	open: function(options){
		console.log('this: ', this);
		var self = this;
		var img = this.sourceImage;
		if(!img.offsetParent) return; // Ramjet will break if no offsetParent, or ancestor elements are 'display: none' or 'position: fixed'

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
			// viewCtrl.start();
			var isTouching= false,
				screenHorizontal = window.matchMedia("(orientation: landscape)").matches ? true : false,
				mouseXDest = containerW / 2,
				mouseYDest = containerH / 2,
				offsetX= null, offsetY= null,
				currentX= 50, currentY= 50,
				gyro= false,
				touchX= 50, touchY= 50,
				gyroX= null, gyroY= null,
				xDif= null, yDif= null;

			function followMouse(e){
				var x = (e.clientX / containerW) * 100;
				var y = (e.clientY / containerH) * 100;

				imageViewer.style.backgroundPosition = touchX + '% ' + touchY + '%';
			}

			function handleTouchMove(e){
				isTouching = true;

				touchX = 100 - (e.pageX / containerW) * 100;
				touchY = 100 - (e.pageY / containerH) * 100;

				imageViewer.style.backgroundPosition = touchX + '% ' + touchY + '%';
			}

			// function detectTouchEnd(e){
			// 	if(isTouching === true) return;
			// }

			imageViewer.addEventListener("touchmove", handleTouchMove);
			addEventListener('mousemove', followMouse);


			// imageViewer.addEventListener('touchend', detectTouchEnd);
		}

		imageViewer.addEventListener('tap', this.closeByEvent);
		window.addEventListener('orientationchange', this.closeViewerImmediately);
		this.listenTo(this,'close', function(){
			removeEventListener('mousemove', followMouse);
			imageViewer.removeEventListener('tap', this.closeByEvent);
			imageViewer.removeEventListener("touchmove", handleTouchMove);
			window.addEventListener('orientationchange', this.closeViewerImmediately);
		});
	},

	openByEvent: function(e){
		e.stopPropagation();
		this.open();
	},

	closeByEvent: function(e){
		e.stopPropagation();
		this.close();
	},

	close: function(options){
		// if(e != null) e.stopPropagation();

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
	},

	closeViewerImmediately: function(){
		var imageViewer = this.Uninvisible.imageViewer;
		this.trigger('close');
		imageViewer.style.visibility = 'hidden';
		imageViewer.style.display = 'none';
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
		img.removeEventListener('tap', function(e){
			viewCtrl.open(img, options);
		}, true);
		this.sourceImage.classList.remove('uninvisible');
	},

});

window.requestAnimFrame = (function(){
	return window.requestAnimationFrame       	||
		window.webkitRequestAnimationFrame 		||
		window.mozRequestAnimationFrame    		||
		function( callback ){
		window.setTimeout(callback, 40);
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

