#!/usr/bin/env bun
/*
 * A FRAME'S CALLS BOUND ON MAIN, IN ONE COMMAND (intent 416c555c) — main and the head measured here, side by side:
 *
 *   bun play/site/scripts/census/frame-bound.ts --world sandbox-1|sandbox-5|sandbox-3 [--view near] [--of calls,writes] --down N%
 *
 * It is `play/avenbox/vs-main.ts frame …` (the same measure, bound and report, from this checkout's vs-main.ts), for
 * the one intent that brings that measure: an intent's box run on GitHub measures main with main's own vs-main.ts,
 * which knows no `frame` before this lands. Once it is on main, a check bounds a frame with vs-main.ts itself.
 */
import { REPO } from './tree';
import { mainOf, mainValues, measure, parse, report } from '../../../avenbox/vs-main';

const o = parse(['frame', ...process.argv.slice(2)]);
if (!o.measure || !o.bound) {
	console.error('frame-bound: --world <world> [--view <view>] [--of <values>] (--within N% | --down N%)');
	process.exit(2);
}
const main = o.main ?? mainOf(REPO);
const r = report(o.measure, mainValues(o.measure, main, REPO), measure(o.measure, null, REPO), o.bound, main);
console.log(r.text);
process.exit(r.ok ? 0 : 1);
