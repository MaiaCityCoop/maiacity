	W: 460,
	L: 480,
	H: 125
};
/** the height (mm) its ClickLock's pawls sit at: low in the foot band until v4; from v5 at the grip's own height, so
*  the release cables run straight and the cube's rails follow them; from v8 in the shell's foot, with the grip */
const lockZ = (v = 8) => v >= 8 ? 10 : v >= 7 ? 20 : v >= 5 ? 30 : 10;
/** how far behind its face (mm) the ClickLock's pawl teeth sit: 40 until v5; from v6 22, so they come out through the
*  drawer's front plate and leave with it */
const lockBack = (v = 8) => v >= 6 ? 22 : 40;
/** the grip's bar height (mm) from v5: low on the face, its trigger at the lock's height */
const gripZ = (v) => v >= 8 ? 10 : v >= 7 ? 28 : 40;
/** how high (mm) the shell's foot (its floor tub and the sill across its face) stands from v8: the drawer rides on it */
const FOOT_8 = 20;
/** from v9 the shell's two front corner columns (mm): `w` across from its side, up to the base plate's top. The cells'
*  block fills 446 of the shell's 452 mm inside, so a column any taller would stop the drawer coming out: the base
*  plate runs between the two, and the cells' holders pass over them */
const POST_9 = {
	w: 46,
	top: 25
//#piece 9053a42212a2603c7b7753a81f928fe01e6189ad1610d344045d96a50537477d
