# The Mac render box: main's baseline and determinism

Kept by the Mac render box (Samuel's Mac, Metal) for every intent's Mac job.

- **`out/<main commit>/`:** main's own views at that commit. These are Sandbox 1 near, mid and far at 12:00 and with a
  low sun, the old city as it opens, the viewer's assets, and story parity. Each is measured once per main commit, so a
  job can measure only its head and compare against it. Each folder's `NOTES.md` says which script made each part.
- **`determinism.mjs`:** what makes two runs of one commit draw the same frame:
  - a seeded `Math.random` (the old city's visitor);
  - a settle that also waits for the far trees' pictures to be taken and kept.

  Builders: add it to a job's script (`SEEDED_RANDOM` as an init script; poll `QUIET` until 0). The render box applies
  it to jobs that don't, with `patch.py` on its own copy, and says so in the job's NOTES.
