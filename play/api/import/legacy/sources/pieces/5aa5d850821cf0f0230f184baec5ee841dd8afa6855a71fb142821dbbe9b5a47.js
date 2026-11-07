*/
function catkin(bag, at, dir, len, radius, colour, stiff) {
	if (len < .003) return;
	const pts = [at.clone()];
	const d = dir.clone().normalize();
	for (let i = 0; i < 5; i++) {
		d.lerp(DOWN, (1 - stiff) * .45).normalize();
		pts.push(pts[i].clone().addScaledVector(d, len / 5));
