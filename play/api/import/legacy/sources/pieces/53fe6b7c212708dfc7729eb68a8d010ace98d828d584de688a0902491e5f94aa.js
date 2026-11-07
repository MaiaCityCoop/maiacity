*/
//#piece e36ef73d601f31ef7136c54bc92d7188a90d2ca4c9168a8ea4bfafd9bd5c336d
/** a colour from green through `turning` to `ripe`, as t goes 0 … 1 */
const ripening = (green, turning, ripe, t) => t < .5 ? mix(green, turning, t * 2) : mix(turning, ripe, (t - .5) * 2);
//#piece bb7c285c7fc4ca81814c67cc5b3342ebc083a203a2e1158d6f2141a1a8b98c5a
