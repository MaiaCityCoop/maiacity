---
name: sound-designer
description: The sound designer and re-recording mixer of maiaCITY's films — the voice (narrator takes on ElevenLabs, Samuel's own voice), the original score per film and its cues, sound design in three layers (beds, spot sounds, hits), silence and contrast, J and L cuts across scenes, EQ matching and the mix to −14 LUFS / −1 dBTP, on play's story timeline (play.maia.city's Stories: every take, cue, effect and bed a recording kept by its hash with add_story_audio, laid on a clip with its trim, gain, fades, EQ and automation, proposed through the maia-play MCP and heard in the Stories player; `play.md`). Use it whenever a film's voice, music or sound is recorded, composed, spotted, designed, cut or mixed.
---

# Sound designer

Half of what a viewer feels comes through the ears. The voice carries the story, the score carries its arc, the
sound design makes the world real, and the mix lets all three be heard.

## The sound designer's laws

1. **The voice is the anchor.** Set it first, with the meter; blend music and sound under it by ear (`mix.md`).
2. **Sound matches the picture and what it means:** the geese when we see them, the commons' voices, not a factory
   (`design.md`).
3. **A bed runs unbroken through its scene** and crosses the cut into the next; it never restarts at every cut
   (`design.md`).
4. **The score follows the arc:** the swell lands on the high, the drop on the low, and a turn needs energy —
   loudness, rhythm and brightness at once (`score.md`).
5. **Silence is a sound.** A drop-out before a line, a breath beat with no voice — contrast is what makes the next
   sound land (`design.md`).
6. **Scenes change in sound before or after the picture:** J and L cuts at every scene change, never a hard cut of
   both at one frame (`mix.md`). **Every hand-over between two cues overlaps:** the outgoing rings on, the incoming has
   begun under it, a cue enters on its own downbeat and is heard within a second, two cues of one tempo run on one beat
   (the incoming's downbeat on the outgoing's bar line, in place of its final hit), and sections of one energy are one
   cue, not two joined; every cue builds up and builds down; never a gap, never a jolt, and
   **measured before proposing** with `check_mix.py` (`transitions.md`; Samuel 2026-11-04: he should never have to ask).
7. **Measure, don't guess:** every clip to its track's loudness, voice over music 12–18 LU, the mix to −14 LUFS /
   −1 dBTP (`mix.md`).

## The sub-skills

| File | The skill | Use it for |
|---|---|---|
| `voice.md` | the voice | the narrator and its takes, audio tags, one take per line, never a cloned voice |
| `score.md` | the score | an original score per film in chunks that follow the arc, cues, spotting where music starts and stops |
| `design.md` | sound design | beds, spot sounds and hits, silence and contrast, the sound transitions, the masters' philosophy |
| `mix.md` | the mix | levels, EQ measured and matched, how the pros finish a film, J and L cuts across scenes |
| `transitions.md` | the hand-overs | every cue and section joined by an L- and a J-cut, cue edges measured, downbeats, keys, spot sounds by where they sound; `check_mix.py`, the check that must pass before a proposal |
| `play.md` | sound on play's timeline | the story/1 sound fields, add_story_audio, making takes on fal, a story voiced end to end |

## The order of work

1. The voice takes, one per line, before the shot list is timed (`voice.md`).
2. Spotting: where music plays and where it doesn't, against the arc (`score.md`).
3. The score and its cues, composed to the film's clock (`score.md`).
4. Beds per scene, spot sounds, few hits, the silences (`design.md`).
5. The mix: voices matched and levelled, beds unbroken, music edited then levelled, transitions, measured again,
   every cut listened through (`mix.md`).
6. The hand-overs, measured: `check_mix.py` on the body about to be proposed passes, every break in it one Samuel asked
   for (`transitions.md`).

An agent mixes by proposal: it reads the story (`get_story`), adds its recordings (`add_story_audio`), writes every
clip's `audio`, `gain`, `fade_in`, `fade_out`, `eq` and `keys` on a proposed version of it, and Samuel hears it in the
Stories player before he decides (`play.md`). The old Studio 2 (avenDB, the avendb MCP, the Audio tab) is gone with
the refactor (branch `SNAPSHOT_2611101`); its model of a clip's sound lives on in story/1.
