# Intent 3e27d730: six trees with lighter shapes of their own (night log)

Builder session in avenBOX, 2026-11-10/11. Spec approved 23:41 UTC. No call to fal.

**A flaw in my own spec, for Samuel** (also on the board, c7's evidence): c1's run counts with the census's viewer,
which draws the scene twice (depth, then lit), so its number is twice the mesh. Its bound of 300,000 therefore means
about 150,000 real triangles at each tree's default stage, twice as strict as asked. I build every tree to the real
300,000 at every stage the worlds draw; c1 then fails only for a tree whose default stage needs more than 150,000. The
fix is c1's bound at 600,000 (a step back and one approval). Walnut passes either way.

Triangles are counted in node from the proposed source (`count.cjs`: every mesh's index / 3), the seconds are
`build()` in node in this box. The viewer's count (c1) is shown where it was run.

## Walnut (`34c5d8e0-48e4-541e-8e1d-3f7bfce8e1fe`): v6 proposed, done

| stage (age) | L0 v5 | **L0 v6** | L1 v6 (detail 0.25) | L2 v6 (detail 0.1) | seconds L0 / L1 / L2 |
|---|---|---|---|---|---|
| 10 (15 y, default) | 887,100 | **137,097** | 18,865 | 6,160 | 1.1 / 0.4 / 0.3 |
| 11 (25 y) | 1,013,782 | **201,031** | 21,789 | 14,293 | 1.0 / 0.6 / 0.7 |
| 12 (40 y) | 1,183,543 | **240,939** | 34,433 | 24,333 | 1.4 / 1.1 / 1.1 |

Ceilings (L1 ≤ 365,783, L2 ≤ 56,454): held with room. Nine seeds (maia, oak, river, c–h) at stages 10–12: every
one under 300,000 at L0 before the leaf cards, lower after. c1 on the proposed variant: 274,415 in the viewer's
count (137,097 real), 19 draws. c2: `{"levels":"declared","values":[{"detail":0.25},{"detail":0.1}]}`.

How (where the 750,000 went): the leaves were 508,000 triangles at 15 years (5,293 leaves × 96: seven leaflets of
3 × 1 rows, two faces, a rachis tube). A grown tree's leaf is now one card (10 triangles): the seven leaflets and the
rachis painted on a folded, arched sheet and cut out by the picture's alpha, a paler underside below. The twigs were
147,000: rings every 4–14 cm on straight wood and up to 40 sides; now rings only where the wood bends or changes
girth and sides by girth (3 to 24). The walnuts on the tree (509 of them, 140,000 with their shells) have half the
fruit view's rings, the nut in a split husk a bead. Under the soil the roots are coarse; a grown tree's 2 mm lateral
buds are not drawn while it is in leaf.

Looked at (render bench, the box's own renderer, beside v5 in the same shots; against its reference sheet
`6a9878f2…`, panels "Bearing tree (10 years)", "Mature tree (20 years)", "Pinnate leaf"):

- `walnut/v5-s10-crown.jpg` / `walnut/v6-s10-crown.jpg`, `walnut/v5-s10-leaves.jpg` / `walnut/v6-s10-leaves.jpg`:
  close on the 15-year crown the leaves read as the sheet's pinnate leaf, seven leaflets with the terminal one the
  largest, at a crown fill like v5's. Judged: as detailed as v5 at this distance, the leaf shape truer than v5's
  three-row leaflets; the cards are a shade more olive than v5's leaflets (their underside shows more often).
- `walnut/v5-s12-whole.jpg` / `walnut/v6-s12-whole.jpg`: the 40-year tree as the viewer frames it. Same silhouette.
  **Not fixed, for its own intent:** both are a narrow crown, not the sheet's broad dome (the growth, not the drawing).

Source: `walnut/walnut-v6.js`.

## Sweet chestnut (`c0382a47-a3ee-58c4-b83a-65df5c71c18e`): v7 drafted, **not proposed** (waits on c1's bound)

| stage (age) | L0 v6 | **L0 v7** | L1 v7 (0.25) | L2 v7 (0.1) | seconds L0 / L1 / L2 |
|---|---|---|---|---|---|
| 9 (10 y, ripe, default) | 994,565 | **259,848** | 96,827 | 24,299 | 2.2 / 1.2 / 1.0 |
| 10 (20 y) | 595,929 | **247,460** | 65,449 | 19,351 | 2.0 / 1.0 / 1.2 |
| 11 (35 y) | 1,220,017 | **260,888** | 83,282 | 25,951 | 3.2 / 2.6 / 2.6 |
| 12 (50 y) | 1,528,360 | **262,602** | 93,572 | 29,343 | 4.1 / 3.7 / 3.6 |

Seven seeds (maia, oak, river, c–g) at stages 9–12: 228,607 to 264,939, all under 300,000. Ceilings L1 ≤ 365,783,
L2 ≤ 56,454: held.

**Why not proposed:** its default stage (the ripe ten-year tree) needs 259,848 to keep its crown as full as today;
c1 as written allows 150,000 there (its doubled count), and a red c1 would hold the whole intent, walnut too, in
Build. It is on play as this intent's variant 1985 of the chestnut (8 edits, its card `declared`), ready: once
c1's bound reads 600,000, it is proposed with one `propose_doc_version` (variant 1985).

How: the leaves were 393,000 at ten years (16,000 leaves × 24: a sheet of 3 × 2 rows, two faces). A tree past its
fourth year now cuts each leaf out of its picture (its serrated outline with the bristle teeth and its straight side
veins, made from `leafShape` and its 16 teeth): a folded upper face of 4 triangles and a flat underside of 2, the
underside lit as the face above it (as `sheet` lights a built leaf). Leaves to 11,000 at most, each grown to fill.
The burr's spines were thin cones of 3 faces: on the tree one blade each (the fuzz is drawn from both sides); the
valves' inner faces only once they open; every burr on the tree at the grown tree's simpler detail, past 350 of a
heavy crop bristly balls. Wood as the walnut's (rings by bend and girth, sides by girth), at most 85,000 triangles.

Looked at (render bench, same shots as v6; no reference sheet on its card, judged against the data sheet's
'Belle Épine' and photographs of open-grown *Castanea sativa* in leaf: long lanceolate glossy dark leaves with
bristle-tipped teeth, light undersides):
- `chestnut/v6-s9-crown.jpg` / `chestnut/v7-s9-crown.jpg`: the same tree, the crown fuller than v6's (the cut-out
  blade is the leaf's true width where v6's two rows across narrowed it), dark glossy tops and pale undersides as
  v6's. Judged: at least as real as v6, fuller.
- `chestnut/v7-s9-close-first-tint.jpg`: my first try, too olive (its underside lit from below): fixed, kept as a
  record of what was judged.
- `chestnut/v6-s12-whole.jpg` / `chestnut/v7-s12-whole.jpg`: the 50-year tree as the viewer frames it: same silhouette.

Source: `chestnut/chestnut-v7.js`.
