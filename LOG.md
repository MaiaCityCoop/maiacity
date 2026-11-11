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

## Hazel (`33a534e9-80c7-5892-89b2-84d1a2efbdac`, both forms: one source): v6 drafted, **not proposed** (waits on c1's bound)

Its `tree` breed (what Sandbox 1 draws) and its `bush` breed share Main's source (a breed only picks the form), so
the change is Main's and both forms are counted.

| stage (age) | L0 v5 tree | **L0 v6 tree** | L1 v6 (0.25) | L2 v6 (0.1) | seconds L0 / L1 / L2 |
|---|---|---|---|---|---|
| 9 (8 y, ripe, default) | 687,289 | **194,157** | 33,311 | 9,355 | 0.9 / 0.4 / 0.3 |
| 10 (12 y) | 624,759 | **214,327** | 39,759 | 11,981 | 1.1 / 0.7 / 0.7 |
| 11 (16 y) | 749,847 | **232,719** | 36,880 | 11,363 | 1.1 / 0.9 / 0.7 |
| 12 (20 y) | 1,004,807 | **276,339** | 40,680 | 12,801 | 1.1 / 0.9 / 0.8 |

Seven seeds × both forms × stages 9–12: 124,154 to 294,590 (the bush 'e' at 20 years the highest), all under
300,000. **Why not proposed:** c1 as written allows 150,000 at the default stage; it needs 194,157. Variant 1986 on
play (6 edits, card `declared`), ready to propose once c1 reads 600,000.

How: leaves cut out of their picture (the round, double-toothed `leafShape`, seven pairs of straight side veins
pressed in) on a cupped sheet, 6 triangles each where a leaf was 24–48 and its 6-triangle stalk (hidden under the
blade, as the grown tree already drew it); at most 12,000 leaves, each grown to fill. Wood rings by bend and girth,
sides by girth, at most 70,000 triangles. Next year's closed catkins in summer as short cones of two spans, at most
1,500 drawn; nuts on the tree as the grown tree draws them; past 300 clusters of a heavy crop, round lumps. Roots coarse.

Looked at (render bench, same shots as v5; no reference sheet on its card, judged against photographs of
*Corylus avellana* trained as a small tree in August: round, double-toothed, softly hairy leaves, mid-green above and
paler beneath, nuts in leafy husks in twos and threes):
- `hazel/v5-s9-crown.jpg` / `hazel/v6-s9-crown.jpg`: the eight-year tree: the same form and crown fill; v6 a shade
  darker where more undersides face away. Judged: no poorer than v5.
- `hazel/v5-s9-leaves.jpg` / `hazel/v6-s9-leaves.jpg`: closer: round toothed leaves, pale undersides, the nuts and
  the reddish young shoots kept. Judged: as v5.
- `hazel/v5-s12-whole.jpg` / `hazel/v6-s12-whole.jpg`: the 20-year tree as the viewer frames it: same silhouette.

Source: `hazel/hazel-v6.js`.

## Moringa (`76b97cae-fa1d-4bfc-a07c-5f093343919f`): v4 drafted, **not proposed** (waits on c1's bound)

| stage (age) | L0 v3 | **L0 v4** | L1 v4 (0.25) | L2 v4 (0.1) | seconds L0 / L1 / L2 |
|---|---|---|---|---|---|
| 5 (8 weeks) | 74,581 | **10,609** | 1,842 | 510 | 0.7 / 0.0 / 0.0 |
| 6 (11 weeks) | 251,223 | **52,289** | 8,437 | 3,491 | 0.2 / 0.0 / 0.0 |
| 8 (24 weeks) | 793,610 | **227,896** | 40,044 | 19,476 | 0.4 / 0.1 / 0.1 |
| 9 (34 weeks, pods ripe, default) | 819,300 | **235,259** | 40,158 | 17,452 | 0.4 / 0.1 / 0.1 |

