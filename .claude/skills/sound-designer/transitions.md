# Transitions: planned first, then built, then measured

Samuel 2026-11-04, after a day of hearing them fail in the vision trailer: "all music transitions are super, super bad
... I needed to reprompt and reprompt you again and again, and you can do by default this way better." Every one of its
transitions was fixed alone, after he complained about it. Each fix was measured but none was planned, and most fixes
broke something next to them:
- a gap, then a hard cut;
- a J-cut that was too much;
- a seam on the beat that still sounded like a cut;
- a line that came too soon.

The default is this method, used **before any music is made** and again before every proposal. A hard cut, a gap or a
silence is only ever there because the plan says it is a break, and the proposal's note says why.

**A method, not a table of numbers.** Each film, each section and each timeline has its own dynamic (Samuel
2026-11-04: "those shouldn't be generic standard rules ... in this case you need a longer pause of thinking, where the
voice is still"). The numbers below are floors and typical ranges; every boundary's pause is a decision made for its
moment: what the listener must feel or think there, and how long that takes.

## The method

1. **Map every boundary first.** Before generating a cue, write one line for each section change in the plan:
   - its **kind**: FLOW, TURN or BREAK (below);
   - the **voice's pause** there: chosen for the moment, written as the section's notes clip's `breath` (seconds of a
     still voice before its first line), which `check_mix.py` then holds the timeline to;
   - what the **outgoing** music does: runs on, ends its phrase and rings out, or stops;
   - what the **incoming** music does: is already under it, swells in, or lands on its downbeat inside the pause;
   - the **keys and tempi** on both sides.

   The map is the score's design. Each cue is generated to fit it, not fitted after.
2. **Give the voice the room each change needs.** A quick turn into a nervous world can be 1.5 s. A thought that has
   to land before a new world opens can be 4–5 s of a still voice: in the vision trailer, the night falling silent
   after "the forest goes quiet.", the first dawn bird, and only then "Now imagine a million of us". The music turns
   inside the voice's pause, never under a word:
   - the outgoing's last hit and the incoming's arrival at full both fall in the pause;
   - after a TURN, the first line comes once the new music has spoken, about a bar after its downbeat;
   - the lines are what moves (a breath longer, a gap shorter); the music's accents stay where they are;
   - inside a section, lines can stay close.
3. **Compose for the joins** (`score.md`):
   - Sections of one energy and tempo are **one cue** (rule 9).
   - Every other cue is generated knowing its neighbours:
     - in a key related to theirs (the same key, the relative key, or a fifth away);
     - with its **entrance** asked for: a one-bar swell into its first downbeat, or a soft pad to rise under the outgoing;
     - with its **ending** asked for: a cadence ringing out on its tonic for 2–3 s;
     - with the neighbour as its `audio_reference` (strength low or medium), so the instruments and the mix carry across.
   - Make three or four takes and choose by measuring.
4. **Place, then measure every boundary** with `check_mix.py` (below): its section table, and every flag. Fix
   everything before proposing. The only flag left is a break Samuel asked for, passed with `--allow`.
5. **Write the map in the proposal's note**, one line per boundary, so Samuel reads the intent before he hears it.

## The three kinds of boundary

