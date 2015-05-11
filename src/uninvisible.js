var ramjet = require('ramjet');
require('node-touch')();

// image viewing manager
var viewCtrl = {
	currentImage: null, // currently viewed image
	imageViewer: null, // container element for viewing image - a div with background set to the current image
	captionContainer: null,
	looper: null, // loops to continuosly request animation frame
	horizontalOrientation: null, // image orientatation
	isDevice: false, // set to false until gyro tells us otherwise?
	viewFullScreen: true,
	containerDimensionsW: null,
	containerDimensionsH: null,

	open: function(img, options){
		if(!img.offsetParent) return;

		options = options || {};

		var currentImage = viewCtrl.currentImage = img;

		viewCtrl.containerDimensionsW = window.innerWidth;
		viewCtrl.containerDimensionsH = window.innerHeight;

		var viewFullScreen;
		setInitialPosition(currentImage);

		viewCtrl.imageViewer.style.backgroundImage = 'url("' + currentImage.src + '")';

		// make sure values are good for for proper copying of elements
		viewCtrl.revealElements();

		// create caption
		viewCtrl.setCaption(options.captionTitle, options.captionText);

		try{
			ramjet.transform(currentImage, viewCtrl.imageViewer, {
				done: function(){
					viewCtrl.currentImage.style.visibility = 'hidden';
					viewCtrl.imageViewer.style.visibility = 'visible';

					if(typeof options.done === 'function') options.done();
				}
			});
		} catch (e){
			console.log('error opening: ', e.stack);
			return;
		}

		// hide elements during animation
		viewCtrl.hideElements();

		// if the image is large enough to view full screen, init scrolling animation
		if(viewFullScreen === true) viewCtrl.start();

		function setInitialPosition(img){
			var imgW = img.naturalWidth;
			var imgH = img.naturalHeight;

			var containerW = viewCtrl.containerDimensionsW;
			var containerH = viewCtrl.containerDimensionsH;

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

				viewCtrl.imageViewer.style.backgroundSize = wDif  + '% ' + hDif  + '%';

				viewFullScreen = false;
			} else {
				viewCtrl.imageViewer.style.backgroundSize = 'cover';
				viewCtrl.horizontalOrientation = imgW / imgH > containerW / containerH ? true : false;
				viewFullScreen = true;
			}
		}
	},

	clickToOpen: function(e){
		e.stopPropagation();
		viewCtrl.open(e.target);
	},

	close: function(e, options){
		if(e != null) e.stopPropagation();

		var imageViewer = viewCtrl.imageViewer;
		var currentImage = viewCtrl.currentImage;

		if(!viewCtrl.currentImage.offsetParent) return viewCtrl.closeViewerImmediately();

		options = options || {};

		// make sure values are good for for proper copying of elements
		viewCtrl.revealElements();

		try{
			ramjet.transform(imageViewer, currentImage, {
				done: function(){
					currentImage.style.visibility = 'visible';
					imageViewer.style.visibility = 'hidden';
					imageViewer.style.display = 'none';
					viewCtrl.removeCaption();
					currentImage = null;
					if(typeof options.done === 'function') options.done();
				}
			});
		} catch (e) {
			console.log('error closing: ', e.stack);
			viewCtrl.closeViewerImmediately();
		}

		// hide elements during animation
		viewCtrl.hideElements();

		viewCtrl.stop();

		document.body.style.cursor = 'auto';
	},

	removeCaption: function(){
		var captionContainer = viewCtrl.captionContainer;
		if(captionContainer != null){
			while(captionContainer.childNodes.length){
				captionContainer.removeChild(captionContainer.childNodes[0]);
			}
			viewCtrl.imageViewer.removeChild(captionContainer);
			viewCtrl.captionContainer = viewCtrl.captionTitle = viewCtrl.captionText = null;
		}
	},

	setCaption: function(title, text){

		// values can come dynamically passed in or as data attributes from the img html element
		var title = title || viewCtrl.currentImage.dataset.captionTitle;
		var text = text || viewCtrl.currentImage.dataset.captionText;

		if(!title && !text) return;

		var captionContainer = document.createElement( 'figcaption' );
		captionContainer.classList.add('caption-container');

		if(title){
			var captionTitle = viewCtrl.isDevice === false ? document.createElement( 'h1' ) : document.createElement('h2');
			captionTitle.classList.add('caption-title');

			captionTitle.innerHTML = title;
			captionContainer.appendChild( captionTitle );
		}

		if(text){
			var captionText = viewCtrl.isDevice === false ? document.createElement( 'div' ) : document.createElement('h4');
			captionText.classList.add('caption-text');

			captionText.innerHTML = text;
			captionContainer.appendChild(captionText);
		}

		viewCtrl.captionContainer = captionContainer;
		viewCtrl.imageViewer.appendChild(captionContainer);
	},

	revealElements: function(){
		var imageViewer = viewCtrl.imageViewer;
		var currentImage = viewCtrl.currentImage;

		imageViewer.style.display = 'block';
		imageViewer.style.visibility = 'visible';
		if(viewCtrl.isDevice === false){
			currentImage.style.visibility = 'visible';
			currentImage.style.display = 'block';
		} else {
			// mobile was not displaying correctly, this looks smoother
			currentImage.style.visibility = 'hidden';
			currentImage.style.display = 'block';
		}
	},

	hideElements: function(){
		viewCtrl.currentImage.style.visibility = 'hidden';
		viewCtrl.imageViewer.style.visibility = 'hidden';
	},

	closeViewerImmediately: function(){
		viewCtrl.imageViewer.style.visibility = 'hidden';
		viewCtrl.imageViewer.style.display = 'none';

		viewCtrl.stop();
	},

	start: function(){
		var isTouching= false,
		containerDimensionsW = viewCtrl.containerDimensionsW,
		containerDimensionsH = viewCtrl.containerDimensionsH,
		horizontalOrientation = viewCtrl.horizontalOrientation,
		screenHorizontal = window.matchMedia("(orientation: landscape)").matches ? true : false,
		mouseXDest = containerDimensionsW / 2,
		mouseYDest = containerDimensionsH / 2,
		offsetX= null, offsetY= null,
		currentX= 50, currentY= 50,
		gyro= false,
		touchX= 50, touchY= 50,
		gyroX= null, gyroY= null,
		xDif= null, yDif= null;

		var followMouse = viewCtrl.followMouse = function(e){
			mouseXDest = e.clientX;
			mouseYDest = e.clientY;
		};

		var handleTouchMove = viewCtrl.handleTouchMove = function(e){
			isTouching = true;

			touchX = 100 - (e.pageX / containerDimensionsW * 100);
			touchY = 100 - (e.pageY / containerDimensionsH * 100);

			viewCtrl.imageViewer.style.backgroundPosition = touchX + '% ' + touchY + '%';
		};

		var loop = viewCtrl.loop = function(){
			viewCtrl.looper = requestAnimFrame(loop);
			gyro === false ? positionImage() : gyroPositionImage();
		};

		var gyroMotion = viewCtrl.gyroMotion = function(e) {
			if (!e.gamma && !e.beta) return;
			gyro = true;
			if(screenHorizontal === false){
				if(horizontalOrientation === true){
					// vertical device, horizontal scroll
					gyroX = e.gamma / 0.23 + 50;
					gyroX = gyroX >= 0 && gyroX <= 100 ? gyroX : gyroX < 0 ? 0 : 100;
				} else {
					// vertical device, vertical scroll
					gyroY = e.beta / 0.23 - 133;
					gyroY = gyroY >= 0 && gyroY <= 100 ? gyroY : gyroY < 0 ? 0 : 100;
				}
			} else {
				if(horizontalOrientation === true){
					// horizontal device, horizontal scroll
					gyroX = e.beta / 0.23 + 50;
					gyroX = gyroX >= 0 && gyroX <= 100 ? gyroX : gyroX < 0 ? 0 : 100;
				} else {
					// horizontal device, vertical scroll
					gyroY = -e.gamma / 0.25 - 100;
					gyroY = gyroY >= 0 && gyroY <= 100 ? gyroY : gyroY < 0 ? 0 : 100;
				}
			}
		};

		window.addEventListener('mousemove', viewCtrl.followMouse);
		window.addEventListener('deviceorientation', viewCtrl.gyroMotion);
		window.addEventListener('orientationchange', viewCtrl.closeViewerImmediately);

		viewCtrl.imageViewer.addEventListener('touchmove', viewCtrl.handleTouchMove);
		viewCtrl.imageViewer.addEventListener('touchend', detectTouchEnd);

		loop();

		function detectTouchEnd(e){
			if(isTouching === true) return slideBackToGyro();
		}

		function positionImage(){
			if(gyro === true) return;
			var x, y;
			if(horizontalOrientation === true){
				var xDest = mouseXDest / containerDimensionsW * 100,
				y = 50;
				offsetX = (xDest - currentX) * 0.05;

				x = currentX = currentX + offsetX;

			} else if (horizontalOrientation === false){
				var yDest = mouseYDest / containerDimensionsH * 100,
				x = 50;
				offsetY = (yDest - currentY) * 0.05;

				y = currentY = currentY + offsetY;
			}

			viewCtrl.imageViewer.style.backgroundPosition = x + '% ' + y + '%';
		}

		function gyroPositionImage(){
			if (isTouching === true) return;
			var x, y;

			x = typeof gyroX === 'number' ? gyroX : 50;
			y = typeof gyroY === 'number' ? gyroY : 50;

			xDif = (x - touchX) * 0.09;
			yDif = (y - touchY) * 0.09;

			if(horizontalOrientation === true && xDif) x = touchX = touchX + xDif;
			if(horizontalOrientation === false && yDif) y = touchY = touchY + yDif;
			viewCtrl.imageViewer.style.backgroundPosition = (100 - x) + '% ' + (100 - y) + '%';
		}

		function slideBackToGyro(){
			touchX = 100 - touchX;
			touchY = 100 - touchY;
			isTouching = false;
		}
	},

	stop: function(){

		window.removeEventListener('mousemove', viewCtrl.followMouse);

		window.removeEventListener('deviceorientation', viewCtrl.gyroMotion);
		window.addEventListener('orientationchange', viewCtrl.closeViewerImmediately);

		cancelRequestAnimFrame(viewCtrl.looper);
		viewCtrl.looper = cancelRequestAnimFrame(viewCtrl.loop);
	}
};

