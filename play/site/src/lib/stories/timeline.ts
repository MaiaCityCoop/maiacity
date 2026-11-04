// A story's timeline (play/SPEC.md §12, format story/1) and the one function that shows it: `renderAt(story, t)` gives
// exactly what is seen and heard at second t (the shot, the one fading out under it and how far, the subtitle and how
// much of it is spoken, the notes), from the timeline alone. The player only moves t; nothing runs on a clock of its
// own (no CSS transition), so the same t is the same picture every time: what a frame-by-frame export into a video
// (WebCodecs in the browser, or a page a renderer seeks through) needs.

export type Clip = { id: string; at: number; duration: number; [field: string]: unknown };
export type Track = { id: string; kind: string; clips: Clip[] };
export type StoryBody = { schema: 'story/1'; format: string; fps: number; duration: number; tracks: Track[] };
export type Story = StoryBody & { id: string; title: string; number?: number | null; version?: string; note?: string; versions?: { number: number; id: string; note: string; created: string; author: string | null }[] };

export type Shot = Clip & { frame: string | null; transition: string };
export type Voice = Clip & { who: string; line: string };
export type Notes = Clip & { section: string; camera: string; retention: string; mood: string; pace?: string; sound?: string };

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
	/** the narration at t: its clip, and how many of its words are spoken by now */
	voice: Voice | null;
	spoken: number;
	/** the one line of it on screen now: the cue being spoken */
	cue: Cue | null;
	notes: Notes | null;
};

/** one subtitle line: its text and which of the narration's words it holds (from, and how many) */
export type Cue = { text: string; from: number; words: number };

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

export const clipsOf = <C extends Clip = Clip>(s: StoryBody | null | undefined, kind: string): C[] => (s?.tracks?.find((t) => t.kind === kind)?.clips ?? []) as C[];

/** the clip of a track on screen at t: the last that has started and not yet ended (the first, before it starts) */
function at<C extends Clip>(clips: C[], t: number): { clip: C | null; index: number } {
	let lo = 0, hi = clips.length - 1, found = -1;
	while (lo <= hi) {
		const mid = (lo + hi) >> 1;
		if (clips[mid].at <= t + 1e-9) {
			found = mid;
			lo = mid + 1;
		} else hi = mid - 1;
	}
	if (found < 0) return { clip: null, index: -1 };
	const c = clips[found];
	return t < c.at + c.duration + 1e-9 ? { clip: c, index: found } : { clip: null, index: found };
}

/** how long a shot fades in over the one before it, from how that one said it goes into the next: a cut cuts */
export function fadeOf(prev: Shot | null, shot: Shot): number {
	if (!prev) return 0;
	if (/\b(hard|smash|match|jump)\s*cut\b|\bcut to\b/i.test(prev.transition ?? '')) return 0;
	return Math.min(0.5, 0.3 * Math.min(prev.duration, shot.duration));
}

const ease = (x: number) => x * x * (3 - 2 * x);

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
	const v = at(clipsOf<Voice>(story, 'voice'), time);
	const words = v.clip ? (v.clip.line ?? '').split(/\s+/).filter(Boolean).length : 0;
	// the words are spoken evenly over the first 92% of the clip, so the line is whole before the next begins
	const spoken = v.clip ? Math.min(words, Math.ceil(((time - v.clip.at) / Math.max(0.01, v.clip.duration * 0.92)) * words)) : 0;
	// the line being spoken: the one holding the last word said (the first, before any is)
	const cues = v.clip ? cuesOf(v.clip.line ?? '') : [];
	const cue = cues.find((c) => Math.max(0, spoken - 1) < c.from + c.words) ?? cues[cues.length - 1] ?? null;
	return { t: time, shot, index: s.index, prev: mix < 1 ? touching : null, mix, voice: v.clip, spoken, cue, notes: at(clipsOf<Notes>(story, 'notes'), time).clip };
}

/** a mood's height: each ↑ one up, each ↓ one down (↕, END and the rest level) */
export const moodLevel = (m: string | undefined) => {
	const s = m ?? '';
	const up = (s.match(/↑/g) ?? []).length, down = (s.match(/↓/g) ?? []).length;
	return up && down ? 0 : up - down;
};

/** consecutive notes of one section, as spans of the timeline */
export function sectionsOf(story: StoryBody | null): { section: string; at: number; end: number }[] {
	const out: { section: string; at: number; end: number }[] = [];
	for (const n of clipsOf<Notes>(story, 'notes')) {
		const last = out[out.length - 1];
		if (last && last.section === n.section) last.end = n.at + n.duration;
		else out.push({ section: n.section || '—', at: n.at, end: n.at + n.duration });
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
