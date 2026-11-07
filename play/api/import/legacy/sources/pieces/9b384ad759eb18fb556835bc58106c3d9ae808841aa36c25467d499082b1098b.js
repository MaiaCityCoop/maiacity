//#region src/lib/plants/trees.js
//#piece 392508ba4674449525343a74c1c3dcb051789ec7cdc025e799d3f84d0b958855
/** an elliptic leaf, broadest in its middle */
const ellipse = (u) => Math.pow(Math.sin(Math.PI * u), .6) * (u < .05 ? u / .05 : 1);
//#piece d8f61b5f54f8fa903d569238df9fc6aff2ad4ec7fbb8fb5ef59d267912091d6e