function Uninvisible(options){
	this.options = options || {};

	this.images = [];

	viewCtrl.isDevice = window.isTouchDevice;

	if(!viewCtrl.imageViewer){
		this.createView();
	}
}

module.exports = Uninvisible;

Uninvisible.prototype.createView = function(){
	var imageViewer = document.createElement('div');
	imageViewer.classList.add('uninvisible-view');
	document.body.appendChild(imageViewer);

	window.addEventListener('resize', viewCtrl.closeViewerImmediately, false);
	imageViewer.addEventListener('tap', viewCtrl.close);
	imageViewer.addEventListener("touchmove", viewCtrl.handleTouchMove);

	viewCtrl.imageViewer = imageViewer;
};

Uninvisible.prototype.destroy = function(){
	imageViewer.removeEventListener('tap', viewCtrl.close);
	imageViewer.removeEventListener("touchmove", viewCtrl.handleTouchMove);
	viewCtrl.imageViewer.parentNode.removeChild(imageViewer);
	window.removeEventListener('resize', viewCtrl.closeViewerImmediately, false);
	delete viewCtrl;
};

Uninvisible.prototype.initImage = function(img, options){
	options = options || {};
	if(img.tagName != 'IMG') throw new Error("Expecting an image element.");

	var image = new ImageElement(img, options);
	this.images.push(image);

	return image;
};

function ImageElement(img, options){
	if(img.tagName != 'IMG'){
		throw new Error("Expecting an image element.");
	}

	var test = function(){
		console.log('testing!!!');
	};

	this.options = options = options || {};

	this.sourceImage = img;

	img.addEventListener('tap', function(e){
		viewCtrl.open(img, options);
	}, true);
	img.classList.add('uninvisible');
}

ImageElement.prototype.open = function(options){
	options = options || {};

	// if no caption passed in, get it from when image was initialized, and if null, it will look to the data-* attribute of element
	if(!options.captionTitle) options.captionTitle = this.options.captionTitle;
	if(!options.captionText) options.captionText = this.options.captionText;

	viewCtrl.open(this.sourceImage, options);
};

ImageElement.prototype.close = function(options){
	viewCtrl.close(null, options);
};

ImageElement.prototype.setCaption = function(options){
	if(options.captionTitle) this.options.captionTitle = options.captionTitle;
	if(options.captionText) this.options.captionText = options.captionText;
	return this;
};

ImageElement.prototype.destroy = function(e){
	this.sourceImage.removeEventListener('tap', function(e){
		viewCtrl.open(img, options);
	}, true);
	this.sourceImage.classList.remove('uninvisible');
};

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

