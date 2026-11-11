/*
 * A STROLL THROUGH A WORLD (intent 095bc67c) — what gpu.ts --stroll walks and how it reads the frames: the eye walked
 * dome to dome at the walker's pace for a few minutes, so every dome's inside, every plant's level and every material
 * near the route is met for the first time while walking, as Samuel met them (5–8 s stutters until about 3 minutes in).
 * Every frame's interval is kept, with the page's long tasks (Chromium) and its making spans (performance.measure
 * named `make:*`), and judged by absolute bounds: no frame over 50 ms, the 99th percentile at most 20 ms, at most 3
 * frames over 33 ms in any minute.
 *
 * Pure, so it is tested without a browser (stroll.bun.test.ts); `walkInPage` is self-contained (Playwright sends its source).
 */

export type Pt = { x: number; z: number };
/** a stroll's frames: each frame's end (ms from the stroll's start) and interval, the long tasks and the making spans */
export type Trace = { at: number[]; dt: number[]; long: [number, number][]; spans: [string, number, number][]; cut?: boolean };
export type StrollStats = { frames: number; seconds: number; max_ms: number; p99_ms: number; over50: number; over33_min: number; worst: string[]; cut?: boolean };
export type StrollBounds = { max?: number; p99?: number; perMinute?: number; overStanding?: number; standingP95?: number | null };

/** the walker's own pace (sandbox-kit/walker.js PACE.walk), m/s */
export const PACE = 6.45;

/**
 * The route: from where the eye stands, past each dome in turn (the nearest not yet passed next), at `side` metres
 * beside its edge, so its inside is built ahead and shown as the walker comes by; then round again, until the route is
 * long enough for `seconds` at `pace`. With no domes (Sandbox 5's forest), one square round the start walked once in
 * the stroll's time, so it keeps meeting new ground.
 */
export function routeOf(start: Pt, domes: (Pt & { ext?: number })[], seconds: number, pace = PACE, side = 6): Pt[] {
	const need = seconds * pace;
	const pts: Pt[] = [{ ...start }];
	let len = 0;
	const add = (p: Pt) => {
		const l = pts[pts.length - 1];
		len += Math.hypot(p.x - l.x, p.z - l.z);
		pts.push(p);
	};
	const a = need / 8;
	const ring = domes.length
		? domes
		: [{ x: start.x + a, z: start.z }, { x: start.x + a, z: start.z - 2 * a }, { x: start.x - a, z: start.z - 2 * a }, { x: start.x - a, z: start.z }];
	for (let round = 0; len < need && round < 50; round++) {
		const left = ring.map((_, i) => i);
		while (left.length && len < need) {
			const l = pts[pts.length - 1];
			left.sort((a, b) => Math.hypot(ring[a].x - l.x, ring[a].z - l.z) - Math.hypot(ring[b].x - l.x, ring[b].z - l.z));
			const d = ring[left.shift()!];
			// beside the dome, on the side the walker comes from
			const gx = l.x - d.x, gz = l.z - d.z, g = Math.hypot(gx, gz) || 1, r = ('ext' in d && d.ext ? d.ext : 0) + side;
			add({ x: d.x + (gx / g) * r, z: d.z + (gz / g) * r });
		}
	}
	return pts;
}

/** where on the route the eye is `m` metres along it, and its heading (yaw: 0 faces −z, as the walker's) */
export function along(route: Pt[], m: number): { x: number; z: number; yaw: number } {
	for (let i = 1; i < route.length; i++) {
		const a = route[i - 1], b = route[i], l = Math.hypot(b.x - a.x, b.z - a.z);
		if (m <= l || i === route.length - 1) {
			const k = l ? Math.min(1, m / l) : 0;
			return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, yaw: Math.atan2(-(b.x - a.x), -(b.z - a.z)) };
		}
		m -= l;
	}
	return { ...route[0], yaw: 0 };
}

/** the p-th percentile of numbers (nearest rank) */
export const percentile = (xs: number[], p: number) => {
	if (!xs.length) return 0;
	const s = [...xs].sort((a, b) => a - b);
	return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))];
};

const r1 = (x: number) => Math.round(x * 10) / 10;

/** a trace read: its worst frame, its 99th percentile, the frames over 50 ms, the most frames over 33 ms in any one
 *  minute (a window sliding frame by frame), and the five worst frames, each with what was being made in it */
