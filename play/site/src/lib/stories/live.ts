// A LIVE SHOT (play/SPEC.md §12; intent f270269e): a story's shot that draws the real asset, built by the asset box's own
// frozen engine inside the story's composition, instead of a still or a video. Pure: what compose.ts writes into the
// composition and what the live runtime (./live-runtime.ts) reads back out of it, and the two maths both share: which
// build a moment shows and where the camera stands then. No clock, no chance: the same t is always the same picture.
//
//   live: { asset: <its UUID>, version: <its version's id>, variant?: <a variant's name>,
//           values?: { stage: 10, ... },              the asset's parameters, held over the shot
//           keys?: [{ at: s, values: { stage: 11 } }], parameters over the shot's time (s into the shot)
//           camera: [{ at: s, eye: [x, y, z], target: [x, y, z], fov: degrees, ease?: 'smooth' | 'linear' }],
//           steps?: how many builds a keyed change is drawn in (2 … 24; 8) }
//
// A parameter is a build's: a palm's stage can't move inside one build, so a keyed change is drawn as `steps` builds
// made before the shot is ready, the one nearest each moment shown then. The camera moves on every frame.

/** a camera keyframe: where the eye is and what it looks at, in metres, its field of view in degrees */
export type CameraKey = { at: number; eye: [number, number, number]; target: [number, number, number]; fov: number; ease?: 'smooth' | 'linear' };
export type Values = Record<string, number | string | boolean>;
export type Live = { asset: string; version: string; variant?: string; values?: Values; keys?: { at: number; values: Values }[]; camera: CameraKey[]; steps?: number };
/** what play knows of an asset's version, for compose: its recipe file and pieces by hash, its box engine, its parameters,
 *  and its variants' recipes */
export type LiveAsset = { asset: string; version: string; recipe: string; pieces?: string[]; engine: number; params?: { id: string | number; name?: string }[]; variants?: Record<string, { recipe: string; pieces?: string[] }> };

export const MOST_STEPS = 24;
export const STEPS = 8;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const smooth = (u: number) => u * u * (3 - 2 * u);
/** where a time falls among keys: the key before, the one after and how far between (0 … 1), the ends held */
function between<K extends { at: number }>(keys: K[], t: number): [K, K, number] {
	if (t <= keys[0].at) return [keys[0], keys[0], 0];
	for (let i = 1; i < keys.length; i++) if (t <= keys[i].at) return [keys[i - 1], keys[i], (t - keys[i - 1].at) / (keys[i].at - keys[i - 1].at)];
	const end = keys[keys.length - 1];
	return [end, end, 0];
}

/** the camera at t seconds into the shot: eye, target and fov from its keys, eased per segment ('smooth' unless the
 *  key it moves to says 'linear') */
export function cameraAt(camera: CameraKey[], t: number) {
	const [a, b, u0] = between(camera, t);
	const u = b.ease === 'linear' ? u0 : smooth(u0);
	return { eye: a.eye.map((x, i) => lerp(x, b.eye[i], u)) as [number, number, number], target: a.target.map((x, i) => lerp(x, b.target[i], u)) as [number, number, number], fov: lerp(a.fov, b.fov, u) };
}

/** the parameters at t seconds into the shot: its values, each key's over them from its moment; a number between two
 *  keys moves linearly, anything else holds until the next key */
export function valuesAt(live: Pick<Live, 'values' | 'keys'>, t: number): Values {
	const keys = live.keys ?? [];
	const out: Values = { ...(live.values ?? {}) };
	if (!keys.length) return out;
	const names = [...new Set(keys.flatMap((k) => Object.keys(k.values)))];
	for (const name of names) {
		const has = keys.filter((k) => name in k.values);
		const [a, b, u] = between(has, t);
		if (t < has[0].at && name in out) continue; // before its first key: the shot's own value
		const x = a.values[name], y = b.values[name];
		out[name] = finite(x) && finite(y) ? Math.round(lerp(x, y, u) * 1e6) / 1e6 : x;
	}
	return out;
}

/** the moments a keyed change is built at (s into the shot), `steps` of them evenly from the first key to the last;
 *  one, at 0, when nothing is keyed */
export function stepTimes(live: Pick<Live, 'keys' | 'steps'>): number[] {
	const keys = live.keys ?? [];
	if (!keys.length) return [0];
	const a = keys[0].at, b = keys[keys.length - 1].at;
	if (b <= a) return [a];
	const n = live.steps ?? STEPS;
	return Array.from({ length: n }, (_, i) => Math.round((a + ((b - a) * i) / (n - 1)) * 1e6) / 1e6);
}