Seven more seeds (oak, river, c–g) at stages 6, 8, 9: 33,766 to 256,604. **Why not proposed:** c1 as written allows
150,000 at the default stage; it needs 235,259 (its pods and flowers are 105,000 of it). Variant 1987 on play
(4 edits, card `declared`).

How: the leaflets were 501,000 at 34 weeks (about 25,000 leaflets, each a template of 5 rows, two faces). Each
pinna (a stalk with its opposite pairs and its terminal leaflet, `pinnateInto`) is now one card: its leaflets painted
from the plan's own numbers (`pinnaLayout`: the same feet, angles, lengths and the traced `leafletHalf` outline;
pinnae of 0 to 4 pairs and with the small foot pair, one row each of one picture) and cut out by its alpha, folded
down along its stalk as the leaflets droop, its underside below: 6 triangles a pinna. Leaflets 501,000 → 36,700. The
pods on the tree with 12 sides (their three angles) and up to 16 rings (their seeds' beading): 142,600 → 62,200.

Looked at (render bench, same shots as v3; against its reference sheet `058c8664…`):
- `moringa/v3-s9-whole.jpg` / `moringa/v4-s9-whole.jpg`: the tree as the viewer frames it: the same.
- `moringa/v3-s9-crown.jpg` / `moringa/v4-s9-crown.jpg`: close (1.8 m): the feathery, thrice-divided leaves read
  as v3's, pods and flowers kept; the leaflets' edges a touch crisper than v3's (cut by a picture, not a 5-row mesh),
  no sparser. Judged: no poorer than v3.

Source: `moringa/moringa-v4.js`.

## Mango (`5ac03d06-26c5-5d1b-af91-62c5ae40880d`): v5 proposed, done

| stage | L0 v4 | **L0 v5** | L1 v5 (0.25) | L2 v5 (0.1) | seconds L0 / L1 / L2 |
|---|---|---|---|---|---|
| 10 (ripe, default) | 444,078 | **149,665** | 54,332 | 20,145 | 0.8 / 0.8 / 0.3 |
| 11 | 349,869 | **156,514** | 46,906 | 17,355 | 0.5 / 0.3 / 0.3 |
| 12 | 568,817 | **229,620** | 58,408 | 25,371 | 0.7 / 0.5 / 0.4 |
| 13 | 872,820 | **270,754** | 53,524 | 29,275 | 1.1 / 0.8 / 0.7 |

Eight seeds (maia, oak, river, c–g) at stages 10–13: 130,626 to 272,161. c1 on the proposed variant: 299,551 in
the viewer's count (149,665 real), 17 draws: under its bound, by little. c2: declared, two levels.

How: leaves cut out of their picture from their fourth year (lanceolate `leafShape`, pale midrib, the fine side
veins), 6 triangles each where a leaf was 16–24 plus its stalk; at most 12,500 living leaves, each grown to fill.
Wood rings by bend and girth past the third year, the trunk's fine rings to 1.5 m; limb sides by girth (3 to 9),
the trunk to 48 (its scaly plates are in its colours: at 24 sides it banded, see below); at most 80,000 triangles.
Fruit on the tree at the fruit view's detail 0.6 (past 220 fruit 0.3). Roots coarse.

Looked at (render bench, same shots as v4; no reference sheet on its card; judged against photographs of 'Tommy
Atkins' trees in fruit: tufts of long lanceolate dark leaves, red-blushed fruit hanging on long stalks, a dark,
scaly trunk):
- `mango/v4-s10-crown.jpg` / `mango/v5-s10-crown.jpg`: the ten-year tree in fruit: the same crown, leaves and fruit.
- `mango/v5-first-try-banded-trunk.jpg`: my first try, the trunk with 24 sides showed horizontal bands where v4
  shows scaly plates: fixed (48 sides), kept as a record.
- `mango/v4-s13-whole.jpg` / `mango/v5-s13-whole.jpg`: the grown tree as the viewer frames it: the same.

Source: `mango/mango-v5.js`.

## Yam (`ec65e757-0c6d-4513-b802-8c8f7a679d3f`): v4 proposed, done

| stage | L0 v3 | **L0 v4** | L1 v4 (0.25) | L2 v4 (0.1) | seconds L0 |
|---|---|---|---|---|---|
| 4 | 164,976 | **37,030** | 4,254 | 783 | 1.3 (first build: its pictures made) |
| 5 | 352,501 | **64,566** | 9,342 | 1,599 | 0.1 |
| 6 | 453,494 | **78,514** | 12,282 | 2,031 | 0.1 |
| 7 | 456,469 | **78,972** | 12,438 | 2,043 | 0.1 |
| 9 (default) | 128,856 | **40,954** | 4,830 | 567 | 0.0 |

Four more seeds (oak, river, c, d) at stages 4–7: 33,741 to 77,978. c1 on the proposed variant: 82,129 in the
viewer's count, 19 draws. c2: declared, two levels.

How: a leaf was 640 triangles (5 rings round a point out to the traced outline, 32 round, two faces). It already
carried a picture of its whole blade (`leafMap`: the seven main veins and the net between them). That picture's
code is now two functions (`leafCurves`, `leafPixel`) shared by `leafMap` and a new `leafCut`, which carries the
traced outline (`DR.outline`, the notch between the basal lobes) in its alpha; each leaf on the vine is that picture
on a cupped sheet of four stations along and three across, drooping as the built one: 24 triangles. The tuber view's
leaves are built ring by ring as before.

Looked at (render bench, same shots as v3; against its reference sheet `b5143254…`):
- `yam/v3-s7-close.jpg` / `yam/v4-s7-close.jpg`: the vine at full canopy, close: the same heart-shaped, long-tipped
  leaves, colour and fill. Judged: as v3.
- `yam/v3-s7-whole.jpg` / `yam/v4-s7-whole.jpg`: the plant on its stake and mound as the viewer frames it: the same.

Source: `yam/yam-v4.js`.

## The far levels, looked at (c5), and walnut's and mango's L2 moved to detail 0.2

Each proposed tree's own levels, built in the box at their declared values (a copy of the source whose `build`
takes that detail, for the pictures only) and framed beside the finest where the worlds hand over to them: the
tree at about a fifth of the view (L2's threshold, `lod.js` LEVELS[2] = 0.22), and smaller.

- `yam/levels-L0-L1-L2-at-a-fifth.jpg`, `yam/levels-far.jpg`: finest | L1 (12,438) | L2 (2,043): the vine on its
  stake reads the same at all three; L2 a little sparser in its leaves, its outline and colour held. Passes.
- `walnut/levels-L0-L1-L2-at-a-fifth.jpg`: finest | L1 (18,865) | L2 at detail 0.1 (6,160): L1 holds; **L2 at 0.1
  thinned the crown to see-through** (a thinned tree, not the tree). `walnut/levels-L2-0.1-vs-0.2.jpg`: finest | L2
  at 0.1 | L2 at 0.2 (13,103): at 0.2 the crown is full and green again, a shade lighter than the finest.
- `mango/levels-L0-L1-L2-at-a-fifth.jpg`: finest | L1 (54,332) | L2 at 0.1 (20,145): L1 holds; **L2 at 0.1 went
  see-through, only its red fruit carrying the crown**. `mango/levels-L2-0.1-vs-0.2.jpg`: at 0.2 (43,638) the crown
  is nearly as full as the finest, fruit and colour kept.

So walnut and mango declare L2 at detail 0.2 (`module.exports.levels = [{ detail: 0.25 }, { detail: 0.2 }]`). A
proposed variant is frozen, so each was proposed again as a new variant with the same edits and messages (walnut
1990, mango 1991, in place of 1983 and 1988). Their L2 at 0.2: walnut 13,103 / 19,641 / 32,045 (stages 10–12),
mango 43,638 / 35,780 / 45,154 / 42,640 (stages 10–13), all under L2's ceiling of 56,454.

**Open for the three drafted trees:** their L2 is declared at 0.1 and was not yet looked at framed; judge it (and
likely move it to 0.2 the same way) before proposing them.
