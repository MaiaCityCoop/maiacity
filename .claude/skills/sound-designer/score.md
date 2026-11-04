# The score: an original one per film

Called on fal directly (the old `score.ts` runner is gone with the refactor, `SNAPSHOT_2611101`); keep each take with add_story_audio on a `music` track's clip (`play.md`).

- ElevenLabs Music v2.5 on fal (`elevenlabs/music/v2.5`) with a `composition_plan` of chunks (3–120 s each, at most
  30). `music.chunks` in the shot list gives each section's `until` on the film's clock and its `styles`; negative
  styles keep it instrumental (vocals, lyrics, singing, drum machine, EDM). `force_instrumental` can't be combined with
  a plan.
- Make an A and a B take and choose. A new score replaces the old one's CID in the shot list; take B prints its CID.
- **Each section switches with the arc** so the swell lands on the high and the drop on the low. Day 19: pre-dawn pad →
  sunrise swell (brass, strings, choir) → a drop to a lone cello drone → warm piano → marimba and pizzicato → full,
  joyful → the epic peak (the pride) → a sudden quiet (piano and cello) → a final hopeful swell that fades.
- **Cues** (`music.cues`, `score.ts --only cues`, cut into A2 by `musicClips()` in `sound.ts`): the score's own turns
  without composing it again. `replace: true` takes the score's place for its stretch (it comes back at
  `music.back`); others lie on top; a cue's `blend` overlaps its end with the score's return. Day 19: a dread cue over
  the low (a dissonant impact on the cut, low string clusters, a machine pulse) ending in silence on "Here…", then
  0.35 s later a **breakfast** cue bursting in (a sunburst chord, bouncy piano, pizzicato, 92 bpm).
- **A turn needs energy, not just warmth:** joy after the low is a lift in loudness, rhythm and brightness at once
  (`storyteller`, `retention.md`).
- **No ducking on play** (Samuel 2026-11-04): the music keeps a clean, continuous flow at a level the voice sits over,
  with a 2–4 kHz pocket. The old render's ducker, for the record: the render ducks A2 with the voice as key (sidechain, about −6 dB, 120 ms
  attack, 900 ms release). Score around 0.6.

## Choosing music from the script, before the shoot

Match the music to where the script's energy rises, slows and breathes, one kind of music per emotional section
(momentum, pressure, reflection), chosen before shooting. Then edit the songs themselves — stretch a section, move the
climax earlier or later — so they land on the script's beats: the music suggests the movement, the rhythm and how long a
moment lasts, and holds the film together as one experience (Tim Runia; LifeOfRiza picks her songs before shooting too).

## Spotting: where music plays, and where it doesn't

Music carries a feeling the scene has already earned; it never makes it. Music that creates the emotion is like a
steroid — a short-term edge paid for by the film's health (Murch). If a beat lands with picture, voice and bed, leave
it unscored. *No Country for Old Men* holds about sixteen minutes of music, credits included (Burwell, Lievsay).

The spotting pass for a 3–5 minute film from a cold low to a warm high:

0. **Read the emotional journey first** (`storyteller`, `emotion.md`; the Story track's feelings): the score changes
   where the feeling changes — a cold feeling gets a sparse, low, unresolved bed, a release a resolved swell.
1. **Watch it without music**, voice and beds only. Mark each beat of the intensity curve, and where the feeling
   already lands: those are silence or bed-only candidates.
2. **Spot the silences first:** the cold open (bed only), the line before the turn, the breath before the last line.
   Write them into the cue list as decisions.
3. **Source or score.** Music the world can hear (a radio in the room) is source — worldize it (`design.md`). Score is
   for the viewer alone. Where a moment must feel lived rather than filmed, leave the score out.
4. **One line per cue:** in, out, what it does, its hit points. Fix the out-points now; they cause most rewrites. Hit
   only what the eye should land on.
5. **Plant one theme for the destination.** In the low: one instrument, slow, unresolved. At the high: the same motif,
   fuller, resolved, with rhythm — varied at every return, never repeated unchanged.
6. **Build the low's tension without a tune:** sustained tones pitched to the bed, so the score seems to rise out of
   the sound and sink back (Burwell tuned a cue to a fridge's hum). End low sections on links, unresolved, not on
   buttons.
7. **Sneak an entrance in under a sound** (a door, a gust, a passing truck) so its start goes unnoticed; come in hard
   only when the jolt is the point.
8. **Release at the turn:** resolve the harmony, bring the motif in whole (with the energy of the turn in the `storyteller`'s `retention.md`).
9. **Edit at bar lines and phrase ends;** shorten or lengthen by whole bars or phrases. In an emotional stretch, cut
   picture on bars or phrases: cutting on every beat fights the music.
10. **End on a real ending.** Crossfade into the cue's own ending on a strong beat; a fade is the last resort. A button
    (a resolved chord or hit) closes a section and can carry a scene change. On the last frame: a button closes, a
    held tail leaves the loop open.
11. **Judge takes by function, not by the temp.** Write down what the temp track does (pace, where the cut lands, the
    feeling) and judge the new take against that. Beware temp love.
12. **Mute each cue once.** If the scene plays as well without it, cut the cue.

Whether ElevenLabs Music holds one melody across its chunks is untested: keep the take that does.

**What a generated cue does at its edges, and with its chunks** (measured on the vision trailer, 2026-11-04): it starts
at full level on its first downbeat (good to enter on) unless asked for a pad, whose first second can be near-silent; it
decays to nothing over its last 1–2 s; and a chunk's planned length is only roughly kept (a 4.8 s intro came out 9.6 s, a
climax planned at 16.5 s landed at 15.0 s). Make three takes, measure each one's loudness curve, onsets, tempo and key,
and place it by what it really does: its climax on the word, its handovers where its decay begins (`transitions.md`).
Ask for the key of the cue it hands over to.

**One cue across sections of one energy, styled by a reference** (the vision trailer's v15, 2026-11-04): the hook and the
trailer were composed as one plan of five chunks (pulse, bloom, trailer, ascent, arrival) with the old intro cue as the
first chunk's `audio_reference` (`{ audio_url, start_ms, end_ms, strength: 'medium' }`; a `data:audio/mpeg;base64,...`
URL is accepted) and a seed per take. Of four takes, two began with the asked-for swell from silence (about 1.5 s; enter
it with `audio_in` for a half-second build-up), two did not (one at full on its first frame, one 5 s of silence and a slow
rise); all held one beat of 128 bpm across every chunk join; the one with a crash on every second bar line had accents to
land the words on. Its chunks' planned lengths were again only roughly kept: choose the take, then fit the lines' gaps.

Sources: Murch in Ondaatje's *The Conversations*; Heather Fenoughty (heather-fenoughty.com, spotting guide);
modwheel.net/guides/scoring-to-picture-spotting; carterburwell.com/projects/NCFOM.html; aftersunsetmusic.com (sting vs
link); storyblocks.com (cutting music without a sudden stop); sheridantongue.com (temp tracks).