| kind | when | the voice's pause (a floor and a typical range; the plan sets it) | the music |
|---|---|---|---|
| **FLOW** | the energy runs on (an intro into a trailer, one section's two halves) | 0.6–1 s | one cue across it, or the incoming's downbeat on the outgoing's bar line in place of its final hit (rules 3, 9); no seam |
| **TURN** | the mood, the energy or the world changes (the old way into the brick, the life into the city) | 1.5–2.5 s | the outgoing ends its phrase and rings out for 1–3 s (the L-cut); the incoming has begun softly under it, from about −20 dB, and is up by the pause's end (the J-cut); the two keys are related or staggered (rule 5) |
| **BREAK** | the story stops to breathe or to think (the night falling silent before the city; the old way's dead stop into "Here.") | 2 s and up, as long as the thought needs (the city: 4.4 s) | the outgoing's own ending (a cadence and its ring, or a planned dead stop); the beds sink but stay under; then one sound with intent (the voice, or the incoming's first beat). Planned, asked for, and in the note |

## The rules

1. **Overlap, never a gap, in a FLOW or a TURN.**
   - The outgoing cue rings on past the boundary (the L-cut, 1–3 s) while the incoming one has already begun under it
     (the J-cut, 0.5–2 s before).
   - The music never drops out there: not for a second, not "covered by birdsong".
   - Silence is only a BREAK's, planned at 2–3.5 s and carried by the beds. Never digital silence (`design.md`).
2. **Find where a cue really ends before you place the next one.**
   - A generated cue (ElevenLabs Music) usually decays to nothing in its last 1–2 s, and often a section of it is a fade.
   - Measure its loudness curve (ffmpeg's `ebur128=metadata=1` momentary loudness, read every 0.5 s) and hand over where
     its decay *begins*, not where its file ends.
   - Measure where the next cue's energy really starts too.
3. **A cue enters on its own first downbeat or a bar line, never mid-phrase.**
   - Do not trim a cue's head (`audio_in`) into a running phrase to make it fit: that is a jolt.
   - Find its tempo and downbeats (onset autocorrelation). To make a cue longer, repeat a bar at a bar line; to make it
     shorter, move it or trim at a bar line. To land its climax on a word, move the lines or the cue, not its head.
   - **Two cues of one tempo run as one piece.** The incoming cue's downbeat lands on the outgoing cue's own bar line
     (within a few ms, measured, not by the generation's nominal bpm), in place of the outgoing's final hit.
   - Never let the outgoing strike its last chord and then bring the incoming in after it: the music ends and starts
     again, a cut however smooth the levels. The vision trailer's v12, hook into trailer: the intro's final chord, then
     the trailer 0.41 s later and 32 ms off the beat, E major into G major. Samuel: "a really abrupt cut".
   - Let the outgoing swell into that bar line and end it there. Under the incoming's first bar, carry on only its ring,
     with its low end and chords taken out when the keys differ (a highpass at about 1.2 kHz).
4. **An entrance is heard within a second.**
   - A new section's music is audible within about 1 s of its first beat. A swell of 1.5–2.5 s from about −20 dB is a
     J-cut; a cue that rises out of near-silence over many seconds reads as nothing (Samuel 2026-11-04).
   - Start it soft under the outgoing sound and let it swell, rather than fading it in from zero.
   - The first second of a recording can be near-silent (a pad's attack): leave it out with `audio_in` and keep its end
     where it was.
5. **Keys and tempo across the overlap.**
   - Check both cues' keys (a key-profile estimate) and tempi.
   - Same key, or a fourth or fifth apart: they can cross-fade freely.
   - Keys whose tonic chords share no note (D major and C major): stagger them, the outgoing mostly gone before the
     incoming is up.
   - When generating a cue, ask for the key of what it hands over to.
6. **Within a section, a cue breathes by its own shape** (no ducking on play, `mix.md`). Lift a pause with the clip's
   `keys`, hold a build back a dB or two under a line and let it burst after; never a dip under every word.
7. **Spot sounds by where they sound, not where the file starts.** Measure the first audible moment of an effect (a bee
   recording starts quiet and buzzes 0.7 s in) and place that moment just after its word. Skip a quiet head with
   `audio_in`.
8. **Every cue builds up and builds down.**
   - The film's first music swells into its first beat over about half a second, never at full on the first frame
     (Samuel 2026-11-04: "always have build ups and build downs, unless it helps to give the story like a good break
     and you want it").
   - Every cue ends by ringing out, fading or handing over.
   - A hard start or a dead stop only as a planned BREAK, said in the note.
9. **Sections of one energy and tempo are one cue, not two joined.**
   - An intro running straight into a trailer is composed as one piece: one composition plan, its sections as chunks,
     the intro's old cue as the first chunk's `audio_reference`.
   - Not two generated cues butted together. Even on the beat and in place of the final hit (rule 3), a seam between two
     recordings changes the mix, the instruments and the key at once and is heard as a cut (Samuel 2026-11-04, the
     vision trailer's v13: "still very hard"; v15 is one cue).
   - Make three or four takes and choose by measuring: a swell at its start, one beat all through, no dip at the chunks'
     joins, accents where the words need them.
   - Land its accents on the words by its `audio_in` and the lines' gaps, never by cutting it.
10. **The voice breathes at every section's change** (the method's step 2, the table above):
    - each change's pause planned for its moment and written as its notes' `breath`; the floors only keep a line from
      running straight into a change (FLOW 0.6 s, TURN 1.5 s);
    - After a trailer's crest, about 1.5 s before the next line ("then for real." … "Maia, can you…").
    - Before a bridge into a new world, the night falls silent first (Samuel 2026-11-04: "a short breathing break of
      voiceover between 3 and 4, so the night turns silent", then "Now imagine a million of us").

11. **A segment played in every film (the trailer) stands on its own.**
    - It must work after any intro, so it shares nothing with the intro: no key, no beat, no seam (Samuel 2026-11-04:
      "the trailer we will play every video again and again, and each intro will be different, so it should work with
      any intro music").
    - The intro builds down after its last line: an even fade of about 30 dB over 1.5–2 s (in `keys`, linear in dB, not a
      linear-amplitude fade, whose tail drops like a cut), or its own composed ending.
    - A breath of 1.5–2 s. The segment's voice may begin in it, over its own soft air bed, never in dead silence.
    - The segment builds up on its own: its music swells in within a second of entering and rises through its first
      line, held back under its last line, its big moment right after it.
    - It is its own story, linked into each film (play's linked stories). Rule 9 (one cue for one energy) is for a film's
      own sections; between a film and a reused segment the break is the design.

## Measure it: check_mix.py

```
python3 .claude/skills/sound-designer/check_mix.py story.json [--min-voice 10] [--allow SECONDS ...]
```

It simulates the mix as the Stories player plays it: each clip's trim, its gain and its track's, keys, fades and EQ,
weighted like hearing. It prints:
- every voice line's margin over the rest;
- a table of the section changes: each one's kind (TURN where a music clip starts or ends within 2 s, or a bed or an
  effect starts within 1 s, else FLOW) and the voice's pause there;
- the music and beds in 0.5 s steps around every section boundary and every music clip's first and last second.

It fails (exit 1) on:

| flag | what it means | the fix |
|---|---|---|
| BREATH | the voice pausing less than its section's planned `breath` (less 0.2 s), or, with no plan, less than the floor (1.5 s at a TURN, 0.6 s at a FLOW) | plan the pause for its moment and move the lines (rule 10) |
| HOLE | the music under −52 dB with the beds under −45 for 0.4 s, or the music under −50 for a second even over the beds | overlap the cues (rules 1–2), or pass a planned BREAK with `--allow` |
| JUMP | the music rising more than 12 dB within 0.25 s out of near-silence: a hard cut in | a J-cut: start it earlier and softer, swell (rule 4) |
| CUT | the music falling more than 15 dB within 0.25 s with nothing taking over | let it ring out or fade, or hand it over (rules 1, 8); a wanted dead stop passes with `--allow` |
| BUILD | the film's first music at full less than 0.4 s after its first sound | start it on its own swell (`audio_in`), ease it in with `keys` (rule 8) |
| LATE | a music clip still under −42 dB a second after it starts | start it on its energy, leave a silent head out (rule 4) |
| LOW | a line under `--min-voice` dB over the rest | the music's keys under that line, or its EQ pocket (`mix.md`) |
| OFFBEAT | two cues of one tempo (within 3 %) whose beats are more than 30 ms apart where one takes over | move the incoming so its downbeat lands on the outgoing's bar line (rule 3) |
| ENDING | the outgoing cue strikes its final hit and the incoming, of the same tempo, comes more than 0.15 s after it | end the outgoing before its final hit; the incoming's downbeat takes that hit's place (rule 3), or make the two one cue (rule 9) |

Run it on the body you are about to propose (local recordings, or play's hashes fetched with `$PLAY_MCP_TOKEN`), and
propose only when it passes. A break Samuel heard and wants is passed with `--allow` and its second, and the note says
why.

## What it missed, and learned (the vision trailer, 2026-11-04)

Every flag above was added after Samuel heard what the one before could not show. Each now flags the version he heard
and passes the fix.

| what Samuel heard | the version | what it learned |
|---|---|---|
| gaps between the old way, the brick and the life; a hard cut into the city | v6, v8 | HOLE, JUMP, LATE |
| the intro ending, then the trailer starting again | v12 | OFFBEAT, ENDING |
| the intro at full on the first frame | v14 | BUILD, CUT, and the film's first moment checked |
| the bridge into the city starting right on "the forest goes quiet." | v15 | BREATH |
| (the trailer as its own story, its music starting 1.4 s in: BUILD measured a second from the film's start, not from the music's first sound) | v17 | BUILD measures from the first sound |
| the handover into the old way (warmth into unease, the horn and the traffic arriving) passed as a FLOW with a 0.95 s pause | v17 | a section change where a bed or an effect arrives is a TURN |
| the pause before the city met the table's number but was too short for its moment ("a longer pause of thinking") | v18 | each change's pause planned in its notes (`breath`), not taken from a table |

A clean check is not a good transition: the plan is. Write the map first, so the next flag never needs Samuel's ear to
find it.
