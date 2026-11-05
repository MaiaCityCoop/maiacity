---
name: plant-skill
description: The maiaCITY plant skill — how to build a plant on play (play.maia.city's asset library, group `plants`) so it looks like the real one at every stage from seed to ripe fruit. One named cultivar with its full Latin name; the name brainstormed with the user before anything is made; its real numbers researched with sources (sizes, growth tempo in days and years, girth, leaf life, flowering age, fruit size and days, yield, spacing, climate) and written as the plant's metadata; its own reference sheet made by Google's image model (Nano Banana Pro on fal: one clean-lit 4K plate of every stage and organ, kept on play by its hash) and the user's go on it; the numbers traced off the sheet (outlines, widths, colours) and matched organ by organ; the plant grown as a readable recipe (organs drawn by their own chance, axes grown flush by flush or year by year, girth by the pipe model, flowers and fruit marked) and checked render by render against the photos with play/site/scripts/render.mjs; then proposed over the maia-play MCP. Use it whenever a plant, a tree, a crop, a herb or a fungus is built, upgraded, checked against the real one or planted in a world. Part of asset-producer.
---

# Plants: the real one, grown from its seed

A plant on play is an asset of the group `plants`: a readable CommonJS recipe that grows it at any **stage** from its
seed to ripe fruit, from any **seed** text (a sister plant), at any **detail** (a crowd in a world), and shows one of
its fruit on its own (the **Plant | Fruit** view). It is right when, stage by stage, it looks like photographs of the
real plant and every number in it is the real plant's. The laws over every asset (real size in metres, real numbers,
built in its parts, every upgrade its own version, look at it like a critic) are `asset-producer`'s; this is how they
are kept for plants.

Worked examples, all proposed over MCP and kept on play: **apricot v2** ('Ungarische Beste'), **cacao v3** (West
African Amelonado; its numbers in `references/cacao-amelonado.md`) and **banana v2** ('Dwarf Cavendish', the first made
from its own reference sheet; its numbers in `references/banana-dwarf-cavendish.md`, its brief in
`references/banana-dwarf-cavendish-brief.md`), and **orange v2** ('Tarocco', a grafted tree grown flush by flush; its
numbers in `references/orange-tarocco.md`, its brief in `references/orange-tarocco-brief.md`), and **peach v2** ('Saturn',
the flat peach, a stone budded and trained as an open vase year by year; its numbers in `references/peach-saturn.md`, its
brief in `references/peach-saturn-brief.md`), and **sapodilla v2** ('Alano', a grafted tree grown as Aubréville's model
from its own sheet, its silhouette laid on the sheet's tree; its numbers in `references/sapodilla-alano.md`, its brief in
`references/sapodilla-alano-brief.md`), and **lemon v2** ('Femminello Santa Teresa', a grafted tree grown flush by flush
inside the crown the grower keeps, three crops on it at once; its numbers in `references/lemon-femminello-santa-teresa.md`,
its brief beside them, its whole source `references/lemon-v2.js`), and **plum v2** ('Hauszwetschge', grown from its stone as
Rauh's model, a leader with tiers of limbs year by year, colour pictures only and leaf undersides with their own normals;
its numbers in `references/plum-hauszwetschge.md`, its brief beside them, its whole source `references/plum-v2.js`), and
**avocado v3** ('Fuerte', Rauh's model flush by flush from its rootstock's seed to mature fruit in its tenth year, inside
the crown measured for each age; its numbers in `references/avocado-fuerte.md`, its brief beside them, its whole source
`references/avocado-v3.js`), and **serviceberry v2** (Saskatoon 'Smoky', the first shrub: a suckering clump of canes
from its crown and suckers from its rhizomes, each cane a leader with side shoots and short flowering shoots, grown year
by year from its seed; its numbers in `references/serviceberry-smoky.md`, its brief beside them, its whole source
`references/serviceberry-v2.js`, whose part 1 is plum v2's without the leaves' clearcoat). Start
a new plant from the newest: copy its part 1
(the growing core, with its surfaces and `sound()`, and `picture()` with its mipmaps as lemon v2 has it; the file is
`references/banana-v2.js` or `references/lemon-v2.js`) as it is and write parts 2–4 for the new plant; a tree takes its
part 3 from orange v2 or lemon v2 (flushes) or plum v2 or apricot v2 (years).

## The order of work

