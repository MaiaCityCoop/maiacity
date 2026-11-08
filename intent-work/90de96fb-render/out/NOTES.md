# Mac run: intent 9bb1bfb7 / 90de96fb, Old City world-shot posters

- Story 55b69416 (fixture `.90de96fb…json`), Old City v8 from the kept fixtures; 4 world shots: jam 0 s, lorries 4 s, ambulance 7.5 s, above 11 s.
- `bash intent-work/90de96fb-render/run.sh` from ef71e6a, ~42 s wall, exit 0, no `player:` errors.
- All four `player-<at>.png` are 1920×1080 (sips). Looked at each: jam (lorries on the ring road, gantry signs), lorries (jam from above the carriageway, MORE billboard), ambulance (in the jam behind the gantry), above (aerial over the blocks, the road at bottom right).
- Patch: `story-parity.ts` launched Chrome without the Metal flags; added `--use-angle=metal --enable-gpu --ignore-gpu-blocklist` (`metal-flags.patch`). Not committed to the script on this branch, only here.
- Bun here is 1.4.2 (README asks 1.4.4); ran fine.
- PLAY_MCP_TOKEN was set; the fixture gave every file, so no play reads were needed beyond what the script does.
