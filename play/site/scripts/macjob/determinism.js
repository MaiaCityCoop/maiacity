// The Mac render box's determinism, once for every Mac job and the census (intent 373050d1; kept here since intent
// cb52fbd9, before on the side branch intent-work/main-baseline-render): two things made the far view and the old
// city differ between two runs of the same commit (Math.random, and views settled while far pictures were still taken),
// so SSIM measured the run, not the change.
//
// Use: `await page.addInitScript({ content: SEEDED_RANDOM })` before the first goto, and poll `page.evaluate(QUIET)`
// every 2 s until it returns 0 (null while the world has no __assets yet).
import { quietness } from '../lib/quiet.js';

export const SEEDED_RANDOM = `(() => { let s = 0x2545f491; Math.random = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();`;

// QUIET is ../quiet.js's rule (intent 7af6e162: one rule for the census, every Mac job and the render box), as an
export const QUIET = `(${quietness})()`;
