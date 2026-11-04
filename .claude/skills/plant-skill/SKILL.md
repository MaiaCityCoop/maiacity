---
name: plant-skill
description: The maiaCITY plant skill — how to build a plant on play (play.maia.city's asset library, group `plants`) so it looks like the real one at every stage from seed to ripe fruit. One named cultivar with its full Latin name; its real numbers researched with sources (sizes, growth tempo in days and years, girth, leaf life, flowering age, fruit size and days, yield, spacing, climate) and written as the plant's metadata; 30–45 reference photos per plant; the plant grown as a readable recipe (organs drawn by their own chance, axes grown flush by flush or year by year, girth by the pipe model, flowers and fruit marked) and checked render by render against the photos with play/site/scripts/render.mjs; then proposed over the maia-play MCP. Use it whenever a plant, a tree, a crop, a herb or a fungus is built, upgraded, checked against the real one or planted in a world. Part of asset-producer.
---

# Plants: the real one, grown from its seed

A plant on play is an asset of the group `plants`: a readable CommonJS recipe that grows it at any **stage** from its
seed to ripe fruit, from any **seed** text (a sister plant), at any **detail** (a crowd in a world), and shows one of
its fruit on its own (the **Plant | Fruit** view). It is right when, stage by stage, it looks like photographs of the
real plant and every number in it is the real plant's. The laws over every asset (real size in metres, real numbers,
built in its parts, every upgrade its own version, look at it like a critic) are `asset-producer`'s; this is how they
are kept for plants.

Worked examples, both proposed over MCP and kept on play: **apricot v2** ('Ungarische Beste') and **cacao v3**
(West African Amelonado; its researched numbers in `references/cacao-amelonado.md`). Start a new plant from the newer
of the two: copy its part 1 (the growing core) as it is and write parts 2–4 for the new plant.

## The order of work

1. **Choose one cultivar, by its full name.** Never "a cacao", "an apple": a species has many kinds that differ in
   just what the eye sees (pod shape and colour, flush colour, habit, when it bears). Choose the one most grown, or
   the one the world it goes into grows, and name it in full: genus, species, author, subspecies or cultivar group,
   cultivar, trade and local names (`Theobroma cacao L. subsp. sphaerocarpum (A.Chev.) Cuatrec. · West African
   Amelonado (Forastero) · Kakao`). Say why in the note. The label is `<Plant> '<Cultivar>' · <Genus species>`.
2. **Research its numbers before the first line of code** (a research agent does it well, in the background, while you
   read the old version). Fill the data sheet (`references/datasheet.md`): every row with a value and its source, the
   cultivar's own where it was measured, the species' otherwise, marked as such; a gap is an estimate marked `[EST]`
   with how it was made. Primary sources first: crop monographs (PROSEA, Wood & Lass…), extension sheets (FAO, ICAR,
   UF/IFAS), germplasm databases, measured theses; Wikipedia only to find them.
3. **Gather reference photos**: 30–45 real photographs from Wikimedia Commons (its API; ~1000 px thumbnails), named by
   stage (`01-bean-…`, `05-jorquette-…`, `09-flowers-…`, `12-ripe-…`, `13-leaves-flush-…`), each opened and checked to
   really be that plant at that stage (a mislabelled one turns up every time), listed with what it shows and its scale
   cues, source and licence. Keep them in the scratchpad: they are for looking, not for the repo.
4. **Look at what there is**: render the current version at every stage (below) and list what is wrong against the
   photos and the numbers. That list is the work.
5. **Write the recipe** (below), stage by stage from the seed up, rendering as you go.
6. **Check it like a critic** (below) until every stage and every close-up holds against the photos.
7. **Propose it** over MCP as the next version (below), its note saying what changed, the numbers and their sources,
   how it was checked, and what is still known to be short.

## The recipe

One file in four parts, as the worked examples are:

