// Stories (Samuel 2026-11-03): a film as one timeline, so Maia City's admins can play its script through and feel
// whether it works, and later (motion design, three.js scenes, a frame-by-frame export into a real video) build it
// there. A story is tracks of clips (play/SPEC.md §12, format `story/1`):
//
//   { schema: "story/1", format: "9:16", fps: 30, duration, tracks: [{ id, kind, clips: [{ id, at, duration, … }] }] }
//
// Every clip has its place in time (`at`, `duration`, in seconds); what else it holds is its track's kind:
//   shots  { frame: <an image's file hash>, transition }   — the storyboard; a `scene` will replace the still later
//   voice  { who, line }                                   — the narration and its subtitle
//   notes  { section, camera, retention, mood }            — what the editor reads beside the picture
// Any clip of any track may sound (the voice's takes, a music or sfx or ambience track's clips): `audio` is a recording
// kept among play's files by its hash (add_story_audio), `audio_in` where in the recording the clip starts, `gain` in
// dB, `fade_in`/`fade_out` in seconds, `eq` (biquad bands) and `keys` (gain automation, [s, dB]), as the old studio's
// clips had them; a track's own `gain` (dB) and `mute` apply to all its clips, and music is ducked under the voice.
// A clip may hold more than its kind names, and a track may be of a kind not named here (music, sfx, callout, scene):
// those are kept as given, so a later kind needs no migration. Frames are images kept among play's files by their
// BLAKE3 hash and served by /api/files/<hash>.
//
// Stories are versioned like the assets (play.story_versions, each written once, numbered when accepted; the story's
// head its newest accepted version) and change only by proposal: an admin's agent proposes a new story or a new
// version over MCP (./mcp.ts), as the whole timeline or as edits applied to the head, and an admin accepts or rejects
// it on the Proposals page (./proposals.ts `decide`). Admins only, reading and proposing.
import { randomUUID } from "node:crypto";
import { COOP, Denied, type Me } from "./access";
import { keyOf, type BlobStore } from "./blobs";
import { canonical, HASH, hashBytes } from "./hash";
import type { Db, Queryable } from "./pg";
import { storyVersionId } from "./versions";
import * as docs from "./docs";
import { EditError } from "./docs/core";
import { asDoc, asStory, authorOf, docIdOf, ensureStoryDoc, overlap, storyDocAt, versionAtFrontiers } from "./storydocs";

export class StoryError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const SCHEMA = "story/1";
export type Clip = { id: string; at: number; duration: number; [field: string]: unknown };
export type Track = { id: string; kind: string; gain?: number; mute?: boolean; clips: Clip[] };
export type StoryBody = { schema: typeof SCHEMA; format: string; fps: number; duration: number; tracks: Track[] };
export type VersionInfo = { number: number; id: string; note: string; created: string; author: string | null; approved_by: string | null };
export type Story = { id: string; title: string; version: string; number: number | null; note: string; created: string; author: string | null; versions: VersionInfo[] } & StoryBody;
export type StoryItem = { id: string; title: string; number: number; versions: number; duration: number; shots: number; tracks: number; updated: string; cover: string | null };

