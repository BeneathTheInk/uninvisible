import closest from "closest";

export function open(img, options){
	var Uninvisible = this;

	if(Uninvisible.isAnimating || Uninvisible.isOpen) return;
	Uninvisible.isAnimating = true;

	if(typeof img !== 'string' && img.nodeType === 1){
		if(closest(img, '[data-uninvisible-nozoom]', true)) return;
	}

	options = Uninvisible.currentImageOptions = options || {};

	Uninvisible.container.style.display = 'block';
	Uninvisible.imageElement.style.opacity = 0;
	Uninvisible.loadingSpinner.classList.remove('done-loading');

	Uninvisible._setupImage(img, function(cancel){
		if(cancel === true) return;
		Uninvisible._setupAdditionalImageLayers();
		Uninvisible.imageElement.style.opacity = 1;
		Uninvisible.loadingSpinner.classList.add('done-loading');
		Uninvisible._open();

		setTimeout(function(){
				Uninvisible._turnOnTransitions();
				Uninvisible._addAnimationCompleteListener(_onOpenComplete);
		},1);

		setTimeout(function(){
			Uninvisible._expand();
		},10);
	});

	Uninvisible._open();
	Uninvisible.setCaption();
	Uninvisible._renderView();
	Uninvisible._setupCloseListener();

	setTimeout(function(){
		Uninvisible.container.style.opacity = 1;
	},10);

	function _onOpenComplete(){
		Uninvisible.isAnimating = false;
		Uninvisible.isOpen = true;
		document.body.style.overflow = 'hidden';

		Uninvisible._removeAnimationCompleteListener(_onOpenComplete);
		Uninvisible._turnOffTransitions();

		if(Uninvisible.isDevice && !(options.zoom === "contain" || (Uninvisible.sourceElement && Uninvisible.sourceElement.dataset.uninvisibleZoom === "contain") || Uninvisible.options.zoom === "contain")){
			Uninvisible._initTrackingTouch();
		} else {
			Uninvisible._initTrackingDesktop();
		}

		Uninvisible.emit('open');
		if(typeof options.onOpen === 'function') options.onOpen();
	}
}
export function _open(){
	var Uninvisible = this;
	Uninvisible.emit('open:start');

	Uninvisible._resetMatrix();
	Uninvisible._setToImgLocation();
}

export function close(options){
	if(this.isAnimating) return;

	options = options || {};

	this._close(options);
}

export function _close(options){
	var Uninvisible = this;
	Uninvisible._turnOnTransitions();
	Uninvisible.isAnimating = true;
	this.emit('close:start');

	Uninvisible._addAnimationCompleteListener(_onCloseComplete);
	Uninvisible._setToImgLocation();
	Uninvisible.container.style.opacity = 0;

	// FIXES BUG WHERE ANIMATION LISTENER DOESNT FIRE WHEN NOT RETURNING TO AN ELEMENT ON THE PAGE
	setTimeout(function(){
		if(Uninvisible.isAnimating === true) _onCloseComplete();
	}, Uninvisible.options.animationSpeed);

	function _onCloseComplete(){
		Uninvisible.isAnimating = false;
		Uninvisible.isOpen = false;

		document.body.style.overflow = '';
		document.body.style.cursor = 'auto';

		Uninvisible.container.style.display = 'none';
		Uninvisible.imageElement.style.opacity = 0;
		Uninvisible.imageElement.style.backgroundPosition = '';
		Uninvisible.clearCaption();
		Uninvisible.sourceElement = null;
		Uninvisible.image = null;
		Uninvisible.container.classList.remove('grab');

		Uninvisible._turnOffTransitions();
		Uninvisible._removeAnimationCompleteListener(_onCloseComplete);

		Uninvisible._removeView();

		var closeComplete = options.onClose || Uninvisible.options.onClose;
		if(closeComplete && typeof closeComplete === 'function') closeComplete();

		if(typeof Uninvisible.currentImageOptions.onClose === 'function') Uninvisible.currentImageOptions.onClose();
		Uninvisible.currentImageOptions = {};

		Uninvisible.emit('close');
	}
}

