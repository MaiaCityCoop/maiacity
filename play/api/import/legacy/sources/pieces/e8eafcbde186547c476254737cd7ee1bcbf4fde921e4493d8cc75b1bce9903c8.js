//#piece 8faf9e79c6071817bcbd7fe64826b1923f9c156cbe4054b032883548cc67e7e7
//#piece 3ca6353d03aca93e08e669edc207c338cbaad714dcd2dd03ff2932fb0083ff57
*/
//#piece 90274540308ecc2dbb55e66add1035999ba6ad45f8eddee31b3eda02b2f64a4c
	const tex = new three.CanvasTexture(canvas);
	tex.colorSpace = three.SRGBColorSpace;
	tex.anisotropy = 8;
	cache.set(key, tex);
	return tex;
//#piece e35bdbc0141fa77f0d95d9eae091966f3cb58aa9c90b2224c2ef595ed6bf3ae3
