var _ = require('underscore');
var EventEmitter = require('events');
var util = require('util');
var raf = require('raf');
// var Touch = require('hammerjs');


var mapPin={};
pins={}
// Map1
pins['fakemarket']={'x':982,'y':1477};
pins['grandgateway']={'x':952,'y':1443};
pins['huashanhospital']={'x':845,'y':977};
pins['jiaotonguniversity']={'x':908,'y':1271};
pins['metrocity']={'x':1021,'y':1512};
pins['stadium']={'x':1060,'y':1810};
pins['xujiahui']={'x':936,'y':1459};
// Map2
pins['2sdepot']={'x':1808,'y':385};
pins['2ssalvagedepot']={'x':1808,'y':385};
pins['army2sdepot']={'x':1808,'y':385};
pins['armydisassemblyfacility']={'x':1705,'y':645};
pins['centralacademyofshanghai']={'x':1836,'y':552};
pins['changshulustation']={'x':1278,'y':963};
pins['datongmill']={'x':1602,'y':678};
pins['elevatedringroadbwstadiumandlupub']={'x':1919,'y':1371};
pins['exposite']={'x':1944,'y':1772};
pins['frenchconcession']={'x':1441,'y':1007};
pins['fuxinglu']={'x':1119,'y':1025};
pins['fuxingpark']={'x':1697,'y':817};
pins['hanzhonglu']={'x':1478,'y':178};
pins['hengshanlustation']={'x':1156,'y':1175};
pins['huangpilustation']={'x':1787,'y':686};
pins['interfacedecommissioningandreclamation']={'x':1712,'y':445};
pins['intersectionoffuxingluandbaoqinglu']={'x':1265,'y':1014};
pins['lupubridge']={'x':1991,'y':1610};
pins['metrodepot']={'x':1811,'y':385};
pins['ministryofaccess']={'x':1803,'y':486};
pins['ministryofaccessheadquarters']={'x':1803,'y':486};
pins['nailhousefacility']={'x':1162,'y':929};
pins['offlinereeducation']={'x':1817,'y':517};
pins['people39ssquare']={'x':1766,'y':444};
pins['peoplessquare']={'x':1766,'y':444};
pins['peoplessquarestation']={'x':1837,'y':429};
pins['portmancolony']={'x':1283,'y':587};
pins['shanghaiacademy']={'x':1836,'y':548};
pins['shanghaicentralacademy']={'x':1836,'y':548};
pins['shelter']={'x':1118,'y':1005};
pins['southnorthelevatedhighway']={'x':1595,'y':285};
pins['storagedepot']={'x':1811,'y':385};
pins['summitmodulecolony']={'x':1145,'y':903};
pins['suzhoucreek']={'x':1404,'y':275};
pins['thecenter']={'x':1176,'y':898};
pins['wu39slanehouse']={'x':1592,'y':166};
pins['xintiandi']={'x':1851,'y':780};
pins['muse']={'x':1851,'y':780};
pins['baoqinglu']={'x':1259,'y':1016};
pins['xinzhalu']={'x':1589,'y':271};
// Map3
pins['xizangsouthstation']={'x':2169,'y':1266};
pins['ferrypier']={'x':2481,'y':674};
pins['huangpuriver']={'x':2301,'y':400};
pins['institute']={'x':2393,'y':322};
pins['lujiazui']={'x':2681,'y':328};
pins['lujiazuicity']={'x':2681,'y':328};
pins['lujiazuicitypiersecurityoffice']={'x':2482,'y':506};
pins['moritower']={'x':2581,'y':384};
pins['nanpubridge']={'x':2541,'y':1161};
pins['thebund']={'x':2209,'y':218};
pins['zhongguotower']={'x':2544,'y':412};
// Map4
pins['centurypark']={'x':3789,'y':851};
pins['partymuseum']={'x':3411,'y':781};
pins['songlina39sapartment']={'x':3840,'y':841};

function UnInVisible(options){
	this.options = options || {};

	this.isDevice = !!('ontouchstart' in window);

	this.sourceElement = null;
	this.url = null;
	this.image = null;
	this.sourceElement = null;

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
	this.settings = {
		contain: false, // all images will be contained within the view, no zoom.
		animationSpeed: options.animationSpeed || 400,
		trackSpeed: options.trackSpeed ? Math.max(Math.min(options.trackSpeed, 1), 0.01) : 0.5,
		clickEvent: options.clickEvent || 'click'
	};

	this._createView();
	if(options.target !== false) this._addClickListeners(options.target || 'uninvisible');
	// this._addTouch();
}
util.inherits(UnInVisible, EventEmitter);


