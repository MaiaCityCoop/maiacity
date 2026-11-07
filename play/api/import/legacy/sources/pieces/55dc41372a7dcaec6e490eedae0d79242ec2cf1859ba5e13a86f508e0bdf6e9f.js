*/
function headTo(q, pose, target, look) {
	const { sk, j } = q;
	reach(sk, pose, "neck", "neck2", j.head, target);
	aim(sk, pose, "head", j.muzzle, look);
}
/**
* A quadruped's moves: each gait in `life.gaits` (walk, trot …), and standing (`idle`), grazing (`graze`), looking
* up (`alert`).
