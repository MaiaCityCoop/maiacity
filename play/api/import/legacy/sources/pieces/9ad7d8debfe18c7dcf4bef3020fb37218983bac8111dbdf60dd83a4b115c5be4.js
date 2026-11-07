/** a round stone fruit: its suture a groove down one side (v near 0) */
const sutured = (u, v, p = .5) => Math.pow(Math.max(0, Math.sin(Math.PI * u)), p) * (1 - .08 * Math.exp(-Math.pow(Math.sin(Math.PI * v) / .12, 2)));
//#piece 71b0d0b335e6985450fc7bdcb4dcd3000c8ec75c14ce2a2849e2b0abbe5e8690
