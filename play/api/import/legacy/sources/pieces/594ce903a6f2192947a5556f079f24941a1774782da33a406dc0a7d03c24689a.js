*/
//#piece 90274540308ecc2dbb55e66add1035999ba6ad45f8eddee31b3eda02b2f64a4c
	const tex = new three.CanvasTexture(canvas);
	tex.colorSpace = three.SRGBColorSpace;
	tex.anisotropy = 8;
	cache.set(key, tex);
	return tex;
}
//#piece 34be38c187aee4f7e720dc008563231c8c2dcde64814d5625ae456a2d8bd04c8
