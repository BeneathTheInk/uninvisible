var Paper = require("../vendor/paper");

module.exports = {
	_setImagePosition: function(p){
		var img = this.imageElement;

		if(p.top || p.top === 0) img.style.top = p.top + 'px';
		if(p.left || p.left === 0) img.style.left = p.left + 'px';
		if(p.width) img.style.width = p.width + 'px';
		if(p.height) img.style.height = p.height + 'px';

		if(this.mapPin.status){
			this.mapPin.sX = (this.mapPin.x - 100) * (p.width / 4300);
	    this.mapPin.sY = (this.mapPin.y - 70) * (p.height / 2950);
	    this.imageDiv.style.backgroundPosition = this.mapPin.sX + "px " + this.mapPin.sY + "px,left top";
		}
	},

	_transformCSS: function(t){
		if(t instanceof Paper.Matrix){
			t = [ t.a, t.b, t.c, t.d, t.tx, t.ty ];
		}

		if(Array.isArray(t)){
			t = t.join(",");
		}

		this.imageElement.style['-webkit-transform'] = "matrix(" + t + ")";
		this.imageElement.style.transform = "matrix(" + t + ")";
	},


	_turnOnTransitions: function(){
		var imageElement = this.imageElement;
		var speed = (this.options.animationSpeed / 1000) + 's';

		imageElement.style.webkitTransition = 'top ' + speed +', height ' + speed + ', width ' + speed + ', left ' + speed + ', opacity ' + speed;
		imageElement.style.oTransition = 'top ' + speed +', height ' + speed + ', width ' + speed + ', left ' + speed + ', opacity ' + speed;
		imageElement.style.mozTransition = 'top ' + speed +', height ' + speed + ', width ' + speed + ', left ' + speed + ', opacity ' + speed;
		imageElement.style.msTransition = 'top ' + speed +', height ' + speed + ', width ' + speed + ', left ' + speed + ', opacity ' + speed;
		imageElement.style.transition = 'top ' + speed +', height ' + speed + ', width ' + speed + ', left ' + speed + ', opacity ' + speed;
	},

	_turnOnContainerTransitions: function(){
		var container = this.container;
		var speed = (this.options.animationSpeed / 1000) + 's';

		container.style.webkitTransition = 'opacity ' + speed;
		container.style.oTransition = 'opacity ' + speed;
		container.style.mozTransition = 'opacity ' + speed;
		container.style.msTransition = 'opacity ' + speed;
		container.style.transition = 'opacity ' + speed;
	},

	_turnOnMatrixTransitions: function(){
		var imageElement = this.imageElement;
		var speed = (this.options.animationSpeed / 1000) + 's';

		imageElement.style.webkitTransition = 'transform ' + speed;
		imageElement.style.webkitTransition = '-webkit-transform ' + speed;
		imageElement.style.oTransition = 'transform ' + speed;
		imageElement.style.mozTransition = 'transform ' + speed;
		imageElement.style.mozTransition = '-moz-transform ' + speed;
		imageElement.style.msTransition = 'transform ' + speed;
		imageElement.style.transition = 'transform ' + speed;
	},

	_turnOffTransitions: function(){
		var imageElement = this.imageElement;

		imageElement.style.webkitTransition = 'none';
		imageElement.style.oTransition = 'none';
		imageElement.style.mozTransition = 'none';
		imageElement.style.msTransition = 'none';
		imageElement.style.transition = 'none';
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
};
