import raf from 'raf';
import throttle from 'lodash/throttle';
import debounce from 'lodash/debounce';
var Point = require('./matrix-lib').Point;

export function _initTrackingDesktop(){
	let Uninvisible = this;

	let matrix, imgW, imgH, scaledHeight, scaledWidth;
	let xDestPercent, yDestPercent, xPercent, yPercent;
	let expandByX, expandByY, currTx, currTy, newTx, newTy;
	let x, y, curX, curY, curScale;

	resetVars();

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

	let followMouse = throttle(function(e){
		if(curScale <= 1) return;// if(Uninvisible.orientation < 2) return;

		xDestPercent = (e.clientX / window.innerWidth) * 100;
		yDestPercent = (e.clientY / window.innerHeight) * 100;
	}, 1000/30);

	function onWheelZoom(){
		Uninvisible.trigger('stoptracking');
		Uninvisible._initGrabZoom();
	}

	const SLIDE_SPEED = Math.max(Math.min(this.options.trackSpeed, 1), 0.01);
	function positionImage(){
		curScale = matrix.decompose().scaling.y;

		positionX();
		positionY();

		matrix.translate(new Point(x, y));

		Uninvisible._transformCSS(matrix);
	}

	function positionX(){
		scaledWidth = imgW * curScale;

		// TODO enable slide and invert when smaller than window
		if(scaledWidth < window.innerWidth) return;

		xPercent = xPercent + ((xDestPercent - xPercent) * SLIDE_SPEED);
		if(xPercent < 0) xDestPercent = (xDestPercent * SLIDE_SPEED);
		if(xPercent > 100) xDestPercent = xDestPercent + ((100 - xDestPercent) * SLIDE_SPEED);

		if(xPercent < 50){// || scaledWidth < window.innerWidth
			expandByX = (50 - xPercent) / 100 * window.innerWidth / 2;
		} else {
			expandByX = -(50 - (100 - xPercent)) / 100 * window.innerWidth / 2;
		}

		newTx = (window.innerWidth / 2) - (((scaledWidth + expandByX) / 2) - ((scaledWidth - window.innerWidth) * (xPercent / 100)));

// TODO invert slide when smaller than window
// if(scaledWidth < window.innerWidth) newTx = 100 - newTx; //

		newTx /= curScale;

		x = currTx - newTx;

		currTx = newTx;
	}

	function positionY(){
		scaledHeight = imgH * curScale;
		// TODO enable and invert slide when smaller than window
		if(scaledHeight < window.innerHeight) return;

		yPercent = yPercent + ((yDestPercent - yPercent) * SLIDE_SPEED);
		if(yPercent < 0) yDestPercent = (yDestPercent * SLIDE_SPEED);
		if(yPercent > 100) yDestPercent = yDestPercent + ((100 - yDestPercent) * SLIDE_SPEED);

		if(yPercent < 50){
			expandByY = (50 - yPercent) / 100 * window.innerHeight / 2;
		} else {
			expandByY = -(50 - (100 - yPercent)) / 100 * window.innerHeight / 2;
		}

		newTy = (window.innerHeight / 2) - (((scaledHeight + expandByY) / 2) - ((scaledHeight - window.innerHeight) * (yPercent / 100)));
		newTy /= curScale;

		y = currTy - newTy;

		currTy = newTy;
	}

	addEventListener('mousemove', followMouse);
	document.addEventListener('wheel', onWheelZoom);

	loopDesktop();

	let looper;
	function loopDesktop(){
		looper = raf(loopDesktop);
		positionImage();
	}

	let onCloseView = function(){
		Uninvisible.off('close:start', onCloseView);
		Uninvisible.off('stoptracking', onCloseView);
		removeEventListener('mousemove', followMouse);
		document.removeEventListener('wheel', onWheelZoom);

		curX = curY = 0;
		raf.cancel(looper);
	};

	Uninvisible.on('close:start', onCloseView);
	Uninvisible.on('stoptracking', onCloseView);
}

export function _initGrabZoom(){
	let Uninvisible = this;

	Uninvisible.container.classList.add('grab');

	let onMouseDown, onMouseUp, onMouseMove,
		isDragging = false,
		isZooming = false;

	let matrix = this.matrix;

	let origin, moveX, moveY, curX, curY;
	let curScale = matrix.decompose().scaling.y;

	let onWheelEnd = debounce(function(){
		if(!isZooming) return;

		origin = null;
		isZooming = false;
		Uninvisible._checkImagePositioning();
	}, 600);

	function onWheelZoom(e){
		e.preventDefault();

		if(isDragging) return isZooming = false;

		isZooming = true;

		if(!origin) origin = Uninvisible._screenToImage(matrix, e.clientX, e.clientY);

		let change = 1 - (e.deltaY * 0.001);

		curScale = matrix.decompose().scaling.y;

		if(curScale * change < Math.min(0.6, Uninvisible.dimensions.initialScale) || curScale * change > 8){
			return;
		}

		matrix.scale(change, origin);

		Uninvisible._transformCSS(matrix);

		onWheelEnd();
	}

	onMouseDown = function(e){
		// if(isZooming === true) return;

		Uninvisible.container.classList.add('grabbing');
		isDragging = true;
		isZooming = false;

		curX = e.screenX;
		curY = e.screenY;

		curScale = matrix.decompose().scaling.y;

		Uninvisible.container.addEventListener('mousemove', onMouseMove);
	};

	onMouseMove = throttle(function(e){
		if(isZooming === true) return;

		moveX = (e.screenX - curX) / curScale;
		moveY = (e.screenY - curY) / curScale;

		curX = e.screenX;
		curY = e.screenY;

		matrix.translate(new Point(moveX, moveY));

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

	var throttledOnWheelZoom = throttle(onWheelZoom, 20);
	document.addEventListener('wheel', throttledOnWheelZoom);

	let onCloseView = function(){
		Uninvisible.off('close:start', onCloseView);
		Uninvisible.container.removeEventListener('mousemove', onMouseMove);
		Uninvisible.container.removeEventListener('mousedown', onMouseDown);
		Uninvisible.container.removeEventListener('mouseup', onMouseUp);
		Uninvisible.container.removeEventListener('mouseleave', onMouseUp);
		document.removeEventListener('wheel', throttledOnWheelZoom);
		Uninvisible.container.classList.remove('grabbing');
	};

	Uninvisible.on('close:start', onCloseView);
}

export function _initTrackingTouch(){
	let Uninvisible = this;

	let onTouchStart, onTouchEnd, handleTouchMove,
		isTouching = false,
		isZooming = false;

	let matrix = this.matrix;

	let origin;

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

	handleTouchMove = throttle(function(e){
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

	let onCloseView = function(){
		Uninvisible.off('close:start', onCloseView);
		Uninvisible.imageElement.removeEventListener("touchmove", handleTouchMove);
		Uninvisible.touch.off('pinchstart', onPinchStart);
		Uninvisible.touch.off('pinchmove', onPinchMove);
		Uninvisible.touch.off('pinchend', onPinchEnd);
	};

	Uninvisible.on('close:start', onCloseView);
}
