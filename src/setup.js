import throttle from 'lodash/throttle';
import extend from 'lodash/extend';
import each from 'lodash/each';
import closest from "closest";
import Touch from 'hammerjs';
import Paper from "../../vendor/paper";

export function setOptions(options) {
	extend(this.options, options);

	if(options.disableClick){
		this.trigger('disableclick');
	}
	return this;
}

export function _init(){
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
}

export function _setupDocument(doc) {
	if(doc) this.options.document = doc;
	doc = doc || document;

	// find all links in the document and add click events
	var Uninvisible = this;

	var onWindowResize = throttle(function(){
		if(Uninvisible.isOpen) Uninvisible.close();

		// ToDo: reset image rather than close Uninvisible
		// if(Uninvisible.isOpen){
		// 	Uninvisible._setupImage();
		// 	Uninvisible._expand();
		// }
	}, 500);

	window.addEventListener("resize", onWindowResize);

	if(this.options.disableClick !== true) Uninvisible.addDocumentClickListener(doc);
}

export function addDocumentClickListener(doc) {
	let Uninvisible = this;

	doc.addEventListener("click", onClick);

	Uninvisible.once('destroy', function() {
		doc.removeEventListener("click", onClick);
	});

	Uninvisible.on('disableclick', function(){
		doc.removeEventListener("click", onClick);
	});

	function onClick(e){
		var target = closest(e.target, '[data-uninvisible]', true);
		if(target){
			e.preventDefault();
			Uninvisible.open(target);
		}
	}
}

export function _addTouch(){
	this.touch = window.Hammer = new Touch.Manager(this.container, {});

	var pinch = new Touch.Pinch();
	// var rotate = new Touch.Rotate();
	var tap = new Touch.Tap();
	// pinch.recognizeWith(rotate);

	this.touch.add([pinch, tap]);

	this.touch.get('pinch').set({ enable: true });
	// this.touch.get('rotate').set({ enable: true });
}

export function _setupCloseListener(){
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
		Uninvisible.off('close:start', onCloseView);
	};

	Uninvisible.on('close:start', onCloseView);
}

export function _createView(){
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
}

export function _renderView(){
	document.body.appendChild(this.container);
}

export function _removeView(){
	if(this.container && this.container.parentNode) this.container.parentNode.removeChild(this.container);
}

export function _setupImage(img, cb){
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
}

export function _setupImageFromString(img, cb){
	var Uninvisible = this;
	var newImg;

	Uninvisible.sourceElement = null;

	newImg = Uninvisible.image = new Image();
	newImg.src = Uninvisible.imageUrl = Uninvisible.imageElement.src = img;

	Uninvisible.imageElement.style.backgroundImage = "url(" + newImg.src + ")";

	newImg.addEventListener('load', cb);
}

export function _setupImageFromTarget(img, cb){
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
}

export function _setupImageFromImage(img, cb){
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
}

export function _setupImageFromElement(img, cb){
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
}