export function _expand(){
	var Uninvisible = this;
	var matrix = this.matrix;
	var options = Uninvisible.currentImageOptions;

	var containerW = window.innerWidth,
		containerH = window.innerHeight;

	var imgW = Uninvisible.image.naturalWidth,
		imgH = Uninvisible.image.naturalHeight;

	var scale, scaledHeight, scaledWidth;

	if(!Uninvisible.isDevice){
		if(options.zoom === "contain" || (Uninvisible.sourceElement && Uninvisible.sourceElement.dataset.uninvisibleZoom === "contain") || Uninvisible.options.zoom === "contain"){
			Uninvisible.orientation = 1;
			if (imgW < containerW && imgH < containerH){
				if(imgW / imgH >= containerW / containerH){
					setToNaturalWidth(true);
				} else {
					setToNaturalHeight(true);
				}
			} else {
				if(imgW / imgH >= containerW / containerH){
					setToContainHorizontal(false);
				} else {
					setToContainVertical(false);
				}
			}
		} else if (imgW < containerW || imgH < containerH){
			if(imgW / imgH >= containerW / containerH){
				Uninvisible.orientation = imgW > containerW ? 2 : 0; //..LARGER HORIZONTALLY or smaller than window
				setToNaturalWidth(true);
			} else {
				Uninvisible.orientation = imgH > containerH ? 3 : 0; //..LARGER VERTICALLY or smaller than window
				setToNaturalHeight(true);
			}
		} else if (options.zoom === "free" || (Uninvisible.sourceElement && Uninvisible.sourceElement.dataset.uninvisibleZoom === "free") || Uninvisible.options.zoom === "free"){
			Uninvisible.orientation = 6;
			if(imgW / imgH > containerW / containerH){ //..CONTAINED HORIZONTAL
				setToNaturalWidth(true);
		 } else { //..CONTAINED VERTICAL
			 setToNaturalHeight(true);
		 }
		} else if(imgW / imgH > containerW / containerH){ //..CONTAINED HORIZONTAL
			Uninvisible.orientation = 4;
			setToContainHorizontal(true);
	 } else { //..CONTAINED VERTICAL
		 Uninvisible.orientation = 5;
		 setToContainVertical(true);
	 }
 } else { // DEVICE
		scale = Uninvisible.dimensions.initialScale = 1;
		if(options.zoom === "contain" || (Uninvisible.sourceElement && Uninvisible.sourceElement.dataset.uninvisibleZoom === "contain") || Uninvisible.options.zoom === "contain"){
			Uninvisible.orientation = 1;
		} else {
			Uninvisible.orientation = 6;
		}

		if(imgW / imgH > containerW / containerH){ //..CONTAINED HORIZONTAL
			setToContainHorizontal(false);
	 } else { //..CONTAINED VERTICAL
		 setToContainVertical(false);
	 }
	}

	function setToNaturalWidth(transform){
		scaledHeight = Uninvisible.dimensions.initialHeight = (containerW / imgW) * imgH;
		Uninvisible.dimensions.initialWidth = containerW;

		Uninvisible._setImagePosition({
			left: 0,
			top: (containerH - scaledHeight) / 2,
			width: containerW,
			height: scaledHeight
		});

		if(transform){
			scale = Uninvisible.dimensions.initialScale = imgW / containerW;
			matrix.scale(scale);
			Uninvisible._transformCSS([ matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty ]);
		}
	}

	function setToNaturalHeight(transform){
		Uninvisible.dimensions.initialHeight = containerH;
		scaledWidth = Uninvisible.dimensions.initialWidth = (containerH / imgH) * imgW;

		Uninvisible._setImagePosition({
			left: (containerW - scaledWidth) / 2,
			top: 0,
			width: scaledWidth,
			height: containerH
		});
		if(transform){
			scale = Uninvisible.dimensions.initialScale = imgH / containerH;
			matrix.scale(scale);
			Uninvisible._transformCSS([ matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty ]);
		}
	}

	function setToContainHorizontal(transform){
		Uninvisible.dimensions.initialWidth = containerW;
		scaledHeight = Uninvisible.dimensions.initialHeight = (containerW / imgW) * imgH;

		Uninvisible._setImagePosition({
			left: 0,
			top: (containerH - scaledHeight) / 2,
			width: containerW,
			height: scaledHeight
		});

		if(transform){
			scale = Uninvisible.dimensions.initialScale = containerH / scaledHeight;
			matrix.scale(scale);
			Uninvisible._transformCSS([ matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty ]);
		}
	}

	function setToContainVertical(transform){
		scaledWidth = Uninvisible.dimensions.initialWidth = (containerH / imgH) * imgW;
		Uninvisible.dimensions.initialHeight = containerH;

		Uninvisible._setImagePosition({
		 left: (containerW - scaledWidth) / 2,
		 top: 0,
		 width: scaledWidth,
		 height: containerH
	 });

	 if(transform){
	 	scale = Uninvisible.dimensions.initialScale = containerW / scaledWidth;
			matrix.scale(scale);
			Uninvisible._transformCSS([ matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty ]);
	 }
	}
}

export function _setToImgLocation(){
	var Uninvisible = this;

	var containerW = window.innerWidth,
		containerH = window.innerHeight;

	var position;
	if(Uninvisible.sourceElement) position = Uninvisible.sourceElement.getBoundingClientRect();

	// will also be null if the source element has been removed
	if(position == null && Uninvisible.image){
		position = {
			left: (containerW - Uninvisible.image.naturalWidth) / 2,
			top: (containerH - Uninvisible.image.naturalHeight) / 2,
			width: Uninvisible.image.naturalWidth,
			height: Uninvisible.image.naturalHeight
		};
	} else if (position == null) {
		position = {
			left: 0,
			top: 0,
			width: containerW,
			height: containerH
		};
	}

	Uninvisible._setImagePosition({
		top: position.top,
		left: position.left,
		width: position.width,
		height: position.height
	});
}

export function closeViewerImmediately(){
	this.container.style.display = 'none';
	this._removeView();
	this.emit('close:immediately');
	this.emit('close:start');
	this._reset();
}
