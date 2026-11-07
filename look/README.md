# 2df30a21: the look (c5)

The dev server (play/api on avenBOX's Postgres, `bun play/api/scripts/seed-look.ts`) with an intent shaped like 99b612ec:
8 pieces in dependency order (3 of them in two versions), ~100 KB of motion data each, and 2 assets requiring them.
Recorded with Playwright at 1280×800.

- `2df30a21-look.mp4`: the whole pass
- `1-detail.png`: the detail opens (0.9 s, page load included; the detail is 10 KB)
- `2-changes.png`: Changes tab, every document listed (13), later versions marked
- `3-person-skeleton.png`: Person skeleton's review, read alone (0.2 s): its source line by line
- `4-person-skeleton-v2.png`: its next version, read against the one before it: the diff
- `5-accepting.png`: Accept pressed: "Accepting…", both buttons disabled
- `6-accepted.png`: answered in ~1.5 s, the intent accepted
- `log.txt`: the requests and timings

Intent: 2df30a21-762b-4d84-b41b-ba016013c1cb
