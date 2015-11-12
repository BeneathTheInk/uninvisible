var _ = require('underscore');
var closest = require("closest");
var Touch = require('hammerjs');
var Paper = require("../vendor/paper");

module.exports = {
	setOptions: function(options) {
		_.extend(this.options, options);
		return this;
	},

	_init: function(){
		this.isDevice = !!('ontouchstart' in window);

		this.sourceElement = null;
		this.image = null;
		this.imageUrl = null;
		this.dimensions = {
			initialScale: 1,
			initialWidth: null,
			initialHeight: null
		};
		this.isAnimating = false;
		this.isOpen = false;
		this.orientation = null;
			// 0 = image is smaller than window
			// 1 = image is contained within window
			// 2 = image height smaller, horizontal width larger than window
			// 3 = image width smaller, vertical height larger than window
			// 4 = fullscreen horizontal
			// 5 = fullscreen vertical
			// 6 = fullscreen free scroll

		this.matrix = new Paper.Matrix();

		this._createView();
		this._addTouch();
		this._setupDocument();
		this._turnOnContainerTransitions();
	},

	_setupDocument: function(doc) {
		if(doc) this.options.document = doc;
		doc = doc || document;

		// find all links in the document and add click events
		var Uninvisible = this;

		var onWindowResize = _.throttle(function(){
			if(Uninvisible.isOpen) Uninvisible.close();

			// ToDo: reset image rather than close Uninvisible
			// if(Uninvisible.isOpen){
			// 	Uninvisible._setupImage();
			// 	Uninvisible._expand();
			// }
		}, 500);

		window.addEventListener("resize", onWindowResize);

		function onClick(e){
			var target = closest(e.target, '[data-uninvisible]', true);
			if(target){
				e.preventDefault();
				Uninvisible.open(target);
			}
		}

		if(this.options.setupClick !== false) doc.addEventListener("click", onClick);

		Uninvisible.once('destroy', function() {
				doc.removeEventListener("click", onClick);
		});
	},

	_addTouch: function(){
		this.touch = window.Hammer = new Touch.Manager(this.container, {});

		var pinch = new Touch.Pinch();
		// var rotate = new Touch.Rotate();
		var tap = new Touch.Tap();
		// pinch.recognizeWith(rotate);

		this.touch.add([pinch, tap]);

		this.touch.get('pinch').set({ enable: true });
		// this.touch.get('rotate').set({ enable: true });
	},

	_setupCloseListener: function(){
		var Uninvisible = this;

		this.touch.on('tap', closeImg);

		function closeImg(e){
			e.srcEvent.stopPropagation();
			e.preventDefault();

			if(!Uninvisible.isOpen) return Uninvisible.closeViewerImmediately();
			Uninvisible.close.bind(Uninvisible)();
		}

		var onCloseView = function(){
			this.touch.off('tap', closeImg);
			Uninvisible.removeListener('close:start', onCloseView);
		};

		Uninvisible.on('close:start', onCloseView);
	},

	_createView: function(){
		if(this.imageElement) return;

		var container = this.container = document.createElement('div');
		container.classList.add('uninvisible-container');

		var imageElement = this.imageElement = document.createElement('div');
    	imageElement.classList.add('uninvisible-image');

			imageElement.style.webkitTransition = 'opacity .2s';
			imageElement.style.oTransition = 'opacity .2s';
			imageElement.style.mozTransition = 'opacity .2s';
			imageElement.style.msTransition = 'opacity .2s';
			imageElement.style.transition = 'opacity .2s';

		var captionContainer = this.captionContainer = document.createElement( 'figcaption' );
		captionContainer.classList.add('caption-container');

		var captionTitle = this.captionTitle = this.isDevice === false ? document.createElement( 'h1' ) : document.createElement('h2');
		captionTitle.classList.add('caption-title');
		captionContainer.appendChild( captionTitle );

		var captionText = this.captionText = this.isDevice === false ? document.createElement( 'div' ) : document.createElement('h4');
		captionText.classList.add('caption-text');
		captionContainer.appendChild(captionText);

		var loadingSpinner = this.loadingSpinner = document.createElement('div');
		loadingSpinner.classList.add('spinner');

		container.appendChild(imageElement);
		container.appendChild(captionContainer);
		container.appendChild(loadingSpinner);
	},

	_renderView: function(){
		document.body.appendChild(this.container);
	},

	_removeView: function(){
		if(this.container && this.container.parentNode) this.container.parentNode.removeChild(this.container);
	},

	_setupImage: function(img, cb){
		var Uninvisible = this;
		Uninvisible.on('close:immediately', function(){
			cb(true);
		});


		Uninvisible.imageElement.style.backgroundSize = "100%"; // reset to 100%, for after there were additional image layers..
		Uninvisible.imageElement.style.backgroundPosition = "top left";

		Uninvisible.sourceElement = img;

		if(img.nodeType === 1 && img.dataset.uninvisibleTarget){
			Uninvisible._setupImageFromTarget(img, cb);
		} else if(typeof img === 'string'){
			Uninvisible._setupImageFromString(img, cb);
		} else if(img.nodeType === 1 && img.tagName !== 'IMG'){
			Uninvisible._setupImageFromElement(img, cb);
		} else if(img.nodeType === 1 && img.tagName === 'IMG') {
			Uninvisible._setupImageFromImage(img, cb);
		} else {
			return null;
		}
	},

	_setupImageFromString: function(img, cb){
		var Uninvisible = this;
		var newImg;

		Uninvisible.sourceElement = null;

		newImg = Uninvisible.image = new Image();
		newImg.src = Uninvisible.imageUrl = Uninvisible.imageElement.src = img;

		Uninvisible.imageElement.style.backgroundImage = "url(" + newImg.src + ")";

		newImg.addEventListener('load', cb);
	},

	_setupImageFromTarget: function(img, cb){
		var Uninvisible = this;

		var target = document.getElementById(img.dataset.uninvisibleTarget);
		if(!target) return Uninvisible.closeViewerImmediately();

		Uninvisible.sourceElement = target;

		var dataUrl, newImg;

		dataUrl = Uninvisible.currentImageOptions.url || img.dataset.uninvisibleUrl || target.dataset.uninvisibleUrl || target.src;

		if(dataUrl == null){
			var imgCss = target.style.backgroundImage || window.getComputedStyle(target).backgroundImage;

			if(imgCss.substring(0,5) === 'url("' || imgCss.substring(0,5) === "url('" ) {
				dataUrl = imgCss.substring(5, imgCss.length - 2);
			} else if(imgCss.substring(0,4) === 'url('){
				dataUrl = imgCss.substring(4, imgCss.length - 1);
			}
		}

		if(!dataUrl) return Uninvisible.closeViewerImmediately();

		newImg = new Image();
		newImg.src = Uninvisible.imageUrl = Uninvisible.imageElement.src = dataUrl;
		Uninvisible.imageElement.style.backgroundImage = "url('" + dataUrl + "')";
		Uninvisible.image = newImg;

		newImg.addEventListener('load', cb);
	},

	_setupImageFromImage: function(img, cb){
		var Uninvisible = this;
		var newImg;

		if(Uninvisible.currentImageOptions.url || img.dataset.uninvisibleUrl){
			newImg = new Image();
			newImg.src = Uninvisible.imageUrl = Uninvisible.imageElement.src = Uninvisible.currentImageOptions.url || img.dataset.uninvisibleUrl;
			Uninvisible.image = newImg;

			Uninvisible.imageElement.style.backgroundImage = "url(" + newImg.src + ")";

			newImg.addEventListener('load', function(){
				cb();
			});
		} else {
			Uninvisible.imageElement.style.backgroundImage = "url(" + img.src + ")";
		 	Uninvisible.imageUrl =	Uninvisible.imageElement.src = img.src;
			Uninvisible.image = img;
			cb();
		}
	},

	_setupImageFromElement: function(img, cb){
		var Uninvisible = this;
		var dataUrl, newImg;

		dataUrl = Uninvisible.currentImageOptions.url || img.dataset.uninvisibleUrl;

		if(dataUrl == null && img.style.backgroundImage != null){
			var imgCss = img.style.backgroundImage || window.getComputedStyle(img).backgroundImage;

			if(imgCss.substring(0,5) === 'url("' || imgCss.substring(0,5) === "url('" ) {
				dataUrl = imgCss.substring(5, imgCss.length - 2);
			} else if(imgCss.substring(0,4) === 'url('){
				dataUrl = imgCss.substring(4, imgCss.length - 1);
			}
		}

		if(!dataUrl) return Uninvisible.closeViewerImmediately();

		newImg = new Image();
		newImg.src = Uninvisible.imageUrl = Uninvisible.imageElement.src = dataUrl;
		Uninvisible.imageElement.style.backgroundImage = "url('" + dataUrl + "')";
		Uninvisible.image = newImg;

		newImg.addEventListener('load', cb);
	},

	destroy: function(){
		if(this.isOpen) this.closeViewerImmediately();
		this._removeView();
		this.emit('destroy');
	},

	_reset: function(){
		this.sourceElement = null;
		this.image = null;
		this.imageUrl = null;
		this.dimensions = {
			scale: 1,
			initialWidth: null,
			initialHeight: null
		};
		this.isAnimating = false;
		this.isOpen = false;
		this.orientation = null;
		this.clearCaption();
	},

	_setupAdditionalImageLayers: function(){
		var Uninvisible = this;
		var img = Uninvisible.sourceElement;
		var additions, imgData;

		if(img.dataset.uninvisibleAddition){
			additions = [];

			var images = img.dataset.uninvisibleAddition.split(',');

			_.each(images, function(i){
				imgData = i.split('|');

				additions.push({
					url: imgData[0],
					x: imgData[1],
					y: imgData[2],
					size: imgData[3]
				});
			});
		} else if(Uninvisible.currentImageOptions.addition || Uninvisible.options.addition){
			imgData = Uninvisible.currentImageOptions.addition || Uninvisible.options.addition;
			if(Array.isArray(imgData)){
				additions = imgData;
			} else if(typeof imgData === 'object'){
				additions = [ imgData ];
			}
		}

		if(!additions) return;

		var bgImageCSS = "url('" + Uninvisible.imageUrl + "')";
		var bgPositionCSS = "left top";
		var bgSizeCSS = "100%";

		_.each(additions, addImage);

		function addImage(imageData){
			if(!imageData.url) return;

			bgImageCSS = "url('" + imageData.url + "')," + bgImageCSS;
			bgPositionCSS = (imageData.x || '0px') + ' ' + (imageData.y || '0px') + ',' + bgPositionCSS;
			bgSizeCSS = (imageData.size || 'initial') + ',' + bgSizeCSS;
		}

		var uImg = Uninvisible.imageElement;
		uImg.style.backgroundImage = bgImageCSS;
		uImg.style.backgroundPosition = bgPositionCSS;
		uImg.style.backgroundSize = bgSizeCSS;
	},
};
