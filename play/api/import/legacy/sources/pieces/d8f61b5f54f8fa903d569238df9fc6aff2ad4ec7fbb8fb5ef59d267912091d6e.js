/** a ripening colour: from green, through a turning colour, to ripe */
const ripening = (green, turning, ripe) => (t) => t < .5 ? mix(green, turning, t * 2) : mix(turning, ripe, (t - .5) * 2);
