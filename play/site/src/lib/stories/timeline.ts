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
export type Notes = Clip & { section: string; camera: string; retention: string; mood: string };

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
	notes: Notes | null;
};

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
	return { t: time, shot, index: s.index, prev: mix < 1 ? touching : null, mix, voice: v.clip, spoken, notes: at(clipsOf<Notes>(story, 'notes'), time).clip };
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
	/** ducked under the voice (music tracks, as the old studio did) */
	duck: boolean;
};

/** the kinds whose sound ducks under the voice */
export const DUCKED = new Set(['music', 'score']);
/** how far music dips under the voice (about -6 dB), and how fast it goes down and comes back up */
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
				duck: DUCKED.has(t.kind),
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
