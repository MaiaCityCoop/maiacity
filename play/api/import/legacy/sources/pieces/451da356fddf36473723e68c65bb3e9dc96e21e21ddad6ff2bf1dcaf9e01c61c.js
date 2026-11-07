const toothed = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .75)), .7) * (1 + (u > .1 && u < .95 ? u * 22 % 1 * .05 : 0));
