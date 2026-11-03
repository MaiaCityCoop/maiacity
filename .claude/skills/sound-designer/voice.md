# Voice: the narrator and the takes

- **Maia's narrator (Samuel 2026-11-03):** Gemini 3.8 Flash TTS on fal (`google/gemini-3.8-flash-tts`), voice
  **Vindemiatrix**, directed in `style_instructions` as an elderly British nature-documentary narrator: "a beloved
  elderly British woman in her seventies, a legendary nature-documentary narrator: deep, low, resonant voice with a
  little gentle gravel, warm, hearty, motherly and kind, close to the microphone, unhurried", plus one sentence per
  line from its note's mood (hushed, wonder, a chuckle, the swell). Chosen by ear over Gemini's Gacrux, Eleven v4
  (Charlotte, Alice), Inworld TTS-1.5 Max (Evelyn, Elizabeth), xAI TTS (liora, aurora), Maya1 and MiniMax voice design.
  The text is spoken verbatim: delivery goes in `style_instructions` only, `<sigh>` and `<laugh>` inline.
- **Samuel speaks his own lines** (the hook intro, the fixed trailer, his close): his recordings, never a synthetic
  stand-in in a proposal he hasn't asked for.
- **fal's ElevenLabs** (`elevenlabs/tts/eleven-v4`, `fal-ai/elevenlabs/tts/eleven-v3`) reaches only the ~20 premade
  voices (or their ids); Voice Library voices ("The Wise Grandmother" `xy6Sbe8D4LZMgYJkWyYA`) need our own
  ElevenLabs key. v3/v4 take audio tags in the text and `timestamps: true` gives per-character timings.
- **Audio tags** go in the text: `[softly] [warmly] [wistfully] [chuckles] [whispers] [with wonder] [proudly] [firmly]
  [quietly] [delighted]`. Use "…" for a breath.
- The old narrator (Day 19) was "Grandpa Spuds Oxley" from the ElevenLabs Voice Library, `NOpBlnGInO9m6vDvFkFC`, made
  with the old `bun voice say` script (gone with the refactor, `SNAPSHOT_2611101` `aven/api/scripts/voice.ts`).
- **One take per line**, each kept with add_story_audio on its voice clip (`play.md`). The pause before each line is
  set on the timeline, not by reading speed — one long take for a whole script sounded rushed.
- **Check every take by ear and by transcript:** transcribe it back (fal `fal-ai/wizper`) and compare with the line; a
  whispered word gets swallowed ("Then it found itself" came back "then found itself") — take it again.
- **Send text as UTF-8 JSON** (`ensure_ascii=False`, `read -r`): an escaped em-dash `\u2014` whose backslash a shell
  ate was spoken as "u two thousand fourteen".
- Rejected: Brian (an ElevenLabs preset), MiniMax Speech 2.8 HD (too sleepy).
- **Never clone a real person's voice.** Describe the qualities instead.

## Writing for the ear

- **Write the narration for one hearing.** The listener can't turn back the page, and a viewer with captions off gets
  one pass: short declarative sentences, one idea each, plain words; read every line aloud and rewrite what trips
  (Alex Chadwick, Rob Rosenthal).
- **Never step on the tape.** The narrator sets up Samuel's on-camera lines and never repeats them: script and tape work
  as a team (Nancy Updike).
- **No print-style narration:** no stacked titles and ages, no clauses the ear must hold.

## Directing a voice

- **To one listener.** Understated and conversational, so the viewer leans in. Samuel's own voice-over can be spoken to
  a person and improvised rather than read (Frank Langfitt).
- **Eleven v3** has no SSML breaks, and "…" and dashes pause unevenly: where a pause must land, split the line into
  two takes. Capitals add emphasis. Speed spans about 0.7–1.2 (unverified through fal).

## Recording Samuel's own voice in a small room

- 15–20 cm from a directional mic gives warmth (proximity effect); 25–30 cm is clearer; 15–30° off-axis tames harsh
  consonants.
- Face soft things — hanging clothes, the duvet — away from corners and with no bare wall behind the mic. In a small
  room the first reflections arrive almost with the voice and make it boxy; a closer mic raises the voice over the
  room.

Sources: transom.org (Updike 2006, Chadwick 2015, Rosenthal 2017 and 2025, Langfitt 2015);
elevenlabs.io/docs/best-practices/prompting/eleven-v3; sonarworks.com (recording vocals at home).
