*/
function wing(shoulder, span, chord, x, color, bone) {
	const s = new three.Shape();
	s.moveTo(0, 0);
	s.quadraticCurveTo(span * .55, chord * .12, span * .9, chord * .02);
	s.quadraticCurveTo(span * 1.02, -chord * .1, span, -chord * .32);
	const tips = 6;
	for (let i = 0; i < tips; i++) {
		const u = span * (1 - (i + .5) / tips * .55), v = -chord * (.35 + .5 * (i / tips));
		s.lineTo(u + span * .04, v + chord * .07);
		s.lineTo(u, v);
	}
