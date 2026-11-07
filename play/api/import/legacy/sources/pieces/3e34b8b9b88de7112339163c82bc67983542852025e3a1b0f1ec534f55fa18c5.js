			y += j[1];
			z += j[2];
		}
		return [y, z];
	};
	/** how far a part is turned in all (its parents' turns and its own) @param {string} part */
	const turned = (part) => part === "swing" ? 0 : part === "boom" ? boom : part === "arm" ? boom + arm : boom + arm + bucket;
	/** @type {Pose} */
	const out = {};
