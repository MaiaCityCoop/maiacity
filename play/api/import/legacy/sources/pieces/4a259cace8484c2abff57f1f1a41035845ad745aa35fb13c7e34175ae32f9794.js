const relaxed = {
//#piece aa9c4b55c692166477ebac722ff511d5de8310549f1b2297d8c5ed0a2589d3d9
function posesFor(s) {
//#piece 11a834f3c232cfeeb85d3e01a280e8c89965f43c07d2dfa87ec9f15d839d3076
	const sitHip = SEAT + .07 * s, a = slope(sitHip);
//#piece f7a5bafa42516457abce7971e092b0000964cb7f9426c36edc9e067bc26b1383
	const fallHips = SEAT + .08 * s, b = slope(fallHips), back = -1.52;
	return {
		stand: relaxed,
//#piece 44151b4e388f50930fa5ca8a29131d0c9538bf088c6e2418114523a5d6268045
			...relaxed,
//#piece f9ac1c1ff1caa90425fb98f88370a2b89bace53b5d2bf9e1f925d33c98099a41
			...relaxed,
//#piece 06287d4e186081651ce9161a975ae4ef1eb8e8d6682232a4dbd7e5822e92586f
			...relaxed,
//#piece a10172c41a7e87c7745eb37ccfe79079ac33171a32ca9b2c238ce8286015746f
			...relaxed,
//#piece c03f5c9d12601fe9d4871c53ccc02203238f379dcfe6275f214edf3576437981
			...relaxed,
//#piece 76296f4466fa4e76362c7d70e6a2bcf9fc0b50aa9ea465466d3535a8388a76fb
const POSES = /* @__PURE__ */ (() => posesFor(HEIGHT / MEASURED))();
function clipsFor(s, poses) {
	const idle = (t) => ({
		...relaxed,
//#piece 2fc242b79782694edc8b7c3891228aa093391291aa056e57f715183914c96ced
		return blend(relaxed, poses.sit, k * k * (3 - 2 * k));
