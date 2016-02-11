# UnInVisible

[![Build Status](https://travis-ci.org/BeneathTheInk/uninvisible.svg?branch=master)](https://travis-ci.org/BeneathTheInk/uninvisible)

## What it Does

UnInVisible creates a slick and beautiful image viewing experience. This is done by adding a smooth fade to and from full screen with a floaty scroll while viewing.

## Quick Start

UnInVisible is really easy to use. Require UnInVisible or add the script to your document. The Javascript looks like this:

```javascript
var UnInVisible = require('uninvisible');

<img id="my-img" src="path/to/myimage.img" />

var img = document.getElementById('my-img');
uninvisible.open(img);
```

You'll need to either add the CSS to your stylesheet, or call `UnInVisible.setupCSS()`:

```html
<script type="text/javascript"> UnInVisible.setupCSS(); </script>
```

You can use Uninvisible without adding any custom Javascript by simply adding `data-uninvisible` to the element you would like to open. UnInVisible setups up a click listener on the document, checking to see if the click is on an element or a child of an element with `data-uninvisible`. If you would like more control and handle the opening yourself, you can remove this click listener by calling `UnInVisible.setOptions({disableClick: true})`.

```javascript
<img data-uninvisible data-uninvisible-url="path/to/imageToOpen.img" src="path/to/image.img" />
```

If the element is not an image, or if you'd like to open up a different image than the original image, you can add `data-uninvisible-url` for the new image to open.

```html
<a href="#" data-uninvisible data-uninvisible-url="path/to/image" data-uninvisible-title="This image was opened from an anchor tag!">Click here to see it!</a>
```

For a nifty target image for the mouse cursor when hovering over the target element, add the class `uninvisible` to the element.

## Methods

### UnInVisible.open(img, options)

`img` is either the element from which UnInVisible is to be expanded from, or a url string. You can pass in any type of element. If it's not an image element, or if you want to open a different image, be sure to either add the attribute `data-uninvisible-url="/url/to/source.img"` directly to the element, or pass in the url with options.

options:
  - url - *url of image to view. Allows for a different image to be opened (i.e. thumbnails -> larger image), or allows opening from non-image elements.*
  - title - *caption title*
  - text - *caption text*
  - onOpen - *open callback*
  - onClose - *close callback*
  - zoom - *'free', 'contain', or 'default'. On desktop, 'free' will set the image to its natural width and height, and will scroll in any direction that is larger than the window- on the x axis if the image is wider than the window, and scroll on the y axis if the image is taller than the window. 'contain' will prevent scrolling and set the image to contain. 'default' behavior is to scroll along the broadest axis, with the image contained on the smaller axis. If the user zooms with the mousewheel on desktop or by pinching on mobile, the image then moves via click and drag.*

Options can also be added directly in your HTML as data attributes.

`<img src="/path/to/thumbnail.img" data-uninvisible data-uninvisible-url="path/to/image.img" data-uninvisible-zoom="free" data-uninvisible-title="This is an image." />`

Images will be not be expanded further than their natural width and height. If you want a deeper zoom, you'll need to increase the size of your original image.

**Example**
```html
	<img id="myImg" src="/path/to/thumbnail.img" data-uninvisible="true" data-uninvisible-url="/path/to/large-image.img" data-uninvisible-title="This is an image." />
	<button id="btn" class="uninvisible" data-uninvisible-url="/path/to/image.img">Open Image!</button>
```
```javascript
	uninvisible.open(myImg);

	uninvisible.open(btn);

	uninvisible.open("/path/to/image.img", {
		title: "Image!"
	});
```

### UnInVisible.close(options)

options:
	- onClose - *close callback*

### UnInVisible.setOptions(options)

options:
	- animationSpeed - *open/close speed, defaults to 400*
	- trackSpeed - *Mouse/touch floaty move speed. a number between 0 and 1, defaults to 0.085*
	- disableClick - *Removes UnInVisible's default click listener on the document, looking for 'data-uninvisible'*

### uninvisible.setCaption()

```javascript
uninvisible.setCaption({
	title: 'Caption Title',
	text: 'Text to go along with the image.'
});
```

### UnInVisible.setupCSS()

If you haven't added the CSS to your stylesheets, use this to tell UnInVisible to create the style sheet for you.

### destroy()

## Events

- open:start - *Start of open animation*
- open - *Open animation complete*
- close:start - *Start of close animation*
- close - *Close complete*

## Multiple Layered images

It is possible to add additional images to the view.

When passing in options, add an `addition` key with a value of an object containing the `url`, `x` coordinate, `y` coordinate, and `size` of the image to add. You may also pass in an array of image objects for multiple additional images. The additional images will be layered in order so that the last one will become the top layer.

```javascript
	var options = {
		addition: {
			url: '/image/url.img',
			x: '75px',
			y: '25%',
			size: '50px'
		}
	};

	Uninvisible.open(image, options);
```

Additional images can also be added with `data-uninvisible-addition`. Images are comma separated, with values separated by `|`. The order of values is `url|x|y|size`.

```html
<img src="./images/4.JPG" data-uninvisible data-uninvisible-addition="./images/layer-one.png|150px|150px|7%,./images/top-layer.jpeg|80%|80%|15%" />
```

## Cursor icons

When viewing an image, the cursor turns into an image mimicking a target. If you want a matching cursor icon when hovering over source elements, add the class 'uninvisible' to the element.

## Nozoom

You can add `data-uninvisible-nozoom` onto an element to prevent the opening of that element as well as any children nodes.

## Browser Support

Successfully tested in Chrome, Safari, Safari Mobile, and Firefox, with more to come.

## License

The MIT License (MIT)
Copyright (c) 2015 Beneath the Ink

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
