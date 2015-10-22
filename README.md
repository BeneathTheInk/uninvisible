# UnInVisible

## What it Does

UnInVisible creates a slick and beautiful image viewing experience. This is done by adding a smooth fade to and from full screen with a floaty scroll while viewing.

## Quick Start

UnInVisible is really easy to use. Just require UnInVisible or add the script to your document and add the CSS to your stylesheet. The Javascript looks like this:

```javascript
var UnInVisible = require('uninvisible');

<img id="my-img" src="path/to/myimage.img" />

var img = document.getElementById('my-img');
uninvisible.open(img);

```

You can use Uninvisible without adding any custom Javascript by simply adding `data-uninvisible` to the element you would like to open.

```javascript
<img data-uninvisible data-uninvisible-url="path/to/imageToOpen.img" src="path/to/image.img" />
```

If the element is not an image, or if you'd like to open up a different image than the original image, you can add `data-uninvisible-url` and set it to the new image to open.

```
<a href="#" data-uninvisible data-uninvisible-url="path/to/image" data-uninvisible-title="This image was opened from an anchor tag!">Click here to see it!</a>
```


## Methods

### UnInVisible.open(img, options)

`img` is the element from which UnInVisible is to be expanded from. You can pass in any type of element. If it's not an image element, or if you want to open a different image, be sure to either add the attribute `data-uninvisible-url="/url/to/source.img"` directly to the element, or pass in the url with options.

You also have the option to pass in the url string as `img`, which will open the image without zooming from an element.

options:
	- url - *url of image to view. Allows for a different image to be opened (i.e. thumbnails -> larger image), or allows opening from non-image elements.*
  - title - *caption title*
  - text - *caption text*
	- contain - *the entire image will be contained in the view, no zoom. Defaults to `false`. This can also be set directly on the image element with `data-contain`*
	- onOpen - *open callback*
	- onClose - *close callback*

Captions can also be added directly in your HTML as `data-uninvisible-title` and `data-uninvisible-text`.

Images will be not be expanded further than their natural width and height. If you want a deeper zoom, you'll need to increase the size of your original image.

**Example**
```javascript
	<img id="myImg" src="/path/to/thumbnail.img" data-uninvisible-url="/path/to/large-image.img" data-uninvisible-title="This is an image." />
	<button id="btn" data-uninvisible-url="/path/to/image.img">Open Image!</button>

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

### uninvisible.setCaption()

```javascript

uninvisible.setCaption({
	title: 'Caption Title',
	text: 'Text to go along with the image.'
});
```

### destroy()

## Events

- open:start - *Start of open animation*
- open - *Open animation complete*
- close:start - *Start of close animation*
- close - *Close complete*

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