1. **Growing** — the shared core, carried over unchanged: `chance(seed, ...keys)` (each organ its own chance, so the
   third leaf is the same leaf at every stage), `span`, `table`, noise (`noise3`, `fbm`, cellular `cells` for bark and
   skin), `tube` (swept, its radius and paint by the length along it), `sheet` (a leaf, a petal; with `back`, a second
   face), `bead`, the `Bag` (everything merged per material, so a tree is a handful of draw calls), `Space` (wood as
   rods, fruit as balls; `settle` hangs a fruit where it touches nothing), `root`, `lite` and `detailAt`. Add a
   material when the plant needs one (the cacao's waxy `pod`), never change what one does for another plant.
2. **Organs** — one object of the cultivar's numbers (`CA`, `UB`: sizes in metres, colours as seen in daylight), and a
   function per organ, built to its measure from the photos: seed, seed leaves, leaf (stalk, pulvini, blade outline,
   veins, its life from flush to fall), bud, flower (every whorl: sepals, petals, stamens, staminodes, style),
   fruit (its profile turned or swept, its ridges, its colour by days), bark (by girth and age: shoot, young bark,
   old bark, lichen, moss), anything the plant has of its own (the cacao's flower cushions).
3. **The plant** — its axes and how they grow in time `t` (years from sowing):
   - **Each axis a function of the length along it**: its direction at `s` metres depends on `s` (and a little on its
     age, as wood sags under its load), so a young axis is exactly the first part of the old one. Its length by its
     age from a table or a curve; flushes as steps (`flushed`): leaves of one flush come out together.
   - **Its architecture as the botany names it**: a cacao's chupon to a jorquette of five fans, their side branches in
     their own plane, the next chupon and tier; an apricot's leader, scaffolds, long shoots and spurs, year by year. The
     architecture is the first thing the eye reads; get it from the photos and the monograph (Hallé's tree models).
   - **Nodes**: a leaf at each, formed when the axis grew past it; phyllotaxis as it really is (2/5, 3/8 spiral; two
     rows on plagiotropic branches); a leaf lives its real life (so a crown is bare inside where it should be).
   - **Girth by the pipe model** (r^2.5 summed over what the wood feeds) plus a ring a year, calibrated to measured
     diameters at known ages (`thicken`); the trunk's foot flaring into its roots; branch collars.
   - **Roots** under the soil: a taproot and laterals at their real depth and spread.
   - **Flowers and fruit** where the plant bears them (on spurs, on one-year wood, on the old wood of the trunk), set
     at the real rate, dropped at the real rate (June drop, cherelle wilt), each fruit placed by `Space.settle` for its
     **ripe** size so it swells where it hangs, marked with `bag.fruit(key, at, dir)` … `bag.fruitDone()`.
4. **Recipe** — `STAGES` (each `{ name, t, note }`: the plant's own milestones, their notes saying what is seen and
   the real numbers of that moment), `timeAt(stage)` (between two stages, on the way), the fruit view (`ripePick`,
   `fruitView`), `PARAMS` (stage, seed, detail, fruit: always these four, in this order, so worlds and the viewer treat
   every plant alike), `PLANT` (label, latin, note, from, layer, stages with their day from sowing, and **`facts`**),
   `build(stage, seed, detail, fruit)` and `module.exports.recipe(id, v, variant)` returning `{ meta, build }`. Export
   the organs too (`module.exports.organs`) for checking them on their own.

### The stages

Not a fixed list: the plant's own milestones, in order, the last its ripe fruit (the default). Usually the seed, its
germination (epigeal or hypogeal, as it is), the seed leaves or first leaves, a seedling, the moment its form is set
(a jorquette, the first scaffolds, the first branching), a young plant, then one season of a bearing plant from
flowering through fruit set to ripe. Show the bearing season on a plant old enough to bear well (cacao in its
eighth year, apricot in its sixth), so its trunk and bark are the mature ones. A stage's `t` is real time from sowing:
germination in days, the seedling in months, form in years, the fruit's season in days after flowering.

### The metadata: `facts`

Every plant's meta carries `facts`, what a world needs to plant it right: heights and trunk diameter by age, crown
width, spacing, shade, climate, years to first flowers, first crop and full bearing, productive life, leaf size and
life, fruit size, mass and days from flower to ripe, yield. Units in metres, kilograms, days and years; ranges as
`[min, max]`. `references/datasheet.md` is its template, the cacao's the example.

## Checking

- **Render it as play shows it**: `node play/site/scripts/render.mjs --file <source.js> --id <slug> --v <n> --shots
  shots.json --out <dir> --size 700` (it starts the dev server, builds in the box engine, writes one PNG per shot and a
  contact sheet). Without `--shots`, every stage framed as the viewer frames it. With shots: `{ name, values: { stage,
  seed, fruit }, camera: { target: [x, y, z], dist, az, el } }`. **The camera carries over from one shot to the next**:
  put the framed whole-plant shots first, then the close-ups, each with its own `target`.
- Faster for numbers: require the source in node (three from `play/site/node_modules`) and print per stage the size,
  the top, the triangles and build time; per age the trunk's diameter at 30 cm, the height, the crown radius and the
  leaf count, against the data sheet.
- **Every look**: every stage whole; a sister seed; close-ups of the trunk and bark, the flowers, the young fruit,
  the fruit on the wood green and ripe; the fruit view; detail 0.3 and 0.1. Read each picture beside the photos of that
  stage and write down what differs (form first, then proportions, then colour, then detail); fix; render again.
- **Budgets**: about 300–450k triangles at full detail for a grown fruit tree, about 60k at 0.3, about 15k at 0.1;
  a build under ~3 s in the box. Thick wood takes the rings and sides (bark relief and lichen need them), twigs few.

## Proposing

- Over the maia-play MCP: `get_asset` (the head version's id is the `base`), `propose_version` with the whole `source`,
  the `params` when they change (a new stage count changes the stage's `max` and `names`), and the note. A source of
  80 kB or more is best sent from a script to the same MCP endpoint (`.mcp.json`; the session's `PLAY_MCP_TOKEN`) than
  pasted into a call. play checks it is readable (lines under 1000 characters) and builds it in the box; admins see it
  on the Proposals page and accept or archive it. Nothing is accepted over MCP.
- One ask, one version. The older versions stay as they were (their own recipe files); worlds anchored to them do not
  change.

## Lessons kept

- **Name the cultivar first.** The old cacao was "a cacao": narrow willow leaves, a shrub, little orange pods. Every
  look that is wrong is easier to see against one real kind.
- **The architecture is what reads.** A real cacao is a straight stem to a jorquette, fans rising at 35–55° and arching
  over, tiers; a plant grown as a generic crown never looks like it, whatever its leaves.
- **Calibrate girth and height to measured ages**, not by eye: the first cacao trunk was a pole half its real width.
- **Leaves where they live.** A leaf's real life (half a year to a year for cacao) leaves the inner crown bare; the
  flush hangs limp and coloured for weeks. Seen from below a crown shows its undersides: give them their own colour.
- **Fruit by the cultivar's measured size and shape** (Amelonado: 14.9 × 8.4 cm, blunt, no neck) and **where the plant
  bears it** (cauliflory: the trunk and old limbs). The set and the drop (cherelle wilt, June drop) are part of the look.
- **Colour from the photos, not memory**: cacao flowers are cream with dark red stripes, not pink; Amelonado flush is
  pale and tinged pink, not copper; cacao trunks are dark grey-brown with round pale lichen spots.
- **Pattern needs vertices**: cellular lichen or bark on a coarse tube comes out as squares. Give thick wood its rings
  and sides, soften the edges, or make the pattern larger.
- **A young axis is the first part of the old one**: directions as functions of the length along the axis, chance per
  organ by name; then a plant tabbed from seed to fruit grows instead of being redrawn.
