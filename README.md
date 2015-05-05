# UnInVisible

## What it UnInActivates

UnInVisible creates a slick and beautiful image viewing experience. This is done by adding a smooth fade to and from full screen with a floaty scroll led by the mouse. On mobile devices, scroll is led by device movement for an immersive visual experience.

## Quick Start

```javascript
var UnInVisible = require('uninvisible');

// pass in a nodelist
var nodeList = document.querySelectorAll('.uninvisible');
UnInVisible.init(nodeList);

// remove UnInVisible
UnInVisible.destoy();
```