/** a leaf's colour: its green (paler while young), the midrib lighter, yellowing and browning as it gets old */
function leafColour(green, young, grown, old, u) {
	return mix(green, young, (1 - grown) * .8).lerp(mix("#c8b04a", "#8a6a3a", u), clamp(old * 1.3 - (1 - u) * .3));
