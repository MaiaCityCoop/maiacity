	/** a branch as far as it has grown, and everything off it @param {Branch} b @param {THREE.Vector3} from */
	const draw = (b, from) => {
		const length = b.order === 0 ? linear(Y, LEADER) * (b.full / LEADER[LEADER.length - 1][1]) : b.full * clamp((Y - b.born) * b.rate / b.full);
		if (length < .004) return;
		const age = Y - b.born;
