		const s = this.size;
		for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
			const list = this.cells.get(this.key(p.x + dx * s, p.y + dy * s, p.z + dz * s));
