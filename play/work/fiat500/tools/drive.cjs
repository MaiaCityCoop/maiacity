// c7: the solver flat out on a level road, and at a few speeds: bun tools/drive.cjs <source.js>
process.env.QUIET = '1';
const path = require('path');
const { o } = require('./build.cjs');
const a = o.userData.asset;
const lab = a.lab;
const env = { broken: false, time: 0, slow: 0, cut: 0, xray: 0 };
const run = (kmh, s, grade = 0, load = 75) => {
	lab.controls.speed.value = kmh;
	lab.controls.grade.value = grade;
	lab.controls.load.value = load;
	for (let t = 0; t < s; t += 0.05) a.tick(0.05, env);
	return lab.read;
};
for (const v of [30, 60, 90]) console.log(`asked ${v} km/h:`, run(v, 40).state, '|', run(v, 1).sub);
const r = run(110, 240);
console.log('flat out, asked 110 km/h, 240 s:', r.state, '|', r.sub);
console.log('up 30% with 4 aboard:', run(20, 30, 30, 300).state);