1. **Brainstorm the name with the user first, and build nothing before they choose.** Offer three or four
   candidates (AskUserQuestion), each by its full Latin name and what sets it apart (size, fruit, where it grows, the
   world it would go into), the one you recommend first. Look in the library first (`list_assets` by the common and
   the Latin name): a plant already there gets its next version, not a second asset. Never "a cacao", "an apple": a species has many kinds that differ in
   just what the eye sees (pod shape and colour, flush colour, habit, when it bears). Choose the one most grown, or
   the one the world it goes into grows, and name it in full: genus, species, author, subspecies or cultivar group,
   cultivar, trade and local names (`Theobroma cacao L. subsp. sphaerocarpum (A.Chev.) Cuatrec. · West African
   Amelonado (Forastero) · Kakao`). Say why in the note. The label is `<Plant> '<Cultivar>' · <Genus species>`.
2. **Research its numbers before the first line of code** (a research agent does it well, in the background, while you
   read the old version). Fill the data sheet (`references/datasheet.md`): every row with a value and its source, the
   cultivar's own where it was measured, the species' otherwise, marked as such; a gap is an estimate marked `[EST]`
   with how it was made. Primary sources first: crop monographs (PROSEA, Wood & Lass…), extension sheets (FAO, ICAR,
   UF/IFAS), germplasm databases, measured theses; Wikipedia only to find them.
3. **Make its reference sheet** (below, "The reference sheet"): one clean-lit photographic plate of every stage and
   every organ, made by Google's image model from a brief of the cultivar's numbers, read critically against the data
   sheet and a handful of real photos, made again where it is wrong, and kept on play by its hash. **Show it to the
   user and wait for their go** before the recipe: the sheet is what the plant will be held to.
4. **Look at what there is**: render the current version at every stage (below) and list what is wrong against the
   sheet and the numbers. That list is the work.
5. **Trace the sheet** (below, "Realism from the sheet"): each organ's outline, widths and colours off its panel as
   numbers for the organs object.
6. **Write the recipe** (below), stage by stage from what is planted up, rendering as you go.
7. **Check it like a critic** (below) until every stage and every close-up holds against the sheet, panel by panel.
8. **Propose it** over MCP as the next version (below), its note saying what changed, the numbers and their sources,
   the sheet's hash, how it was checked, and what is still known to be short.

## The reference sheet

Real photographs of a plant are shot in every light, from every distance, half of them of another kind. The sheet is
the plant photographed once more the way a museum would: every stage and every organ of the one cultivar on white,
in one even light, straight on, beside one another. It replaces searching the web for photos as the plant's look.

- **Model**: Google's **Nano Banana Pro** (Gemini 3 Pro Image, `fal-ai/nano-banana-pro` on fal: 4K, high thinking, the
  data sheet passed as context). **Nano Banana 2.1** (`google/nano-banana-2.1`, with `--search` for web grounding) is
  the second opinion. `FAL_API_KEY` is the session's. About $0.15–0.30 a 4K plate.
- **The brief** (`brief.md`, kept beside the data sheet): the full name; then the plant in a paragraph per organ with
  the data sheet's numbers and the colours as seen (what it is planted as, the stem or pseudostem or trunk and its
  bark by age, the leaf upper and under side, young and old, the flower by its whorls, the fruit by age, cut, its seed,
  the roots); then `LAYOUT:` row by row. Row 1 the stages, standing on one ground line, soil cut away; row 2 the parts
  laid flat (roots washed, the stem cut across, bark or skin as 5–10 cm swatches, the leaf both sides, young and old,
  a bud); row 3 the flower (front, side, cut), the fruit at four ages side by side, cut, its seeds, and a 24-patch
  colour checker. The plant's own botany decides the rows: a banana has no seed or bark, but suckers, a pseudostem
  and a male bell. `references/banana-dwarf-cavendish-brief.md` is the example.
- **Make it**: `bun .claude/skills/plant-skill/scripts/sheet.ts --brief brief.md --datasheet datasheet.md --out
  <scratchpad>/<plant>` writes `sheet-1.png` (5504 × 3072), a JPEG under 4 MB for play, the prompt and the result.
  `--n 2` for two to choose from; `--model google/nano-banana-2.1 --search` for the second opinion.
