let Matrix = require('./matrix-lib').Matrix;

export function _setImagePosition(p){
	var img = this.imageElement;

	if(p.top || p.top === 0) img.style.top = p.top + 'px';
	if(p.left || p.left === 0) img.style.left = p.left + 'px';
	if(p.width) img.style.width = p.width + 'px';
	if(p.height) img.style.height = p.height + 'px';
}

export function _transformCSS(t){
	if(t instanceof Matrix){
		t = [ t.a, t.b, t.c, t.d, t.tx, t.ty ];
	}

	if(Array.isArray(t)){
		t = t.join(",");
	}

	this.imageElement.style['-webkit-transform'] = "matrix(" + t + ")";
	this.imageElement.style.transform = "matrix(" + t + ")";
}


export function _turnOnTransitions(){
	var imageElement = this.imageElement;
	var speed = (this.options.animationSpeed / 1000) + 's';

	imageElement.style.webkitTransition = 'top ' + speed +', height ' + speed + ', width ' + speed + ', left ' + speed + ', opacity ' + speed;
	imageElement.style.oTransition = 'top ' + speed +', height ' + speed + ', width ' + speed + ', left ' + speed + ', opacity ' + speed;
	imageElement.style.mozTransition = 'top ' + speed +', height ' + speed + ', width ' + speed + ', left ' + speed + ', opacity ' + speed;
	imageElement.style.msTransition = 'top ' + speed +', height ' + speed + ', width ' + speed + ', left ' + speed + ', opacity ' + speed;
	imageElement.style.transition = 'top ' + speed +', height ' + speed + ', width ' + speed + ', left ' + speed + ', opacity ' + speed;
}

export function _turnOnContainerTransitions(){
	var container = this.container;
	var speed = (this.options.animationSpeed / 1000) + 's';

	container.style.webkitTransition = 'opacity ' + speed;
	container.style.oTransition = 'opacity ' + speed;
	container.style.mozTransition = 'opacity ' + speed;
	container.style.msTransition = 'opacity ' + speed;
	container.style.transition = 'opacity ' + speed;
}

export function _turnOnMatrixTransitions(){
	var imageElement = this.imageElement;
	var speed = (this.options.animationSpeed / 1000) + 's';

	imageElement.style.webkitTransition = 'transform ' + speed;
	imageElement.style.webkitTransition = '-webkit-transform ' + speed;
	imageElement.style.oTransition = 'transform ' + speed;
	imageElement.style.mozTransition = 'transform ' + speed;
	imageElement.style.mozTransition = '-moz-transform ' + speed;
	imageElement.style.msTransition = 'transform ' + speed;
	imageElement.style.transition = 'transform ' + speed;
}

export function _turnOffTransitions(){
	var imageElement = this.imageElement;

	imageElement.style.webkitTransition = 'none';
	imageElement.style.oTransition = 'none';
	imageElement.style.mozTransition = 'none';
	imageElement.style.msTransition = 'none';
	imageElement.style.transition = 'none';
}

export function _addAnimationCompleteListener(fn){
	var imageElement = this.imageElement;

	imageElement.addEventListener("webkitTransitionEnd", fn);
	imageElement.addEventListener("oanimationend", fn);
	imageElement.addEventListener("transitionend", fn);
}

export function _removeAnimationCompleteListener(fn){
	var imageElement = this.imageElement;

	imageElement.removeEventListener("webkitTransitionEnd", fn);
	imageElement.removeEventListener("oanimationend", fn);
	imageElement.removeEventListener("transitionend", fn);
}
export function addStylesheetRules(rules, id) {
  var styleEl = document.createElement('style'),
      styleSheet;
  if(id) styleEl.id = id;

  // Append style element to head
  document.head.appendChild(styleEl);

  // Grab style sheet
  styleSheet = styleEl.sheet;

  for (var i = 0, rl = rules.length; i < rl; i++) {
    var j = 1, rule = rules[i], selector = rules[i][0], propStr = '';
    // If the second argument of a rule is an array of arrays, correct our variables.
    if (Object.prototype.toString.call(rule[1][0]) === '[object Array]') {
      rule = rule[1];
      j = 0;
    }

    for (var pl = rule.length; j < pl; j++) {
      var prop = rule[j];
      propStr += prop[0] + ':' + prop[1] + (prop[2] ? ' !important' : '') + ';\n';
    }

    // Insert CSS Rule
    styleSheet.insertRule(selector + '{' + propStr + '}', styleSheet.cssRules.length);
  }

	return styleEl;
}
