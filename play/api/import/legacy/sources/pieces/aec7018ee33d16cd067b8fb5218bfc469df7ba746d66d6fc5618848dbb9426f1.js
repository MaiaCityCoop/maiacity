			y += j[1];
			z += j[2];
		}
		return [y, z];
	};
	/** how far a part is turned in all @param {string} part */
	const turned = (part) => part === "boom" ? boom : part === "arm" ? boom + arm : part === "bucket" ? boom + arm + bucket : 0;
	/** @type {Pose} */
	const out = {};
	for (const [name, ram] of Object.entries(spec.rams)) {
		const [on0, on1] = ram.on;
		const a = place(on0, ram.a), b = place(on1, ram.b);