_.extend(UnInVisible.prototype, {
	_createView: function(){
		if(this.imageElement) return;

		var container = this.container = document.createElement('div');
		container.classList.add('uninvisible-container');

    	var imageDiv = this.imageDiv = this.imageElement = document.createElement('div');	
    	imageDiv.classList.add('uninvisible-image');

		// var imageElement = this.imageElement = document.createElement('img');
		// imageElement.classList.add('uninvisible-image');

		var captionContainer = this.captionContainer = document.createElement( 'figcaption' );
		captionContainer.classList.add('caption-container');

		var captionTitle = this.captionTitle = this.isDevice === false ? document.createElement( 'h1' ) : document.createElement('h2');
		captionTitle.classList.add('caption-title');
		captionContainer.appendChild( captionTitle );

		var captionText = this.captionText = this.isDevice === false ? document.createElement( 'div' ) : document.createElement('h4');
		captionText.classList.add('caption-text');
		captionContainer.appendChild(captionText);

		container.appendChild(imageDiv);
		// container.appendChild(imageElement);
		container.appendChild(captionContainer);
	},

	_renderView: function(){
		document.body.appendChild(this.container);
	},

	_removeView: function(){
		if(this.container && this.container.parentNode) this.container.parentNode.removeChild(this.container);
	},

	_addClickListeners: function(target){
		var Uninvisible = this;

		document.addEventListener('click', _onClick);

		Uninvisible.on('destroy', function(){
			document.removeEventListener('click', _onClick);
		});

		function _onClick(e){
			if(e.target.classList.contains(target) && !e.target.classList.contains('uninvisible-open') && !e.target.dataset.nozoom){
				Uninvisible.open(e.target);
			}
		}
	},

	open: function(img, options, cb){
		var Uninvisible = this;

		if(Uninvisible.isAnimating || Uninvisible.isOpen) return;

		if(options){
			if(typeof options === 'function' && cb == null){
				cb = options;
				options = {};
			}
		}
		options = options || {};

		// // if img is in a link, don't open it
		// var node = img;
		// while(node != null){
		// 	if(node.tagName == 'A') return;
		// 	node = node.parentNode;
		// }

		Uninvisible._setupImage(img, options, function(){
			Uninvisible.setCaption(options);
			Uninvisible._renderView();
			Uninvisible._open(options);
			Uninvisible._setupCloseListener();
		});
	},

	_setupImage: function(img, options, cb){
		var Uninvisible = this;
		var dataUrl;
		mapPin.status=false;
		Uninvisible.imageDiv.style.backgroundSize="100%";

		Uninvisible.sourceElement = img;

		if(typeof img === 'string'){
			Uninvisible.sourceElement = null;
			Uninvisible.url = img;

			var newImg = Uninvisible.image = new Image();
			newImg.src = Uninvisible.imageElement.src = Uninvisible.url = img;

			Uninvisible.imageDiv.style.backgroundImage="url("+newImg.src+")";

			newImg.addEventListener('load', function(){
				cb();
			});
		} else if(img.nodeType === 1 && img.tagName !== 'IMG'){
			Uninvisible.image = img;
			dataUrl = options.url || img.dataset.uninvisibleUrl;

			if(dataUrl == null && img.style.backgroundImage != null){
				dataUrl = img.style.backgroundImage.substring(4, img.style.backgroundImage.length - 1);
			};

			var newImg = Uninvisible.image = new Image();
			newImg.src = Uninvisible.imageElement.src = Uninvisible.url = dataUrl;

			if(img.dataset.uninvisiblePin!==undefined){
				mapPin.status=true;
				Uninvisible.imageDiv.style.backgroundImage="url('pin.PNG'),url('"+dataUrl+"')";
				mapPin.x=pins[img.dataset.uninvisiblePin].x;
				mapPin.y=pins[img.dataset.uninvisiblePin].y;
				Uninvisible.imageDiv.style.backgroundPosition=mapPin.x+"px "+mapPin.y+"px,left top";
				Uninvisible.imageDiv.style.backgroundSize="5%, 100%";
			}
			newImg.addEventListener('load', function(){
				cb();
			});
		} else if(img.nodeType === 1 && img.tagName === 'IMG') {
			Uninvisible.image = img;

			if(options.url || img.dataset.uninvisibleUrl){
				var newImg = Uninvisible.image = new Image();
				newImg.src = Uninvisible.imageElement.src = Uninvisible.url = options.url || img.dataset.uninvisibleUrl;
				Uninvisible.imageDiv.style.backgroundImage="url("+newImg.src+")";
				newImg.addEventListener('load', function(){
					cb();
				});
			} else {
				Uninvisible.imageDiv.style.backgroundImage="url("+img.src+")";
				Uninvisible.imageElement.src = img.src;
				cb();
			}
		} else {
			return null;
		}
	},

	_setupCloseListener: function(){
		var Uninvisible = this;
		var container = Uninvisible.container;

		container.addEventListener(Uninvisible.settings.clickEvent, closeImg);
		function closeImg(e){
			e.stopPropagation();
			e.preventDefault();
			Uninvisible.close.bind(Uninvisible)();
		}

		var xListener = function(){
			container.removeEventListener(Uninvisible.settings.clickEvent, closeImg);
			Uninvisible.removeListener('close', xListener);
		};

		Uninvisible.on('close', xListener);
	},

	close: function(options, cb){
		if(this.isAnimating) return;

		this.emit('close:before');

		if(options){
			if(typeof options === 'function' && cb == null){
				cb = options;
				options = {};
			}
		}
		options = options || {};

		this._close();
	},

	closeViewerImmediately: function(){
		this.emit('close');
		this.container.style.display = 'none';
		this.clearCaption();
	},

	setCaption: function(options){
		var Uninvisible = this;

		var title = options.title || (Uninvisible.sourceElement != null ? Uninvisible.sourceElement.dataset.uninvisibleTitle : null);
		var text = options.text || (Uninvisible.sourceElement != null ?  Uninvisible.sourceElement.dataset.uninvisibleText : null);

		if(title || text) Uninvisible.captionContainer.style.display = 'block';
		if(title && title.trim().length){
			Uninvisible.captionTitle.innerHTML = title;
			Uninvisible.captionTitle.style.display = 'block';
		}
		if(text && text.trim().length){
			Uninvisible.captionText.innerHTML = text;
			Uninvisible.captionText.style.display = 'block';
		}
	},

	clearCaption: function(){
		this.captionContainer.style.display = 'none';

		this.captionTitle.style.display = 'none';
		this.captionTitle.innerHTML = '';

		this.captionText.style.display = 'none';
		this.captionText.innerHTML = '';
	},

	_open: function(options){
		var Uninvisible = this;

		UnInVisible.isAnimating = true;
		Uninvisible.emit('open');

		Uninvisible._setToImgLocation();
		Uninvisible.container.style.display = 'block';

		setTimeout(function(){
				Uninvisible._turnOnTransitions();
				Uninvisible._addAnimationCompleteListener(_onOpenComplete);
		},1);

		setTimeout(function(){
			Uninvisible._expand(options);
			if(Uninvisible.orientation > 1) Uninvisible._trackMovement();
		},10);


		if(Uninvisible.sourceElement){
			Uninvisible.sourceElement.classList.add('uninvisible-open');
		}


		function _onOpenComplete(){
			Uninvisible.isAnimating = false;
			Uninvisible.isOpen = true;
			document.body.style.overflow = 'hidden';

			Uninvisible._removeAnimationCompleteListener(_onOpenComplete);
			Uninvisible._turnOffTransitions();

			Uninvisible.emit('open:after');

			// if(typeof cb === 'function') cb();
		}
	},

	_close: function(){
		var Uninvisible = this;
		Uninvisible._turnOnTransitions();
		Uninvisible.isAnimating = true;
		this.emit('close');

		Uninvisible._addAnimationCompleteListener(_onCloseComplete);
		Uninvisible._setToImgLocation();

		// FIXES BUG WHERE ANIMATION LISTENER DOESNT FIRE WHEN NOT RETURNING TO AN ELEMENT ON THE PAGE
		setTimeout(function(){
			if(Uninvisible.isAnimating === true) _onCloseComplete();
		}, Uninvisible.settings.animationSpeed);

		function _onCloseComplete(){
			Uninvisible.isAnimating = false;
			Uninvisible.isOpen = false;

			if(Uninvisible.sourceElement){
				Uninvisible.sourceElement.classList.remove('uninvisible-open');
			}

			document.body.style.overflow = '';
			document.body.style.cursor = 'auto';

			Uninvisible.container.style.display = 'none';
			Uninvisible.clearCaption();
			Uninvisible.sourceElement = null;

			Uninvisible._turnOffTransitions();
			Uninvisible._removeAnimationCompleteListener(_onCloseComplete);

			Uninvisible._removeView();

			Uninvisible.emit('close:after');

			// if(typeof cb === 'function') cb();
		}
	},

	_expand: function(options){
		var Uninvisible = this;

		Uninvisible.emit('open:before');

		var containerW = window.innerWidth,
			containerH = window.innerHeight;

		var imgW = Uninvisible.image.naturalWidth,
			imgH = Uninvisible.image.naturalHeight;

		var imgSizeContain = options.contain || (Uninvisible.sourceElement ? Uninvisible.sourceElement.dataset.uninvisibleContain : Uninvisible.settings.contain);

		if(imgSizeContain){
			Uninvisible.orientation = 1;
			 if(imgW < containerW && imgH < containerH){ // SMALLER THAN WINDOW
				 Uninvisible._setImagePositionCSS({
	 				left: (containerW - imgW) / 2,
	 				top: (containerH - imgH) / 2,
	 				width: imgW,
	 				height: imgH
	 			});
			 } else if(imgW / imgH > containerW / containerH){ //..CONTAINED HORIZONTAL
				var heightScaled = imgH * (containerW / imgW);
				var yMargin = containerH - heightScaled;

				Uninvisible._setImagePositionCSS({
					top: yMargin / 2,
					left: 0,
					width: containerW,
					height: heightScaled
				});
			} else { //..CONTAINED VERTICAL
				var widthScaled = imgW * (containerH / imgH);
				var xMargin = containerW - widthScaled;

				Uninvisible._setImagePositionCSS({
					top: 0,
					left: xMargin / 2,
					height: containerH,
					width: widthScaled
				});
			}
		} else if(imgW < containerW || imgH < containerH){ // SMALL IMAGE..
			if(imgW > containerW || imgH > containerH){
				Uninvisible.orientation = imgW > containerW ? 2 : 3; //..LARGER HORIZONTALLY OR VERTICALLY
			} else {
				Uninvisible.orientation = 0; // ..SMALLER THAN WINDOW
			}

			Uninvisible._setImagePositionCSS({
				left: (containerW - imgW) / 2,
				top: (containerH - imgH) / 2,
				width: imgW,
				height: imgH
			});

	} else { // LARGE IMAGE..
			if(imgW / imgH > containerW / containerH){
				Uninvisible.orientation = 4; //..HORIZONTAL
				var widthScaled = (imgW * (containerH / imgH));
				var horizontalMargin = (widthScaled - containerW) / 2;

				Uninvisible._setImagePositionCSS({
					top: 0,
					left: -horizontalMargin,
					height: containerH,
					width: widthScaled
				});
			} else {
				Uninvisible.orientation = 5; //..VERTICAL
				var heightScaled = (imgH * (containerW / imgW));

				var verticalMargin = (heightScaled - containerH) / 2;

				Uninvisible._setImagePositionCSS({
					top: -verticalMargin,
					left: 0,
					width: containerW,
					height: heightScaled
				});
			}
		}

		Uninvisible.container.style.opacity = 1;
	},

	_setImagePositionCSS: function(p){
		var Uninvisible = this;
		var img = this.imageElement;

		if(p.top || p.top === 0) img.style.top = p.top + 'px';
		if(p.left || p.left === 0) img.style.left = p.left + 'px';
		if(p.width) img.style.width = p.width + 'px';
		if(p.height) img.style.height = p.height + 'px';

		if(mapPin.status){
			mapPin.sX=(mapPin.x-100)*(p.width/4300);
		    mapPin.sY=(mapPin.y-70)*(p.height/2950);
		    Uninvisible.imageDiv.style.backgroundPosition=mapPin.sX+"px "+mapPin.sY+"px,left top";
		}
	},

	_setToImgLocation: function(){
		var Uninvisible = this;

		var containerW = window.innerWidth,
			containerH = window.innerHeight;

		var position;
		if(Uninvisible.sourceElement) position = Uninvisible.sourceElement.getBoundingClientRect();

		// will also be null if the source element has been removed
		if(position == null){
			position = {
				left: (containerW - Uninvisible.image.naturalWidth) / 2,
				top: (containerH - Uninvisible.image.naturalHeight) / 2,
				width: Uninvisible.image.imgW,
				height: Uninvisible.image.imgH
			};
		}

		Uninvisible._setImagePositionCSS({
			top: position.top,
			left: position.left,
			width: position.width,
			height: position.height
		});

		Uninvisible.container.style.opacity = 0;
	},

	_turnOnTransitions: function(){
		var imageElement = this.imageElement;
		var container = this.container;
		var speed = (this.settings.animationSpeed / 1000) + 's';

		imageElement.style.webkitTransition = 'top ' + speed +', height ' + speed + ', width ' + speed + ', left ' + speed + ', opacity ' + speed;
		imageElement.style.oTransition = 'top ' + speed +', height ' + speed + ', width ' + speed + ', left ' + speed + ', opacity ' + speed;
		imageElement.style.mozTransition = 'top ' + speed +', height ' + speed + ', width ' + speed + ', left ' + speed + ', opacity ' + speed;
		imageElement.style.msTransition = 'top ' + speed +', height ' + speed + ', width ' + speed + ', left ' + speed + ', opacity ' + speed;
		imageElement.style.transition = 'top ' + speed +', height ' + speed + ', width ' + speed + ', left ' + speed + ', opacity ' + speed;
		container.style.webkitTransition = 'opacity ' + speed;
		container.style.oTransition = 'opacity ' + speed;
		container.style.mozTransition = 'opacity ' + speed;
		container.style.msTransition = 'opacity ' + speed;
		container.style.transition = 'opacity ' + speed;
	},

	_turnOffTransitions: function(){
		var imageElement = this.imageElement;
		var container = this.container;

		imageElement.style.webkitTransition = 'none';
		imageElement.style.oTransition = 'none';
		imageElement.style.mozTransition = 'none';
		imageElement.style.msTransition = 'none';
		imageElement.style.transition = 'none';
		container.style.webkitTransition = 'none';
		container.style.oTransition = 'none';
		container.style.mozTransition = 'none';
		container.style.msTransition = 'none';
		container.style.transition = 'none';
	},

	_addAnimationCompleteListener: function(fn){
		var imageElement = this.imageElement;

		imageElement.addEventListener("webkitTransitionEnd", fn);
		imageElement.addEventListener("oanimationend", fn);
		imageElement.addEventListener("transitionend", fn);
	},

	_removeAnimationCompleteListener: function(fn){
		var imageElement = this.imageElement;

		imageElement.removeEventListener("webkitTransitionEnd", fn);
		imageElement.removeEventListener("oanimationend", fn);
		imageElement.removeEventListener("transitionend", fn);
	},

	// _addTouch: function(){
	// 	this.touch = new Touch.Manager(this.imageElement,{
	//
	// 	});
	//
	// 	var pinch = new Touch.Pinch();
	// 	var rotate = new Touch.Rotate();
	//
	// 	this.touch.add([pinch, rotate]);
	//
	// 	this.touch.get('pinch').set({ enable: true });
	// 	this.touch.get('rotate').set({ enable: true });
	//
	// 	this.touch.on("pinch", function(e) {
	// 	    console.log('pinch',e);
	// 	});
	//
	// 	this.touch.on("rotate", function(e) {
	// 	    console.log('rotate',e);
	// 	});
	// },

	_trackMovement: function(){
		var Uninvisible = this;
		var imageElement = Uninvisible.imageElement;

		var orientation = Uninvisible.orientation;
		if(orientation < 2) return;

		// touch.on('rotate', function(e){
		// 	console.log('rotate!!', e);
		// });
		//
		// touch.on('pinch', function(e){
		// 	console.log('pinch!!', e);
		// });
		//
		// touch.on('pan', function(e){
		// 	console.log('pan!!', e);
		// });
		//
		// touch.on('swipe', function(e){
		// 	console.log('swipe!!', e);
		// });

		var containerW = window.innerWidth,
			containerH = window.innerHeight;

		var imgW = Uninvisible.image.naturalWidth;
		var imgH = Uninvisible.image.naturalHeight;
		var wRatio,
				hRatio,
				scaledWidth,
				scaledHeight,
				horizontalMargin,
				verticalMargin;

		switch(orientation){
			case 0:
			case 1:
				break;
			case 2:
			case 3:
				horizontalMargin = containerW - imgW;
				verticalMargin = containerH - imgH;
				break;
			case 4:
				scaledWidth = (imgW * (containerH / imgH));
				horizontalMargin = -(scaledWidth - containerW);
				break;
			case 5:
				scaledHeight = (imgH * (containerW / imgW));
				verticalMargin = -(scaledHeight - containerH);
				break;
			case 6:
				break;
		}

		var xDest = yDest = 50,
			x = y = 50,
			followMouse,
			onTouchStart, onTouchEnd, handleTouchMove,
			isTouching = false,
			diffX, diffY;

		followMouse = _.throttle(function(e){
			xDest = (e.clientX / containerW) * 100;
			yDest = (e.clientY / containerH) * 100;
		}, 1000/30);

		onTouchStart = function(e){
			isTouching = true;
			var startX = 100 - (e.pageX / containerW) * 100;
			var startY = 100 - (e.pageY / containerH) * 100;

			diffX = x - startX;
			diffY = y - startY;
		};

		onTouchEnd = function(e){
			isTouching = false;
		};

		handleTouchMove = _.throttle(function(e){
			xDest = ((100 - (e.pageX / containerW) * 100) + diffX);
			yDest = ((100 - (e.pageY / containerH) * 100) + diffY);
		}, 1000/30);

		var SLIDE_SPEED = Uninvisible.settings.trackSpeed;
		function positionImage(){
			switch(orientation){
				case 0:
				case 1:
					break;
				// HORIZONTAL
				case 2:
				case 4:
					x = x + ((xDest - x) * SLIDE_SPEED);
					if(x < 0 && !isTouching) xDest = (xDest * SLIDE_SPEED);
					if(x > 100 && !isTouching) xDest = xDest + ((100 - xDest) * SLIDE_SPEED);

					var expandBy;
					if(x < 50){
						expandBy = -((50 - x) / 1000) * horizontalMargin * 2;
					} else {
						expandBy = ((50 - (100 - x)) / 1000) * horizontalMargin * 2;
					}

					Uninvisible._setImagePositionCSS({
						left: expandBy + (horizontalMargin - (horizontalMargin - (horizontalMargin * (x / 100))))
					});
					break;
				// VERTICAL
				case 3:
				case 5:
					y = y + ((yDest - y) * SLIDE_SPEED);
					if(y < 0 && !isTouching) yDest = (yDest * SLIDE_SPEED);
					if(y > 100 && !isTouching) yDest = yDest + ((100 - yDest) * SLIDE_SPEED);

					var expandBy;
					if(y < 50){
						expandBy = -((50 - y) / 1000) * verticalMargin * 2;
					} else {
						expandBy = ((50 - (100 - y)) / 1000) * verticalMargin * 2;
					}

					Uninvisible._setImagePositionCSS({
						top: expandBy + (verticalMargin - (verticalMargin - (verticalMargin * (y / 100))))
					});
					break;
				// FREE SCROLL
				case 6:
					break;
			}
		}

		imageElement.addEventListener("touchstart", onTouchStart);
		imageElement.addEventListener("touchend", onTouchEnd);
		imageElement.addEventListener("touchmove", handleTouchMove);
		addEventListener('mousemove', followMouse);

		var looper;
		function loop(){
			looper = raf(loop);
			positionImage();
		}
		loop();

		var xListener = function(){
			raf.cancel(looper);
			removeEventListener('mousemove', followMouse);
			imageElement.removeEventListener("touchmove", handleTouchMove);
			Uninvisible.removeListener('close', xListener);
		};

		Uninvisible.on('close', xListener);
	},

	destroy: function(){
		if(this.isOpen) this.closeViewerImmediately();
		this._removeView();
		this.emit('destroy');
	},
});


module.exports = UnInVisible;
