		const side = new three.Vector3().crossVectors(dir, v3(0, 1, 0));
		if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
		side.normalize().multiplyScalar(k % 2 ? 1 : -1);
		leaf(at, side.addScaledVector(dir, .5).add(v3(lr() - .5, 0, lr() - .5).multiplyScalar(.6)));
	}
}
/**
* A flowering site through its stages: buds, flowers (a panicle, a cluster, a catkin), then the fruit it keeps,
* swelling and ripening on its stalk.
* @param {Bag} bag @param {Orchard} spec @param {string} seed @param {number} g
* @param {{ at: THREE.Vector3, dir: THREE.Vector3, key: (string | number)[] }} site @param {Space} space @param {number} vigour
