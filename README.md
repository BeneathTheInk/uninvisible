# UnInVisible

## What it UnInActivates

UnInVisible creates a slick and beautiful image viewing experience. This is done by adding a smooth fade to and from full screen with a floaty scroll led by the mouse. On mobile devices, scroll is led by device movement for an immersive visual experience.

## Quick Start

UnInVisible is really easy to use. First add the CSS to your stylesheet and then add the cursor icons to your assets. The Javascript looks like this:

```javascript
var UnInVisible = require('uninvisible');
UnInVisible = new UnInVisible();

// pass in image elements to activate
var images = document.body.querySelectorAll('.img-expandable');
for (var i = 0; i < images.length; i++){
	uninvisibleImages.push(Uninvisible.initImage(images[i], {
		captionTitle: 'I am Image #' + i,
		captionText: 'I am image number #' + i + ' out of ' + images.length + '!!'
	}));
}

var uninvisibleImg = uninvisibleImages[0];

uninvisibleImg.setCaption({
	captionTitle: 'New Title',
	captionText: 'And this is a new description of the image.'
});
uninvisibleImg.open();
uninvisibleImg.close();
uninvisibleImg.destroy();

// remove UnInVisible
UnInVisible.destoy();
```

## Methods

### UnInVisible.initImage(img, options)

options:
  - captionTitle
  - captionText

Captions can also be added directly in your HTML as `data-captionTitle` and `data-captionText`.

### destroy()

Removes UnInVisible elements and event listeners

### *img*.open(options)

Allows you to open the image with your code rather than just a click

options:
 - captionTitle
 - captionText

### *img*.close()

### *img*.setCaption({
	captionTitle:
	captionText:
})

### *img*.destroy()

## Browser Support

Successfully tested in Chrome, Safari, Safari Mobile, and Firefox, with more to come.

## License

MIT
