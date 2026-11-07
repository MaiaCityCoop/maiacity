/** a direction `tilt` (radians) from upright toward the level `out` */
const tilted = (out, tilt) => out.clone().setY(0).normalize().multiplyScalar(Math.sin(tilt)).add(v3(0, Math.cos(tilt), 0)).normalize();
