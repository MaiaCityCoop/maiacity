			0,
			.2,
			0
		] });
	}
	const C = new three.Vector3(0, CRANK.y, CRANK.z);
	const r = ENGINE.stroke / 2;
	/** a bank's axis: its angle from upright, towards +x for the right bank */
	const banks = [["left", -1], ["right", 1]];
	/** the banks sit a rod's width apart along the crank, their two rods side by side on one pin */
	const off = (sx) => sx * .0125;
	const axis = (sx) => new three.Vector3(sx * Math.sin(ENGINE.bank), Math.cos(ENGINE.bank), 0);
	/** a geometry made upright on its own +y, turned onto a bank's axis and set on the crank */
	const onBank = (geo, sx) => geo.rotateZ(-sx * ENGINE.bank).translate(C.x, C.y, C.z + off(sx));
	/** @type {Record<string, THREE.Group>} */
	const moving = {};
	{