export function statsOf(t: Trace): StrollStats {
	const n = t.dt.length;
	let over33 = 0;
	for (let i = 0, j = 0, inWin = 0; i < n; i++) {
		if (t.dt[i] > 33) inWin++;
		while (t.at[i] - t.at[j] > 60_000) if (t.dt[j++] > 33) inWin--;
		over33 = Math.max(over33, inWin);
	}
	const worst = t.dt.map((d, i) => i).sort((a, b) => t.dt[b] - t.dt[a]).slice(0, 5).filter((i) => t.dt[i] > 33).map((i) => {
		const end = t.at[i], start = end - t.dt[i];
		const inIt = (s: number, e: number) => e > start && s < end;
		const spans = new Map<string, number>();
		for (const [name, s, e] of t.spans) if (inIt(s, e)) spans.set(name, (spans.get(name) ?? 0) + Math.min(e, end) - Math.max(s, start));
		const long = t.long.filter(([s, d]) => inIt(s, s + d)).map(([, d]) => r1(d));
		const what = [...spans].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${r1(v)} ms`);
		return `${r1(t.dt[i])} ms at ${r1(end / 1000)} s${long.length ? ` (long task ${long.join('+')} ms)` : ''}${what.length ? `: ${what.join(', ')}` : ''}`;
	});
	return {
		frames: n,
		seconds: n ? r1(t.at[n - 1] / 1000) : 0,
		max_ms: r1(n ? Math.max(...t.dt) : 0),
		p99_ms: r1(percentile(t.dt, 99)),
		over50: t.dt.filter((d) => d > 50).length,
		over33_min: over33,
		worst,
		...(t.cut ? { cut: true } : {})
	};
}

/** why a stroll fails its bounds: nothing when every bound holds */
export function judgeStroll(label: string, s: StrollStats | null, b: StrollBounds): string[] {
	if (b.max === undefined && b.p99 === undefined && b.perMinute === undefined && b.overStanding === undefined) return [];
	if (!s || s.frames < 2) return [`the ${label} stroll drew no frames`];
	const why: string[] = s.cut ? [`the ${label} stroll's page stopped drawing frames: it was ended a minute past its time`] : [];
	if (b.max !== undefined && s.max_ms > b.max) why.push(`the ${label} stroll held a frame ${s.max_ms} ms (${s.over50} over 50 ms), more than ${b.max} ms`);
	if (b.p99 !== undefined && s.p99_ms > b.p99) why.push(`the ${label} stroll's 99th percentile frame ${s.p99_ms} ms, more than ${b.p99} ms`);
	// a walking frame against the same world's standing frames in the same load: on a machine slow at everything (GitHub's
	// VM) a stall is what stands out of its own slowness
	if (b.overStanding !== undefined) {
		if (!b.standingP95) why.push(`the ${label} stroll has no standing frames to be judged against`);
		else if (s.max_ms > b.overStanding * b.standingP95) why.push(`the ${label} stroll held a frame ${s.max_ms} ms, more than ${b.overStanding} × the standing p95 ${b.standingP95} ms`);
	}
	if (b.perMinute !== undefined && s.over33_min > b.perMinute) why.push(`the ${label} stroll had ${s.over33_min} frames over 33 ms in a minute, more than ${b.perMinute}`);
	return why;
}

/** a stroll's line: frames, worst, p99, how many held */
export const strollLine = (label: string, s: StrollStats | null) =>
	s ? `${label} stroll ${s.seconds} s, ${s.frames} frames: worst ${s.max_ms} ms, p99 ${s.p99_ms} ms, ${s.over50} over 50 ms, at most ${s.over33_min} over 33 ms in a minute` : `${label} stroll: none`;

/**
 * In the page (self-contained): the eye walked along `route` by the clock for `seconds`, placed each frame, every
 * frame's interval kept, with the long tasks and the `make:*` spans seen meanwhile. Null where the world has no walker.
 */
export async function walkInPage({ route, seconds, pace }: { route: Pt[]; seconds: number; pace: number }): Promise<Trace | null> {
	const walker = (window as any).__walker;
	if (!walker) return null;
	const where = (m: number) => {
		for (let i = 1; i < route.length; i++) {
			const a = route[i - 1], b = route[i], l = Math.hypot(b.x - a.x, b.z - a.z);
			if (m <= l || i === route.length - 1) {
				const k = l ? Math.min(1, m / l) : 0;
				return [a.x + (b.x - a.x) * k, a.z + (b.z - a.z) * k, Math.atan2(-(b.x - a.x), -(b.z - a.z))];
			}
			m -= l;
		}
		return [route[0].x, route[0].z, 0];
	};
	const t: Trace = { at: [], dt: [], long: [], spans: [] };
	const t0 = performance.now();
	const obs: PerformanceObserver[] = [];
	for (const [type, keep] of [
		['longtask', (e: PerformanceEntry) => t.long.push([e.startTime - t0, e.duration])],
		['measure', (e: PerformanceEntry) => e.name.startsWith('make:') && t.spans.push([e.name, e.startTime - t0, e.startTime - t0 + e.duration])]
	] as const) {
		try {
			const o = new PerformanceObserver((l) => l.getEntries().forEach(keep));
			o.observe({ type, buffered: false });
			obs.push(o);
		} catch {
			// WebKit has no long tasks: its frames say it all the same
		}
	}
	let yaw = where(0)[2];
	await new Promise<void>((finish) => {
		// a page that stops drawing frames ends its stroll all the same, a minute past its time, saying so
		const cut = setTimeout(() => ((t.cut = true), finish()), (seconds + 60) * 1000);
		const done = () => (clearTimeout(cut), finish());
		let last = t0;
		const each = (now: number) => {
			const s = (now - t0) / 1000;
			if (now > t0) (t.at.push(now - t0), t.dt.push(now - last));
			last = now;
			if (s >= seconds) return done();
			const [x, z, y] = where(s * pace);
			// the head turns towards the way ahead as a person's does, a quarter turn a second at most
			const d = Math.atan2(Math.sin(y - yaw), Math.cos(y - yaw));
			yaw += Math.max(-1.6 / 60, Math.min(1.6 / 60, d));
			walker.place(x, z, yaw, -0.05);
			requestAnimationFrame(each);
		};
		requestAnimationFrame(each);
	});
	for (const o of obs) o.disconnect();
	return t;
}
