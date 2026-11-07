// THE COMPILE (play/SPEC.md §12): a story/1 version made into one HyperFrames composition, the one engine that plays it
// (StoryPlayer.svelte: HyperFrames' player in play's sealed frame) and renders it (scripts/story-parity.ts: HyperFrames'
// renderer). `compose(story, links, compositions)` is pure: no clock, chance or environment, so a version always gives the
// same bytes, kept by their hash. story/1 stays the source; the composition is only ever made from it.
// - shots: an image, a video (muted, from video_in) or a composition (readable HTML kept by hash, inlined as a
//   sub-composition and seeked from 0 at the shot's start), each held over a gap until the next shot; its transition
//   codes (cut, dissolve s, from black s, to black s, dip to black s) GSAP tweens on the story's own timeline
// - voice: its cues, or its line cut evenly, as caption clips (`em` alone and large)
// - sound: every clip's recording an <audio> clip with its gain, fades, EQ (data-fx-chain) and gain keys (data-automation),
//   on its track's bus (<hf-audio-group>, the track's gain); a `duck` track dips under the voice in its automation
// - links: each linked version a nested sub-composition at its link's place, its sound carrying the link's gain and mute
// - live shots (intent f270269e, ./live.ts): the real asset drawn in the shot by the asset box's own frozen engine, its
//   recipe and pieces laid in by hash, built before the composition is ready (its still the poster until then) and
//   drawn at every seek from the shot's camera and keyed values (./live-runtime.ts, VENDOR.live)
import { frameCsp, SANDBOX, DENY } from '../kernel/sandbox/policy.js';
import { hashBytes } from '../content/game/hash.js';
import { engineAt } from '../kernel/engines.js';
import { buildsOf, stepTimes, type Live, type LiveAsset } from './live';
import { clipsOf, cuesOf, linkedOf, setCuesOf, LINK, MOST_LINK_DEPTH, type Clip, type Links, type Shot, type StoryBody, type Voice } from './timeline';

/** the live runtime's hash: what scripts/live-runtime.ts builds, held to it (`bun scripts/live-runtime.ts --check`) */
const LIVE_HASH = '3341d3965ed4fd0b2107654d11bba9d05eb11ca9561dd245edcbd062b012dce5';
/** HyperFrames' runtime, GSAP and the one font (Inter, where a composition names only a generic family, as HyperFrames'
 *  renderer puts it first), pinned by their BLAKE3 hash: among play's files, never from a CDN */
export const VENDOR = {
	runtime: { hash: '2a2d643f32b99f433c4fd1812fb83de451e2e12b90cbe23ad876e994f815e93b', name: 'hyperframe.runtime.iife.js @hyperframes/core 0.9.20' },
	gsap: { hash: '0a705954bbbe95f3a0c82d91f20af16b181e87a5f427e54d9be67d9dcec5231f', name: 'gsap.min.js gsap 3.15.0' },
	font: { hash: '194fdc7f41a1a3e29bcd521e088c7a6b9f0fbb6b621cf513fb01451fc44797d3', name: 'inter-latin-wght-normal.woff2 @fontsource-variable/inter 5.3.0' },
	/** a live shot's runtime (./live-runtime.ts, bundled by scripts/live-runtime.ts): the asset library's rebuild and
	 *  stage, and the site's three.js they draw with; the asset is built by the frozen box engine, laid in by its hash */
	live: { hash: LIVE_HASH, name: 'live-runtime.js play/site src/lib/stories/live-runtime.ts' }
};
const FONT = '"PlayInter"';
const GENERIC = /^\s*(sans-serif|serif|monospace|cursive|fantasy|system-ui|ui-sans-serif|ui-serif|ui-monospace|-apple-system|blinkmacsystemfont)\s*(,|$)/i;
/** a font-family (or a custom property) whose first family is a generic one gets play's font first, as the renderer does */
const fonts = (css: string) => css.replace(/((?:^|[;{\s])(?:font-family|--[\w-]+)\s*:\s*)([^;}]+)/g, (m, k, v) => (GENERIC.test(v) ? `${k}${FONT}, ${v.trim()}` : m));
/** play's files, by hash: the only place a composition loads anything from */
export const fileUrl = (hash: string) => `/api/files/${hash}`;
const FILE = /\/api\/files\/([0-9a-f]{64})/g;
/** every file a composition names, once each, in order */
export const filesOf = (html: string) => [...new Set([...html.matchAll(FILE)].map((m) => m[1]))];
const CODE = /<script type="text\/x-play-code" data-play-code="([0-9a-f]{64})"><\/script>/g;
/** every code file a composition's live shots run (the frozen box engine, recipes, pieces), laid in as text, not loaded */
export const codeOf = (html: string) => [...new Set([...html.matchAll(CODE)].map((m) => m[1]))];
/** a composition with its code files laid in (the renderer's way: the page's is the sealed frame's bridge), each a
 *  JavaScript string, so its bytes come out as they went in; `code` by hash, each held to it by the live runtime */
