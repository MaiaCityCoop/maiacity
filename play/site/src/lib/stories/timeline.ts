// A story's timeline (play/SPEC.md §12, format story/1) and the one function that shows it: `renderAt(story, t)` gives
// exactly what is seen and heard at second t (the shot, the one fading out under it and how far, the subtitle and how
// much of it is spoken, the notes), from the timeline alone. The player only moves t; nothing runs on a clock of its
// own (no CSS transition), so the same t is the same picture every time: what a frame-by-frame export into a video
// (WebCodecs in the browser, or a page a renderer seeks through) needs.
// A story may link others (a track of kind `story`, each clip naming a story by its UUID and the version of it it plays:
// the trailer in every film);
// `flatten(story, links)` lays each linked story's tracks into its place, and everything below runs on that one timeline.

/** a clip laid in from a linked story: the story it came from (its UUID), its title and the version number it plays */
export type LinkTag = { story: string; title: string; number: number | null; depth: number };
export type Clip = { id: string; at: number; duration: number; link?: LinkTag; [field: string]: unknown };
export type Track = { id: string; kind: string; clips: Clip[]; gain?: number; mute?: boolean; duck?: boolean; link?: LinkTag; name?: string };
export type StoryBody = { schema: 'story/1'; format: string; fps: number; duration: number; tracks: Track[] };
/** a linked version as play reads it (play/api/src/stories.ts `linksOf`): its story's UUID, title, number and id, its
 *  length and timeline, and its story's newest accepted number (only shown: a link plays its own version) */
export type Linked = { id: string; title: string; number: number; version: string; duration: number; newest?: number | null; body: StoryBody };
/** every version a timeline links, to any depth, by the version's id */
export type Links = Record<string, Linked>;
/** a story whose newest version links this one, and the number of this one's version it plays (GET /api/stories/:id) */
export type LinkedBy = { id: string; title: string; number: number; version: string; plays: number | null };
export type Story = StoryBody & { id: string; title: string; number?: number | null; version?: string; note?: string; links?: Links; linked_by?: LinkedBy[]; versions?: { number: number; id: string; note: string; created: string; author: string | null }[] };

export type Shot = Clip & { frame: string | null; transition: string };
/** a subtitle the clip sets itself: `at` seconds into the clip it comes on, until the next; `em` sets it alone, large */
export type SetCue = { at: number; text: string; em?: boolean };
export type Voice = Clip & { who: string; line: string; cues?: SetCue[] };
export type Notes = Clip & { section: string; camera: string; retention: string; mood: string; pace?: string; sound?: string; emotion?: string };

/** what a clip of a sound track says it is, sounding or still to be made: its note (a planned cue, an effect, a bed) or its name */
export const cueOf = (c: Clip) => String((c as { note?: unknown }).note ?? (c as { name?: unknown }).name ?? '');

export type Moment = {
	t: number;
	/** the shot on screen, its index among the shots, and the shot fading out under it while `mix` < 1 */
	shot: Shot | null;
	index: number;
	prev: Shot | null;
	/** how far the shot has faded in over the one before it, 0…1 (1: it alone) */
	mix: number;
	/** how bright the picture is, 0 black … 1 full: a shot's transition coded `from black`, `to black` or `dip to black` */
	light: number;
	/** the narration at t: its clip, and how many of its words are spoken by now */
	voice: Voice | null;
	spoken: number;
	/** the one line of it on screen now: the cue being spoken */
	cue: Cue | null;
	notes: Notes | null;
};

/** one subtitle line: its text and which of the narration's words it holds (from, and how many); `em` when the clip
 *  set it to stand alone, emphasized (a number the film wants seen: "100x") */
export type Cue = { text: string; from: number; words: number; em?: boolean };

/** about how many characters one subtitle line holds at the film's size (the player's .line: 5.6% of the frame's width) */
export const CUE_CHARS = 26;

