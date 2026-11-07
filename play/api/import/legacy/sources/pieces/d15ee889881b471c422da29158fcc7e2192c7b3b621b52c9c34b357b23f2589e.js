		/** @type {{ at: THREE.Vector3, dir: THREE.Vector3, key: (string | number)[] }[]} */
		const sites = [];
		for (const sh of shoots) {
			if (f.sites === "tips" && sh.end && tipSite(sh.key, sh.gen, sh.born)) sites.push({
				at: sh.tip,
				dir: sh.dir,
				key: sh.key
			});
