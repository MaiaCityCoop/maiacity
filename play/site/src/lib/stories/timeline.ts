// A story's timeline (play/SPEC.md §12, format story/1), read for the Stories player's lanes and notes: its clips lane by
// lane, its subtitles, its sections and mood, its links. What is seen and heard is made by HyperFrames from the same
// timeline (./compose.ts), never here.

import type * as W from '$wire';
import { storyHref } from '../app/address';

export type Clip = W.Clip;
/** a track as the site reads it: the API's, and the names and ducking its tracks carry (not in its type yet) */
export interface Track extends W.Track {
	duck?: boolean;
	name?: string;
}
export type StoryBody = Omit<W.StoryBody, 'tracks'> & { tracks: Track[] };
/** a linked version as play reads it (play/api/src/stories.ts `linksOf`): its story's UUID, title, number and id, its
 *  length and timeline, and its story's newest accepted number (only shown: a link plays its own version) */
export type Linked = Omit<W.Linked, 'newest' | 'body'> & { newest?: number | null; body: StoryBody };
/** every version a timeline links, to any depth, by the version's id */
export type Links = Record<string, Linked>;
/** a story whose newest version links this one, and the number of this one's version it plays (GET /api/stories/:id) */
export type LinkedBy = W.LinkedBy;
export type Story = StoryBody & { id: string; title: string; number?: number | null; version?: string; note?: string; links?: Links; linked_by?: LinkedBy[]; versions?: { number: number; id: string; note: string; created: string; author: string | null; approved_by?: string | null }[] };

/** a shot: its still (frame), how it goes into the next (transition), and its moving picture if it has one: a video
 *  (played muted from video_in seconds into it, the story's own sound under it) or a composition (readable HTML by hash) */
export type Shot = Clip & { frame: string | null; transition: string; video?: string | null; video_in?: number; composition?: string | null };
/** a subtitle the clip sets itself: `at` seconds into the clip it comes on, until the next; `em` sets it alone, large */
type SetCue = { at: number; text: string; em?: boolean };
export type Voice = Clip & { who: string; line: string; cues?: SetCue[] };
export type Notes = Clip & { section: string; camera: string; retention: string; mood: string; pace?: string; sound?: string; emotion?: string };

/** what a clip of a sound track says it is, sounding or still to be made: its note (a planned cue, an effect, a bed) or its name */
export const cueOf = (c: Clip) => String((c as { note?: unknown }).note ?? (c as { name?: unknown }).name ?? '');

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
/** every clip of a kind, of every track of that kind, in time order: one lane */
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
 * The clip of a lane at t. Of the clips that cover t, the one that started last (two tracks of a kind may overlap: the
 * later one is the one just begun); two that start together, the first. None covering t, the last that started holds the
 * index (the first, before any starts).
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

/** the clip of a kind on screen at t, or null */
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

/** a mood's height: each ↑ one up, each ↓ one down (↕, END and the rest level) */
export const moodLevel = (m: string | undefined) => {
	const s = m ?? '';
	const up = (s.match(/↑/g) ?? []).length, down = (s.match(/↓/g) ?? []).length;
	return up && down ? 0 : up - down;
};

/** consecutive notes of one section, as spans of the timeline, each with the primary emotion it should leave (the first
 * its notes name) */
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

// ---- linked stories (Samuel 2026-11-04: the trailer its own story, in every film), each played in its place (./compose.ts)

/** the kind of track whose clips link other stories in */
export const LINK = 'story';
/** how deep links nest (play's API refuses deeper ones) */
export const MOST_LINK_DEPTH = 4;
/** the version a link clip plays, as `links` holds it (by the version's id), if it is there and is the story's it names */
export const linkedOf = (c: { [field: string]: unknown }, links: Links | null | undefined): Linked | null => {
	const l = typeof c.version === 'string' ? links?.[c.version] : undefined;
	return l && l.id === c.story ? l : null;
};

/** a link in its place: the story it plays (null title: it can't be read), its version's number, its newest */
export type Slot = { clip: string; at: number; duration: number; story: string; title: string | null; number: number | null; newest: number | null };
export const slotsOf = (story: StoryBody & { links?: Links | null }): Slot[] =>
	story.tracks.filter((x) => x.kind === LINK).flatMap((x) => x.clips.map((c) => {
		const l = linkedOf(c, story.links);
		return { clip: `${x.id}/${c.id}`, at: c.at, duration: c.duration, story: l?.id ?? String(c.story ?? ''), title: l?.title ?? null, number: l?.number ?? null, newest: l?.newest ?? null };
	}));
/** a link as people read it: the story's title and the version it plays, "Trailer · v3" */
export const linkName = (s: Slot) => (s.title ? `${s.title} · v${s.number}` : 'A story that can no longer be read');
/** a newer accepted version of the linked story, if there is one: only shown (moving to it is a proposal on this story) */
export const newerOf = (s: Slot) => (s.newest != null && s.number != null && s.newest > s.number ? s.newest : null);
/** the Stories page at the linked story (by its UUID), at the version this link plays */
export const linkHref = (s: Slot) => storyHref(s.story, s.number);

const PALETTE = ['#8fae8b', '#d9a441', '#c96f53', '#7c9cb8', '#a98bb5', '#6f9e95', '#c4a27a', '#9aa35c'];
/** a calm colour for each section, the same every time */
export const colourOf = (s: string) => PALETTE[[...(s ?? '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % PALETTE.length];

export const clock = (s: number) => {
	const m = Math.floor(s / 60), r = s - m * 60;
	return `${m}:${r < 10 ? '0' : ''}${r.toFixed(1)}`;
};