export const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
const TRACK_ID = /^[a-z0-9][a-z0-9-]{0,31}$/;
const CLIP_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/;
export const FORMATS = ["9:16", "16:9", "1:1", "4:5"];
export const FPS = [24, 25, 30, 48, 50, 60];
/** the kinds whose clips follow one another on their track, never overlapping */
const SEQUENTIAL = new Set(["shots", "voice", "notes"]);
const MOST_TRACKS = 32;
const MOST_CLIPS = 2000;
/** the largest story body kept, as JSON */
const MOST_BODY = 1_000_000;
/** the largest frame an agent may add */
export const MOST_FRAME = 4_000_000;
/** the image types a frame may be, by the bytes they start with */
/** the largest recording an agent may add */
export const MOST_AUDIO = 25_000_000;
const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.slice(from, to));
/** the audio types a recording may be, by the bytes they start with */
const AUDIO: { type: string; is: (b: Uint8Array) => boolean }[] = [
  { type: "audio/mpeg", is: (b) => ascii(b, 0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0 && (b[1] & 0x06) !== 0) },
  { type: "audio/wav", is: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WAVE" },
  { type: "audio/ogg", is: (b) => ascii(b, 0, 4) === "OggS" },
  { type: "audio/flac", is: (b) => ascii(b, 0, 4) === "fLaC" },
  { type: "audio/mp4", is: (b) => ascii(b, 4, 8) === "ftyp" && /^(M4A |M4B |mp42|isom|dash)/.test(ascii(b, 8, 12)) },
  { type: "audio/webm", is: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
];
export const AUDIO_TYPES = AUDIO.map((a) => a.type);
const IMAGES: { type: string; is: (b: Uint8Array) => boolean }[] = [
  { type: "image/jpeg", is: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/png", is: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { type: "image/webp", is: (b) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP" },
];

const iso = (d: Date | string) => new Date(d).toISOString();
const shotsOf = (b: StoryBody | undefined) => b?.tracks?.find((t) => t.kind === "shots")?.clips ?? [];
const round = (n: number) => Math.round(n * 1000) / 1000;

/** only Maia City's admins read and propose stories */
/** a story brought into another (foldStories) takes no proposal: its versions are that story's now */
const folded = (id: string, into: string) => new StoryError(`Story ${id} is part of story ${into} now, its versions that story's: propose there.`, 409);

export function admin(me: Me | null): Me {
  if (!me) throw new Denied("Please sign in first.", 401);
  if (me.level !== "admin") throw new Denied("Only Maia City's admins may open the Stories.");
  return me;
}

// ---- the format, checked

const text = (v: unknown, what: string, most: number, need = false): string => {
  if (v == null || v === "") {
    if (need) throw new StoryError(`${what} is missing.`);
    return "";
  }
  if (typeof v !== "string") throw new StoryError(`${what} must be text.`);
  const t = v.trim();
  if (t.length > most) throw new StoryError(`${what} is longer than ${most} characters.`);
  if (need && !t) throw new StoryError(`${what} is missing.`);
  return t;
};
const seconds = (v: unknown, what: string, least: number, most: number): number => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  if (!Number.isFinite(n) || n < least || n > most) throw new StoryError(`${what} must be a number of seconds from ${least} to ${most}.`);
  return round(n);
};

/** each known kind's own fields, checked (texts trimmed, lengths held); the rest of a clip is kept as given */
const KINDS: Record<string, (c: Record<string, unknown>, what: string) => Record<string, unknown>> = {
  shots: (c, what) => {
    const frame = c.frame == null || c.frame === "" ? null : text(c.frame, `${what}'s frame`, 64);
    if (frame !== null && !HASH.test(frame)) throw new StoryError(`${what}'s frame must be an image's file hash (add_story_frame gives one).`);
    return { frame, transition: text(c.transition, `${what}'s transition`, 500) };
  },
  voice: (c, what) => ({ who: text(c.who, `${what}'s speaker`, 60), line: text(c.line, `${what}'s line`, 1000) }),
  notes: (c, what) => ({
    section: text(c.section, `${what}'s section`, 40),
    camera: text(c.camera, `${what}'s camera`, 500),
    retention: text(c.retention, `${what}'s retention`, 500),
    mood: text(c.mood, `${what}'s mood`, 12),
  }),
};

/** a clip's sound, where it has one: its recording (a hash), where in it the clip starts, its gain and fades */
function sound(c: Record<string, unknown>, what: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (c.audio != null && c.audio !== "") {
    const audio = text(c.audio, `${what}'s audio`, 64);
    if (!HASH.test(audio)) throw new StoryError(`${what}'s audio must be a recording's file hash (add_story_audio gives one).`);
    out.audio = audio;
  } else if (c.audio === "") out.audio = null;
  if (c.audio_in != null) out.audio_in = seconds(c.audio_in, `${what}'s audio_in`, 0, 36_000);
  if (c.gain != null) out.gain = seconds(c.gain, `${what}'s gain (dB)`, -60, 24);
  if (c.fade_in != null) out.fade_in = seconds(c.fade_in, `${what}'s fade_in`, 0, 600);
  if (c.fade_out != null) out.fade_out = seconds(c.fade_out, `${what}'s fade_out`, 0, 600);
  if (c.eq != null) out.eq = eqOf(c.eq, what);
  if (c.keys != null) out.keys = keysOf(c.keys, what);
  return out;
}

/** the biquad types an EQ band may be (the Audio EQ Cookbook's, as Web Audio's BiquadFilterNode plays them) */
export const EQ_TYPES = ["highpass", "lowshelf", "peaking", "notch", "highshelf", "lowpass"];
const MOST_BANDS = 8;
const MOST_KEYS = 64;
/** a clip's EQ: bands in order, each { type, f (Hz, 20–20000), gain (dB, ±24), q (0.1–18) } (the old studio's, checked the same) */
function eqOf(v: unknown, what: string) {
  if (!Array.isArray(v)) throw new StoryError(`${what}'s eq is a list of bands: { type, f, gain, q }.`);
  if (v.length > MOST_BANDS) throw new StoryError(`${what}'s eq has at most ${MOST_BANDS} bands.`);
  return v.map((b: any, i) => {
    const band = `${what}'s eq band ${i + 1}`;
    if (!b || typeof b !== "object" || !EQ_TYPES.includes(b.type)) throw new StoryError(`${band}'s type is one of ${EQ_TYPES.join(", ")}.`);
    const q = b.q == null ? (b.type === "peaking" || b.type === "notch" ? 1 : 0.707) : seconds(b.q, `${band}'s q`, 0.1, 18);
    return { type: b.type, f: seconds(b.f, `${band}'s frequency (Hz)`, 20, 20000), gain: b.gain == null ? 0 : seconds(b.gain, `${band}'s gain (dB)`, -24, 24), q };
  });
}
/** a clip's gain automation: [seconds into the clip, dB (-60…12)] points, straight lines between them */
function keysOf(v: unknown, what: string) {
  if (!Array.isArray(v)) throw new StoryError(`${what}'s keys are a list of [seconds into the clip, dB].`);
  if (v.length > MOST_KEYS) throw new StoryError(`${what} has at most ${MOST_KEYS} keys.`);
  return v
    .map((k: any, i) => {
      if (!Array.isArray(k) || k.length !== 2) throw new StoryError(`${what}'s key ${i + 1} is [seconds, dB].`);
      return [seconds(k[0], `${what}'s key ${i + 1} time`, 0, 3600), seconds(k[1], `${what}'s key ${i + 1} gain (dB)`, -60, 12)];
    })
    .sort((a, b) => a[0] - b[0]);
}

/** A story's timeline as given, checked and laid out (clips in time order, each track's clips never overlapping where its kind follows one after another); every shot's frame an image play holds. */
export async function checkBody(db: Queryable, given: any): Promise<StoryBody> {
  if (!given || typeof given !== "object" || Array.isArray(given)) throw new StoryError("A story's timeline is a JSON object: { format, fps, tracks }.");
  if (given.schema != null && given.schema !== SCHEMA) throw new StoryError(`A story's schema is ${SCHEMA}.`);
  const format = given.format == null ? "9:16" : text(given.format, "The format", 8);
  if (!FORMATS.includes(format)) throw new StoryError(`The format is one of ${FORMATS.join(", ")}.`);
  const fps = given.fps == null ? 30 : Number(given.fps);
  if (!FPS.includes(fps)) throw new StoryError(`The frame rate is one of ${FPS.join(", ")}.`);
  if (!Array.isArray(given.tracks) || !given.tracks.length) throw new StoryError("A story has at least one track.");
  if (given.tracks.length > MOST_TRACKS) throw new StoryError(`A story has at most ${MOST_TRACKS} tracks.`);
  const trackIds = new Set<string>();
  let clipCount = 0;
  const tracks: Track[] = given.tracks.map((t: any, ti: number) => {
    if (!t || typeof t !== "object") throw new StoryError(`Track ${ti + 1} is not an object.`);
    const kind = text(t.kind, `Track ${ti + 1}'s kind`, 32, true);
    if (!TRACK_ID.test(kind)) throw new StoryError(`Track ${ti + 1}'s kind is a short word: lower-case letters, digits and dashes.`);
    const id = t.id == null ? kind : text(t.id, `Track ${ti + 1}'s id`, 32, true);
    if (!TRACK_ID.test(id)) throw new StoryError(`Track ${ti + 1}'s id is a short word: lower-case letters, digits and dashes.`);
    if (trackIds.has(id)) throw new StoryError(`Two tracks are called ${id}.`);
    trackIds.add(id);
    if (!Array.isArray(t.clips)) throw new StoryError(`Track ${id} has no clips list.`);
    clipCount += t.clips.length;
    if (clipCount > MOST_CLIPS) throw new StoryError(`A story has at most ${MOST_CLIPS} clips.`);
    const clipIds = new Set<string>();
    let next = 0;
    const clips: Clip[] = t.clips.map((c: any, ci: number) => {
      const what = `Clip ${c?.id ?? ci + 1} of track ${id}`;
      if (!c || typeof c !== "object" || Array.isArray(c)) throw new StoryError(`${what} is not an object.`);
      const cid = c.id == null ? `${id}-${ci + 1}` : text(c.id, `${what}'s id`, 64, true);
      if (!CLIP_ID.test(cid)) throw new StoryError(`${what}'s id is letters, digits, dots, colons, dashes or underscores.`);
      if (clipIds.has(cid)) throw new StoryError(`Two clips of track ${id} are called ${cid}.`);
      clipIds.add(cid);
      const at = c.at == null ? round(next) : seconds(c.at, `${what}'s start`, 0, 36_000);
      const duration = seconds(c.duration, `${what}'s duration`, 0.04, 3600);
      next = at + duration;
      const { id: _i, at: _a, duration: _d, ...rest } = c;
      return { ...rest, ...(KINDS[kind]?.(c, what) ?? {}), ...sound(c, what), id: cid, at, duration };
    });
    clips.sort((a, b) => a.at - b.at);
    if (SEQUENTIAL.has(kind))
      for (let i = 1; i < clips.length; i++)
        if (clips[i].at < clips[i - 1].at + clips[i - 1].duration - 1e-6)
          throw new StoryError(`On track ${id}, clip ${clips[i].id} starts at ${clips[i].at} s, before clip ${clips[i - 1].id} ends (${round(clips[i - 1].at + clips[i - 1].duration)} s).`);
    const level = t.gain == null ? {} : { gain: seconds(t.gain, `Track ${id}'s gain (dB)`, -60, 24) };
    const mute = t.mute == null ? {} : { mute: !!t.mute };
    return { id, kind, ...level, ...mute, clips };
  });
  const sounds = [...new Set(tracks.flatMap((t) => t.clips.map((c) => c.audio)).filter((a): a is string => typeof a === "string"))];
  if (sounds.length) {
    const { rows } = await db.query<{ hash: string }>(`SELECT hash FROM play.files WHERE hash = ANY($1) AND media_type LIKE 'audio/%'`, [sounds]);
    const held = new Set(rows.map((r) => r.hash));
    const missing = sounds.filter((f) => !held.has(f));
    if (missing.length) throw new StoryError(`No recording is kept by ${missing.length === 1 ? "the hash" : "the hashes"} ${missing.map((m) => m.slice(0, 12)).join(", ")}: add ${missing.length === 1 ? "it" : "them"} with add_story_audio first.`);
  }
  const frames = [...new Set(tracks.filter((t) => t.kind === "shots").flatMap((t) => t.clips.map((c) => c.frame)).filter((f): f is string => typeof f === "string"))];
  if (frames.length) {
    const { rows } = await db.query<{ hash: string }>(`SELECT hash FROM play.files WHERE hash = ANY($1) AND media_type LIKE 'image/%'`, [frames]);
    const held = new Set(rows.map((r) => r.hash));
    const missing = frames.filter((f) => !held.has(f));
    if (missing.length) throw new StoryError(`No image is kept by ${missing.length === 1 ? "the hash" : "the hashes"} ${missing.map((m) => m.slice(0, 12)).join(", ")}: add ${missing.length === 1 ? "it" : "them"} with add_story_frame first.`);
  }
  const duration = round(Math.max(0, ...tracks.flatMap((t) => t.clips.map((c) => c.at + c.duration))));
  if (!(duration > 0)) throw new StoryError("A story has at least one clip.");
  const body: StoryBody = { schema: SCHEMA, format, fps, duration, tracks };
  if (JSON.stringify(body).length > MOST_BODY) throw new StoryError(`A story is at most ${MOST_BODY / 1e6} MB as JSON.`, 413);
  return body;
}

// ---- edits: a new version made from the head, clip by clip

export type Edit =
  | { op: "set_clip"; track: string; clip: string; fields: Record<string, unknown> }
  | { op: "add_clip"; track: string; clip: Record<string, unknown> }
  | { op: "remove_clip"; track: string; clip: string }
  | { op: "add_track"; track: { id?: string; kind: string; clips?: unknown[] }; index?: number }
  | { op: "remove_track"; track: string }
  | { op: "set_track"; track: string; fields: { id?: string; kind?: string } }
  | { op: "shift"; from: number; by: number; tracks?: string[] }
  | { op: "set"; fields: { format?: string; fps?: number } }
  | { op: "edit_text"; track: string; clip: string; field: string; index: number; delete?: number; insert?: string };

/** The head's timeline with `edits` applied in order (checked as a whole afterwards by checkBody). */
export function applyEdits(head: StoryBody, edits: unknown): any {
  if (!Array.isArray(edits) || !edits.length) throw new StoryError("Edits are a list of operations: set_clip, add_clip, remove_clip, add_track, remove_track, set_track, shift, set, edit_text.");
  const body: any = JSON.parse(JSON.stringify(head));
  const trackOf = (id: unknown, i: number) => {
    const t = body.tracks.find((x: any) => x.id === id);
    if (!t) throw new StoryError(`Edit ${i + 1}: there is no track ${id}.`);
    return t;
  };
  const clipOf = (t: any, id: unknown, i: number) => {
    const c = t.clips.find((x: any) => x.id === id);
    if (!c) throw new StoryError(`Edit ${i + 1}: track ${t.id} has no clip ${id}.`);
    return c;
  };
  const object = (v: unknown, what: string, i: number) => {
    if (!v || typeof v !== "object" || Array.isArray(v)) throw new StoryError(`Edit ${i + 1}: ${what} must be an object.`);
    return v as Record<string, unknown>;
  };
  edits.forEach((e: any, i: number) => {
    switch (e?.op) {
      case "set_clip": {
        const c = clipOf(trackOf(e.track, i), e.clip, i);
        for (const [k, v] of Object.entries(object(e.fields, "its fields", i))) v === null && k !== "frame" ? delete c[k] : (c[k] = v);
        break;
      }
      case "add_clip":
        trackOf(e.track, i).clips.push({ ...object(e.clip, "the clip", i) });
        break;
      case "remove_clip": {
        const t = trackOf(e.track, i);
        clipOf(t, e.clip, i);
        t.clips = t.clips.filter((x: any) => x.id !== e.clip);
        break;
      }
      case "add_track": {
        const t = object(e.track, "the track", i);
        const at = Number.isInteger(e.index) ? Math.max(0, Math.min(body.tracks.length, e.index)) : body.tracks.length;
        body.tracks.splice(at, 0, { clips: [], ...t });
        break;
      }
      case "remove_track":
        trackOf(e.track, i);
        body.tracks = body.tracks.filter((x: any) => x.id !== e.track);
        break;
      case "set_track":
        Object.assign(trackOf(e.track, i), object(e.fields, "its fields", i));
        break;
      case "shift": {
        const from = Number(e.from), by = Number(e.by);
        if (!Number.isFinite(from) || !Number.isFinite(by)) throw new StoryError(`Edit ${i + 1}: shift takes from and by, in seconds.`);
        for (const t of body.tracks) {
          if (Array.isArray(e.tracks) && !e.tracks.includes(t.id)) continue;
          for (const c of t.clips) if (Number(c.at) >= from - 1e-6) c.at = round(Number(c.at) + by);
        }
        break;
      }
      case "set": {
        const f = object(e.fields, "its fields", i);
        if (f.format !== undefined) body.format = f.format;
        if (f.fps !== undefined) body.fps = f.fps;
        break;
      }
      case "edit_text": {
        // a range of one of a clip's texts: the finest step there is (a word put in, a phrase taken out)
        const c = clipOf(trackOf(e.track, i), e.clip, i);
        const field = `${e.field ?? ""}`;
        if (!/^[a-z][a-z_]{0,31}$/.test(field)) throw new StoryError(`Edit ${i + 1}: edit_text names the clip's field (line, transition, camera …).`);
        const was = c[field] == null ? "" : c[field];
        if (typeof was !== "string") throw new StoryError(`Edit ${i + 1}: clip ${c.id}'s ${field} is not text.`);
        const index = Number(e.index), del = e.delete == null ? 0 : Number(e.delete), put = e.insert == null ? "" : `${e.insert}`;
        if (!Number.isInteger(index) || !Number.isInteger(del) || index < 0 || del < 0 || index + del > was.length)
          throw new StoryError(`Edit ${i + 1}: the range ${e.index}+${e.delete ?? 0} is outside clip ${c.id}'s ${field} (${was.length} characters).`);
        c[field] = was.slice(0, index) + put + was.slice(index + del);
        break;
      }
      default:
        throw new StoryError(`Edit ${i + 1}: ${e?.op ?? "an edit without op"} is not an operation (set_clip, add_clip, remove_clip, add_track, remove_track, set_track, shift, set, edit_text).`);
    }
  });
  return body;
}

// ---- what changed between two versions

export type Change = { field: string; from: unknown; to: unknown };
export type StoryDiff = {
  title: { from: string; to: string } | null;
  settings: Change[];
  tracks: { id: string; kind: string; state: "added" | "removed" | "same" | "changed"; added: Clip[]; removed: Clip[]; changed: { id: string; changes: Change[] }[] }[];
};

export function diffStories(from: { title: string; body: StoryBody } | null, to: { title: string; body: StoryBody }): StoryDiff {
  const settings: Change[] = [];
  if (from) for (const k of ["format", "fps", "duration"] as const) if (from.body[k] !== to.body[k]) settings.push({ field: k, from: from.body[k], to: to.body[k] });
  const before = new Map((from?.body.tracks ?? []).map((t) => [t.id, t]));
  const after = new Map(to.body.tracks.map((t) => [t.id, t]));
  const tracks: StoryDiff["tracks"] = [];
  for (const t of to.body.tracks) {
    const b = before.get(t.id);
    if (!b) {
      tracks.push({ id: t.id, kind: t.kind, state: "added", added: t.clips, removed: [], changed: [] });
      continue;
    }
    const old = new Map(b.clips.map((c) => [c.id, c]));
    const now = new Map(t.clips.map((c) => [c.id, c]));
    const added = t.clips.filter((c) => !old.has(c.id));
    const removed = b.clips.filter((c) => !now.has(c.id));
    const changed = t.clips.filter((c) => old.has(c.id)).map((c) => {
      const o = old.get(c.id)!;
      const keys = [...new Set([...Object.keys(o), ...Object.keys(c)])].filter((k) => k !== "id");
      return { id: c.id, changes: keys.filter((k) => canonical(o[k]) !== canonical(c[k])).map((k) => ({ field: k, from: o[k] ?? null, to: c[k] ?? null })) };
    }).filter((c) => c.changes.length);
    const state = b.kind !== t.kind || added.length || removed.length || changed.length ? "changed" : "same";
    tracks.push({ id: t.id, kind: t.kind, state, added, removed, changed });
  }
  for (const b of from?.body.tracks ?? []) if (!after.has(b.id)) tracks.push({ id: b.id, kind: b.kind, state: "removed", added: [], removed: b.clips, changed: [] });
  return { title: from && from.title !== to.title ? { from: from.title, to: to.title } : null, settings, tracks };
}

// ---- reading

export async function listStories(db: Queryable, me: Me | null): Promise<StoryItem[]> {
  admin(me);
  const { rows } = await db.query<{ id: string; title: string; body: StoryBody; number: number; updated: Date; versions: string }>(
    `SELECT s.id, s.title, v.body, v.number, s.updated,
            (SELECT count(*) FROM play.story_versions x WHERE x.story_id = s.id AND x.number IS NOT NULL) AS versions
       FROM play.stories s JOIN play.story_versions v ON v.id = s.head
      WHERE s.folded_into IS NULL
      ORDER BY s.updated DESC, s.id`,
  );
  return rows.map((r) => {
    const shots = shotsOf(r.body);
    return {
      id: r.id,
      title: r.title,
      number: r.number,
      versions: Number(r.versions),
      duration: Number(r.body?.duration ?? 0),
      shots: shots.length,
      tracks: r.body?.tracks?.length ?? 0,
      updated: iso(r.updated),
      cover: (shots.find((c) => typeof c.frame === "string")?.frame as string | undefined) ?? null,
    };
  });
}

type VersionRow = { id: string; story_id: string; number: number | null; title: string; body: StoryBody; note: string; created: Date; author: string | null; approved_by: string | null };

/** story `id` at its head, or at accepted version `number` */
export async function storyOf(db: Queryable, me: Me | null, id: string, number?: number): Promise<Story> {
  admin(me);
  if (!SLUG.test(id)) throw new StoryError("A story is named by a short slug: lower-case letters, digits and dashes.", 404);
  if (number !== undefined && !(Number.isInteger(number) && number >= 1)) throw new StoryError(`${number} is not a version.`, 404);
  const { rows } = await db.query<VersionRow>(
    `SELECT v.id, v.story_id, v.number, v.title, v.body, v.note, v.created, au.name AS author, ap.name AS approved_by
       FROM play.stories s JOIN play.story_versions v ON v.story_id = s.id
       LEFT JOIN play.humans au ON au.id = v.author LEFT JOIN play.humans ap ON ap.id = v.approved_by
      WHERE s.id = $1 AND v.number IS NOT NULL
      ORDER BY v.number DESC`,
    [id],
  );
  if (!rows.length) throw new StoryError("There is no such story.", 404);
  const v = number === undefined ? rows[0] : rows.find((r) => r.number === number);
  if (!v) throw new StoryError(`Story ${id} has no version ${number}.`, 404);
  const versions = rows.map((r) => ({ number: r.number!, id: r.id, note: r.note, created: iso(r.created), author: r.author, approved_by: r.approved_by }));
  return { id, title: v.title, version: v.id, number: v.number, note: v.note, created: iso(v.created), author: v.author, versions, ...v.body };
}

// ---- proposing, step by step (play/SPEC.md §4.4): every story is also a Loro document (./storydocs.ts) whose branches
// are its proposals, each change a step on one

export type StoryProposal = {
  story: string;
  title?: string;
  note?: string;
  body?: unknown; // the whole new timeline
  edits?: unknown; // or edits applied to the head's (or, with a branch, its last step)
  base?: string | null; // the head version's id it was made from, as the proposer saw it
  branch?: number; // a draft made step by step with story_edit, proposed as it stands
};

// a story version's id is content-addressed as an asset version's is (./versions.ts, play/SPEC.md §4.3): the same story,
// parents, title and timeline give the same id; any change to any of them, or to the history it stands on, another
const versionIdOf = (story: string, parents: string[], title: string, body: StoryBody) => storyVersionId({ story, parents, title, body });

/** a document's errors said as a story's (MCP shows them to the agent) */
async function asStoryError<R>(run: () => Promise<R>): Promise<R> {
  try {
    return await run();
  } catch (e) {
    if (e instanceof docs.DocError) throw new StoryError(e.message, e.status);
    if (e instanceof docs.SchemaError || e instanceof EditError) throw new StoryError(e.message);
    throw e;
  }
}

/** a draft branch of story `id`'s document, still open for steps */
async function draftOf(tx: Queryable, docId: string, story: string, b: unknown): Promise<{ id: number; base: docs.Frontiers }> {
  const n = Number(b);
  if (!Number.isInteger(n) || n < 1) throw new StoryError("A draft is named by its number (story_edit gives it).");
  const { rows } = await tx.query<{ id: string; status: string; base: docs.Frontiers }>(`SELECT id, status, base FROM play.doc_branches WHERE id = $1 AND doc_id = $2`, [n, docId]);
  if (!rows[0]) throw new StoryError(`Story ${story} has no draft ${n}.`, 404);
  if (rows[0].status !== "open") throw new StoryError(`Draft ${n} of ${story} was ${rows[0].status === "proposed" ? "proposed already: it is decided as it was proposed. Start a new draft" : rows[0].status}.`, 409);
  return { id: n, base: rows[0].base };
}

/** one step on draft `b`: edits, a whole timeline, or a title, checked whole */
async function draftStep(tx: Queryable, story: string, docId: string, b: number, p: { edits?: unknown; body?: unknown; title?: unknown }, message: string, author: docs.Author) {
  const cur = await storyDocAt(tx, story, b);
  const title = p.title !== undefined ? text(p.title, "The title", 120, true) : cur.title;
  const body = await checkBody(tx, p.body !== undefined ? p.body : p.edits !== undefined ? applyEdits(cur.body, p.edits) : cur.body);
  return docs.commit(tx, docId, { branch: b, target: asDoc(title, body), message, author });
}

export type StoryDraft = { story: string; branch?: number; edits?: unknown; body?: unknown; title?: string; message?: string };

/**
 * One step of a draft change to story `id`, as the admin `me`: edits (or a whole timeline, or a new title) on draft
 * `branch`, or on a new draft from the head. Every step is kept, with its message, who made it and when; the draft is
 * proposed as a version with propose_story_version (its `branch`).
 */
export async function editStory(db: Db, me: Me | null, p: StoryDraft, via: "web" | "mcp" = "mcp") {
  const who = admin(me);
  const id = `${p?.story ?? ""}`;
  if (!SLUG.test(id)) throw new StoryError("Name the story by its slug (list_stories).");
  const message = text(p.message, "The step's message (what it does)", 500, true);
  if (p.edits === undefined && p.body === undefined && p.title === undefined) throw new StoryError("A step is edits, a whole timeline (body) or a new title.");
  if (p.edits !== undefined && p.body !== undefined) throw new StoryError("Give edits or a whole timeline (body), not both.");
  return asStoryError(() =>
    db.transaction(async (tx) => {
      const { rows } = await tx.query<{ head: string | null; folded_into: string | null }>(`SELECT head, folded_into FROM play.stories WHERE id = $1`, [id]);
      if (!rows[0]) throw new StoryError(`There is no story ${id}: propose it as a new story (propose_story).`, 404);
      if (rows[0].folded_into) throw folded(id, rows[0].folded_into);
      if (!rows[0].head) throw new StoryError(`Story ${id} has no accepted version yet: a new story is proposed whole (propose_story).`, 409);
      const docId = await ensureStoryDoc(tx, id);
      const author = authorOf(who, via === "mcp" ? "mcp" : "site");
      const b = p.branch == null ? (await docs.branch(tx, docId, { author, note: message })).id : (await draftOf(tx, docId, id, p.branch)).id;
      const step = await draftStep(tx, id, docId, b, p, message, author);
      const now = await storyDocAt(tx, id, b);
      const steps = await docs.history(tx, docId, { branch: b });
      return { story: id, branch: b, step: step?.seq ?? null, changed: !!step, steps: steps.length, title: now.title, duration: now.body.duration };
    }),
  );
}

/** Propose a new story (`fresh`) or a new version of one, as the admin `me`, via `via`; filed as a proposal for an admin to decide. */
export async function proposeStory(db: Db, me: Me | null, p: StoryProposal, fresh: boolean, via: "web" | "mcp" = "mcp") {
  const who = admin(me);
  const id = `${p?.story ?? ""}`;
  if (!SLUG.test(id)) throw new StoryError("Name the story by a short slug: lower-case letters, digits and dashes, up to 64.");
  const note = text(p.note, "The note", 2000, true);
  const drafted = p.branch != null;
  if (drafted && fresh) throw new StoryError("A new story is proposed whole (its body); drafts are of a story that has a version.");
  if (!drafted && (p.body === undefined) === (p.edits === undefined)) throw new StoryError("Give the new timeline (body) or edits to the head's, not both and not neither.");
  if (drafted && p.body !== undefined && p.edits !== undefined) throw new StoryError("Give edits or a whole timeline (body) for the draft's last step, not both.");
  const author = authorOf(who, via === "mcp" ? "mcp" : "site");
  return asStoryError(() =>
    db.transaction(async (tx) => {
      const { rows: s } = await tx.query<{ head: string | null; title: string; number: number | null; body: StoryBody | null; folded_into: string | null }>(
        `SELECT s.head, s.title, v.number, v.body, s.folded_into FROM play.stories s LEFT JOIN play.story_versions v ON v.id = s.head WHERE s.id = $1 FOR UPDATE OF s`, [id],
      );
      if (s[0]?.folded_into) throw folded(id, s[0].folded_into);
      const head = s[0]?.head ?? null;
      if (fresh && head) throw new StoryError(`There is a story ${id} already: propose a version of it.`, 409);
      if (!fresh && !s[0]) throw new StoryError(`There is no story ${id}: propose it as a new story.`, 404);
      if (!fresh && !head) throw new StoryError(`Story ${id} has no accepted version yet: propose it as a new story.`, 409);
      if (p.base !== undefined && (p.base ?? null) !== head) throw new StoryError("Someone changed this story since you read it: make your change again on its newest version (get_story).", 409);
      let title: string, body: StoryBody, branchId: number, base: string | null;
      if (fresh) {
        title = text(p.title, "The title", 120, true);
        if (p.edits !== undefined) throw new StoryError("A new story is given as its whole timeline (body), not as edits.");
        body = await checkBody(tx, p.body);
        await tx.query(`INSERT INTO play.stories (id, coop_id, title) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`, [id, COOP, title]);
        const docId = await ensureStoryDoc(tx, id);
        branchId = (await docs.branch(tx, docId, { author, note })).id;
        await docs.commit(tx, docId, { branch: branchId, target: asDoc(title, body), message: note, author });
        base = null;
      } else {
        const docId = await ensureStoryDoc(tx, id);
        if (drafted) {
          const d = await draftOf(tx, docId, id, p.branch);
          if (p.body !== undefined || p.edits !== undefined || p.title !== undefined) await draftStep(tx, id, docId, d.id, p, note, author);
          if (!(await docs.history(tx, docId, { branch: d.id })).length) throw new StoryError(`Draft ${d.id} has no steps yet: there is nothing to propose.`);
          const cur = await storyDocAt(tx, id, d.id);
          title = cur.title;
          body = await checkBody(tx, cur.body);
          branchId = d.id;
          const n = await versionAtFrontiers(tx, id, d.base);
          base = n === null ? head : ((await tx.query<{ id: string }>(`SELECT id FROM play.story_versions WHERE story_id = $1 AND number = $2`, [id, n])).rows[0]?.id ?? head);
        } else {
          title = text(p.title ?? s[0]?.title, "The title", 120, true);
          body = await checkBody(tx, p.body !== undefined ? p.body : applyEdits(s[0]!.body!, p.edits));
          branchId = (await docs.branch(tx, docId, { author, note })).id;
          await docs.commit(tx, docId, { branch: branchId, target: asDoc(title, body), message: note, author });
          base = head;
        }
      }
      const parents = base ? [base] : [];
      const version = versionIdOf(id, parents, title, body);
      if (base) {
        const { rows: b } = await tx.query<{ title: string; body: StoryBody }>(`SELECT title, body FROM play.story_versions WHERE id = $1`, [base]);
        if (b[0] && version === versionIdOf(id, parents, b[0].title, b[0].body)) throw new StoryError("That is the head as it is: nothing changed.");
      }
      const proposal = randomUUID();
      await tx.query(
        `INSERT INTO play.story_versions (id, story_id, parents, title, body, note, author) VALUES ($1, $2, $3, $4, ($5::text)::jsonb, $6, $7) ON CONFLICT (id) DO NOTHING`,
        [version, id, parents, title, JSON.stringify(body), note, who.id],
      );
      await tx.query(
        `INSERT INTO play.proposals (id, coop_id, kind, story_id, story_base, story_version, author, note, via, doc_branch) VALUES ($1, $2, 'story_version', $3, $4, $5, $6, $7, $8, $9)`,
        [proposal, COOP, id, base, version, who.id, note, via, branchId],
      );
      await docs.propose(tx, docIdOf(id), branchId, { note, author });
      const steps = (await docs.history(tx, docIdOf(id), { branch: branchId })).length;
      return { id: proposal, story: id, version, number: (s[0]?.number ?? 0) + 1, base, duration: body.duration, branch: branchId, steps };
    }),
  );
}

// ---- one film, one timeline (Samuel 2026-11-03)

export type Fold = { into: string; from: string[] };
export type FoldReport = { folded: string[]; present: string[]; errors: string[] };

/**
 * Brings stories into one timeline: each story of `from`, in order, has its accepted versions proposed on `into` and
 * accepted there, one after the other, as that story's next versions (each by its own author and approver, its note
 * saying where it came from), and its open proposals proposed again on `into`'s new head, their own withdrawn. Then it
 * is folded: kept with its whole history, listed no more, taking no proposal. Run with every deploy (import/stories.ts);
 * a version already on `into` (the same title and timeline) is not brought twice, and a folded story is passed over.
 */
export async function foldStories(db: Db, folds: Fold[]): Promise<FoldReport> {
  const out: FoldReport = { folded: [], present: [], errors: [] };
  const as = async (human: string | null): Promise<Me> => {
    const { rows } = await db.query<{ id: string; name: string }>(`SELECT id, name FROM play.humans WHERE id = $1`, [human]);
    if (!rows[0]) throw new Error(`no human ${human}`);
    return { id: rows[0].id, name: rows[0].name, level: "admin", rule: {}, founder_number: null };
  };
  const onInto = async (into: string, title: string, body: unknown, accepted: boolean) =>
    (
      await db.query(
        `SELECT 1 FROM play.story_versions v WHERE v.story_id = $1 AND v.title = $2 AND v.body = ($3::text)::jsonb
            AND (${accepted ? "v.number IS NOT NULL" : "EXISTS (SELECT 1 FROM play.proposals p WHERE p.story_version = v.id AND p.status = 'open')"})`,
        [into, title, JSON.stringify(body)],
      )
    ).rows.length > 0;
  for (const f of folds) {
    for (const from of f.from) {
      try {
        if (!SLUG.test(f.into) || !SLUG.test(from) || from === f.into) throw new Error("a fold names two stories by their slugs");
        const { rows: st } = await db.query<{ id: string; folded_into: string | null }>(`SELECT id, folded_into FROM play.stories WHERE id = ANY($1)`, [[from, f.into]]);
        const src = st.find((x) => x.id === from), dst = st.find((x) => x.id === f.into);
        if (!src || src.folded_into) {
          out.present.push(from);
          continue;
        }
        if (!dst || dst.folded_into) throw new Error(`there is no story ${f.into} to bring it into`);
        const { rows: versions } = await db.query<{ number: number; title: string; body: StoryBody; note: string; created: Date; author: string | null; approved_by: string | null; via: string | null }>(
          `SELECT v.number, v.title, v.body, v.note, v.created, v.author, v.approved_by,
                  (SELECT p.via FROM play.proposals p WHERE p.story_version = v.id ORDER BY p.created LIMIT 1) AS via
             FROM play.story_versions v WHERE v.story_id = $1 AND v.number IS NOT NULL ORDER BY v.number`,
          [from],
        );
        for (const v of versions) {
          if (await onInto(f.into, v.title, v.body, true)) continue;
          const said = `(Brought from story ${from}, its v${v.number} of ${iso(v.created).slice(0, 10)}, so the film is one timeline.)`;
          const note = `${`${v.note ?? ""}`.slice(0, 2000 - said.length - 2)}\n\n${said}`.trim();
          const author = await as(v.author ?? v.approved_by);
          const made = await proposeStory(db, author, { story: f.into, title: v.title, body: v.body, note }, false, v.via === "web" ? "web" : "mcp");
          const decider = await as(v.approved_by ?? v.author);
          const res = await db.transaction(async (tx) => {
            const { rows } = await tx.query<any>(`SELECT * FROM play.proposals WHERE id = $1`, [made.id]);
            return decideStory(tx, decider, rows[0], "accept");
          });
          if (res.status !== "accepted") throw new Error(`${from} v${v.number} did not go in: ${(res as any).message ?? res.status}`);
        }
        // its open proposals, proposed again on the timeline's new head; their own withdrawn
        const { rows: open } = await db.query<any>(
          `SELECT p.*, v.title, v.body FROM play.proposals p JOIN play.story_versions v ON v.id = p.story_version
            WHERE p.story_id = $1 AND p.kind = 'story_version' AND p.status = 'open' ORDER BY p.created`,
          [from],
        );
        for (const p of open) {
          const author = await as(p.author);
          if (!(await onInto(f.into, p.title, p.body, false))) {
            const said = `(Moved from story ${from}, where it was proposed on ${iso(p.created).slice(0, 10)}: the film is one timeline now.)`;
            const note = `${`${p.note ?? ""}`.slice(0, 2000 - said.length - 2)}\n\n${said}`.trim();
            await proposeStory(db, author, { story: f.into, title: p.title, body: p.body, note }, false, p.via === "web" ? "web" : "mcp");
          }
          await db.transaction(async (tx) => {
            await tx.query(`UPDATE play.proposals SET status = 'withdrawn', decided_at = now() WHERE id = $1 AND status = 'open'`, [p.id]);
            await withdrawStory(tx, author, p);
          });
        }
        await db.query(`UPDATE play.stories SET folded_into = $2 WHERE id = $1`, [from, f.into]);
        out.folded.push(from);
      } catch (e) {
        out.errors.push(`${from} → ${f.into}: ${String((e as Error)?.message ?? e).slice(0, 300)}`);
      }
    }
  }
  return out;
}

/** each step with its author's name, and the version it was named where one was (an asset's history too, ./assetdocs.ts) */
export async function named(db: Queryable, steps: docs.Step[], versions: docs.Version[] = []) {
  const ids = [...new Set(steps.map((s) => s.author).filter((x): x is string => !!x))];
  const names = new Map((await db.query<{ id: string; name: string }>(`SELECT id, name FROM play.humans WHERE id = ANY($1)`, [ids])).rows.map((r) => [r.id, r.name]));
  const key = (f: docs.Frontiers) => canonical([...f].sort((a, b) => (a.peer < b.peer ? -1 : 1)));
  const at = new Map(versions.map((v) => [key(v.frontiers), v.number]));
  // a version marks the latest step at its point (a merge that only caught the main line up stands where the draft's
  // last step stood: the merge is the step that made it the version)
  const marked = new Map<number, number>();
  for (let i = steps.length - 1; i >= 0; i--) {
    const n = at.get(key(steps[i].frontiers));
    if (n !== undefined && ![...marked.values()].includes(n)) marked.set(i, n);
  }
  return steps.map((s, i) => ({ seq: s.seq, branch: s.branch, kind: s.kind, author: s.author ? names.get(s.author) ?? null : null, via: s.via, message: s.message, at: iso(s.created), bytes: s.bytes, version: marked.get(i) ?? null }));
}

/** a story proposal as people review it: the proposed timeline, the head's it was made from, what changed, and its steps */
export async function storyReview(db: Queryable, p: { story_id: string; story_base: string | null; story_version: string; doc_branch?: string | number | null }) {
  const { rows } = await db.query<{ id: string; title: string; body: StoryBody; number: number | null }>(
    `SELECT id, title, body, number FROM play.story_versions WHERE id = ANY($1)`, [[p.story_version, p.story_base].filter(Boolean)],
  );
  const next = rows.find((r) => r.id === p.story_version)!;
  const base = p.story_base ? rows.find((r) => r.id === p.story_base) ?? null : null;
  const steps = p.doc_branch != null ? await named(db, await docs.history(db, docIdOf(p.story_id), { branch: Number(p.doc_branch) })) : [];
  return {
    story: { id: p.story_id, title: next.title, ...next.body },
    baseStory: base ? { id: p.story_id, title: base.title, number: base.number, ...base.body } : null,
    diff: diffStories(base ? { title: base.title, body: base.body } : null, { title: next.title, body: next.body }),
    steps,
  };
}

/**
 * Accept or reject story proposal `p` (locked by the caller's transaction), as admin `me`. Accepted, its branch is
 * merged into the story's document and the version numbered, the document's version of the same number. Made on a head
 * that has moved on since, it still goes in where the two changes touch different fields (both stand, in a version
 * whose parents are both); where they touch the same field it goes stale, kept on its side line, to be proposed again.
 */
export async function decideStory(tx: Queryable, me: Me, p: any, verdict: "accept" | "reject") {
  if (me.level !== "admin") throw new Denied("Only Maia City's admins decide on stories.");
  return asStoryError(async () => {
    const docId = await ensureStoryDoc(tx, p.story_id);
    const branch = Number((await tx.query<{ doc_branch: string | null }>(`SELECT doc_branch FROM play.proposals WHERE id = $1`, [p.id])).rows[0]?.doc_branch);
    const author = authorOf(me, "site");
    const closeBranch = async (status: "rejected" | "stale") => {
      const { rows } = await tx.query<{ status: string }>(`SELECT status FROM play.doc_branches WHERE id = $1`, [branch]);
      if (rows[0] && (rows[0].status === "open" || rows[0].status === "proposed")) await docs.close(tx, docId, branch, { author, status });
    };
    if (verdict === "reject") {
      await tx.query(`UPDATE play.proposals SET status = 'rejected', decided_by = $2, decided_at = now() WHERE id = $1`, [p.id, me.id]);
      await closeBranch("rejected");
      return { id: p.id, status: "rejected" };
    }
    const { rows } = await tx.query<{ head: string | null; number: number | null }>(
      `SELECT s.head, v.number FROM play.stories s LEFT JOIN play.story_versions v ON v.id = s.head WHERE s.id = $1 FOR UPDATE OF s`, [p.story_id],
    );
    const head = rows[0]?.head ?? null, n = (rows[0]?.number ?? 0) + 1;
    const accepted = async (version: string) => {
      const v = await docs.accept(tx, docId, branch, { author, note: p.note });
      if (v.number !== n) throw new Error(`story ${p.story_id} and its document disagree: version ${n} against ${v.number}`);
      await tx.query(`UPDATE play.stories SET head = $2, title = (SELECT title FROM play.story_versions WHERE id = $2), updated = now() WHERE id = $1`, [p.story_id, version]);
      await tx.query(`UPDATE play.proposals SET status = 'accepted', decided_by = $2, decided_at = now() WHERE id = $1`, [p.id, me.id]);
    };
    if (head === (p.story_base ?? null)) {
      await tx.query(`UPDATE play.story_versions SET number = $2, approved_by = $3 WHERE id = $1`, [p.story_version, n, me.id]);
      await accepted(p.story_version);
      return { id: p.id, status: "accepted", number: n, version: p.story_version };
    }
    // the head moved on since this was made: merged where the two changes touch different fields, stale where the same
    let merged: { title: string; body: StoryBody } | null = null, clash: string[] = [];
    if (head && p.story_base) {
      const baseNumber = (await tx.query<{ number: number }>(`SELECT number FROM play.story_versions WHERE id = $1`, [p.story_base])).rows[0]?.number;
      const was = await docs.stateAt(tx, docId, { version: baseNumber });
      const now = (await docs.readDoc(tx, docId)).json, mine = (await docs.readDoc(tx, docId, { branch })).json;
      clash = overlap(docs.diff(was, now).map((c) => c.path), docs.diff(was, mine).map((c) => c.path));
      const preview = await docs.previewMerge(tx, docId, branch);
      if (!clash.length && !preview.problems.length) {
        const m = asStory(preview.json);
        try {
          merged = { title: text(m.title, "The title", 120, true), body: await checkBody(tx, m.body) };
        } catch {
          merged = null;
        }
      }
    }
    if (!merged) {
      await tx.query(`UPDATE play.proposals SET status = 'stale', decided_at = now() WHERE id = $1`, [p.id]);
      await closeBranch("stale");
      const where = clash.length ? ` It changes what v${n - 1} changed too (${clash.slice(0, 3).map((c) => c.replace(/^\$\./, "")).join(", ")}).` : "";
      return { id: p.id, status: "stale", message: `This story has a newer version than the one this was made on.${where} Propose the change again on its head.` };
    }
    const version = versionIdOf(p.story_id, [head!, p.story_version], merged.title, merged.body);
    await tx.query(
      `INSERT INTO play.story_versions (id, story_id, number, parents, title, body, note, author, approved_by) VALUES ($1, $2, $3, $4, $5, ($6::text)::jsonb, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
      [version, p.story_id, n, [head, p.story_version], merged.title, JSON.stringify(merged.body), `${p.note} (merged with v${n - 1})`.slice(0, 2000), p.author ?? null, me.id],
    );
    await accepted(version);
    return { id: p.id, status: "accepted", number: n, version, merged: true };
  });
}

/** a story proposal withdrawn by its author: its branch closed, its steps kept on their side line */
export async function withdrawStory(tx: Queryable, me: Me, p: any) {
  if (p.doc_branch == null) return;
  const { rows } = await tx.query<{ status: string }>(`SELECT status FROM play.doc_branches WHERE id = $1`, [p.doc_branch]);
  if (rows[0] && (rows[0].status === "open" || rows[0].status === "proposed")) await docs.close(tx, docIdOf(p.story_id), Number(p.doc_branch), { author: authorOf(me, "site"), status: "withdrawn" });
}

// ---- a story's history, step by step

/** every step of story `id` (its main line with each accepted proposal's steps, or one draft's), its versions and drafts */
export async function storyHistory(db: Db, me: Me | null, id: string, o: { branch?: number } = {}) {
  admin(me);
  if (!SLUG.test(id)) throw new StoryError("A story is named by a short slug.", 404);
  return asStoryError(async () => {
    const docId = await db.transaction((q) => ensureStoryDoc(q, id));
    const versions = await docs.versionsOf(db, docId);
    const steps = await named(db, await docs.history(db, docId, o.branch === undefined ? {} : { branch: o.branch }), versions);
    const { rows: drafts } = await db.query<any>(
      `SELECT b.id, b.status, b.note, b.created, h.name AS author, p.id AS proposal, p.status AS proposal_status,
              (SELECT count(*) FROM play.doc_updates u WHERE u.branch = b.id) AS steps
         FROM play.doc_branches b LEFT JOIN play.humans h ON h.id = b.created_by LEFT JOIN play.proposals p ON p.doc_branch = b.id
        WHERE b.doc_id = $1 ORDER BY b.id`,
      [docId],
    );
    return {
      story: id,
      steps,
      versions: versions.map((v) => ({ number: v.number, note: v.note, at: iso(v.created), contentHash: v.contentHash })),
      drafts: drafts.map((d) => ({ id: Number(d.id), status: d.status, note: d.note, at: iso(d.created), author: d.author, proposal: d.proposal, steps: Number(d.steps) })),
    };
  });
}

/** story `id` as it was at step `seq` of its history */
export async function storyAtStep(db: Db, me: Me | null, id: string, seq: number) {
  admin(me);
  if (!SLUG.test(id)) throw new StoryError("A story is named by a short slug.", 404);
  if (!Number.isInteger(seq) || seq < 1) throw new StoryError(`${seq} is not a step.`, 404);
  return asStoryError(async () => {
    const docId = await db.transaction((q) => ensureStoryDoc(q, id));
    const { title, body } = asStory(await docs.stateAt(db, docId, { step: seq }));
    return { id, title, step: seq, ...body };
  });
}

/** A story kept in the repo, written as its accepted v1 where play holds no story of its id (import/stories.ts). */
export async function seedStory(db: Db, id: string, title: string, note: string, given: unknown): Promise<boolean> {
  if (!SLUG.test(id)) throw new StoryError("its folder's name is no story's slug");
  const body = await checkBody(db, given);
  const t = text(title, "The title", 120, true);
  const version = versionIdOf(id, [], t, body);
  return db.transaction(async (tx) => {
    const { rows } = await tx.query(`INSERT INTO play.stories (id, coop_id, title) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING RETURNING id`, [id, COOP, t]);
    if (!rows.length) return false;
    await tx.query(
      `INSERT INTO play.story_versions (id, story_id, number, parents, title, body, note) VALUES ($1, $2, 1, '{}', $3, ($4::text)::jsonb, $5)`,
      [version, id, t, JSON.stringify(body), text(note, "The note", 2000)],
    );
    await tx.query(`UPDATE play.stories SET head = $2 WHERE id = $1`, [id, version]);
    // and its document, its first step that version
    await ensureStoryDoc(tx, id);
    return true;
  });
}

// ---- recordings

/** The audio type of `bytes`, by how they start, or null */
export const audioType = (bytes: Uint8Array): string | null => AUDIO.find((a) => a.is(bytes))?.type ?? null;

/** Keep one recording (MP3, WAV, Ogg, FLAC, M4A or WebM audio, at most MOST_AUDIO bytes) among play's files; its hash. */
export async function putAudio(db: Queryable, store: BlobStore, bytes: Uint8Array, said?: string): Promise<{ hash: string; size: number; media_type: string }> {
  if (!bytes.length) throw new StoryError("The recording is empty.");
  if (bytes.length > MOST_AUDIO) throw new StoryError(`A recording is at most ${MOST_AUDIO / 1e6} MB.`, 413);
  const type = audioType(bytes);
  if (!type) throw new StoryError("A recording is MP3, WAV, Ogg, FLAC, M4A or WebM audio.", 415);
  if (said && said !== type && !(said === "audio/mp3" && type === "audio/mpeg") && !(said === "audio/x-wav" && type === "audio/wav")) throw new StoryError(`Those bytes are ${type}, not ${said}.`, 415);
  const hash = hashBytes(bytes);
  const key = (await store.has(hash)) ? keyOf(hash) : await store.put(hash, bytes, type);
  await db.query(`INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, $2, $3, $4) ON CONFLICT (hash) DO NOTHING`, [hash, bytes.length, type, key]);
  return { hash, size: bytes.length, media_type: type };
}

/** A recording given as base64 (an agent's), checked and kept */
export async function putAudioBase64(db: Queryable, store: BlobStore, data: unknown, mediaType: unknown) {
  if (typeof data !== "string" || !data) throw new StoryError("Give the recording as base64 text (data).");
  const clean = data.replace(/^data:[^,]*,/, "").replace(/\s+/g, "");
  if (clean.length > Math.ceil((MOST_AUDIO * 4) / 3) + 8) throw new StoryError(`A recording is at most ${MOST_AUDIO / 1e6} MB.`, 413);
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) throw new StoryError("That is not base64.");
  return putAudio(db, store, new Uint8Array(Buffer.from(clean, "base64")), typeof mediaType === "string" ? mediaType : undefined);
}

// ---- frames

/** The image type of `bytes`, by how they start, or null */
export const imageType = (bytes: Uint8Array): string | null => IMAGES.find((i) => i.is(bytes))?.type ?? null;

/** Keep one frame (an image, at most MOST_FRAME bytes) among play's files; its hash. */
export async function putFrame(db: Queryable, store: BlobStore, bytes: Uint8Array, said?: string): Promise<{ hash: string; size: number; media_type: string }> {
  if (!bytes.length) throw new StoryError("The frame is empty.");
  if (bytes.length > MOST_FRAME) throw new StoryError(`A frame is at most ${MOST_FRAME / 1e6} MB.`, 413);
  const type = imageType(bytes);
  if (!type) throw new StoryError("A frame is a JPEG, PNG or WebP image.", 415);
  if (said && said !== type) throw new StoryError(`Those bytes are ${type}, not ${said}.`, 415);
  const hash = hashBytes(bytes);
  const key = (await store.has(hash)) ? keyOf(hash) : await store.put(hash, bytes, type);
  await db.query(`INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, $2, $3, $4) ON CONFLICT (hash) DO NOTHING`, [hash, bytes.length, type, key]);
  return { hash, size: bytes.length, media_type: type };
}

/** A frame given as base64 (an agent's), checked and kept */
export async function putFrameBase64(db: Queryable, store: BlobStore, data: unknown, mediaType: unknown) {
  if (typeof data !== "string" || !data) throw new StoryError("Give the image as base64 text (data).");
  const clean = data.replace(/^data:[^,]*,/, "").replace(/\s+/g, "");
  if (clean.length > Math.ceil((MOST_FRAME * 4) / 3) + 8) throw new StoryError(`A frame is at most ${MOST_FRAME / 1e6} MB.`, 413);
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) throw new StoryError("That is not base64.");
  return putFrame(db, store, new Uint8Array(Buffer.from(clean, "base64")), typeof mediaType === "string" ? mediaType : undefined);
}
