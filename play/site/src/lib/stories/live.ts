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
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HASH = /^[0-9a-f]{64}$/;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const vec = (v: unknown): v is [number, number, number] => Array.isArray(v) && v.length === 3 && v.every(finite);
const value = (v: unknown) => finite(v) || typeof v === 'string' || typeof v === 'boolean';
const valuesOk = (v: unknown): v is Values => !!v && typeof v === 'object' && !Array.isArray(v) && Object.entries(v as object).every(([k, x]) => /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(k) && value(x));

/** why a shot's `live` is out of shape, or null: its asset and version named by id, its keys and camera in time order
 *  and within the shot @param {unknown} live @param {number} duration the shot's */
export function liveProblem(live: unknown, duration: number): string | null {
	if (!live || typeof live !== 'object' || Array.isArray(live)) return 'live must be an object';
	const l = live as Record<string, unknown>;
	if (typeof l.asset !== 'string' || !UUID.test(l.asset)) return "live.asset must be the asset's UUID";
	if (typeof l.version !== 'string' || !HASH.test(l.version)) return "live.version must be the version's id (its hash)";
	if (l.variant !== undefined && (typeof l.variant !== 'string' || !l.variant || l.variant.length > 80)) return "live.variant must be a variant's name";
	if (l.values !== undefined && !valuesOk(l.values)) return 'live.values must be { parameter: number | text | true/false }';
	if (l.steps !== undefined && !(Number.isInteger(l.steps) && (l.steps as number) >= 2 && (l.steps as number) <= MOST_STEPS)) return `live.steps must be a whole number 2 … ${MOST_STEPS}`;
	const inShot = (at: unknown) => finite(at) && at >= 0 && at <= duration + 1e-9;
	if (l.keys !== undefined) {
		if (!Array.isArray(l.keys) || l.keys.length > 64) return 'live.keys must be a list of at most 64 { at, values }';
		let last = -1;
		for (const k of l.keys) {
			if (!k || !inShot(k.at) || !valuesOk(k.values)) return "each of live.keys must be { at: seconds into the shot, values }";
			if (k.at <= last) return 'live.keys must be in time order, one per moment';
			last = k.at;
		}
	}
	if (!Array.isArray(l.camera) || !l.camera.length || l.camera.length > 64) return 'live.camera must be 1 … 64 keyframes { at, eye, target, fov }';
	let last = -1;
	for (const c of l.camera) {
		if (!c || !inShot(c.at) || !vec(c.eye) || !vec(c.target) || !finite(c.fov) || c.fov < 5 || c.fov > 120) return 'each of live.camera must be { at: seconds into the shot, eye: [x, y, z], target: [x, y, z] in metres, fov: 5 … 120 degrees }';
		if (c.ease !== undefined && c.ease !== 'smooth' && c.ease !== 'linear') return "a camera key's ease is 'smooth' or 'linear'";
		if (c.at <= last) return 'live.camera must be in time order, one per moment';
		last = c.at;
	}
	return null;
}

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
