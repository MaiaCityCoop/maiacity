		});
	}
}
/** @typedef {(geo: THREE.BufferGeometry, color: string, mat?: number) => void} Put */
/** @typedef {{ box: (x: number, y: number, z: number, w: number, l: number, h: number, r?: number) => THREE.BufferGeometry, bar: (a: MM, b: MM, w: number, h: number, r?: number) => THREE.BufferGeometry, cyl: (a: MM, b: MM, r: number, seg?: number, r1?: number) => THREE.BufferGeometry, hose: (pts: MM[], r?: number) => THREE.BufferGeometry, T: (g: THREE.BufferGeometry) => THREE.BufferGeometry, L: (x: number, y: number, z: number) => V3, P: (x: number, y: number, z: number) => V3, kit: ReturnType<typeof machineKit>, W: number, Lh: number, H: number, B: number, joints: { flywheel: string, coupling: string, fan: string }, base: string }} Tools what a cube's insides are drawn with: mm in the cube's frame */
/** @typedef {(part: (g: Group, info: any, joint: string, make: (put: Put) => void) => void, tools: Tools) => void} Insides */
/** where a Power Cube's moving joints are, its foot's middle at `at` @param {V3} at @returns {{ flywheel: V3, coupling: V3, fan: V3 }} */
function powerCubeJoints(at) {
	const L = (x, y, z) => [