export function setupUninvisibleCSS(){
	var uninvisibleStyles = document.getElementById('uninvisible-css');
	if(uninvisibleStyles) return;

	var styles = this.addStylesheetRules([
		['.uninvisible-container',
		  ['position', 'fixed'],
		  ['top', '0'],
		  ['bottom', '0'],
		  ['left', '0'],
		  ['right', '0'],
		  ['width', '100%'],
		  ['height', '100%'],
		  ['background', 'rgba(19, 19, 19, 0.88)'],
		  ['opacity', '0'],
		  ['z-index', '999'],
		  ['cursor', 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyRpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoTWFjaW50b3NoKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo3Q0IyNDI3M0FFMkYxMUUzOEQzQUQ5NTMxMDAwQjJGRCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo3Q0IyNDI3NEFFMkYxMUUzOEQzQUQ5NTMxMDAwQjJGRCI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjdDQjI0MjcxQUUyRjExRTM4RDNBRDk1MzEwMDBCMkZEIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjdDQjI0MjcyQUUyRjExRTM4RDNBRDk1MzEwMDBCMkZEIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+soZ1WgAABp5JREFUeNrcWn9M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") 25 25, auto']
		],
			['.uninvisible-container.grab',
		    ['cursor', '-moz-grab'],
		    ['cursor', '-webkit-grab'],
		    ['cursor', 'grab']
			],
		    ['.uninvisible-container.grab.grabbing',
		      ['cursor', '-moz-grabbing'],
		      ['cursor', '-webkit-grabbing'],
		      ['cursor', 'grabbing']
				],
		  ['.uninvisible-container .uninvisible-image',
		    ['position', 'absolute'],
		    ['top', '0%'],
		    ['right', '0%'],
		    ['bottom', '0%'],
		    ['left', '0%'],
		    ['z-index', '99999'],
		    ['background-repeat', 'no-repeat']
			],
		  ['.uninvisible-container .caption-container',
		    ['font-family', 'sans-serif'],
		    ['position', 'fixed'],
		    ['bottom', '0px'],
		    ['left', '0px'],
		    ['padding', '20px'],
		    ['color', '#fff'],
		    ['word-spacing', '0.2px'],
		    ['text-shadow', '-1px 0px 1px rgba(0, 0, 0, 0.3)'],
		    ['background', 'rgba(0, 0, 0, 0.6)'],
		    ['border-top-right-radius', '5px'],
		    ['display', 'none'],
		    ['z-index', '99999']
			],
		    ['.uninvisible-container .caption-container .caption-title',
		      ['margin', '0px'],
		      ['padding', '0px'],
		      ['text-align', 'left'],
		      ['font-weight', 'normal'],
		      ['letter-spacing', '0.5px'],
		      ['line-height', '35px'],
		      ['font-weight', '100'],
		      ['display', 'none']
				],
		    ['.uninvisible-container .caption-container .caption-text',
		      ['margin', '0px'],
		      ['padding', '0px'],
		      ['font-weight', '100'],
		      ['max-width', '500px'],
		      ['text-align', 'left'],
		      ['background', 'none'],
		      ['margin-top', '5px'],
		      ['font-size', '17px'],
		      ['letter-spacing', '0.1px'],
		      ['display', 'none']
				],
		  ['.uninvisible-container .spinner',
		    ['width', '100px'],
		    ['height', '100px'],
		    ['margin', '45% auto'],
		    ['background-color', '#FFF'],
		    ['position', 'absolute'],
		    ['top', '50%'],
		    ['left', '50%'],
		    ['margin-left', '-50px'],
		    ['margin-top', '-50px'],
		    ['border-radius', '100%'],
		    ['-webkit-animation', 'sk-scaleout 1s infinite ease-in-out'],
		    ['animation', 'sk-scaleout 1s infinite ease-in-out']
			],
		    ['.uninvisible-container .spinner.done-loading',
		      ['display', 'none']
			],
		['.uninvisible',
		  ['cursor', 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyRpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoTWFjaW50b3NoKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo4M0UzRkZGRUY4ODQxMUUzQjg5REQwNUQyQTFENTVGOSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo4M0UzRkZGRkY4ODQxMUUzQjg5REQwNUQyQTFENTVGOSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjUyNjc4QUY1Rjg0QjExRTNCODlERDA1RDJBMUQ1NUY5IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjUyNjc4QUY2Rjg0QjExRTNCODlERDA1RDJBMUQ1NUY5Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+x6eaoAAABeVJREFUeNrcWn1M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") 25 25, auto']
		],
		['.uninvisible-transition',
		  ['-webkit-transition', 'top 0.4s, right 0.4s, bottom 0.4s, left 0.4s, opacity 0.3s'],
		  ['-o-transition', 'top 0.4s, right 0.4s, bottom 0.4s, left 0.4s, opacity 0.3s'],
		  ['-moz-transition', 'top 0.4s, right 0.4s, bottom 0.4s, left 0.4s, opacity 0.3s'],
		  ['-ms-transition', 'top 0.4s, right 0.4s, bottom 0.4s, left 0.4s, opacity 0.3s'],
		  ['transition', 'top 0.4s, right 0.4s, bottom 0.4s, left 0.4s, opacity 0.3s']
		],
		['.uninvisible-parent img:not([data-uninvisible-nozoom])',
		  ['cursor', 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyRpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoTWFjaW50b3NoKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo4M0UzRkZGRUY4ODQxMUUzQjg5REQwNUQyQTFENTVGOSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo4M0UzRkZGRkY4ODQxMUUzQjg5REQwNUQyQTFENTVGOSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjUyNjc4QUY1Rjg0QjExRTNCODlERDA1RDJBMUQ1NUY5IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjUyNjc4QUY2Rjg0QjExRTNCODlERDA1RDJBMUQ1NUY5Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+x6eaoAAABeVJREFUeNrcWn1M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") 25 25, auto']
		],
		['.uninvisible-parent [data-uninvisible-nozoom] img',
		  ['cursor', 'auto']
		],
		['.uninvisible-parent img:not([data-nozoom])',
		  ['cursor', 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyRpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoTWFjaW50b3NoKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo4M0UzRkZGRUY4ODQxMUUzQjg5REQwNUQyQTFENTVGOSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo4M0UzRkZGRkY4ODQxMUUzQjg5REQwNUQyQTFENTVGOSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjUyNjc4QUY1Rjg0QjExRTNCODlERDA1RDJBMUQ1NUY5IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjUyNjc4QUY2Rjg0QjExRTNCODlERDA1RDJBMUQ1NUY5Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+x6eaoAAABeVJREFUeNrcWn1M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") 25 25, auto']
		],
		['.uninvisible-parent [data-nozoom] img',
		  ['cursor', 'auto']
		]
	], 'uninvisible-css');

	try {
		styles.sheet.insertRule('@keyframes sk-scaleout {0% {transform: scale(0);transform: scale(0);}100% {transform: scale(1);transform: scale(1);opacity: 0;}}', styles.sheet.rules.length);
		styles.sheet.insertRule('@-webkit-keyframes sk-scaleout {0% {-webkit-transform: scale(0);}100% {-webkit-transform: scale(1);opacity: 0;}}', styles.sheet.rules.length);
	} catch (e) {
		console.log('CSS rule insertion error: ', e);
	}
}

export function destroy(){
	if(this.isOpen) this.closeViewerImmediately();
	this._removeView();
	this.trigger('destroy');
}

export function _reset(){
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
}

export function _setupAdditionalImageLayers(){
	var Uninvisible = this;
	var img = Uninvisible.sourceElement;
	var additions, imgData;

	if(img.dataset.uninvisibleAddition){
		additions = [];

		var images = img.dataset.uninvisibleAddition.split(',');

		each(images, function(i){
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

	each(additions, addImage);

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
}
