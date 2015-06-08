# UnInVisible

## What it Does

UnInVisible creates a slick and beautiful image viewing experience. This is done by adding a smooth fade to and from full screen with a floaty scroll while viewing.

## Quick Start

UnInVisible is really easy to use. First add the CSS to your stylesheet and then add the cursor icons to your assets. The Javascript looks like this:

```javascript
var UnInVisible = require('uninvisible');

document.addEventListener("DOMContentLoaded", function() {
	uninvisible = new UnInVisible();
});

var img = document.querySelector('.my-img');
uninvisible.open(img);

```

```javascript

uninvisible.setCaption({
	captionTitle: 'New Title',
	captionText: 'And this is a new description of the image.'
});
uninvisibleImg.open();
uninvisibleImg.close();
uninvisibleImg.destroy();

// remove UnInvisible
uninvisible.destoy();
```

## Methods

### UnInVisible.open(img, options)

options:
  - captionTitle
  - captionText

Captions can also be added directly in your HTML as `data-captionTitle` and `data-captionText`.

### UnInVisible.close()

### destroy()

Removes UnInVisible elements and event listeners

## Browser Support

Successfully tested in Chrome, Safari, Safari Mobile, and Firefox, with more to come.

## License

The MIT License (MIT)
Copyright (c) 2015 Beneath the Ink

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
