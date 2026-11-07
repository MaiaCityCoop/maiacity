# Mac job: the Old City story's world-shot posters (intent 90de96fb)

Story `55b69416-8516-47dc-a235-781a8c08c640` v2 has four world shots of Old City v8: jam at 0 s, lorries at 4 s,
ambulance at 7.5 s, above at 11 s. Only the first has a poster still. This job plays the story in HyperFrames' player,
as the Stories player plays it, with Chrome on Metal. The world shots are drawn live by the live runtime, from Old
City v8's files kept in `play/site/src/lib/stories/fixtures/worlds/`, each held to its hash. The job takes one still a
world shot, at its first frame, at 1920×1080.

**Needs:** a Mac with Chrome, Bun 1.4.4 and ffmpeg. Set `PLAY_MCP_TOKEN` (an admin's play token): it reads the first
shot's existing still from play.

**Run:** `bash intent-work/90de96fb-render/run.sh` (about a minute: the world's guests take ~15 s to build).

**Out:** `intent-work/90de96fb-render/out/player-0.png`, `player-4.png`, `player-7.5.png`, `player-11.png`. Each line
it prints is `pixelWidth 1920 pixelHeight 1080 <file>`. Commit `out/*.png` to this branch and push. The builder keeps
each with `add_story_frame` (label: the shot's id) and sets the shots' `frame`.

**Fails if:** the player's frame never becomes ready (the world can't build; its error is printed as `player: …`), or
a still is not 1920×1080.