export const laid = (html: string, code: Record<string, string>) =>
	html.replace(CODE, (m, h) => (typeof code[h] === 'string' ? `<script>(window.__playCode ??= {})[${JSON.stringify(h)}] = ${JSON.stringify(code[h]).replace(/<\//g, '<\\/').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')};</script>` : m));
/** the frame's policy: scripts inline (and play's files where it is not sealed: a renderer's), media from play's files or
 *  the frame's own blobs, no connection of any kind */
export const CSP = frameCsp({ script: "'self' 'unsafe-inline' blob:", open: { 'img-src': "'self' blob: data:", 'media-src': "'self' blob:", 'style-src': "'unsafe-inline'", 'font-src': "'self' blob: data:" } });
/** the player's frame: play's walls (no same origin, every device feature off; sound may play) */
export const FRAME = { sandbox: SANDBOX, allow: `autoplay; ${DENY}` };

/** a film's frame in pixels: its short side 1080 */
export function sizeOf(format: string | undefined): [number, number] {
	const [a, b] = String(format ?? '9:16').split(':').map(Number);
	if (!(a > 0 && b > 0)) return [1080, 1920];
	return a >= b ? [Math.round((1080 * a) / b), 1080] : [1080, Math.round((1080 * b) / a)];
}
const n = (x: number) => String(Math.round(x * 1e6) / 1e6);
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const db = (x: number) => Math.pow(10, x / 20);
const num = (v: unknown, otherwise = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : otherwise);

// ---- transitions: a shot's `transition` read as codes, each from its start; anything else is prose (a short dissolve)
type Codes = { cut: boolean; dissolve: number | null; fromBlack: number; toBlack: number; dip: number };
const secs = (p: string, otherwise: number) => {
	const v = Number(p.match(/(\d+(?:\.\d+)?)/)?.[1]);
	return Number.isFinite(v) ? Math.min(10, Math.max(0, v)) : otherwise;
};
function codes(text: unknown): Codes {
	const out: Codes = { cut: false, dissolve: null, fromBlack: 0, toBlack: 0, dip: 0 };
	for (const raw of String(text ?? '').split(/[,;·]/)) {
		const p = raw.trim().toLowerCase();
		if (/^dip\b/.test(p)) out.dip = secs(p, 0.5);
		else if (/^(fade )?(from black|in)\b/.test(p)) out.fromBlack = secs(p, 0.5);
		else if (/^(fade )?(to black|out)\b/.test(p)) out.toBlack = secs(p, 0.5);
		else if (/^(dissolve|cross-?fade)\b/.test(p)) out.dissolve = secs(p, 0.5);
		else if (/^cut\b/.test(p) || /\b(hard|smash|match|jump)\s*cut\b|\bcut to\b/.test(p)) out.cut = true;
	}
	return out;
}
/** how long a shot dissolves in over the one before it, which it touches: a cut cuts, black goes through black */
function dissolve(prev: Shot | null, shot: Shot): number {
	if (!prev) return 0;
	const c = codes(prev.transition);
	if (c.cut || c.toBlack > 0 || c.dip > 0) return 0;
	if (c.dissolve !== null) return Math.min(c.dissolve, prev.duration / 2, shot.duration / 2);
	return Math.min(0.5, 0.3 * Math.min(prev.duration, shot.duration));
}

