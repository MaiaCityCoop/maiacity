# Untangle the whole code base once — decision log (intent 5884ade4)

Intent 5884ade4-b543-443e-a09b-f63b6c4b2d44, method `untangle-codebase` (Artifact c308c135-5571-417b-9c52-ffd25770ec44).
Each fix stands above the problems it solves. Measured on main d5346b7 (2026-11-09).

## Baselines (main d5346b7)

`bun intent-work/5884ade4/graph.ts`: files 524, edges 1604, file cycles 4, module cycles 2, imports of a less
stable module 18, orphans 17 (entries the script doesn't know: scripts, a param matcher, piece sources).

Held (open intents' branches change them; untouched here, their tangles under *Next untangles*): 116 files, from
`git diff --name-only origin/main...origin/<branch>` for the branches of 6fd5e63f, 090168c8, 602a8849, c1bee1f8,
24454c2d, a5faafad, 0b4c007b, 544485e2, and 4284946e's two files still unlanded.

(Audit in progress.)

## The two additions (Samuel's choice, by the Orchestrator 2026-11-09 07:56Z): Comments and Tests, both

- Comments: comments that restate the implementation go (even phrased as a why); comments about something outside the
  code stay (a proxy, a browser, a GPU quirk, a person's decision with its date); a workaround's comment goes with it.
- Tests, last: tests that repeat the implementation or can't fail go; tests tied to internals are rewritten to
  behaviour; any that fail without a bug are fixed.
