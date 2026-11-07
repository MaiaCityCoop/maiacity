/** leaves: narrow and pointed; elliptic; ovate and toothed */
const lance = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .65) * (u < .06 ? u / .06 : 1) * (1 + (u > .1 && u < .95 ? u * 28 % 1 * .03 : 0));
