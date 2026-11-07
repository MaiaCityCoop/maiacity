//#piece 80b80756754bb01e97cbe3b255388c61a5ebf89c55671cdbfd0779fcddf628a0
const set$1 = (img, i, r, g, b, a = 255) => {
	img.data[i] = r;
	img.data[i + 1] = g;
	img.data[i + 2] = b;
	img.data[i + 3] = a;
};
/** Grey-brown bark in vertical fissures. */
function bark() {
	const size = 256;
//#piece 4c2ffafb7dac9a273ae0a235bceb91666b689ad0a43245700de6360e8c679193
			set$1(img, (y * size + x) * 4, 118 * v, 98 * v, 80 * v);
		}
	});
