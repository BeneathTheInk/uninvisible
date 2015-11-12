var _ = require('underscore');
var closest = require("closest");
var Touch = require('hammerjs');

module.exports = {
	setOptions: function(options) {
		_.extend(this.options, options);
		return this;
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

		var imageDiv = this.imageDiv = this.imageElement = document.createElement('div');
    	imageDiv.classList.add('uninvisible-image');

			imageDiv.style.webkitTransition = 'opacity .2s';
			imageDiv.style.oTransition = 'opacity .2s';
			imageDiv.style.mozTransition = 'opacity .2s';
			imageDiv.style.msTransition = 'opacity .2s';
			imageDiv.style.transition = 'opacity .2s';

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

		container.appendChild(imageDiv);
		container.appendChild(captionContainer);
		container.appendChild(loadingSpinner);
	},

	_renderView: function(){
		document.body.appendChild(this.container);
	},

	_removeView: function(){
		if(this.container && this.container.parentNode) this.container.parentNode.removeChild(this.container);
	},

	_setupImage: function(img, options, cb){
		var Uninvisible = this;
		Uninvisible.mapPin.status = false;
		Uninvisible.imageDiv.style.backgroundSize = "100%"; // reset to 100%, for after there was a map pin

		Uninvisible.sourceElement = img;

		if(img.nodeType === 1 && img.dataset.uninvisibleTarget){
			Uninvisible._setupImageFromTarget(img, options, cb);
		} else if(typeof img === 'string'){
			Uninvisible._setupImageFromString(img, options, cb);
		} else if(img.nodeType === 1 && img.tagName !== 'IMG'){
			Uninvisible._setupImageFromElement(img, options, cb);
		} else if(img.nodeType === 1 && img.tagName === 'IMG') {
			Uninvisible._setupImageFromImage(img, options, cb);
		} else {
			return null;
		}
	},

	_setupImageFromString: function(img, options, cb){
		var Uninvisible = this;
		var newImg;

		Uninvisible.sourceElement = null;

		newImg = Uninvisible.image = new Image();
		newImg.src = Uninvisible.imageUrl = Uninvisible.imageElement.src = img;

		Uninvisible.imageDiv.style.backgroundImage = "url(" + newImg.src + ")";

		newImg.addEventListener('load', function(){
			cb();
		});
	},

	_setupImageFromTarget: function(img, options, cb){
		var Uninvisible = this;

		var target = document.getElementById(img.dataset.uninvisibleTarget);
		if(!target) return Uninvisible.closeViewerImmediately();

		Uninvisible.sourceElement = target;

		var dataUrl, newImg;

		dataUrl = options.url || img.dataset.uninvisibleUrl || target.dataset.uninvisibleUrl || target.src;

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

		newImg.addEventListener('load', function(){
			Uninvisible._setupMapPins(img);
			cb();
		});
	},

	_setupImageFromImage: function(img, options, cb){
		var Uninvisible = this;
		var newImg;

		if(options.url || img.dataset.uninvisibleUrl){
			newImg = new Image();
			newImg.src = Uninvisible.imageUrl = Uninvisible.imageElement.src = options.url || img.dataset.uninvisibleUrl;
			Uninvisible.image = newImg;

			Uninvisible.imageDiv.style.backgroundImage = "url(" + newImg.src + ")";

			newImg.addEventListener('load', function(){
				Uninvisible._setupMapPins(img);
				cb();
			});
		} else {
			Uninvisible.imageDiv.style.backgroundImage = "url(" + img.src + ")";
		 Uninvisible.imageUrl =	Uninvisible.imageElement.src = img.src;
			Uninvisible.image = img;
			Uninvisible._setupMapPins(img);
			cb();
		}
	},

	_setupImageFromElement: function(img, options, cb){
		var Uninvisible = this;
		var dataUrl, newImg;

		dataUrl = options.url || img.dataset.uninvisibleUrl;

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

		newImg.addEventListener('load', function(){
			Uninvisible._setupMapPins(img);
			cb();
		});
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

	_setupMapPins: function(img){
			var Uninvisible = this;

			if(img.dataset.uninvisiblePin !== undefined){
				Uninvisible.mapPin.status = true;
				Uninvisible.imageDiv.style.backgroundImage = "url('Maps/pin.PNG'),url('" + Uninvisible.imageUrl + "')";
				Uninvisible.mapPin.x = Uninvisible.pins[img.dataset.uninvisiblePin].x;
				Uninvisible.mapPin.y = Uninvisible.pins[img.dataset.uninvisiblePin].y;
				Uninvisible.imageDiv.style.backgroundPosition = Uninvisible.mapPin.x + "px " + Uninvisible.mapPin.y + "px,left top";
				Uninvisible.imageDiv.style.backgroundSize = "5%, 100%";
			}
	},
};
