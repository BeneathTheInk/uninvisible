class Point{
	constructor(x, y){
		this.x = x || 0;
		this.y = y == null ? this.x : y || 0;
	}

	negate(){
        return new Point(-this.x, -this.y);
    }
}

class Matrix{
	constructor(){
		this.a = 1;
		this.b = 0;
		this.c = 0;
		this.d = 1;
		this.tx = 0;
		this.ty = 0;
	}

	scale(scale, center){
		if (center)
            this.translate(center);
        this.a *= scale;//scale.x;
        this.c *= scale;//scale.x;
        this.b *= scale;//scale.y;
        this.d *= scale;//scale.y;
        if (center)
            this.translate(center.negate());

        return this;
	}
	translate(point){
		var x = point.x,
            y = point.y;
        this.tx += x * this.a + y * this.b;
        this.ty += x * this.c + y * this.d;

        return this;
	}
	inverseTransform(point){
		var a = this.a,
		   b = this.b,
		   c = this.c,
		   d = this.d,
		   tx = this.tx,
		   ty = this.ty,
		   det = a * d - b * c,
		   res = new Point();

	   if (det && !isNaN(det) && isFinite(tx) && isFinite(ty)) {
		   var x = point.x - this.tx,
			   y = point.y - this.ty;

			res.x = (x * d - y * b) / det;
			res.y = (y * a - x * c) / det;
	   }
	   return res;
	}
	decompose(){
		// http://dev.w3.org/csswg/css3-2d-transforms/#matrix-decomposition
        // http://stackoverflow.com/questions/4361242/
        // https://github.com/wisec/DOMinator/blob/master/layout/style/nsStyleAnimation.cpp#L946
        var a = this.a, b = this.b, c = this.c, d = this.d;
        if ((a * d - b * c) === 0)
            return null;

        var scaleX = Math.sqrt(a * a + b * b);
        a /= scaleX;
        b /= scaleX;

        var shear = a * c + b * d;
        c -= a * shear;
        d -= b * shear;

        var scaleY = Math.sqrt(c * c + d * d);
        c /= scaleY;
        d /= scaleY;
        shear /= scaleY;

        // a * d - b * c should now be 1 or -1
        if (a * d < b * c) {
            a = -a;
            b = -b;
            // We don't need c & d anymore, but if we did, we'd have to do this:
            // c = -c;
            // d = -d;
            shear = -shear;
            scaleX = -scaleX;
        }

        return {
            scaling: new Point(scaleX, scaleY),
            rotation: -Math.atan2(b, a) * 180 / Math.PI,
            shearing: shear
        };
	}
}

module.exports = {
	Point: Point,
	Matrix: Matrix
};
