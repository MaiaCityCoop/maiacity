// triangles per part: bun tools/parts.cjs <source.js>
const { o } = require('./build.cjs');
const a = o.userData.asset;
const rows = [];
for (const p of a.parts) {
	let t = 0;
	p.obj.traverse((x) => { if (x.isMesh) t += (x.geometry.index ? x.geometry.index.count : x.geometry.attributes.position.count) / 3; });
	rows.push([p.info.id, Math.round(t)]);
}
rows.sort((a, b) => b[1] - a[1]);
console.log(rows.map((r) => r.join(' ')).join('\n'));
