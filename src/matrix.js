let Point = require('./matrix-lib').Point;

// converts a point on the screen to a point on the image
// origin of image is the center, not the top-left corner like the window
export function _screenToImage(matrix, x, y) {
	var containerW = window.innerWidth,
		containerH = window.innerHeight;

	var screenCenterX = containerW / 2;
	var screenCenterY = containerH / 2;

	if (typeof x === "object") {
		y = x.y;
		x = x.x;
	}

	return matrix.inverseTransform(new Point(x - screenCenterX, y - screenCenterY));
}

// transform a matrix according to an event
export function _applyToMatrix(matrix, origin, x, y, scale, preventTransform) {
	// normalize the touch point relative to the image
	var center = this._screenToImage(matrix, x, y);

	// translate the image by the amount moved
	if(origin) matrix.translate(center.x - origin.x, center.y - origin.y);

	// scale the image by the amount scaled
	// this is relative to the origin point, not the current touch location
	if(scale) matrix.scale(scale, origin);

	// rasterize the matrix and apply it
	var t = [ matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty ].join(",");

	if(!preventTransform) this._transformCSS(t);
}

export function _getImageToWindowPosition(){
	var matrix = this.matrix;
	var location = {
		left: 0,
		right: 0,
		top: 0,
		bottom: 0
	};

	var curScale = matrix.decompose().scaling.y;

	var containerW = window.innerWidth,
			containerH = window.innerHeight;

	var scaledWidth = this.dimensions.initialWidth * curScale,
			scaledHeight = this.dimensions.initialHeight * curScale;


	var fromLeft = (scaledWidth / 2) - (matrix.tx + (containerW / 2));

	var fromRight = fromLeft - (scaledWidth - containerW);

	if((fromLeft < 0 && fromRight < 0 && scaledWidth >= containerW) || (fromLeft > 0 && fromRight > 0 && scaledWidth < containerW)) location.left = fromLeft;
	if((fromLeft < 0 && fromRight < 0 && scaledWidth < containerW) || (fromLeft > 0 && fromRight > 0 && scaledWidth >= containerW)) location.right = fromRight;

	var fromTop = (scaledHeight/ 2) - (matrix.ty + (containerH / 2));
	var fromBottom = fromTop - (scaledHeight - containerH);

	if((fromTop < 0 && fromBottom < 0 && scaledHeight >= containerH) || (fromBottom > 0 && fromTop > 0 && scaledHeight < containerH)) location.top = fromTop;
	if((fromTop < 0 && fromBottom < 0 && scaledHeight < containerH) || (fromBottom > 0 && fromTop > 0 && scaledHeight >= containerH)) location.bottom = fromBottom;

	return location;
}

	// TODO for when zooming, if image is smaller then screen, after zooming the _checkImagePositioning() expands the image to full size...
export function _checkImagePositioning(){
	var Uninvisible = this;
	var matrix = Uninvisible.matrix;
	var scale = matrix.decompose().scaling.y;
	var changeCss = false;
	// var img = Uninvisible.image;

	if(scale < Math.min(1, Uninvisible.dimensions.initialScale)){
		changeCss = true;
		this._resetMatrix(null, Math.max(1, Math.min(0.6, Uninvisible.dimensions.initialScale)));
	}

	var location = this._getImageToWindowPosition();
	if(location.left !== 0 || location.right !== 0 || location.top !== 0 || location.bottom !== 0){
		changeCss = true;

		matrix.tx += location.left;
		matrix.tx += location.right;
		matrix.ty += location.top;
		matrix.ty += location.bottom;
	}

	if(changeCss){
		Uninvisible._turnOnMatrixTransitions();
		Uninvisible._addAnimationCompleteListener(onDone);
		Uninvisible._transformCSS([matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty]);
	}

	function onDone(){
		Uninvisible._turnOffTransitions();
		Uninvisible._removeAnimationCompleteListener(onDone);
	}
}

export function _resetMatrix(m, scale){
	var matrix = this.matrix;

	m = m || [];
	scale = scale || 1;

	matrix.a = m[0] || scale;
	matrix.b = m[1] || 0;
	matrix.c = m[2] || 0;
	matrix.d = m[3] || scale;
	matrix.tx = m[4] || 0;
	matrix.ty = m[5] || 0;

	this._transformCSS([matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty]);
}
