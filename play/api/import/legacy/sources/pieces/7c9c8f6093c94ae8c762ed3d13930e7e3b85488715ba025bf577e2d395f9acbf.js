	]
].reduce((sum, [bx, by, rx, ry, dz]) => sum + dz * (Math.exp(-(((x - bx) / rx) ** 2) - ((y - by) / ry) ** 2) + (bx ? Math.exp(-(((x + bx) / rx) ** 2) - ((y - by) / ry) ** 2) : 0)), 0);
/** how far forward the face's skin is at (x, y), as built for 1.80 m; behind its sides, the sides' z */
