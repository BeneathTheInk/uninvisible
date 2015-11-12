var raf = require('raf');
var _  = require('underscore');

module.exports = {
	_initTrackingDesktop: function(){
		var Uninvisible = this;
		resetVars();

		var matrix, imgW, imgH, scaledHeight, scaledWidth;
		var xDestPercent, yDestPercent, xPercent, yPercent;
		var expandByX, expandByY, currTx, currTy, newTx, newTy;
		var x, y, curX, curY, curScale;


		function resetVars(){
			matrix = Uninvisible.matrix;

			imgW = Uninvisible.dimensions.initialWidth;
			imgH = Uninvisible.dimensions.initialHeight;

			xDestPercent = 50;
			yDestPercent = 50;
					xPercent = 50;
					yPercent = 50;

			currTx = 0;
			currTy = 0;
			newTx = currTx;
			newTy = currTy;
			x = 0;
			y = 0;
			curX = 0;
			curY = 0;
			curScale = matrix.decompose().scaling.y;
		}

		var followMouse = _.throttle(function(e){
			if(Uninvisible.orientation < 2) return;

			xDestPercent = (e.clientX / window.innerWidth) * 100;
			yDestPercent = (e.clientY / window.innerHeight) * 100;
		}, 1000/30);

		function onWheelZoom(){
			Uninvisible.emit('stoptracking');
			Uninvisible._initGrabZoom();
		}

		var SLIDE_SPEED = Math.max(Math.min(this.options.trackSpeed, 1), 0.01);
		function positionImage(){
			curScale = matrix.decompose().scaling.y;
			switch(Uninvisible.orientation){
				case 0:
				case 1:
					break;
				// HORIZONTAL
				case 2:
				case 4:
					positionX();
					break;
				// VERTICAL
				case 3:
				case 5:
					positionY();
					break;
				// FREE SCROLL
				case 6:
					positionX();
					positionY();
					break;
				}

				matrix.translate(x, y);
				Uninvisible._transformCSS(matrix);
		}

		function positionX(){
			xPercent = xPercent + ((xDestPercent - xPercent) * SLIDE_SPEED);
			if(xPercent < 0) xDestPercent = (xDestPercent * SLIDE_SPEED);
			if(xPercent > 100) xDestPercent = xDestPercent + ((100 - xDestPercent) * SLIDE_SPEED);

			if(xPercent < 50){
				expandByX = (50 - xPercent) / 100 * window.innerWidth / 2;
			} else {
				expandByX = -(50 - (100 - xPercent)) / 100 * window.innerWidth / 2;
			}

			scaledWidth = imgW * curScale;

			newTx = (window.innerWidth / 2) - (((scaledWidth + expandByX) / 2) - ((scaledWidth - window.innerWidth) * (xPercent / 100)));
			newTx /= curScale;

			x = currTx - newTx;

			currTx = newTx;
		}

		function positionY(){
			yPercent = yPercent + ((yDestPercent - yPercent) * SLIDE_SPEED);
			if(yPercent < 0) yDestPercent = (yDestPercent * SLIDE_SPEED);
			if(yPercent > 100) yDestPercent = yDestPercent + ((100 - yDestPercent) * SLIDE_SPEED);

			if(yPercent < 50){
				expandByY = (50 - yPercent) / 100 * window.innerHeight / 2;
			} else {
				expandByY = -(50 - (100 - yPercent)) / 100 * window.innerHeight / 2;
			}

			scaledHeight = imgH * curScale;
			newTy = (window.innerHeight / 2) - (((scaledHeight + expandByY) / 2) - ((scaledHeight - window.innerHeight) * (yPercent / 100)));
			newTy /= curScale;

			y = currTy - newTy;

			currTy = newTy;
		}

		addEventListener('mousemove', followMouse);
		document.addEventListener('wheel', onWheelZoom);
		loopDesktop();

		var looper;
		function loopDesktop(){
			looper = raf(loopDesktop);
			positionImage();
		}

		var onCloseView = function(){
			Uninvisible.removeListener('close:start', onCloseView);
			Uninvisible.removeListener('stoptracking', onCloseView);
			removeEventListener('mousemove', followMouse);
			document.removeEventListener('wheel', onWheelZoom);
			curX = curY = 0;
			raf.cancel(looper);
		};

		Uninvisible.on('close:start', onCloseView);
		Uninvisible.on('stoptracking', onCloseView);
	},


	_initGrabZoom: function(){
		var Uninvisible = this;
		Uninvisible.orientation = 6;

		Uninvisible.container.classList.add('grab');

		var onMouseDown, onMouseUp, onMouseMove,
			isDragging = false,
			isZooming = false;

		var matrix = this.matrix;

		var origin, moveX, moveY, curX, curY;

		var onWheelEnd = _.debounce(function(){
			origin = null;
			isZooming = false;
			Uninvisible._checkImagePositioning();
		}, 20);

		function onWheelZoom(e){
			e.preventDefault();

			isZooming = true;

			if(!origin) {
				origin = Uninvisible._screenToImage(matrix, e.clientX, e.clientY);
			}

			var change = 1 - (e.deltaY * 0.001);

			var curScale = matrix.decompose().scaling.y;
			if(curScale * change < 0.6 || curScale * change > 50) return Uninvisible._checkImagePositioning();

			matrix.scale(change, origin);
			Uninvisible._transformCSS(matrix);

			onWheelEnd();
		}

		onMouseDown = function(e){
			if(isZooming === true) return;

			Uninvisible.container.classList.add('grabbing');
			isDragging = true;

			curX = e.screenX;
			curY = e.screenY;

			Uninvisible.container.addEventListener('mousemove', onMouseMove);
		};

		onMouseMove = _.throttle(function(e){
			if(isZooming === true) return;

			moveX = e.screenX - curX;
			moveY = e.screenY - curY;

			curX = e.screenX;
			curY = e.screenY;

			matrix.translate(moveX, moveY);

			Uninvisible._transformCSS(matrix);
		}, 1000/30);

		onMouseUp = function(){
			Uninvisible.container.removeEventListener('mousemove', onMouseMove);
			Uninvisible.container.classList.remove('grabbing');

			isDragging = false;

			Uninvisible._checkImagePositioning();
		};

		Uninvisible.container.addEventListener('mousedown', onMouseDown);
		Uninvisible.container.addEventListener('mouseup', onMouseUp);
		Uninvisible.container.addEventListener('mouseleave', onMouseUp);
		document.addEventListener('wheel', onWheelZoom);

		var onCloseView = function(){
			Uninvisible.removeListener('close:start', onCloseView);
			Uninvisible.container.removeEventListener('mousemove', onMouseMove);
			Uninvisible.container.removeEventListener('mousedown', onMouseDown);
			Uninvisible.container.removeEventListener('mouseup', onMouseUp);
			Uninvisible.container.removeEventListener('mouseleave', onMouseUp);
			document.removeEventListener('wheel', onWheelZoom);
			Uninvisible.container.classList.remove('grabbing');
		};

		Uninvisible.on('close:start', onCloseView);
	},

	_initTrackingTouch: function(){
		var Uninvisible = this;

		var onTouchStart, onTouchEnd, handleTouchMove,
			isTouching = false,
			isZooming = false;

		var matrix = this.matrix;

		var origin;

		function onPinchStart(e){
			isZooming = true;
			origin = Uninvisible._screenToImage(matrix, e.center.x, e.center.y);
		}

		function onPinchMove(e){
			// applied to a clone of the matrix so the next move resets
			if(matrix.decompose().scaling.y * e.scale < 100) Uninvisible._applyToMatrix(matrix.clone(), origin, e.center.x, e.center.y, e.scale);
		}

		function onPinchEnd(e){
			setTimeout(function(){ isZooming = false; }, 200);

			// applied to the actual matrix so the next zoom applies on top
			if(matrix.decompose().scaling.y * e.scale < 100) Uninvisible._applyToMatrix(matrix, origin, e.center.x, e.center.y, e.scale);
			origin = null;

			Uninvisible._checkImagePositioning();
		}

		onTouchStart = function(e){
			if(isZooming === true) return;
			isTouching = true;

			origin = Uninvisible._screenToImage(matrix, e.pageX, e.pageY);
		};

		handleTouchMove = _.throttle(function(e){
			if(isZooming === true) return;

			// applied to a clone of the matrix so the next move resets
			Uninvisible._applyToMatrix(matrix.clone(), origin, e.pageX, e.pageY, null);
		}, 1000/30);

		onTouchEnd = function(e){
			if(isZooming === true) return;

			// applied to the actual matrix so the next zoom applies on top
			Uninvisible._applyToMatrix(matrix, origin, e.pageX, e.pageY, null);
			origin = null;

			isTouching = false;

			Uninvisible._checkImagePositioning();
		};

		this.touch.on('pinchstart', onPinchStart);
		this.touch.on('pinchmove', onPinchMove);
		this.touch.on('pinchend', onPinchEnd);
		this.imageElement.addEventListener("touchstart", onTouchStart);
		this.imageElement.addEventListener("touchend", onTouchEnd);
		this.imageElement.addEventListener("touchmove", handleTouchMove);

		var onCloseView = function(){
			Uninvisible.removeListener('close:start', onCloseView);
			Uninvisible.imageElement.removeEventListener("touchmove", handleTouchMove);
			Uninvisible.touch.off('pinchstart', onPinchStart);
			Uninvisible.touch.off('pinchmove', onPinchMove);
			Uninvisible.touch.off('pinchend', onPinchEnd);
		};

		Uninvisible.on('close:start', onCloseView);
	},
};
