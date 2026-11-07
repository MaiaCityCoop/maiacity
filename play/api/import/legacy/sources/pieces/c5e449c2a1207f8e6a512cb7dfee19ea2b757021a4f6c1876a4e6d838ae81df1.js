	wire: new three.MeshStandardMaterial({
		color: "#c3c7bf",
		transparent: true,
		opacity: .16,
		side: three.DoubleSide,
		depthWrite: false,
		roughness: .6
	}),
	clear: new three.MeshStandardMaterial({
		color: "#e8f0ee",
		transparent: true,
		opacity: .2,
		side: three.DoubleSide,
		depthWrite: false,
		roughness: .15
	})
}))();
/**
* A geodesic dome: the triangles of an icosphere of radius R above the ground (squashed to `squash` of its height), a
* strut along every edge. Each triangle goes to the material `panel` gives it (null: left open), by its middle.
* @param {THREE.Group} g @param {number} R @param {number} detail @param {number} squash
* @param {number} strut the struts' radius @param {THREE.Material} strutMat
* @param {(c: THREE.Vector3, R: number) => THREE.Material | null} panel
