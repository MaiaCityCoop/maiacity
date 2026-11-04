# Transitions: how one cue hands over to the next

Samuel 2026-11-04, after a day of hearing them fail: "the good music transitions need to happen properly" and he should
never have to ask for it. Every hand-over between two cues, two sections or two beds is built as an L-cut and a J-cut and
**measured before the story is proposed** (`check_mix.py` below). A hard cut or a gap is only ever there because he asked
for it, and the proposal's note says so.

## The rules

1. **Overlap, never a gap.** The outgoing cue rings on past the boundary (the L-cut, 1–3 s) while the incoming one has
   already begun under it (the J-cut, 0.5–2 s before). The music never drops out between two cues: not for a second, not
   "covered by birdsong". A section's "breath" or "break" is a hush the outgoing tail and the beds still carry, 0.8–1.5 s,
   never silence; digital silence never (`design.md`).
2. **Find where a cue really ends before you place the next one.** A generated cue (ElevenLabs Music) usually decays to
   nothing in its last 1–2 s, and often a section of it is a fade: measure its loudness curve (ffmpeg's `ebur128=metadata=1`
   momentary loudness, read every 0.5 s) and hand over where its decay *begins*, not where its file ends. Measure where the next cue's
   energy really starts too.
3. **A cue enters on its own first downbeat or a bar line, never mid-phrase.** Do not trim a cue's head (`audio_in`) into
   a running phrase to make it fit: that is a jolt. Find its tempo and downbeats (onset autocorrelation); to make a cue
   longer, repeat a bar at a bar line; to make it shorter, move it or trim at a bar line; to land its climax on a word,
   move the lines or the cue, not its head.
   **Two cues of one tempo run as one piece:** the incoming cue's downbeat lands on the outgoing cue's own bar line (within
   a few ms, measured, not by the generation's nominal bpm), and in place of the outgoing's final hit. Never let the
   outgoing strike its last chord and then bring the incoming in after it: the music ends and starts again, a cut
   however smooth the levels (the vision trailer's v12, hook into trailer: the intro's final chord, then the trailer
   0.41 s later and 32 ms off the beat, E major into G major; Samuel: "a really abrupt cut"). Let the outgoing swell
   into that bar line, end it there, and carry on only its ring, its low end and chords taken out when the keys differ
   (a highpass at about 1.2 kHz), under the incoming's first bar.
4. **An entrance is heard within a second.** A new section's music is audible within about 1 s of its first beat (a
   swell of 1.5–2.5 s from about −20 dB is a J-cut; a cue that rises out of near-silence over many seconds reads as
   nothing, Samuel 2026-11-04). Start it soft under the outgoing sound and let it swell, rather than fading it in from zero.
   The first second of a recording can be near-silent (a pad's attack): leave it out with `audio_in` and keep its end where
   it was.
5. **Keys and tempo across the overlap.** Check both cues' keys (a key-profile estimate) and tempi. Same key, or a
   fourth/fifth apart, can cross-fade freely; keys with no common notes (D major and C major) are staggered: the outgoing
   mostly gone before the incoming is up. When generating a cue, ask for the key of what it hands over to.
6. **Within a section, a cue breathes by its own shape** (no ducking on play, `mix.md`): lift a pause with the clip's
   `keys`, hold a build back a dB or two under a line and let it burst after; never a dip under every word.
7. **Spot sounds by where they sound, not where the file starts.** Measure the first audible moment of an effect (hens,
   geese, bees: a bee recording starts quiet and buzzes 0.7 s in) and place that moment just after its word; skip a quiet
   head with `audio_in`.
8. **Give a speaker's change a breath after a big musical moment:** after a trailer's crest, 1.2–1.5 s before the next
   line ("then for real." … "Maia, can you…", Samuel 2026-11-04).

## Measure it: check_mix.py

```
python3 .claude/skills/sound-designer/check_mix.py story.json [--min-voice 10] [--allow SECONDS ...]
```

It simulates the mix as the Stories player plays it (each clip's trim, gain and its track's, keys, fades, EQ, weighted
like hearing) and prints every voice line's margin over the rest, and the music and beds in 0.5 s steps around every
section boundary and every music clip's first and last second. It fails (exit 1) on:

| flag | what it means | the fix |
|---|---|---|
| HOLE | the music under −52 dB with the beds under −45 for 0.4 s, or the music under −50 for a second even over the beds | overlap the cues (rules 1–2) |
| JUMP | the music rising more than 12 dB within 0.25 s out of near-silence: a hard cut in | a J-cut: start it earlier and softer, swell (rule 4) |
| LATE | a music clip still under −42 dB a second after it starts | start it on its energy, leave a silent head out (rule 4) |
| LOW | a line under `--min-voice` dB over the rest | the music's keys under that line, or its EQ pocket (`mix.md`) |
| OFFBEAT | two cues of one tempo (within 3 %) whose beats are more than 30 ms apart where one takes over | move the incoming so its downbeat lands on the outgoing's bar line (rule 3) |
| ENDING | the outgoing cue strikes its final hit and the incoming, of the same tempo, comes more than 0.15 s after it | end the outgoing before its final hit; the incoming's downbeat takes that hit's place (rule 3) |

Run it on the body you are about to propose (local recordings or play's hashes, fetched with `$PLAY_MCP_TOKEN`) and
propose only when it passes. A break Samuel heard and wants is passed with `--allow` and its second, and the note says
why. The day it was written it flagged every break Samuel had complained of in the vision trailer's v6 and v8 (the intro
into the trailer, the old way into the brick, the brick into the life, the life into the city) and passed v12; Samuel
then still heard v12's intro end and the trailer start again, which its levels could not show, so it learned OFFBEAT and
ENDING (each cue's pulse measured from its recording by onset autocorrelation, its last hit as its ending's start): they
flag v12 and pass v13.
