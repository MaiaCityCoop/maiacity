// @ts-nocheck
// play's Sandbox 3 keeps none of legacy V2's story (its welcome tour, intro and trailer: maia/content/maiacity-v2/tour.js);
// the world still times a spoken line by it.

/** how long a line is shown, seconds: a moment, and a third of a second a word */
export const lineDur = (line) => 1.8 + line.split(/\s+/).length * 0.34;
