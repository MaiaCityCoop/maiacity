// THE FILM'S COLOUR STANDARD — one working space for every picture, from the moment it comes in to the moment it goes
// out: ACEScct (ACES AP1 primaries, the ACEScct log curve), processed in float. Every source is brought into it by its
// input transform (IDT), graded in it, and taken out by one output transform (ODT) to what every delivery shows:
// Rec.709, BT.1886 gamma 2.4, SDR (ACES 2.0 output transform): OpenColorIO's ACES 2.0 studio config, or exact maths. LUTs are made from them only while rendering — natively on
// the Mac (vault-media's cst and aces2, the final render in vault-render) — never committed; media stays in its own
// encoding for ever.
//
// Shared by the film scripts (Node), Sandbox 4's film camera, the API and the studio. The grade itself (the CDL, the
// balance) is Rust's alone: vault-render `grade`.

/**
 * Linear light with Rec.709 primaries (D65) — what the world renders, and what Rec.709 video and sRGB pictures decode
 * to — to ACES AP1 (D60), Bradford, from OCIO's own conversion (cst.rs derives the same from the chromaticities).
 */
export const REC709_TO_AP1 = [
	[0.6130974, 0.33952314, 0.047379453],
	[0.07019372, 0.9163539, 0.013452399],
	[0.020615593, 0.10956977, 0.86981463]
];

// ── the ACEScct curve (S-2016-001) ─────────────────────────────────────────────────────────────────────────────────
const X_BRK = 0.0078125;
const Y_BRK = 0.155251141552511;
const A = 10.5402377416545;
const B = 0.0729055341958355;

/** Linear AP1 → ACEScct. */
export const toCct = (/** @type {number} */ lin) => (lin <= X_BRK ? A * lin + B : (Math.log2(lin) + 9.72) / 17.52);
/** ACEScct → linear AP1. */
export const fromCct = (/** @type {number} */ cct) =>
	cct <= Y_BRK ? (cct - B) / A : cct < (Math.log2(65504) + 9.72) / 17.52 ? Math.pow(2, cct * 17.52 - 9.72) : 65504;