/** words a line should not end on (it would leave the reader hanging), and words a line may well begin with */
const GLUE = new Set('a an the of to in on at for with by from and or but nor so that how than as its his her their our your my one two ten is are was be every each this these those some any no all few many more most such own little very'.split(' '));
const OPENS = new Set('and but or so that which who how to of in on at for with from than as when while because until'.split(' '));
const bare = (w: string | undefined) => (w ?? '').toLowerCase().replace(/[^a-z']/g, '');

/** a run of words cut into `n` lines of about even length, breaking where a reader would pause: never after a small
 *  word, gladly before a new phrase (the cheapest cut points, found by trying them all) */
function evenly(words: string[], max: number): string[][] {
	const len = words.join(' ').length;
	const n = Math.ceil(len / max);
	if (n <= 1 || words.length < 2) return [words];
	const target = len / n;
	const lineLen = (i: number, j: number) => words.slice(i, j).join(' ').length;
	const cost = (i: number, j: number) => {
		const l = lineLen(i, j);
		let c = (l - target) ** 2 + (l > max * 1.15 ? 1e4 : 0);
		if (j < words.length) {
			if (GLUE.has(bare(words[j - 1]))) c += 60;
			if (OPENS.has(bare(words[j]))) c -= 20;
			if (/[,;:–—]$/.test(words[j - 1])) c -= 30;
		}
		return c;
	};
	// best[k][j]: the cheapest way to set the first j words as k lines, and where its last line began
	const best: { c: number; from: number }[][] = Array.from({ length: n + 1 }, () => Array(words.length + 1).fill(null).map(() => ({ c: Infinity, from: -1 })));
	best[0][0] = { c: 0, from: -1 };
	for (let k = 1; k <= n; k++)
		for (let j = 1; j <= words.length; j++)
			for (let i = k - 1; i < j; i++) {
				const c = best[k - 1][i].c + cost(i, j);
				if (c < best[k][j].c) best[k][j] = { c, from: i };
			}
	const out: string[][] = [];
	for (let k = n, j = words.length; k > 0; k--) {
		const i = best[k][j].from;
		out.unshift(words.slice(i, j));
		j = i;
	}
	return out;
}

const cueCache = new Map<string, Cue[]>();

/** the subtitles a voice clip sets itself (Samuel 2026-11-04: "100x" on its own, emphasized, while "a hundred times" is
 *  said), in time order; none when it sets none, and then its line is cut evenly (cuesOf) */
export function setCuesOf(v: Voice | null | undefined): (SetCue & Cue)[] {
	const given = Array.isArray(v?.cues) ? v!.cues : [];
	const cues = given
		.filter((c) => c && typeof c.text === 'string' && c.text.trim() && Number.isFinite(c.at))
		.map((c) => ({ at: Math.max(0, c.at), text: c.text.trim(), em: c.em === true }))
		.sort((a, b) => a.at - b.at);
	return cues.map((c, i) => ({ ...c, from: i, words: 1 }));
}

/** a narration line cut into subtitles of one line each, as a film shows them (Samuel 2026-11-04: large, one line at a
 *  time, never the whole paragraph): at its sentences, then its commas, then evenly by words */
export function cuesOf(line: string, max = CUE_CHARS): Cue[] {
	const key = max + '|' + line;
	const known = cueCache.get(key);
	if (known) return known;
	const lines: string[] = [];
	// a line may run a little over rather than be cut
	const hard = Math.round(max * 1.15);
	for (const sentence of line.trim().split(/(?<=[.!?:;])\s+/).filter(Boolean)) {
		if (sentence.length <= hard) {
			lines.push(sentence);
			continue;
		}
		// its clauses, kept together while they fit one line
		let acc = '';
		const pieces: string[] = [];
		for (const clause of sentence.split(/(?<=[,–—])\s+/)) {
			if (acc && (acc + ' ' + clause).length > max) {
				pieces.push(acc);
				acc = clause;
			} else acc = acc ? acc + ' ' + clause : clause;
		}
		if (acc) pieces.push(acc);
		for (const p of pieces) {
			if (p.length <= hard) lines.push(p);
			else for (const ws of evenly(p.split(/\s+/).filter(Boolean), max)) lines.push(ws.join(' '));
		}
	}
	let from = 0;
	const cues = lines.map((text) => {
		const words = text.split(/\s+/).filter(Boolean).length;
		const c = { text, from, words };
		from += words;
		return c;
	});
	if (cueCache.size > 500) cueCache.clear();
	cueCache.set(key, cues);
	return cues;
}

const lanes = new WeakMap<StoryBody, Map<string, Clip[]>>();
/** every clip of a kind, of every track of that kind (the story's own first, then those its links lay in), in time
 *  order: one lane, as the picture shows it */
export const clipsOf = <C extends Clip = Clip>(s: StoryBody | null | undefined, kind: string): C[] => {
	if (!s?.tracks) return [];
	let byKind = lanes.get(s);
	if (!byKind) lanes.set(s, (byKind = new Map()));
	let clips = byKind.get(kind);
	if (!clips) {
		const of = s.tracks.filter((t) => t.kind === kind);
		clips = of.length === 1 ? of[0].clips : of.flatMap((t) => t.clips).sort((a, b) => a.at - b.at); // a stable sort: on a tie, the story's own first
		byKind.set(kind, clips);
	}
	return clips as C[];
};

/**
 * The clip of a lane on screen at t. Of the clips that cover t, the one that started last: a linked story's clip may
 * overlap the story's own (Samuel 2026-11-04), and the later one is the one just begun (the trailer's notes inside the
 * film's long one; the film's next line over the trailer's last words). Two that start together: the story's own. None
 * covering t, the last that started holds the index (the first, before any starts).
 */
function at<C extends Clip>(clips: C[], t: number): { clip: C | null; index: number } {
	let found = -1, last = -1;
	for (let i = 0; i < clips.length; i++) {
		const c = clips[i];
		if (c.at > t + 1e-9) break;
		last = i;
		if (t < c.at + c.duration + 1e-9 && (found < 0 || c.at > clips[found].at + 1e-9)) found = i;
	}
	return found >= 0 ? { clip: clips[found], index: found } : { clip: null, index: last };
}

/** the clip of a kind on screen at t (renderAt's rule), or null */
export const clipAt = <C extends Clip = Clip>(story: StoryBody | null | undefined, kind: string, t: number): C | null => at(clipsOf<C>(story, kind), t).clip;

/** what a lane shows over time: spans of the timeline, each the clip on screen through it (a clip broken where a later
 *  one lies over it, and whole again after) */
export function spansOf<C extends Clip = Clip>(story: StoryBody | null | undefined, kind: string): { clip: C; at: number; end: number }[] {
	const clips = clipsOf<C>(story, kind);
	const edges = [...new Set(clips.flatMap((c) => [c.at, c.at + c.duration]))].sort((a, b) => a - b);
	const out: { clip: C; at: number; end: number }[] = [];
	for (let i = 0; i + 1 < edges.length; i++) {
		const a = edges[i], b = edges[i + 1];
		if (b - a < 1e-6) continue;
		const c = at(clips, (a + b) / 2).clip;
		if (!c) continue;
		const prev = out[out.length - 1];
		if (prev && prev.clip === c && Math.abs(prev.end - a) < 1e-6) prev.end = b;
		else out.push({ clip: c, at: a, end: b });
	}
	return out;
}

const ease = (x: number) => x * x * (3 - 2 * x);

/** a shot's transition read as code (Samuel 2026-11-04: a fade is a transition like any other, written in the shot's
 *  `transition` and set by a proposal like any other field). Codes are separated by commas, `;` or `·`, each from its
 *  start, seconds where it gives them:
 *  - `cut` (and a hard, smash, match or jump cut, "cut to …"): into the next shot at once;
 *  - `dissolve` / `cross-fade` [s]: the next shot fades in over this one (0.5 s unless it says);
 *  - `from black` / `fade in` [s]: this shot comes up from black;
 *  - `to black` / `fade out` [s]: this shot goes down to black;
 *  - `dip to black` [s]: this shot goes down to black and the next comes up out of it.
 *  Anything else is prose about the transition, and a shot whose transition codes no cut goes into the next with a short
 *  dissolve, as before. */
export type Transition = { cut: boolean; dissolve: number | null; fromBlack: number; toBlack: number; dip: number };

const secondsIn = (part: string, otherwise: number) => {
	const n = Number(part.match(/(\d+(?:\.\d+)?)/)?.[1]);
	return Number.isFinite(n) ? Math.min(10, Math.max(0, n)) : otherwise;
};

export function transitionOf(text: string | null | undefined): Transition {
	const out: Transition = { cut: false, dissolve: null, fromBlack: 0, toBlack: 0, dip: 0 };
	for (const raw of String(text ?? '').split(/[,;·]/)) {
		const p = raw.trim().toLowerCase();
		if (!p) continue;
		if (/^dip\b/.test(p)) out.dip = secondsIn(p, 0.5);
		else if (/^(fade )?(from black|in)\b/.test(p)) out.fromBlack = secondsIn(p, 0.5);
		else if (/^(fade )?(to black|out)\b/.test(p)) out.toBlack = secondsIn(p, 0.5);
		else if (/^(dissolve|cross-?fade)\b/.test(p)) out.dissolve = secondsIn(p, 0.5);
		else if (/^cut\b/.test(p) || /\b(hard|smash|match|jump)\s*cut\b|\bcut to\b/.test(p)) out.cut = true;
	}
	return out;
}

/** how long a shot fades in over the one before it, from the code of the one before: a cut cuts, a fade or dip to
 *  black goes through black instead, a dissolve takes its seconds (at most half of either shot) */
export function fadeOf(prev: Shot | null, shot: Shot): number {
	if (!prev) return 0;
	const code = transitionOf(prev.transition);
	if (code.cut || code.toBlack > 0 || code.dip > 0) return 0;
	if (code.dissolve !== null) return Math.min(code.dissolve, prev.duration / 2, shot.duration / 2);
	return Math.min(0.5, 0.3 * Math.min(prev.duration, shot.duration));
}

/** how bright a shot is at second t, 0 black … 1 full, from the transition codes: its own `from black` and `to black`,
 *  its `dip to black` at its end, and the shot before it's `dip to black` at its start */
export function lightOf(shot: Shot, t: number, prev: Shot | null = null): number {
	const own = transitionOf(shot.transition);
	const fin = Math.max(own.fromBlack, prev ? transitionOf(prev.transition).dip : 0), fout = Math.max(own.toBlack, own.dip);
	let light = 1;
	if (fin > 0) light = Math.min(light, ease(Math.max(0, Math.min(1, (t - shot.at) / fin))));
	if (fout > 0) light = Math.min(light, ease(Math.max(0, Math.min(1, (shot.at + shot.duration - t) / fout))));
	return light;
}

/** exactly what is shown at second t */
export function renderAt(story: StoryBody | null, t: number): Moment {
	const shots = clipsOf<Shot>(story, 'shots');
	const time = Math.max(0, Math.min(t, story?.duration ?? 0));
	const s = at(shots, time);
	const shot = s.clip ?? (s.index >= 0 ? shots[s.index] : null); // between shots, the last one holds
	const before = shot && s.index > 0 ? shots[s.index - 1] : null;
	const touching = before && shot && Math.abs(before.at + before.duration - shot.at) < 0.05 ? before : null;
	const fade = shot ? fadeOf(touching, shot) : 0;
	const mix = shot && fade > 0 ? ease(Math.max(0, Math.min(1, (time - shot.at) / fade))) : 1;
	const light = shot ? lightOf(shot, time, touching) : 1;
	const v = at(clipsOf<Voice>(story, 'voice'), time);
	const words = v.clip ? (v.clip.line ?? '').split(/\s+/).filter(Boolean).length : 0;
	// the words are spoken evenly over the first 92% of the clip, so the line is whole before the next begins
	const spoken = v.clip ? Math.min(words, Math.ceil(((time - v.clip.at) / Math.max(0.01, v.clip.duration * 0.92)) * words)) : 0;
	// the line being spoken: the subtitle the clip set for this second, if it sets its own (each from its own second);
	// else its line cut evenly, the cue holding the last word said (the first, before any is)
	const set = setCuesOf(v.clip);
	let cue: Cue | null;
	if (set.length) cue = set.findLast((c) => c.at <= time - v.clip!.at + 1e-9) ?? set[0];
	else {
		const cues = v.clip ? cuesOf(v.clip.line ?? '') : [];
		cue = cues.find((c) => Math.max(0, spoken - 1) < c.from + c.words) ?? cues[cues.length - 1] ?? null;
	}
	return { t: time, shot, index: s.index, prev: mix < 1 ? touching : null, mix, light, voice: v.clip, spoken, cue, notes: at(clipsOf<Notes>(story, 'notes'), time).clip };
}

/** a mood's height: each ↑ one up, each ↓ one down (↕, END and the rest level) */
export const moodLevel = (m: string | undefined) => {
	const s = m ?? '';
	const up = (s.match(/↑/g) ?? []).length, down = (s.match(/↓/g) ?? []).length;
	return up && down ? 0 : up - down;
};

/** consecutive notes of one section, as spans of the timeline, each with the primary emotion it should leave (the first
 * its notes name); where a linked story's notes lie over the story's own, its sections stand for as long as they do */
export function sectionsOf(story: StoryBody | null): { section: string; at: number; end: number; emotion: string }[] {
	const out: { section: string; at: number; end: number; emotion: string }[] = [];
	for (const { clip: n, at, end } of spansOf<Notes>(story, 'notes')) {
		const last = out[out.length - 1];
		const section = n.section || '—';
		if (last && last.section === section) {
			last.end = end;
			if (!last.emotion && n.emotion) last.emotion = n.emotion;
		} else out.push({ section, at, end, emotion: n.emotion ?? '' });
	}
	return out;
}

/** the start of the shot before / after t (for seeking by shot) */
export function shotEdge(story: StoryBody | null, t: number, dir: 1 | -1): number {
	const shots = clipsOf<Shot>(story, 'shots');
	if (!shots.length) return t;
	if (dir > 0) return shots.find((c) => c.at > t + 0.01)?.at ?? story!.duration;
	const back = [...shots].reverse().find((c) => c.at < t - 0.3);
	return back?.at ?? 0;
}

// ---- linked stories: one timeline composed of others (Samuel 2026-11-04: the trailer its own story, in every film)

/** the kind of track whose clips link other stories in */
export const LINK = 'story';
/** how deep links are laid in (play's API refuses deeper ones) */
export const MOST_LINK_DEPTH = 4;
/** the version a link clip plays, as `links` holds it (by the version's id), if it is there and is the story's it names */
export const linkedOf = (c: { [field: string]: unknown }, links: Links | null | undefined): Linked | null => {
	const l = typeof c.version === 'string' ? links?.[c.version] : undefined;
	return l && l.id === c.story ? l : null;
};

/** a link clip as the player shows it: its place, the story it plays (null when it can't be read) and how long that is now */
export type Slot = {
	track: string;
	clip: string;
	at: number;
	duration: number;
	/** the story it plays (its UUID), its title and the number of the version it plays (null: it can't be read) */
	story: string;
	title: string | null;
	number: number | null;
	/** that story's newest accepted number: higher than `number`, a newer version is there (only shown, never played) */
	newest: number | null;
	depth: number;
};
export type Flat = StoryBody & { slots: Slot[] };

/**
 * The story with its links laid in, as one timeline: each link clip's version (from `links`, by its id) has its tracks
 * laid in from the clip's `at`, recursively, each of its clips tagged `link` (the story it came from) and its id made
 * unique against the story's own (`<link track>:<link clip>/<its id>`, ids of the story's own never holding a slash). A
 * link plays inside its clip, which play holds to its version's length (whatever ran past it would be cut there). A link
 * track's gain and mute, and its clip's gain, carry onto the tracks it lays in. The story's own tracks come first and stay
 * as they are, so renderAt and soundsOf run on this exactly as on a story without links.
 */
export function flatten(story: (StoryBody & { links?: Links | null }) | null | undefined, links: Links | null | undefined = story?.links): Flat {
	if (!story) return { schema: 'story/1', format: '9:16', fps: 30, duration: 0, tracks: [], slots: [] };
	const tracks: Track[] = [];
	const slots: Slot[] = [];
	const lay = (body: StoryBody, o: { offset: number; end: number; prefix: string; depth: number; path: string[]; tag: LinkTag | null; gain: number; mute: boolean }) => {
		for (const t of body.tracks ?? []) {
			if (!o.tag) {
				tracks.push(t);
				continue;
			}
			if (t.kind === LINK) continue; // a linked story's own links are laid in below, its link lanes are its own
			const clips: Clip[] = [];
			for (const c of t.clips) {
				const from = o.offset + c.at;
				if (from >= o.end - 1e-6) continue;
				const end = Math.min(from + c.duration, o.end);
				clips.push({ ...c, id: o.prefix + c.id, at: from, duration: end - from, link: o.tag });
			}
			const gain = (Number(t.gain ?? 0) || 0) + o.gain;
			tracks.push({ ...t, id: o.prefix + t.id, name: t.name ?? t.id, link: o.tag, clips, ...(gain ? { gain } : {}), ...(t.mute || o.mute ? { mute: true } : {}) });
		}
		for (const t of body.tracks ?? []) {
			if (t.kind !== LINK) continue;
			for (const c of t.clips) {
				const l = linkedOf(c, links);
				const from = o.offset + c.at;
				if (from >= o.end - 1e-6) continue;
				const end = Math.min(from + c.duration, o.end);
				slots.push({ track: o.prefix + t.id, clip: o.prefix + c.id, at: from, duration: end - from, story: l?.id ?? String(c.story ?? ''), title: l?.title ?? null, number: l?.number ?? null, newest: l?.newest ?? null, depth: o.depth });
				// a story that can't be read plays nothing; one already on the way down (a loop) or too deep is not laid in again
				if (!l || o.depth >= MOST_LINK_DEPTH || o.path.includes(l.id)) continue;
				lay(l.body, {
					offset: from,
					end,
					prefix: `${o.prefix}${t.id}:${c.id}/`,
					depth: o.depth + 1,
					path: [...o.path, l.id],
					tag: { story: l.id, title: l.title, number: l.number, depth: o.depth + 1 },
					gain: o.gain + (Number(t.gain ?? 0) || 0) + (Number(c.gain ?? 0) || 0),
					mute: o.mute || !!t.mute,
				});
			}
		}
	};
	lay(story, { offset: 0, end: Infinity, prefix: '', depth: 0, path: [(story as { id?: string }).id ?? ''], tag: null, gain: 0, mute: false });
	return { ...story, schema: 'story/1', tracks, slots };
}

export const clock = (s: number) => {
	const m = Math.floor(s / 60), r = s - m * 60;
	return `${m}:${r < 10 ? '0' : ''}${r.toFixed(1)}`;
};

// ---- sound: what the timeline plays, from the timeline alone (the player's Web Audio engine, ./sound.ts, and later
// an export's mix lay exactly these on their clocks)

export type EqBand = { type: BiquadFilterType; f: number; gain: number; q: number };
/** one recording laid on the timeline: from `at` for `duration` seconds, starting `from` seconds into the file */
export type Sound = {
	track: string;
	kind: string;
	clip: string;
	hash: string;
	at: number;
	duration: number;
	from: number;
	/** linear gain: the clip's and its track's dB together */
	vol: number;
	fadeIn: number;
	fadeOut: number;
	eq: EqBand[];
	keys: [number, number][];
	/** dips under the voice: only a track that asks for it (`duck: true`) */
	duck: boolean;
};

/**
 * No sound dips under the voice by itself (Samuel 2026-11-04: music that drops whenever someone speaks feels bad; a
 * clean, continuous flow): the mix is set by each clip's level and EQ. A track that wants the old studio's dip asks for
 * it with `duck: true`; then it goes this far down (about -6 dB) and this fast.
 */
export const DUCK = { level: 0.5, down: 0.15, up: 0.9 };
export const dbToGain = (db: number) => Math.pow(10, db / 20);

/** every sounding clip of the story, in time order (muted tracks left out) */
export function soundsOf(story: StoryBody | null | undefined): Sound[] {
	const out: Sound[] = [];
	for (const t of story?.tracks ?? []) {
		if ((t as any).mute) continue;
		const trackDb = Number((t as any).gain ?? 0) || 0;
		for (const c of t.clips) {
			if (typeof c.audio !== 'string' || !c.audio) continue;
			const voice = t.kind === 'voice';
			out.push({
				track: t.id,
				kind: t.kind,
				clip: c.id,
				hash: c.audio,
				at: c.at,
				duration: c.duration,
				from: Number(c.audio_in ?? 0) || 0,
				vol: dbToGain(trackDb + (Number(c.gain ?? 0) || 0)),
				fadeIn: Number(c.fade_in ?? (voice ? 0.03 : 0.06)),
				fadeOut: Math.min(Number(c.fade_out ?? (voice ? 0.08 : 0.3)), c.duration / 2),
				eq: Array.isArray(c.eq) ? (c.eq as EqBand[]) : [],
				keys: Array.isArray(c.keys) ? (c.keys as [number, number][]) : [],
				duck: (t as any).duck === true,
			});
		}
	}
	return out.sort((a, b) => a.at - b.at);
}

/** the spans the voice speaks over (where music ducks), merged */
export function voiceSpans(sounds: Sound[]): [number, number][] {
	const spans: [number, number][] = [];
	for (const s of sounds.filter((x) => x.kind === 'voice')) {
		const last = spans[spans.length - 1];
		if (last && s.at <= last[1] + 0.5) last[1] = Math.max(last[1], s.at + s.duration);
		else spans.push([s.at, s.at + s.duration]);
	}
	return spans;
}

/** the gain automation's dB at `t` seconds into the clip: straight lines between keys, the ends held */
export function keyDb(keys: [number, number][], t: number): number {
	if (!keys.length) return 0;
	if (t <= keys[0][0]) return keys[0][1];
	for (let i = 1; i < keys.length; i++) {
		const [t0, d0] = keys[i - 1], [t1, d1] = keys[i];
		if (t <= t1) return t1 > t0 ? d0 + ((d1 - d0) * (t - t0)) / (t1 - t0) : d1;
	}
	return keys[keys.length - 1][1];
}
