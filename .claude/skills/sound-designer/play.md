# Sound on play's story timeline

A story (play/SPEC.md §12, `story/1`) sounds through its clips. **Any clip of any track may carry a recording**; the
Stories player lays them all on one Web Audio clock and its playhead follows that clock
(`play/site/src/lib/stories/sound.ts`, after the old studio's `schedule`).

| field | on | what |
|---|---|---|
| `audio` | a clip | a recording's file hash, from `add_story_audio` (MP3, WAV, Ogg, FLAC, M4A, WebM; ≤ 25 MB) |
| `audio_in` | a clip | where in the recording the clip starts, seconds (a trim) |
| `gain` | a clip, a track | dB (−60…+24); the track's adds to its clips' |
| `fade_in`, `fade_out` | a clip | seconds (defaults: voice 0.03 / 0.08, others 0.06 / 0.3) |
| `eq` | a clip | up to 8 biquads `{ type: highpass\|lowshelf\|peaking\|notch\|highshelf\|lowpass, f, gain, q }` |
| `keys` | a clip | gain automation `[[seconds into the clip, dB], …]`, straight lines between |
| `mute` | a track | left out of the mix |

- **Tracks by kind:** `voice` (each line's take on its clip; its clips never overlap), `music` (the score and cues,
  steady under the voice: no ducking unless the track says `duck: true`, Samuel 2026-11-04), `sfx` (spot sounds and hits), `ambience`
  (the beds). Sound tracks other than voice may overlap their clips.
- A clip plays from `at` for `duration`: a take longer than its clip is cut, so **retime the clip to its take** (a
  breath of 0.3–0.5 s after it), and shift what follows.
- A voice clip with a take is not read by the browser's voice; one without can still be (the player's Voice button).

## A story voiced end to end

1. Read it: `get_story` (at a step, or a draft with `story_history`). Voice the **latest** version: ask which one the
   session that owns the story is building on, and never voice a script that is about to change.
2. One take per voice line, directed by its note (`voice.md`), on fal. Trim the silence at both ends
   (`silenceremove`, −45 dB) and transcribe each take back (`fal-ai/wizper`); take again what doesn't match.
3. `add_story_audio` each take (base64), and set the voice clip's `audio`; retime every clip to its take.
4. Music, sfx and beds the same way, each on its track, at its track's level (`mix.md`).
5. Check the hand-overs and the voice: `check_mix.py` on the body (`transitions.md`) must pass.
6. Propose: `propose_story_version` (edits `set_clip` with `audio`, `shift` to make room) or the whole body. A story
   with no accepted version yet takes no version: its first is proposed whole (`propose_story`).