/** which build shows at t seconds into the shot: the step nearest it (an index into stepTimes) */
export function stepAt(times: number[], t: number): number {
	if (times.length < 2 || t <= times[0]) return 0;
	if (t >= times[times.length - 1]) return times.length - 1;
	const span = (times[times.length - 1] - times[0]) / (times.length - 1);
	return Math.min(times.length - 1, Math.max(0, Math.round((t - times[0]) / span)));
}

/** every build a live shot needs: the parameters at each step, as text (a build is named by its values as text, as the
 *  asset library names one) */
export function buildsOf(live: Live): Record<string, string>[] {
	return stepTimes(live).map((t) => Object.fromEntries(Object.entries(valuesAt(live, t)).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => [k, String(v)])));
}

// ---- A WORLD SHOT (intent 65d04790): a whole world, an asset of the group `worlds` (play/SPEC.md §4.11), played in the
// shot. Its camera is a live shot's; its hour, exposure and lights are each a number held over the shot or [[t, v], …]
// keys (t in s into the shot, linear between, the ends held). Checked by play (play/api/src/stories.ts `worldOf`).
//
//   world: { asset: <its UUID>, version: <its version's id>, camera: CameraKey[],
//            hour?: Curve (0 … 24: the sun's place, over the world's mood), exposure?: Curve (stops over the mood),
//            lights?: { sun?, sky?, lamps?: Curve } (multipliers over the mood) }
//
// A world that moves (its own tick, seeded) is stepped through every frame of the shot before the shot is ready, each
// frame's places kept; a moment t shows frame frameOf(t): the same t, the same picture.

export type Curve = number | [number, number][];
export type World = { asset: string; version: string; camera: CameraKey[]; hour?: Curve; exposure?: Curve; lights?: { sun?: Curve; sky?: Curve; lamps?: Curve } };
/** what play knows of a world's version, for compose: its recipe file, pieces and engine, and every guest it plants
 *  (`use:` nodes) by its recipe's hash, with that recipe's pieces */
export type WorldAsset = { asset: string; version: string; recipe: string; pieces?: string[]; engine: number; guests: Record<string, string[]> };

/** a curve's value at t: its number, or its keys' (linear between, the ends held); `or` where it has none */
export function curveAt(c: Curve | undefined, t: number, or: number): number {
	if (c == null) return or;
	if (finite(c)) return c;
	if (!Array.isArray(c) || !c.length) return or;
	const [a, b, u] = between(c.map(([at, v]) => ({ at, v })), t);
	return Math.round(lerp(a.v, b.v, u) * 1e6) / 1e6;
}

/** how many frames a shot of `duration` s holds at `fps`: its first and its last both drawn */
export const framesOf = (duration: number, fps: number) => Math.max(1, Math.round(duration * fps) + 1);
/** the frame a moment shows: t's nearest, within the shot */
export const frameOf = (t: number, fps: number, frames: number) => Math.min(frames - 1, Math.max(0, Math.round(t * fps)));

/** the sun at an hour (0 … 24) on a day's arc: up at 6 in the east (az 90°), highest at noon (50° in the south, 180°),
 *  down at 18 in the west (270°), under the horizon at night; degrees, as a world's mood names them (`sun`, `az`) */
export function sunAt(hour: number): { sun: number; az: number } {
	const h = ((hour % 24) + 24) % 24;
	const sun = Math.round(50 * Math.sin((Math.PI * (h - 6)) / 12) * 1e4) / 1e4;
	const az = Math.round((((90 + (h - 6) * 15) % 360) + 360) % 360 * 1e4) / 1e4;
	return { sun, az };
}

/** everything a world shot shows at t seconds into it, by t alone: its frame on the world's own clock (`since`: how long
 *  after the world's first frame the shot begins, so every shot of one world runs on one clock, intent 4f7a2178), its
 *  camera, the sun (null: the mood's), its exposure in stops and its lights' multipliers */
export function worldAt(w: Pick<World, 'camera' | 'hour' | 'exposure' | 'lights'>, t: number, fps: number, frames: number, since = 0) {
	return {
		frame: frameOf(since + t, fps, frames),
		camera: cameraAt(w.camera, t),
		sun: w.hour == null ? null : sunAt(curveAt(w.hour, t, 12)),
		exposure: curveAt(w.exposure, t, 0),
		lights: { sun: curveAt(w.lights?.sun, t, 1), sky: curveAt(w.lights?.sky, t, 1), lamps: curveAt(w.lights?.lamps, t, 1) }
	};
}
