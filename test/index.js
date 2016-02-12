var test = require('tape');
var uninvisible = require('../');

test('Loaded', function(t){
	t.plan(2);
	t.equals(typeof uninvisible, 'object', 'Is an object');
	t.equals(typeof uninvisible.open, 'function', 'uninvisible.open is a function');
});
