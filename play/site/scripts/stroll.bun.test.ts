/*
 * A stroll's route and how its frames are read (./stroll.ts, intent 095bc67c), without a browser.
 *
 *   cd play/site && bun test scripts/stroll.bun.test.ts
 */
import { expect, test } from 'bun:test';
import { along, judgeStroll, percentile, routeOf, statsOf, type Trace } from './stroll';

test('the route passes beside every dome, nearest first, and is long enough for the stroll', () => {
	const domes = [{ x: 100, z: 0, ext: 10 }, { x: 20, z: 0, ext: 5 }, { x: 20, z: -80, ext: 5 }];
	const r = routeOf({ x: 0, z: 0 }, domes, 60, 6.45, 6);
	expect(r[0]).toEqual({ x: 0, z: 0 });
	// the nearest first, at its edge plus 6 m on the walker's side
	expect(r[1].x).toBeCloseTo(9);
	expect(r[1].z).toBeCloseTo(0);
	let len = 0;
	for (let i = 1; i < r.length; i++) len += Math.hypot(r[i].x - r[i - 1].x, r[i].z - r[i - 1].z);
	expect(len).toBeGreaterThanOrEqual(60 * 6.45);
	// every dome is passed within its edge plus 6 m
	for (const d of domes) expect(Math.min(...r.map((p) => Math.hypot(p.x - d.x, p.z - d.z)))).toBeCloseTo(d.ext + 6);
});

test('a world without domes is walked round a square, as long', () => {
	const r = routeOf({ x: 5, z: 5 }, [], 30);
	let len = 0;
	for (let i = 1; i < r.length; i++) len += Math.hypot(r[i].x - r[i - 1].x, r[i].z - r[i - 1].z);
	expect(len).toBeGreaterThanOrEqual(30 * 6.45);
});

test('along the route: its place and heading, yaw 0 facing −z as the walker does', () => {
	const r = [{ x: 0, z: 0 }, { x: 0, z: -10 }, { x: 10, z: -10 }];
	const a = along(r, 5);
	expect([a.x, a.z, Math.abs(a.yaw)]).toEqual([0, -5, 0]);
	const b = along(r, 15);
	expect([b.x, b.z]).toEqual([5, -10]);
	expect(b.yaw).toBeCloseTo(-Math.PI / 2);
	expect(along(r, 999)).toMatchObject({ x: 10, z: -10 });
});

test('the percentile is by nearest rank', () => {
	const xs = Array.from({ length: 100 }, (_, i) => i + 1);
	expect(percentile(xs, 99)).toBe(99);
	expect(percentile(xs, 50)).toBe(50);
	expect(percentile([], 99)).toBe(0);
});

/** a trace of frames at `ms` each, with some frames held */
const trace = (seconds: number, ms: number, held: Record<number, number> = {}): Trace => {
	const t: Trace = { at: [], dt: [], long: [], spans: [] };
	for (let at = 0, i = 0; at < seconds * 1000; i++) {
		const d = held[i] ?? ms;
		at += d;
		t.at.push(at), t.dt.push(d);
	}
	return t;
};

test('a smooth stroll passes; a held frame, a heavy tail or a minute of hitches fails, each saying so', () => {
	const b = { max: 50, p99: 20, perMinute: 3 };
	expect(judgeStroll('cold', statsOf(trace(180, 16.7)), b)).toEqual([]);
	const held = statsOf(trace(180, 16.7, { 600: 80 }));
	expect(held.max_ms).toBe(80);
	expect(held.over50).toBe(1);
	expect(judgeStroll('cold', held, b)).toEqual(['the cold stroll held a frame 80 ms (1 over 50 ms), more than 50 ms']);
	// four frames over 33 ms within a minute, none over 50
	const hitches = statsOf(trace(180, 16.7, { 100: 40, 400: 40, 700: 40, 1000: 40, 9000: 40 }));
	expect(hitches.over33_min).toBe(4);
	expect(judgeStroll('warm', hitches, b)).toEqual(['the warm stroll had 4 frames over 33 ms in a minute, more than 3']);
	// the same four spread over minutes pass
	expect(statsOf(trace(240, 16.7, { 100: 40, 4000: 40, 8000: 40, 12000: 40 })).over33_min).toBe(1);
	expect(judgeStroll('cold', statsOf(trace(60, 25)), b)).toEqual(['the cold stroll\'s 99th percentile frame 25 ms, more than 20 ms']);
	expect(judgeStroll('cold', null, b)).toEqual(['the cold stroll drew no frames']);
	expect(judgeStroll('cold', null, {})).toEqual([]);
	// a page that stopped drawing frames fails, whatever its frames say
	const stopped = trace(60, 16.7);
	stopped.cut = true;
	expect(judgeStroll('warm', statsOf(stopped), b)).toEqual(["the warm stroll's page stopped drawing frames: it was ended a minute past its time"]);
	// against the world's standing frames: a slow machine's slowness passes, a stall out of it fails
	const slow = statsOf(trace(60, 280, { 50: 900 }));
	expect(judgeStroll('cold', slow, { overStanding: 2, standingP95: 1031 })).toEqual([]);
	expect(judgeStroll('cold', statsOf(trace(60, 280, { 50: 6519 })), { overStanding: 2, standingP95: 1031 })).toEqual(['the cold stroll held a frame 6519 ms, more than 2 × the standing p95 1031 ms']);
	expect(judgeStroll('cold', slow, { overStanding: 2, standingP95: null })).toEqual(['the cold stroll has no standing frames to be judged against']);
});

test('the worst frames are named with what was being made in them', () => {
	const t = trace(10, 16.7, { 100: 70 });
	const end = t.at[100];
	t.spans.push(['make:pipeline', end - 60, end - 20], ['make:dome', end - 10, end + 50], ['make:far', 0, 10]);
	t.long.push([end - 65, 62]);
	const s = statsOf(t);
	expect(s.worst).toEqual([`70 ms at ${Math.round(end / 100) / 10} s (long task 62 ms): make:pipeline 40 ms, make:dome 10 ms`]);
});
