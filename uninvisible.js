var ramjet = require('ramjet');

(function (global, factory) {
		typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
		typeof define === 'function' && define.amd ? define(factory) :
		global.UnInVisible = factory();
		}(this, function () {

	var imageViewer,
		nodes,
		currentImage,
		imageSource,
		containerDimensions,
		sourceDimensions,
		relativeSourceDimensions,
		uninvisibleHoverStyle,
		looper,
		horizontalOrientation,
		viewFullScreen,
		isDevice,
		gyro = false,
		deviceHorizontal,
		isTouching = false;

	var captionContainer,
		captionTitle,
		captionText;

	var mouse = {
		xCurr: 0,
		yCurr: 0,
		xDest: 0,
		yDest: 0
	};

	var currentPosition = {
		x: 50,
		y: 50
	};

	var lastPosition = {
		x: 0,
		y: 0
	};

	var forEach = Array.prototype.forEach;

	function applyStyles(el, styles){
		for(var key in styles) {
			el.style[key] = styles[key];
		}
	}

	function createView(){
		imageViewer = document.createElement('div');
		imageViewer.id = 'image-viewer';

		applyStyles(imageViewer, {
			'width': '100%',
			'height': '100%',
			'position': 'absolute',
			'zIndex': 999,
			'display': 'none',
			'background': 'rgba(19, 19, 19, 0.88)',
			'backgroundRepeat': 'no-repeat',
			'backgroundPosition': 'center',
			'cursor': 'url(assets/close_cursor.png) 25 25, auto'
		});

		document.body.appendChild(imageViewer);
	}

	function createHoverStyle(){
		uninvisibleHoverStyle = document.createElement('style');
		style.type = 'text/css';
		style.innerHTML = '.uninvisible:hover { cursor: url(assets/close_cursor.png) 25 25, auto; }';
		document.getElementsByTagName('head')[0].appendChild(style);
	}

	function removeCaption(){
		if(captionContainer != null) imageViewer.removeChild(captionContainer);
		captionContainer = captionTitle = captionText = null;
	}

	function caption(){

		var title = currentImage.getAttribute('data-title');
		var text = currentImage.getAttribute('data-text');

		if(!title && !text) return;

		captionContainer = document.createElement( 'figcaption' );
		captionContainer.id = 'caption-container';
		applyStyles(captionContainer, {
			'fontFamily': 'Georgia, Times, "Times New Roman", serif',
			'position': 'fixed',
			'bottom': '0px',
			'left': '0px',
			'padding': '20px',
			'color': '#fff',
			'wordSpacing': '0.2px',
			'webkitFontSmoothing': 'antialiased',
			'textShadow': '-1px 0px 1px rgba(0,0,0,0.3)',
			'background': 'rgba(0,0,0,0.6)',
			'borderTopRightRadius': '5px'
		});

		if(title){
			captionTitle = isDevice === false ? document.createElement( 'h1' ) : document.createElement('h2');
			captionTitle.id = 'caption-title';
			applyStyles(captionTitle, {
				'margin': '0px',
				'padding': '0px',
				'fontWeight': 'normal',
				'letterSpacing': '0.5px',
				'lineHeight': '35px',
				'textAlign': 'left'
			});
			captionTitle.innerHTML = title;
			captionContainer.appendChild( captionTitle );
		}

		if(text){
			captionText = isDevice === false ? document.createElement( 'div' ) : document.createElement('h4');
			captionText.id = 'caption-text';
			applyStyles(captionText, {
				'margin': '0px',
				'padding': '0px',
				'fontWeight': 'normal',
				'letterSpacing': '0.1px',
				'maxWidth': '500px',
				'textAlign': 'left',
				'background': 'none',
				'marginTop': '5px',
				'fontSize': '17px'
			});
			captionText.innerHTML = text;
			captionContainer.appendChild(captionText);
		}
		imageViewer.appendChild(captionContainer);
	}

	function bindEvents(){
		window.addEventListener('resize', closeViewer, false);

		if(isDevice === true){
			imageViewer.addEventListener('touchend', detectTouchEnd);
			imageViewer.addEventListener("touchmove", handleTouchMove);

			for (var i = 0; i < nodes.length; ++i) {
				nodes[i].addEventListener('touchend', initialize, true);
				nodes[i].classList.add('uninvisible');
			}
		} else {
			imageViewer.addEventListener('click', closeImageView);

			for (var i = 0; i < nodes.length; ++i) {
				nodes[i].addEventListener('click', initialize, true);
			}
		}

	}

	function unbindEvents(){
		window.removeEventListener('resize', closeViewer, false);

		if(isDevice === true){
			imageViewer.removeEventListener('touchend', detectTouchEnd);
			imageViewer.removeEventListener("touchmove", handleTouchMove);

			for (var i = 0; i < nodes.length; ++i) {
				nodes[i].removeEventListener('touchend', initialize, true);
				nodes[i].classList.remove('uninvisible');
			}
		} else {
			imageViewer.removeEventListener('click', closeImageView);

			for (var i = 0; i < nodes.length; ++i) {
				nodes[i].removeEventListener('click', initialize, true);
			}
		}
	}

	function initialize(e){
		e.stopPropagation();
		currentImage = e.target;

		setDimensions();
		setDeviceOrientation();

		imageSource = currentImage.src;

		getImageDimensions(function(viewFullScreen){
			viewImage(currentImage);
			if(viewFullScreen === true){
				initTracking();
				start();
			}
		});

	}

	function revealElements(){
		imageViewer.style.display = 'block';
		imageViewer.style.visibility = 'visible';
		if(isDevice === false){
			currentImage.style.visibility = 'visible';
			currentImage.style.display = 'block';
		} else {
			// mobile was not displaying correctly, this looks smoother
			currentImage.style.visibility = 'hidden';
			currentImage.style.display = 'block';
		}
	}

	function hideElements(){
		currentImage.style.visibility = 'hidden';
		imageViewer.style.visibility = 'hidden';
	}

	function viewImage(){
		imageViewer.style.backgroundImage = 'url(' + imageSource +')';

		// make sure values are good for for proper copying of elements
		revealElements();
		caption();

		ramjet.transform(currentImage, imageViewer, {
			done: function(){
				currentImage.style.visibility = 'hidden';
				imageViewer.style.visibility = 'visible';
			}
		});

		hideElements();
	}

	function closeImageView(e){
		if(e != null) e.stopPropagation();

		// make sure values are good for for proper copying of elements
		revealElements();

		ramjet.transform(imageViewer, currentImage, {
			done: function(){
				currentImage.style.visibility = 'visible';
				imageViewer.style.visibility = 'hidden';
				imageViewer.style.display = 'none';
				removeCaption();
			}
		});

		hideElements();

		stop();
		stopTracking();
		document.body.style.cursor = 'auto';
	}

	function detectTouchEnd(e){
		if(isTouching === true) return slideBackToGyro();
		closeImageView(e);
	}

	function initTracking(){
		mouse.xDest = containerDimensions.w / 2;
		mouse.yCurr = mouse.yDest = containerDimensions.h / 2;

		window.addEventListener('mousemove', followMouse);

		if(isDevice === true){
			window.addEventListener('deviceorientation', gyroMotion);
			window.addEventListener('orientationchange', closeViewer);
		}
	}

	function stopTracking(){
		window.removeEventListener('mousemove', followMouse);

		if(isDevice === true){
			window.removeEventListener('deviceorientation', gyroMotion);
			window.addEventListener('orientationchange', closeViewer);
		}
	}

	function followMouse(e){
		mouse.xDest = e.clientX;
		mouse.yDest = e.clientY;
	}

	var offsetX, offsetY,
		currentX = currentY = 50;
	function positionImage(){
		var x, y;

		if(horizontalOrientation === true){
			var xDest = mouse.xDest / containerDimensions.w * 100,
			y = 50;
			offsetX = (xDest - currentX) * 0.05;

			x = currentX = currentX + offsetX;

		} else if (horizontalOrientation === false){
			var yDest = mouse.yDest / containerDimensions.h * 100,
			x = 50;
			offsetY = (yDest - currentY) * 0.05;

			y = currentY = currentY + offsetY;
		}

		imageViewer.style.backgroundPosition = x + '% ' + y + '%';
	}

	var gyroX, gyroY;
	function gyroMotion(e) {
		gyro = true;
		if(deviceHorizontal === false){
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
	}

	var xDif, yDif;
	function gyroPositionImage(){
		if (isTouching === true) return;
		var x, y;

		x = typeof gyroX === 'number' ? gyroX : 50;
		y = typeof gyroY === 'number' ? gyroY : 50;

		xDif = (x - touchX) * 0.09;
		yDif = (y - touchY) * 0.09;

		if(horizontalOrientation === true && xDif) x = touchX = touchX + xDif;
		if(horizontalOrientation === false && yDif) y = touchY = touchY + yDif;

		imageViewer.style.backgroundPosition = (100 - x) + '% ' + (100 - y) + '%';
	}

	var touchX = 50,
		touchY = 50;
	function handleTouchMove(e){
		isTouching = true;

		touchX = 100 - (e.pageX / containerDimensions.w * 100);
		touchY = 100 - (e.pageY / containerDimensions.h * 100);

		imageViewer.style.backgroundPosition = touchX + '% ' + touchY + '%';
	}

	function slideBackToGyro(){
		touchX = 100 - touchX;
		touchY = 100 - touchY;
		isTouching = false;
	}

	function setDeviceOrientation(){
		deviceHorizontal = window.matchMedia("(orientation: landscape)").matches ? true : false;
	}

	function closeViewer(e){
		imageViewer.style.visibility = 'hidden';
		imageViewer.style.display = 'none';

		stop();
		stopTracking();
	}

	function setDimensions(){
		containerDimensions = {
			w: window.innerWidth,
			h: window.innerHeight
		};
	}

	function getImageDimensions(cb){
		var img = new Image();
		img.src = imageSource;
		img.onload = function() {

			var imgW = img.naturalWidth;
			var imgH = img.naturalHeight;

			sourceDimensions = {
				w: imgW,
				h: imgH
			};

			var containerW = containerDimensions.w;
			var containerH = containerDimensions.h;

			if((imgW < 325 && containerW > 900) || (imgH < 325 && containerH > 900)){
				// image is small, and will probably look bad when full screen
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

				imageViewer.style.backgroundRepeat = 'no-repeat';

				viewFullScreen = true;
				if(typeof cb === 'function') cb(false);
			} else {
				imageViewer.style.backgroundSize = 'cover';

				if(imgW / imgH > containerW / containerH){
					relativeSourceDimensions = {
						h: containerH,
						w: (containerH / imgH) * imgW
					};
					horizontalOrientation = true;
				} else if (imgW / imgH < containerW / containerH){
					relativeSourceDimensions = {
						h: (containerW/ imgW) * imgH,
						w: containerH
					};
					horizontalOrientation = false;
				}

				viewFullScreen = true;
				if(typeof cb === 'function') cb(true);
			}
		};
	}

	function closest(elem, selector) {
		while (elem != null) {
			if (elem.nodeType === 1 && elem.classList.contains('content-inner')) return elem;
			elem = elem.parentNode;
		}
		return null;
	}

	function start(){
		loop();
	}

	function stop(){
		cancelRequestAnimationFrame(looper);
		looper = cancelRequestAnimationFrame(loop);
		touchX = touchY = 50;
	}

	function loop(){
		looper = requestAnimationFrame(loop);
		isDevice === false ? positionImage() : gyroPositionImage();
	}


	window.requestAnimationFrame = (function(){
		return window.requestAnimationFrame       	||
			window.webkitRequestAnimationFrame 		||
			window.mozRequestAnimationFrame    		||
			function( callback ){
			window.setTimeout(callback, 1000/60);
		};
	})();

	window.cancelRequestAnimationFrame = ( function() {
		return window.cancelAnimationFrame          	||
			window.webkitCancelRequestAnimationFrame    ||
			window.mozCancelRequestAnimationFrame       ||
			window.oCancelRequestAnimationFrame     	||
			window.msCancelRequestAnimationFrame        ||
		clearTimeout;
	})();

	function isNodeList(nodes) {
	var stringRepr = Object.prototype.toString.call(nodes);

	return typeof nodes === 'object' &&
		/^\[object (HTMLCollection|NodeList|Object)\]$/.test(stringRepr) &&
		nodes.hasOwnProperty('length') &&
		(nodes.length === 0 || (typeof nodes[0] === "object" && nodes[0].nodeType > 0));
	}

	uninvisible = {
		init: function(imageNodes){
			if(isNodeList(imageNodes)){
				nodes = imageNodes;
			} else {
				nodes = [];
				if(imageNodes.tagName != 'IMG') return;
				nodes[0] = imageNodes;
			}

			if(!nodes.length) return;

			if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
				isDevice = true;
			} else {
				isDevice = false;
			}

			createView();
			bindEvents();
		},

		destroy: function(){
			unbindEvents();
			delete imageViewer;
			delete uninvisibleHoverStyle;
		},
	};

	return uninvisible;
}));