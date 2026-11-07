// This version's own source was never kept: legacy wrote it into avenDB from code that was not committed (it is on no
// branch of the repository and not in the vault). Here is its recipe file's library as it is, the code the box runs,
// only laid out to be read (prettier); its names are the minifier's. play/api/import/legacy/sources/README.md
Object.defineProperty(exports, Symbol.toStringTag, { value: `Module` });
var e = Object.create,
	t = Object.defineProperty,
	n = Object.getOwnPropertyDescriptor,
	r = Object.getOwnPropertyNames,
	i = Object.getPrototypeOf,
	a = Object.prototype.hasOwnProperty,
	o = (e, i, o, s) => {
		if ((i && typeof i == `object`) || typeof i == `function`)
			for (var c = r(i), l = 0, u = c.length, d; l < u; l++)
				(d = c[l]),
					!a.call(e, d) &&
						d !== o &&
						t(e, d, { get: ((e) => i[e]).bind(null, d), enumerable: !(s = n(i, d)) || s.enumerable });
		return e;
	},
	s = (n, r, s) => (
		(s = n == null ? {} : e(i(n))),
		o(r || !n || !n.__esModule || !a.call(n, `default`) ? t(s, `default`, { value: n, enumerable: !0 }) : s, n)
	);
let c = require('three');
c = s(c, 1);
