// the sliders played: each part's box shut and open
const { o, THREE } = require('./build.cjs');
const a = o.userData.asset, c = a.lab.controls;
const env = { broken: false, time: 0, slow: 0, cut: 0, xray: 0 };
const box = (id) => { const p = a.parts.find((p) => p.info.id === id); o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(p.obj); return [...b.min.toArray(), ...b.max.toArray()].map((v) => +v.toFixed(3)); };
c.speed.value = 0;
for (const [k, ids] of [['doors', ['door-left', 'door-right']], ['lid', ['engine-lid']], ['roof', ['rolltop']], ['steer', ['wheel-fl', 'steering-wheel']]]) {
	const before = ids.map(box);
	c[k].value = k === 'steer' ? 30 : 1;
	for (let i = 0; i < 4; i++) a.tick(0.05, env);
	const after = ids.map(box);
	ids.forEach((id, i) => console.log(k, id, 'shut', before[i].join(' '), '| moved', after[i].join(' ')));
	c[k].value = 0;
	for (let i = 0; i < 4; i++) a.tick(0.05, env);
}
