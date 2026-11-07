# b9e6ad45 · the Mac render job (c11's look)

Samuel's rule (2026-11-07): GPU work runs only on his Mac (Metal), never on SwiftShader in the cloud. This job draws
both people of intent b9e6ad45, Stand-in v14 and Elder woman v5 as proposed, beside the motion capture they were made
from:

- Each person is built from `tools/motion`'s mirror of what the intent proposes (its pieces held to their hashes in
  `tools/motion/proposed.json`) and posed by every clip as play's box poses it.
- Each is skinned by the body piece's own dual-quaternion shader on the GPU.
- Beside each, in blue, is the recorded skeleton: the source's own joints from `tools/motion/sources`, at the person's
  size.

**On the Mac**, on the branch `intent/b9e6ad45-motion`, from the repository's root:

```sh
git fetch origin intent/b9e6ad45-motion && git checkout intent/b9e6ad45-motion
bash intent-work/b9e6ad45-render/run.sh
```

- Needs: node, bun, Playwright with its Chromium, ffmpeg, and curl (for the Pyrkon reference on Wikimedia Commons). No
  token, no fal, nothing paid.
- It prints `renderer: …`. If that is not Apple's Metal, it stops and draws nothing.
- **Out**, in `intent-work/b9e6ad45-render/out/` (commit and push it on this branch; the frames themselves stay in
  `~/b9e6ad45-work`):
  - `film-stand-in.mp4` and `film-elder-woman.mp4`: every clip in turn, in four panels: the person from the front, the
    recording from the front, the person from the side, the recording from the side.
  - `sheet-<who>-<clip>.jpg`: four moments of each clip, stacked.
  - `elder-idle-beside-pyrkon.mp4`: the Elder's idle from the front, beside the first 20 s of *Pyrkon 2026 - ambient
    flow of people 1* (Rose Abrams, Wikimedia Commons, CC BY 4.0; artifact 535a1d5f), as 99b612ec's c7 film was.
  - `run-log.txt`.
- What to look for: the person moves as the blue skeleton beside it does. The Elder stands with a slight stoop (about
  8°, where the recording leans 30°: her back is straightened at the spine on purpose), so the blue skeleton leans
  further than she does in her idle and her hurried shuffle. The quarter turns have no recording of their own.