- **Read it like a botanist**, panel by panel, against the data sheet and **5–10 real photos** (Wikimedia Commons, for
  checking only): an image model draws what is usual, not what is true. What to trust: colours (against the
  checker), surface texture, the form of one organ and its proportions *when they agree with the data sheet*. What
  never to trust: its scale bars and labels (the first banana sheet's bars disagreed with its own labels), counts
  (petals, locules, hands), relative sizes between panels, and anything the data sheet contradicts (its banana
  pseudostem was drawn thin and brown, the real one 0.8 m round and green, blotched). Sizes always come from the data
  sheet. A wrong panel is made again: `bun .claude/skills/plant-skill/scripts/sheet-edit.ts --sheet sheet-1.jpg --fix
  fix.txt --out <dir>/sheet-3 --label …` (`fal-ai/nano-banana-pro/edit`, the sheet as its image, "keep the whole plate,
  redraw only these cells", one paragraph a cell; kept in the Library too), or a whole new plate with the fault named in
  the brief. Edit often leaves the cells as they were (the
  sapodilla's redrew one cell of four): then make the wrong organs as a small plate of their own (its brief only those
  organs, the fault named) and paste them into the sheet's cells, their light-grey ground made white; keep that plate
  in the Library too, and the composite is the sheet held to. A form the model keeps redrawing its own way
  needs its own edit naming the form in plain words (the lemon's trees came back as lollipop standards twice; "a SHORT
  trunk … the crown starts LOW … like a haystack, not a ball on a stick" fixed them); make two and keep the one that
  changed only what was asked (the lemon's other edit replaced its cut fruit with whole ones).
- **Keep it in play's Library**: `sheet.ts` keeps every sheet it makes there at once (MCP `add_story_frame`, up to
  4 MB), labelled `Reference sheet · <Plant 'Cultivar'> · <k>` (give `--label "Lemon 'Femminello Santa Teresa'"`),
  and prints its BLAKE3 hash (`sheet-<k>.hash`); a sheet made otherwise is kept with `sheet.ts --upload <jpg>
  --label "<label>"`. Admins find them on play's Library page (`/library/`). The recipe names it in
  `PLANT.sheet = { hash, model, made }` and the version's note names it, so the plant and the plate it was held to are
  kept together; every later version that is checked against a new plate names that one.
- **Ask the user for the go** with the sheet shown (SendUserFile) and what you found wrong in it; build only once they
  say go.

## Realism from the sheet

The sheet is clean input, so the bar goes up: every organ is measured, not drawn by eye, and checked on the same white
in the same light as its panel.

1. **Trace the organs** with `python3 -I .claude/skills/plant-skill/scripts/trace.py sheet-1.png --box x0 y0 x1 y1
   --length <m> --axis x|y`: one specimen's outline and widths in metres (scaled by its real length from the data
   sheet) and its colours zone by zone in linear sRGB with their spread. They go into the organs object as tables
   (`LEAF_W`, `FRUIT_R`…) with a comment naming the sheet's hash and the panel, so a blade, a petal or a fruit's
   lathe has the real outline and not an ellipse. Colours: the median as the base, p10–p90 as each organ's own
   variation by its chance; check first that the checker's grey patches came out grey. A plate's ground is often light
   grey, not white: with the default `--white 0.10` the ground counts as specimen and every width comes out the box's
   (the orange's leaf traced as 57 mm at every station); pass `--white 0.2`–`0.25`, and read the widths before using
   them. A fruit's ends lie in its own shadow on the light box: cut it from the ground by its colour (saturation) to get
   its real profile, which closes round at both ends. The lemon's ground was lavender, about 0.91: white-balance
   the sheet on its ground first. A specimen laid at a slant is traced and compared crooked: turn it upright on its
   own main axis first, `python3 -I .claude/skills/plant-skill/scripts/upright.py <sheet> x0 y0 x1 y1 <out.png>
   [white]` (the lemon leaf's overlap went from 0.76 to 0.82 on that alone).
2. **Shape the third dimension** the plate does not show flat: a blade's fold along its midrib and its wave, a fruit's
   ridges and section (from the cut panel), a pseudostem's sheath edges, from the side views and the cuts.
3. **Detail where the eye reads it, as surfaces**: what vertex colours cannot carry (veins, blotches, fibres, spots,
   streaks) as small pictures the recipe makes from tiling noise (`surface()`, banana v2: nothing is loaded; the box
   carries a DataTexture's pixels to the page, up to 64 pictures of 4096 px), laid on by UVs in metres (`metric()`) so
   a blotch is a blotch's size on every plant; colour pictures multiply the vertex colours, bump pictures lift the
   light; only at detail 0.5 and over. Measure a pattern like a shape: its cover, its sizes along and across, its
   colour over each ground it lies on (banana: blotches as cells round scattered points, not stretched noise, which
   makes strands). And the materials: roughness and sheen per organ (a waxy fruit, a bloom as sheen, a matt
   underside; little clearcoat on leaves, or the sky turns their undersides blue).
4. **Match organ by organ on the organ bench**: `node .claude/skills/plant-skill/scripts/organ.mjs --file <source.js>
   --make "(o, T) => …" --view front|side|top --ppm <px per m> [--flat] --out organ.png` draws one organ from
   `module.exports.organs` alone, orthographic, in even light, on a transparent ground; `python3 -I
   .claude/skills/plant-skill/scripts/compare.py <panel.png> organ.png [--box …] [--axis x] [--colourful] --out
   cmp.png` lays it on its panel and gives the silhouettes' overlap (aim ≥ 0.9), both aspects, the widths edge to
   edge at ten stations and each zone's colour (aim within 0.03; `--flat` for the organ's own colours). Lay the bench
   organ as the panel lies (straight, its stalk down), crop the panel to one specimen (neighbours in the box ruin the
   numbers), and read the side-by-side picture as well as the numbers. Then the stages whole against row 1 for form
   and proportion (`--colourful` drops the sheet's ground line and bars; it also drops a dark crown, so for a tree
   white out the bars by hand instead); where the sheet cut a plant off or drew it against the data sheet, judge by
   eye and say so. A grown tree is more than the bench's page holds: `node .claude/skills/plant-skill/scripts/
   silhouette.cjs --file <source.js> --make "(o) => o.lite({ roots: false }, () => o.grow(10, 'maia'))" --out
   tree.png` rasterises it in node, and `compare.py … --close 0.04` compares crowns by their envelopes (a crown's
   silhouette is porous: its raw overlap stays near 0.6 even when the form is right). A white organ (a lemon flower) on a near-white ground cannot be
   cut out: judge it side by side. Compare like with like: a blade against a blade (cut the petiole off both when the
   sheet's is shorter than the data sheet's), a fruit without its stalk; where the sheet's proportion is wrong (the
   lemon's ripe fruit 1.37 : 1 against a measured 1.15), stretch the bench organ to the panel's aspect once to judge
   its outline apart from its proportion, and keep the data sheet's.
5. **Budgets go up with it**: up to about 800k triangles at full detail for a grown plant (a close-up is what the sheet
   is checked by), and still about 60k at 0.3 and 15k at 0.1 for the crowds: the extra detail belongs to `detailAt`.
   A plant of few big leaves (banana) thins by rows, never by dropping parts: `THINNED` holds only what is many. A
   tree of ten thousand small leaves (sapodilla v2) lays them from a few leaf templates into one batch of arrays (its
   `Leaves`, thinned there) instead of ten thousand Bag merges, and tunes `detailAt`'s table to keep far fewer far off.

## The recipe

One file in four parts, as the worked examples are:

1. **Growing** — the shared core, carried over unchanged: `chance(seed, ...keys)` (each organ its own chance, so the
   third leaf is the same leaf at every stage), `span`, `table`, noise (`noise3`, `fbm`, cellular `cells` for bark and
   skin), `tube` (swept, its radius and paint by the length along it), `sheet` (a leaf, a petal; with `back`, a second
   face), `bead`, the `Bag` (everything merged per material, so a tree is a handful of draw calls), `Space` (wood as
   rods, fruit as balls; `settle` hangs a fruit where it touches nothing), `root`, `lite` and `detailAt`. Add a
   material when the plant needs one (the cacao's waxy `pod`), never change what one does for another plant.
2. **Organs** — one object of the cultivar's numbers (`CA`, `UB`: sizes in metres, colours as seen in daylight), and a
   function per organ, built to its measure from the sheet's traces: seed, seed leaves, leaf (stalk, pulvini, blade outline,
   veins, its life from flush to fall), bud, flower (every whorl: sepals, petals, stamens, staminodes, style),
   fruit (its profile turned or swept, its ridges, its colour by days), bark (by girth and age: shoot, young bark,
   old bark, lichen, moss), anything the plant has of its own (the cacao's flower cushions).
3. **The plant** — its axes and how they grow in time `t` (years from sowing):
   - **Each axis a function of the length along it**: its direction at `s` metres depends on `s` (and a little on its
     age, as wood sags under its load), so a young axis is exactly the first part of the old one. Its length by its
     age from a table or a curve; flushes as steps (`flushed`): leaves of one flush come out together.
   - **Its architecture as the botany names it**: a cacao's chupon to a jorquette of five fans, their side branches in
     their own plane, the next chupon and tier; an apricot's leader, scaffolds, long shoots and spurs, year by year. The
     architecture is the first thing the eye reads; get it from the sheet's row 1, the real photos and the monograph (Hallé's tree models).
   - **A tree that grows in flushes** (citrus, mango, avocado, tea, cacao's fans): shoot units, one a flush, each tip
     aborting and the next flush breaking from the buds below it (orange v2's `shoots()`). Grow them in time order, flush
     by flush, so each decision rests only on older shoots and a younger tree is the first part of an older one. What
     made the orange read as itself, each found by a render that did not: the crown held to an envelope by age (a dome,
     widest two fifths up, its skirt near the ground) with the shoots steered along its normal toward the light; vigorous
     shoots upright, the strong ones high in the crown leaning in over its middle (or the dome's top stays hollow, two
     lobes); low side shoots arching out and down; a bud with no room yet waiting a few flushes instead of dying; a crowding
     grid of young tips (a light competition) for density; and renewal breaks from lit older wood, without which the
     skirt dies and the crown climbs into a ring as the old leaves fall.
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
  the fruit on the wood green and ripe; the fruit view; detail 0.3 and 0.1. Read each picture beside its panel of the sheet
  (and the real photos of that stage) and write down what differs (form first, then proportions, then colour, then detail); fix; render again.
- **Budgets**: about 300–450k triangles at full detail for a grown fruit tree, about 60k at 0.3, about 15k at 0.1;
  a build under ~3 s in the box. Thick wood takes the rings and sides (bark relief and lichen need them), twigs few.

## Proposing

- **Clean first**: `node .claude/skills/plant-skill/scripts/nan-check.cjs <source.js> <id> <v>` prints clean for
  every stage, plant and fruit, at detail 1 and 0.3 (no NaN, no normal of no length), or it is not proposed.
- **Link the sheet**: `propose_version` (or `propose_asset`) with `sheet`: the hash of the reference sheet Samuel gave
  the go for. play keeps it with the version (play/SPEC.md §4.10): the asset library shows it beside the version, the
  Library shows the plant beside the sheet.
- Over the maia-play MCP: `get_asset` (the head version's id is the `base`), `propose_version` with the whole `source`,
  the `params` when they change (a new stage count changes the stage's `max` and `names`), and the note. A source of
  80 kB or more is best sent from a script to the same MCP endpoint (`.mcp.json`; the session's `PLAY_MCP_TOKEN`) than
  pasted into a call. play checks it is readable (lines under 1000 characters) and builds it in the box; admins see it
  on the Proposals page and accept or archive it. Nothing is accepted over MCP.
- One ask, one version. The older versions stay as they were (their own recipe files); worlds anchored to them do not
  change.

## Lessons kept

- **Pictures need their mipmaps.** A `DataTexture` is nearest-filtered and unmipmapped by default: the lemon's rind
  glands, a fine pattern, read as a coarse honeycomb from two metres, and leaf veins shimmered. `picture()` sets linear
  filtering and mipmaps (lemon v2's part 1; banana v2's lacks it).
- **A bump picture's strength is per UV, not per metre.** A leaf whose UVs run 0 … 1 over its 10 cm needs a bump scale
  about a twentieth of a rind's laid on 3 cm tiles in metres (lemon: 0.04 against 0.8); too strong, every leaf showed
  barcode stripes.
- **Glossy leaves go white at a grazing angle.** A clearcoat on a leaf, however thin, mirrors the sky where the leaf is
  seen edge-on, and a crown of thousands of leaves turns grey-white. No clearcoat on leaves; roughness about 0.5 and a
  low `specularIntensity` (0.3) still read glossy. Render close-ups with the sun behind the camera, or glare hides it.
- **A colour mix must not overshoot.** THREE's `Color.lerp` does not clamp: a factor above 1 runs past the colour (the
  lemon's ripe yellow went mustard, its blue negative). Clamp the factor, or use `mix()`.
- **A tree of flushes is held by its crowding, sized by its pruning.** Lemon v2 grows every shoot of three flushes a
  year from the tips of the last, so its count would double each year; what holds it is a hard cap of young shoots
  (born within one leaf life) per 25 cm cell, the same everywhere, and its size is the grower's: a crown shape from
  the data sheet's heights and widths by age that no shoot grows out of. Exempting the crown's face from the cap ran
  away (60k leaves); a cap of 3 starved its top (2.7 m for 3.3). Tune by numbers per age (height, width, trunk at 30 cm,
  leaves, fruit, triangles) for two seeds before rendering; dead twigs inside must fall (they also thicken the trunk
  by the pipe model: 19 cm at eight years for a measured 9–12).
- **Image models draw standards.** Every tree on the lemon's sheet came out as a lollipop on a metre of bare stem; an
  orchard tree has a short trunk and a crown down to near the ground. Name the form in the brief and check it first.
- **The model draws the usual form of the species.** Peach v2's two first plates drew every 'Saturn' fruit round from
  the side and its stone almond-shaped, though the brief said flat, 62 × 30 mm, a disc stone; two edit passes got the
  side views to 1.4 : 1, not 2 : 1. When a cultivar's mark is its departure from the species (flat, seedless, dwarf),
  check that first, and if the plate will not draw it, take that shape from the data sheet and say so in the go question.
- **Every edit pass casts the plate.** Each `nano-banana-pro/edit` pass on peach v2's sheet tinted it magenta (the
  checker's greys from neutral to R and B some 15 levels over G). Read the checker's greys after every edit; grey-balance
  the edited plate against the first one's checker (a curve per channel through the six greys) before tracing a colour.
- **Size a fruit's balls so it touches nothing where it should hang.** A flat peach sits tight on its shoot; balls as big
  as the fruit overlapped its own shoot, so `Space.settle` ran its whole search for every fruit (46 shapes each, 3.6 s of
  a 5.7 s build). Balls a little inside the fruit, and a short search of its own round the shoot (`hangFlat`), brought
  the build to 1.7 s.
- **Measure a cover, do not guess its threshold.** A blush meant to cover 70–85 % covered 34 % at its first threshold.
  Count the red share of the skin on the mesh (area-weighted, over seeds and suns), tabulate cover against threshold and
  draw it through that table (`BLUSH_AT`, peach v2).
- **A washed-white close-up is a leaf at the lens.** With the camera's target inside the crown, a leaf right in front of
  it blurs the frame white; nan-check tells that from NaN. Put the target on the crown's near side. The organ bench
  times out on a whole tree of over ~400k triangles: judge whole stages from render.mjs.
- **But a white frame with one black pixel is a NaN nan-check cannot see** (plum v2, 2026-11-05). Its bearing tree went
  white from 3–4 m and at zoom 0.4, from anywhere and with leaves, fruit or wood each taken out, though nan-check was
  clean: one NaN pixel (black, at the frame's edge) and the viewer metered the frame white. The cause was its bump
  pictures: three's `perturbNormalArb` normalises a vector of no length wherever a triangle stands edge-on or shrinks
  under a pixel on screen, and a tree of a million small triangles finds such a pixel. Taking every bump picture out
  cured it (colour pictures cannot make NaN). For a dense tree: colour pictures only, relief as geometry; and render a
  zoom series (`camera: { zoom: 0.6 / 0.4 / 0.25 }`) before proposing, a uniformly white or black frame failing it.
- **A small leaf's underside needs its own normals.** `sheet({ back })` lights a leaf's underside with the upper
  face's normals (a banana's thin blade lets the light through). Seen from below, those normals face away from the eye,
  the Fresnel term takes the whole sky, and a tree of small hanging leaves draws white wherever undersides show (plum
  v2's seedling leaves were silver). `backLit: false` gives the underside its own normals (plum v2's part 1). It holds
  for a whole crown of big leathery leaves too: avocado v3's dome read silver-blue until the back half's normals were
  negated in its `leaf()`; give thick leaves (avocado, citrus, olive, cacao) their own underside normals.
- **trace.py measures from the bottom of its box.** Lay a specimen base down (`upright.py`) or flip the table: plum
  v2's leaf was first laid in tip first (a wedge base, a broad tip); the organ bench showed it at once.
- **White on white has no silhouette.** compare.py finds a white petal on the sheet's white ground as ground: a flower's
  overlap of 0.5 meant nothing (only its centre and stamens were measured). Judge white organs by eye, side by side.
- **A crown's form is set by height as well as by order** (plum v2, Rauh's model). Every tier of limbs leaving the
  leader at the same steep angle and rising to the light made an inverted cone, a broom; the sheet's tree is fullest
  just below the middle. Give the lower tiers a wider angle, a little more vigour and little upward turn (passed down
  to their shoots), the upper ones less vigour; then lay the silhouette (`silhouette.cjs`, `compare.py --close`) on
  row 1. Raising the clear stem by 20 cm took away a whole first tier: put the clear stem below the first year's top.
- **Parse a colour once.** A tree asks for the same few named colours hundreds of thousands of times; `new
  THREE.Color('#hex')` in `mix()` and every `lerp` was a fifth of plum v2's build. Keep parsed colours in a map
  (`named()`, plum v2's part 1).

- **A lathe closes on a circle, not on a sine** (serviceberry v2, 2026-11-05). With its rings laid along its height (y = −H·u),
  a fruit's radius near its poles must follow the circle, 2√(u(1 − u)); a sine of u (`sin(πu)^k`) closes in a point, and
  the round berry came off the bench like a lemon, pointed at both ends, at an overlap of 0.907 that looked fine. The
  side-by-side picture showed it; the circle took it to 0.965. Look at the bench's picture, not only its numbers.
- **A sheet with no width at either end has no area.** A sepal drawn with one row (`along: 1`) and a shape that is 0 at
  u = 0 and u = 1 is all collapsed triangles: `sound()` drops every one and the sepals vanish without an error. Give
  it two rows.
- **A shrub is a clump of canes** (serviceberry v2). Grow each stem as its own leader from the crown, a few a year
  (2–3 for a Saskatoon), and suckers from rhizomes from the third year, each with its own lean (5–20°, the outer ones
  more) and an arch that grows with its age. Calibrate by stems, height and the thickest stem's foot per age, as a tree
  by its trunk. The broom lesson holds for a bush too: side shoots low on a stem wider and stronger, those near its top
  weaker, or the bush is wider at its top than through its middle.
- **Measure a crown's fill, band by band.** Beside the envelope's overlap, count how much of its closed envelope the
  silhouette fills, in five height bands, against the sheet's (serviceberry v2: 61–63 % against 86 %, the top two
  fifths thinnest). The interior counts: the silhouette is a projection, so shading out the leaves inside the bush
  lowered the fill as well as the triangles. Each few points of fill cost 100k+ triangles in leaves and short shoots:
  decide the trade against the budget, and say what is left short. The sheet may draw a bush denser than it is.
- **A lathe from traced widths closes round, or it is a box.** Orange v2's first fruit came off the bench at overlap
  0.78, its ends flat: a lathe's first and last rings jumped from the traced width straight to zero. Space the rings by
  `(1 − cos)` toward the poles and keep the traced profile as a correction of an ellipse (held at its neighbours' near the
  ends): 0.956 at once. Its blush, first drawn from noise along u and round v, came out as smears: patterns on a fruit are
  noise on the unit ball, so they are round.
- **No shader code leaves the box.** play's asset box sends a material out as its kind and plain settings
  (`box/serialize.js`): an `onBeforeCompile` (a leaf's underside tinted by `gl_FrontFacing`) is lost. A leaf's two
  colours are two faces; budget a tree's leaves by their rows (orange v2: 6 blade stations, 3 across, ~11k leaves, about
  half its 800k triangles), and thin harder for crowds where twigs and leaves are many (`detailAt`).
- **Calibrate the girth where the stem already is.** Avocado v3's germinating shoot came out as a 6 m cone: the trunk
  was scaled to its measured diameter at 30 cm while the shoot was 6 cm tall (a division by zero). Measure at
  `min(0.32, half the length grown)`.
- **What falls, falls.** A shoot shaded out must die with every shoot it carries and leave the tree within a year
  (avocado v3: drawn as length 0 after it); kept, the crown is a broom of bare sticks between the leaves.
- **Don't search for what will drop.** Placing every fruitlet of the set with `Space.settle` took avocado v3's fruit-set
  stage to 56 s in the box; only the fruit kept to maturity search, the ones that drop hang as they are (3 s). Winter
  inflorescence buds as one bead a tip, not stub racemes (140k triangles saved).
- **Bench what the sheet can be held to.** Where the data sheet and the sheet disagree on a part (the avocado's
  petiole is 'very long' to UPOV, short on the plate), bench the blade alone; give a radial organ (a flower) a `turn`
  so its first tepal lies where the panel's does, or the overlap measures the rotation (0.43 → 0.85).
- **A big tree has no close-up in render.mjs.** With the camera inside a grown crown's bounds the frame comes out white
  (its exposure, not NaN: nan-check was clean); judge leaves, flowers and fruit on the organ bench, and the tree whole.
- **Judge a panel's colour on its middle.** On the light box the underside of a fruit or a trunk is in its own soft
  shadow: the bench's bottom zones disagree with the panel by 0.1–0.2 however right the colour is.
- **A tree's architecture is grown, then checked as a silhouette** (sapodilla v2, Aubréville's model, 2026-11-05). Its
  first crowns were a vase, an umbrella over a bare leader, and a pagoda of thin tiers, though each read as "a tree"
  in its own render. What fixed it, each found by laying the silhouette on the sheet's tree: a shade rule that counts
  only the rosettes just over a tip (its own tier's canopy, 0.1–0.6 m up), not everything up to the top (the upper
  tiers had starved the lower); branches aimed a little below level, because each unit's end turns up to its rosette
  and the rise adds up along a branch; twigs that stop and lose their leaves die and fall (else the inside is a broom of
  bare sticks); the first scaffold tier kept low (the data sheet's 0.5–0.8 m), not pruned; the crown envelope a dome
  widest half way up. Count where the rosettes are by height before rendering: it is quicker than a render.
- **Tips by the hundred.** A crown reads as dense only with enough shoot tips: the sapodilla needed some 1,000 at 8 years
  (forks of two or three at most flushes, a minimum spacing between new rosettes of ~9 cm) before its crown stopped
  being see-through; check `forks` and the spacing rule's rejections when a crown stays thin.

- **Safe on every GPU, or black on an iPad.** Banana v2's first proposal drew black in play's viewer on an iPad:
  some 800 normals of no length where its blades' rows met at the tip, with a bump picture, made NaN pixels on
  Apple's GPU, and the viewer blurred them over the frame (Chromium's software GL, which the renders use, hid it).
  Every mesh goes through `sound()` when the Bag merges it (collapsed triangles out, every normal of no length
  given its faces'), and `node .claude/skills/plant-skill/scripts/nan-check.cjs <source.js> <id> <v>` must print
  clean for every stage before proposing. `references/banana-v2.js` is banana v2's whole source: copy its part 1
  (with `sound()`, `surface()`, `metric()`) for a new plant.
- **The sheet is clean, not true.** The first banana plate (Nano Banana Pro, 2026-11-04) was clean, sharp and right
  in colour and texture, and its organs traced true (blade 2.4 : 1 against the clone's measured 2.3; bell and leaf
  overlaps 0.93 when matched). But its scale bars disagreed with its own labels, its "hand" at four ages was pairs of
  fingers, its ripe slice showed five segments for three, its tallest plants were cut off at the top, and it drew the
  pseudostem thin and brown where the data sheet measures 0.8 m round and blotched green. Trace the shapes it gets
  right; take every size and count from the data sheet; measure before judging (a first look at its leaf said 4 : 1:
  the crop held the petiole and white).
- **The bench sees what the eye misses.** Banana v2's fingers all hung downward for three renders that looked right
  (a rotation's sign); its fingers were 6 : 1 where the sheet and Pope say 4 : 1. Count and measure: tips above
  stalks, aspects, cover.

- **Name the cultivar first.** The old cacao was "a cacao": narrow willow leaves, a shrub, little orange pods. Every
  look that is wrong is easier to see against one real kind.
- **The architecture is what reads.** A real cacao is a straight stem to a jorquette, fans rising at 35–55° and arching
  over, tiers; a plant grown as a generic crown never looks like it, whatever its leaves.
- **Calibrate girth and height to measured ages**, not by eye: the first cacao trunk was a pole half its real width.
- **Leaves where they live.** A leaf's real life (half a year to a year for cacao) leaves the inner crown bare; the
  flush hangs limp and coloured for weeks. Seen from below a crown shows its undersides: give them their own colour.
- **Fruit by the cultivar's measured size and shape** (Amelonado: 14.9 × 8.4 cm, blunt, no neck) and **where the plant
  bears it** (cauliflory: the trunk and old limbs). The set and the drop (cherelle wilt, June drop) are part of the look.
- **Colour from the sheet and the photos, not memory**: cacao flowers are cream with dark red stripes, not pink; Amelonado flush is
  pale and tinged pink, not copper; cacao trunks are dark grey-brown with round pale lichen spots.
- **Pattern needs vertices**: cellular lichen or bark on a coarse tube comes out as squares. Give thick wood its rings
  and sides, soften the edges, or make the pattern larger.
- **A young axis is the first part of the old one**: directions as functions of the length along the axis, chance per
  organ by name; then a plant tabbed from seed to fruit grows instead of being redrawn.