// ---- a composition shot's HTML laid into the story's: its styles scoped to it, its scripts in a scope of their own
function scopeCss(css: string, scope: string): string {
	let out = '', i = 0;
	css = css.replace(/\/\*[\s\S]*?\*\//g, '');
	while (i < css.length) {
		const open = css.indexOf('{', i);
		if (open < 0) break;
		let depth = 1, j = open + 1;
		while (j < css.length && depth) depth += css[j] === '{' ? 1 : css[j] === '}' ? -1 : 0, j++;
		const head = css.slice(i, open).trim(), body = css.slice(open + 1, j - 1);
		if (/^@(media|supports|container)/.test(head)) out += `${head}{${scopeCss(body, scope)}}`;
		else if (head.startsWith('@')) out += `${head}{${body}}`;
		else out += head.split(/,(?![^(]*\))/).map((s) => s.trim()).map((s) => (/^(html|body|:root)$/.test(s) ? scope : /^(html|body|:root)\b/.test(s) ? s.replace(/^(html|body|:root)/, scope) : `${scope}:is(${s}), ${scope} ${s}`)).join(', ') + `{${body}}`;
		i = j;
	}
	return out;
}
function inline(html: string, id: string, at: number, duration: number, z: number, track: number, [w, h]: [number, number]) {
	const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
	const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html).replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
	const scripts = [...body.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter((m) => !/\bsrc=/.test(m[1])).map((m) => m[2]);
	const rest = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<!--[\s\S]*?-->/g, '').trim();
	const tag = rest.match(/^<(\w+)([^>]*)>/);
	if (!tag) return { html: '', script: '' };
	// its root: the sub-composition, timed as the shot (only its own tag: what is inside keeps its own times)
	const old = tag[2].match(/data-composition-id="([^"]*)"/)?.[1] ?? '';
	const cw = num(Number(tag[2].match(/data-width="(\d+)"/)?.[1]), w), ch = num(Number(tag[2].match(/data-height="(\d+)"/)?.[1]), h);
	const fit = cw === w && ch === h ? '' : `;width:${cw}px;height:${ch}px;transform:scale(${n(Math.min(w / cw, h / ch))});transform-origin:0 0`;
	const cls = tag[2].match(/\sclass="([^"]*)"/)?.[1];
	const attrs = tag[2].replace(/\s(class|data-(start|duration|track-index|composition-id))="[^"]*"/g, '');
	const root = `<${tag[1]} class="clip${cls ? ' ' + cls : ''}" data-composition-id="${id}" data-start="${n(at)}" data-duration="${n(duration)}" data-track-index="${track}"${attrs}>` + rest.slice(tag[0].length);
	const timelines = (s: string) => s.replace(/__timelines\[\s*(["'])([^"']*)\1\s*\]/g, (m, q, k) => (k === old ? `__timelines[${q}${id}${q}]` : m));
	return {
		html: `<style>${fonts(scopeCss(styles.join('\n'), `[data-composition-id="${id}"]`))}</style>\n<div class="layer" style="z-index:${z}${fit}">${root.replace(/\sstyle="([^"]*)"/g, (m, st) => ` style="${fonts(st)}"`)}</div>`,
		script: scripts.map((s) => `(() => { try {\n${timelines(s)}\n} catch (e) { console.error(${JSON.stringify(id)}, e); } })();`).join('\n')
	};
}

// ---- one story's timeline, the story's own or a linked version's, laid into the composition at `id`
type Out = { html: string[]; script: string[] };
type Ctx = { links: Links; compositions: Record<string, string>; assets: Record<string, LiveAsset>; size: [number, number]; path: string[]; code: Set<string> };
const BUS = (track: string, id: string) => `${id}-g-${track.replace(/[^\w-]/g, '_')}`;

function voiceSpans(body: StoryBody) {
	const spans: [number, number][] = [];
	for (const v of clipsOf(body, 'voice').filter((c) => typeof c.audio === 'string')) {
		const last = spans[spans.length - 1];
		if (last && v.at <= last[1] + 0.5) last[1] = Math.max(last[1], v.at + v.duration);
		else spans.push([v.at, v.at + v.duration]);
	}
	return spans;
}
/** a clip's gain over its length, relative to its own level: its keys ([s into the clip, dB]) and, on a ducking track, a
 *  dip of about 6 dB under the voice (in 0.15 s, out over 0.9 s), as one volume lane (linear, HyperFrames' unit) */
function lane(c: Clip, duck: [number, number][] | null) {
	const keys = (Array.isArray(c.keys) ? (c.keys as [number, number][]) : []).filter((k) => Array.isArray(k) && Number.isFinite(k[0]) && Number.isFinite(k[1]));
	const dips = (duck ?? []).map(([a, b]) => [a - c.at, b - c.at]).filter(([a, b]) => b > 0 && a < c.duration);
	if (!keys.length && !dips.length) return null;
	const keyDb = (t: number) => {
		if (!keys.length) return 0;
		if (t <= keys[0][0]) return keys[0][1];
		for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return keys[i][0] > keys[i - 1][0] ? keys[i - 1][1] + ((keys[i][1] - keys[i - 1][1]) * (t - keys[i - 1][0])) / (keys[i][0] - keys[i - 1][0]) : keys[i][1];
		return keys[keys.length - 1][1];
	};
	const dip = (t: number) => dips.reduce((g, [a, b]) => Math.min(g, t < a - 0.15 || t > b + 0.9 ? 1 : t < a ? 1 - (0.5 * (t - a + 0.15)) / 0.15 : t <= b ? 0.5 : 0.5 + (0.5 * (t - b)) / 0.9), 1);
	const ts = [...new Set([0, c.duration, ...keys.map((k) => k[0]), ...dips.flatMap(([a, b]) => [a - 0.15, a, b, b + 0.9])].filter((t) => t >= 0 && t <= c.duration))].sort((a, b) => a - b);
	return { version: 1, lanes: [{ target: 'volume', points: ts.map((t) => ({ t: Number(n(t)), v: Number(n(db(keyDb(t)) * dip(t))) })) }] };
}
const EQ: Record<string, string[]> = { peaking: ['frequency', 'gain', 'q'], lowshelf: ['frequency', 'gain'], highshelf: ['frequency', 'gain'], highpass: ['frequency', 'q'], lowpass: ['frequency', 'q'] };
function chain(c: Clip) {
	const bands = (Array.isArray(c.eq) ? c.eq : []) as { type: string; f: number; gain?: number; q?: number }[];
	const nodes = bands.filter((b) => b && EQ[b.type]).map((b, i) => {
		const v: Record<string, number | string> = { frequency: num(b.f, 1000), gain: num(b.gain), q: num(b.q, 0.707) };
		return { type: b.type, id: `n${i + 1}`, params: { ...Object.fromEntries(EQ[b.type].map((k) => [k, v[k]])), ...(b.type.endsWith('pass') ? { poles: '2' } : {}) } };
	});
	return nodes.length ? { version: 1, nodes } : null;
}
const attr = (name: string, v: unknown) => (v == null ? '' : ` ${name}='${esc(typeof v === 'string' ? v : JSON.stringify(v))}'`);

/** a shot's live asset as the composition draws it, or null where it has none or play gave nothing for its version (it
 *  then shows its still, as before): its engine, recipe and pieces by hash, its builds' values and their moments */
function liveOf(s: Shot, ctx: Ctx) {
	const l = s.live as Live | undefined;
	if (!l || typeof l !== 'object' || !Array.isArray(l.camera) || !l.camera.length) return null;
	const a = ctx.assets[l.version];
	if (!a || a.asset !== l.asset) return null;
	const v = l.variant ? a.variants?.[l.variant] : a;
	const engine = engineAt('box', a.engine) as { v: number; blake3: string } | undefined;
	if (!v || !engine) return null;
	const camera = l.camera.map((c) => ({ at: c.at, eye: c.eye, target: c.target, fov: c.fov, ...(c.ease ? { ease: c.ease } : {}) }));
	return { asset: l.asset, version: l.version, engine: { v: engine.v, hash: engine.blake3 }, recipe: v.recipe, pieces: [...(v.pieces ?? [])], builds: buildsOf(l), times: stepTimes(l), camera };
}

function lay(body: StoryBody, id: string, ctx: Ctx, out: Out, sound: { db: number; mute: boolean }) {
	const [w, h] = ctx.size, D = num(body.duration);
	const shots = clipsOf<Shot>(body, 'shots');
	let track = 0;
	// shots: each on its own track, a later one in front; held to the next shot (the last to the end), and under the next
	// while it dissolves in over it
	const fades = shots.map((s, i) => {
		const prev = shots[i - 1];
		return dissolve(prev && Math.abs(prev.at + prev.duration - s.at) < 0.05 ? prev : null, s);
	});
	const steps: string[] = [];
	shots.forEach((s, i) => {
		const next = shots[i + 1], sid = `${id}-s${i}`;
		const end = Math.max(s.at + s.duration, next ? next.at + fades[i + 1] : D);
		const t = track++, z = i + 1, dur = end - s.at;
		const comp = typeof s.composition === 'string' ? ctx.compositions[s.composition] : undefined;
		const time = `data-start="${n(s.at)}" data-duration="${n(dur)}" data-track-index="${t}" style="z-index:${z}"`;
		const live = liveOf(s, ctx);
		if (live) {
			// the asset drawn: its poster (the shot's still) until it is built, then its canvas
			const [lw, lh] = ctx.size;
			for (const h of [live.engine.hash, ...live.pieces, live.recipe]) ctx.code.add(h);
			out.html.push(`<div id="${sid}" class="clip shot live" ${time} data-asset="${esc(live.asset)}" data-version="${esc(live.version)}">${s.frame ? `<img class="poster" src="${fileUrl(s.frame)}" alt="">` : ''}<canvas width="${lw}" height="${lh}"></canvas></div>`);
			out.script.push(`playLive.shot(tl, ${JSON.stringify(sid)}, ${JSON.stringify({ engine: live.engine, recipe: live.recipe, pieces: live.pieces, builds: live.builds, times: live.times, camera: live.camera, size: ctx.size, at: s.at, duration: dur })});`);
		} else if (comp) {
			const c = inline(comp, sid, s.at, dur, z, t, ctx.size);
			out.html.push(c.html), out.script.push(c.script);
		} else if (typeof s.video === 'string' && s.video) out.html.push(`<video id="${sid}" class="clip shot" ${time} data-media-start="${n(num(s.video_in))}" muted playsinline src="${fileUrl(s.video)}"></video>`);
		else if (s.frame) out.html.push(`<img id="${sid}" class="clip shot" ${time} src="${fileUrl(s.frame)}" alt="">`);
		else out.html.push(`<div id="${sid}" class="clip shot empty" ${time}><span>Shot ${i + 1}: no frame yet</span></div>`);
		const own = codes(s.transition), before = i > 0 && !fades[i] && Math.abs(shots[i - 1].at + shots[i - 1].duration - s.at) < 0.05 ? codes(shots[i - 1].transition).dip : 0;
		const fin = Math.max(own.fromBlack, before), fout = Math.max(own.toBlack, own.dip);
		steps.push(`[${JSON.stringify(sid)}, ${n(s.at)}, ${n(s.at + s.duration)}, ${n(fin)}, ${n(fout)}, ${n(fades[i])}]`);
	});
	// the black a shot fades from or to, over every shot
	const veil = `${id}-black`;
	out.html.push(`<div id="${veil}" class="clip veil" data-start="0" data-duration="${n(D)}" data-track-index="${track++}" style="z-index:${shots.length + 1}"></div>`);
	out.script.push(`shots(tl, ${JSON.stringify(veil)}, [${steps.join(', ')}]);`);
	// links: each linked version a sub-composition in its place, in front of the story's own shots
	for (const t of body.tracks.filter((x) => x.kind === LINK)) {
		for (const c of t.clips) {
			const l = linkedOf(c, ctx.links);
			if (!l?.body || ctx.path.length > MOST_LINK_DEPTH || ctx.path.includes(l.id)) continue;
			const lid = `${id}-l-${String(t.id).replace(/[^\w-]/g, '_')}-${String(c.id).replace(/[^\w-]/g, '_')}`, dur = Math.min(num(c.duration), num(l.duration, num(c.duration)));
			const inner: Out = { html: [], script: [] };
			lay(l.body, lid, { ...ctx, path: [...ctx.path, l.id] }, inner, { db: sound.db + num(t.gain) + num(c.gain), mute: sound.mute || !!t.mute });
			out.html.push(`<div id="${lid}" class="clip link" data-composition-id="${lid}" data-start="${n(c.at)}" data-duration="${n(dur)}" data-track-index="${track++}" data-width="${w}" data-height="${h}" data-story="${esc(l.id)}" data-version="${esc(l.version)}" style="z-index:${shots.length + 2}">\n${inner.html.join('\n')}\n</div>`);
			out.script.push(`{\nconst tl = gsap.timeline({ paused: true });\n${inner.script.join('\n')}\ntl.set({}, {}, ${n(dur)});\nwindow.__timelines[${JSON.stringify(lid)}] = tl;\n}`);
		}
	}
	// the voice's subtitles: one caption clip per cue, in front of everything
	const cueTrack = track++;
	const onScreen = (t: number) => shots.some((s) => s.frame && s.at <= t && t < s.at + s.duration);
	clipsOf<Voice>(body, 'voice').forEach((v, k) => {
		const set = setCuesOf(v), W = cuesOf(v.line ?? '').reduce((a, c) => a + c.words, 0), speak = v.duration * 0.92;
		const cues = set.length
			? set.map((c, i) => ({ text: c.text, em: c.em, at: v.at + c.at, end: v.at + (set[i + 1]?.at ?? v.duration) }))
			: cuesOf(v.line ?? '').map((c, i, all) => ({ text: c.text, em: false, at: v.at + (i ? (c.from / W) * speak : 0), end: v.at + (i === all.length - 1 ? v.duration : ((c.from + c.words) / W) * speak) }));
		cues.forEach((c, i) => {
			if (c.end - c.at < 1e-6 || (v.who === 'ON SCREEN' && onScreen(c.at))) return;
			out.html.push(`<div id="${id}-v${k}-c${i}" class="clip cue" data-start="${n(c.at)}" data-duration="${n(Math.min(c.end, v.at + v.duration) - c.at)}" data-track-index="${cueTrack}" style="z-index:${shots.length + 3}"><span class="who">${esc(v.who)}</span><span class="line${c.em ? ' em' : ''}">${esc(c.text)}</span></div>`);
		});
	});
	// sound: every recording on its track's bus
	if (sound.mute) return;
	const spans = voiceSpans(body);
	for (const t of body.tracks) {
		if (t.kind === LINK || t.mute) continue;
		const clips = t.clips.filter((c) => typeof c.audio === 'string' && c.audio);
		if (!clips.length) continue;
		const bus = BUS(t.id, id), at = track++, voice = t.kind === 'voice';
		out.html.push(`<hf-audio-group id="${bus}" data-label="${esc(t.name ?? t.id)}" data-volume="${n(db(num(t.gain)))}"></hf-audio-group>`);
		for (const c of clips) {
			const fadeIn = num(c.fade_in, voice ? 0.03 : 0.06), fadeOut = Math.min(num(c.fade_out, voice ? 0.08 : 0.3), c.duration / 2);
			out.html.push(`<audio id="${id}-a-${String(t.id).replace(/[^\w-]/g, '_')}-${String(c.id).replace(/[^\w-]/g, '_')}" class="clip" data-start="${n(c.at)}" data-duration="${n(c.duration)}" data-track-index="${at}" data-media-start="${n(num(c.audio_in))}" data-volume="${n(db(num(c.gain) + sound.db))}" data-fade-in="${n(fadeIn)}" data-fade-out="${n(fadeOut)}" data-audio-group="${bus}"${attr('data-fx-chain', chain(c))}${attr('data-automation', lane(c, t.duck === true ? spans : null))} src="${fileUrl(c.audio as string)}"></audio>`);
		}
	}
}

const STYLE = (w: number, h: number) => `
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${w}px; height: ${h}px; overflow: hidden; background: #000; }
#story, .link { position: absolute; inset: 0; width: ${w}px; height: ${h}px; overflow: hidden; }
.shot, .layer { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.shot.empty { display: grid; place-items: center; color: #cfc8b8; background: #24211b; font: ${n(w * 0.03)}px sans-serif; }
.veil { position: absolute; inset: 0; background: #000; opacity: 0; pointer-events: none; }
.live, .live canvas, .live .poster { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.live canvas { visibility: hidden; }
.cue { position: absolute; left: 3%; right: 3%; bottom: 9%; display: grid; gap: ${n(w * 0.008)}px; justify-items: center; text-align: center; font-family: ${FONT}, sans-serif; }
.cue .who { font-size: ${n(w * 0.028)}px; font-weight: 700; letter-spacing: 0.08em; color: #ffe6a8; text-shadow: 0 1px 3px rgb(0 0 0 / 0.85); }
.cue .line { font-size: ${n(w * 0.056)}px; font-weight: 700; line-height: 1.2; color: #fff; text-wrap: balance; background: rgb(10 10 8 / 0.5); padding: 0.18em 0.45em; border-radius: 0.3em; text-shadow: 0 1px 4px rgb(0 0 0 / 0.7); }
.cue .line.em { font-size: ${n(w * 0.14)}px; font-weight: 800; letter-spacing: 0.02em; line-height: 1; color: #ffd76a; background: none; padding: 0; text-shadow: 0 2px 10px rgb(0 0 0 / 0.75), 0 0 2px rgb(0 0 0 / 0.9); }`;

/** each shot's transitions on a timeline: its dissolve in, and the black it comes up from or goes down to (smoothstep) */
const SHOTS = `const smooth = (x) => x * x * (3 - 2 * x);
function shots(tl, veil, list) {
	for (const [id, at, end, fin, fout, fade] of list) {
		tl.set('#' + veil, { opacity: fin ? 1 : 0 }, at);
		if (fin) tl.to('#' + veil, { opacity: 0, duration: fin, ease: smooth }, at);
		if (fout) tl.fromTo('#' + veil, { opacity: 0 }, { opacity: 1, duration: fout, ease: smooth, immediateRender: false }, end - fout);
		if (fade) tl.fromTo('#' + id, { opacity: 0 }, { opacity: 1, duration: fade, ease: smooth, immediateRender: false }, at);
	}
}`;

/**
 * A story's version as one HyperFrames composition: HTML, the same bytes for the same version. `links` holds every
 * version it links (by the version's id, as play reads it), `compositions` every composition its shots name (readable
 * HTML by its hash). What it can't read (a link not in `links`, a composition not given) it leaves out.
 */
export function compose(story: StoryBody & { id?: string; title?: string; number?: number | null; version?: string }, links: Links = {}, compositions: Record<string, string> = {}, assets: Record<string, LiveAsset> = {}): string {
	const size = sizeOf(story.format), [w, h] = size, D = num(story.duration);
	const out: Out = { html: [], script: [] };
	const code = new Set<string>();
	lay(story, 'pl', { links: links ?? {}, compositions, assets: assets ?? {}, size, path: [story.id ?? ''], code }, out, { db: 0, mute: false });
	const live = code.size ? `\n<script src="${fileUrl(VENDOR.live.hash)}" data-vendor="${VENDOR.live.name}"></script>\n${[...code].map((h) => `<script type="text/x-play-code" data-play-code="${h}"></script>`).join('\n')}` : '';
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="viewport" content="width=${w}, height=${h}">
<title>${esc(story.title ?? 'A story')}</title>
<!-- play's story ${esc(story.id ?? '')}${story.number ? ` v${story.number}` : ''}${story.version ? ` (${esc(story.version)})` : ''}, compiled from story/1 by play's compose -->
<script src="${fileUrl(VENDOR.runtime.hash)}" data-vendor="${VENDOR.runtime.name}"></script>
<script src="${fileUrl(VENDOR.gsap.hash)}" data-vendor="${VENDOR.gsap.name}"></script>${live}
<style data-play-font="true">@font-face { font-family: ${FONT}; src: url(${fileUrl(VENDOR.font.hash)}) format("woff2"); font-weight: 100 900; font-style: normal; font-display: block; }</style>
<style data-hyperframes-text-rendering="true">html,body,*{text-rendering:geometricPrecision}</style>
<style>${STYLE(w, h)}
</style>
</head>
<body>
<div id="story" data-composition-id="story" data-start="0" data-duration="${n(D)}" data-width="${w}" data-height="${h}">
${out.html.join('\n')}
</div>
<script>
${SHOTS}
const tl = gsap.timeline({ paused: true });
${out.script.join('\n')}
tl.set({}, {}, ${n(D)});
window.__timelines["story"] = tl;
</script>
</body>
</html>
`;
}

// ---- sealed: the composition in play's frame, which loads nothing. Its files come from the page (fetched with the page's
// session, code checked against its hash) as blobs the frame makes its own URLs of; its scripts wait for them

/** the frame's side: asks the page for every file it names, then lays them in and runs the scripts in order; a tap or
 *  key in it is the page's (and a tap plays or pauses there and then, inside the gesture, as a phone's sound needs) */
const BRIDGE = `(() => {
	const urls = {};
	const post = (m) => parent.postMessage(Object.assign({ play: 1 }, m), '*');
	const all = (q) => [...new Set([...document.querySelectorAll(q)].map((e) => e.dataset.playFile))];
	addEventListener('DOMContentLoaded', () => post({ op: 'need', code: [...all('script[data-play-file]'), ...[...new Set([...document.querySelectorAll('script[data-play-code]')].map((e) => e.dataset.playCode))]], media: all('img[data-play-file], video[data-play-file], audio[data-play-file], style[data-play-file]') }));
	addEventListener('message', (e) => {
		const m = e.data;
		if (e.source !== parent || !m || m.play !== 1 || m.op !== 'files') return;
		for (const el of document.querySelectorAll('script[data-play-code]')) {
			const f = m.files[el.dataset.playCode];
			if (typeof f === 'string') (window.__playCode ??= {})[el.dataset.playCode] = f;
		}
		for (const el of document.querySelectorAll('img[data-play-file], video[data-play-file], audio[data-play-file]')) {
			const f = m.files[el.dataset.playFile];
			if (f instanceof Blob) el.src = urls[el.dataset.playFile] ??= URL.createObjectURL(f);
		}
		for (const st of document.querySelectorAll('style[data-play-file]')) {
			const f = m.files[st.dataset.playFile];
			if (f instanceof Blob) st.textContent = st.textContent.split('/api/files/' + st.dataset.playFile).join(urls[st.dataset.playFile] ??= URL.createObjectURL(f));
			st.removeAttribute('media');
		}
		for (const old of document.querySelectorAll('script[type="text/x-play-held"]')) {
			const s = document.createElement('script');
			for (const a of old.attributes) if (a.name !== 'type' && a.name !== 'data-play-file') s.setAttribute(a.name, a.value);
			s.textContent = old.dataset.playFile ? String(m.files[old.dataset.playFile] ?? '') : old.textContent;
			old.replaceWith(s);
		}
	});
	addEventListener('click', () => {
		const p = window.__player;
		try { if (p) p.isPlaying && p.isPlaying() ? p.pause() : p.play(); } catch {}
		post({ op: 'tap' });
	});
	addEventListener('keydown', (e) => post({ op: 'key', key: e.key, meta: e.metaKey || e.ctrlKey || e.altKey }));
})();`;

/** the page's side: what the frame asks for, each file fetched by `get` (play's files, with the page's session), a
 *  script's bytes held to the hash that names it, handed in: code as text, media as blobs */
export async function feed(frame: Window, need: { code?: string[]; media?: string[] }, get: (hash: string) => Promise<Blob>) {
	const files: Record<string, Blob | string> = {};
	await Promise.all([
		...(need.code ?? []).map(async (h) => {
			const bytes = new Uint8Array(await (await get(h)).arrayBuffer());
			if (hashBytes(bytes) !== h) throw new Error(`refused: a script that does not hash to ${h.slice(0, 12)}…`);
			files[h] = new TextDecoder().decode(bytes);
		}),
		...(need.media ?? []).map(async (h) => void (files[h] = await get(h)))
	]);
	frame.postMessage({ play: 1, op: 'files', files }, '*');
}

/** a composition as the sealed frame takes it: its files and scripts held for the bridge */
export function seal(html: string): string {
	return html
		.replace(/<script\b([^>]*?)\ssrc="\/api\/files\/([0-9a-f]{64})"([^>]*)><\/script>/g, '<script type="text/x-play-held" data-play-file="$2"$1$3></script>')
		.replace(/<script>/g, '<script type="text/x-play-held">')
		.replace(/\ssrc="\/api\/files\/([0-9a-f]{64})"/g, ' data-play-file="$1"')
		.replace(/<style data-play-font="true">([^<]*?\/api\/files\/([0-9a-f]{64}))/g, '<style data-play-file="$2" media="not all">$1')
		.replace(/(<meta http-equiv="Content-Security-Policy"[^>]*>)/, `$1\n<script>${BRIDGE}</script>`);
}
