import { THREE } from './mocap.mjs';
import { targetFK } from './retarget.mjs';
const { cut, settle, close } = await import('./convert.mjs');
const show = (tag, c) => { const f = c.frames[0]; const { P } = targetFK(f.q, f.hips); console.log(tag, 'lHand', P.leftHand.toArray().map((x) => x.toFixed(2)).join(','), 'head', P.head.toArray().map((x) => x.toFixed(2)).join(','), 'hips', f.hips.toArray().map((x) => x.toFixed(2)).join(',')); };
const c = cut('style', '/tmp/claude-0/data/style/100STYLE/Neutral/Neutral_ID.bvh', 4, 12, undefined, 15);
show('cut', c); settle(c); show('settled', c); close(c); show('closed', c);
