		const geo = new three.BufferGeometry();
		const n = this.pos.length / 3;
		geo.setAttribute("position", new three.Float32BufferAttribute(this.pos, 3));
