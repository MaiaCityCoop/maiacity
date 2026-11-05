# Ananas comosus (L.) Merr. 'Queen Victoria': facts for a procedural model

Researched 2026-11-05 for a pineapple grown stage by stage from planting material (sucker, slip or crown) to ripe fruit
and its ratoon suckers. Built on the template `datasheet.md` and set out like `banana-dwarf-cavendish.md` (the nearest
sheet: a monocot rosette whose axis flowers once). 'Queen Victoria' ("ananas Victoria" in Réunion) belongs to the
**Queen group**. Where Réunion numbers exist they are used first. Where only the group (India's 'Queen', South
Africa's Natal Queen) or the species (mostly 'Smooth Cayenne') is measured, the row says so.

**Labels used below**

- **[CV]**: measured on 'Queen Victoria' / 'Victoria' itself (Réunion, Mauritius).
- **[GR]**: measured on another clone of the Queen group ('Queen' in India and South Africa, 'Natal Queen', 'Moris').
- **[SP]**: said of *Ananas comosus* in general, or measured on 'Smooth Cayenne' (SC).
- **[EST]**: my estimate for modelling, with the reasoning given. It is not a published value.
- **[2nd]**: I read only an abstract, a snippet, a trade page or a review that cites the work, not the original.

Each number has a source tag such as S1. The full references are at the end. Units are metres, kilograms and days.
Ages run **from planting** the sucker unless a row says otherwise. "Forcing" (TIF, *traitement d'induction florale*)
is the day the flower is induced by ethephon or acetylene. Natural induction is called "differentiation".

> **Do not confuse it** with Brazil's 'Vitória' (an Embrapa hybrid, spineless, ~1.5 kg). Papers on "cv. Vitória"
> are not about this plant.

---

## For the model (at a glance)

Two Réunion climates matter:

- **Lowland, warm** (≈150–350 m, mean 22–25 °C): forced at about **5–7 months**.
- **Highland, cool** (≈750 m, mean ~19 °C): forced at **11–12 months** (S4).

The values below are lowland unless marked.

**Planting material**

| Item | Value | Tag |
|---|---|---|
| Sucker (*rejet*), the usual Réunion planting | **250 g** standard (S1). Range used 100–400 g ± 50 g (S2). Above 500 g, 40–50 % flower spontaneously within weeks of planting (S2) | [CV] |
| Its look | **~30–40 cm long**, a tight fan of **~25–30 leaves**, with a curved, rooted base (often an underground sucker that has already rooted, S2) | length [EST from leaf counts S3 Fig. 3 and D-leaf ~10 g]; leaves [CV] S3 |
| Slip (*bulbille*) | Victoria "n'émet pas de bulbilles" (makes no slips) in Réunion (S2). The Indian 'Queen' makes **~2.1 slips** per plant (S9). **Model 0–2 slips, default 0** | [CV]; [GR] |
| Crown | not planted in Réunion: the fruit is sold with it (S2). It is the slowest material: crown > slip > sucker in growth rate (S5) | [CV]; [SP] |

**Growth by stage (lowland Réunion, sucker of ~250 g)**

| Age | Plant fresh mass | D-leaf mass | Leaves on plant (all, incl. sucker's) | Height to leaf tips | Spread (tip to tip) | Source |
|---|---|---|---|---|---|---|
| 0 | 0.25 kg | ~10 g | ~27 | 0.30–0.35 m | 0.35–0.45 m | S1; S3; [EST] |
| 1 month | ~0.18–0.20 kg (transplant check) | 10 g | 28 | 0.30 m | 0.40 m | [CV] S3 Fig. 1–3 (read off) |
| 3 months | ~0.35 kg | ~12 g | ~37 | 0.35–0.40 m | 0.50–0.60 m | [CV] S3 (read off); height/spread [EST] |
| 4 months | ~0.48 kg | ~20 g | ~41 | 0.40–0.45 m | 0.60–0.70 m | [CV] S3; [EST] |
| 5 months | ~0.65 kg | ~30–40 g (warm site) | ~46 | 0.45–0.55 m | 0.70–0.80 m | [CV] S3, S1; [EST] |
| 6 months | ~0.80 kg | ~40 g | ~49 | 0.50–0.60 m | 0.75–0.90 m | [CV] S3; [EST] |
| **forcing** (5 months warm, 7 months at S3's site; **11–12 months at 750 m**) | **~1.0 kg** | **50 g** (the Réunion forcing rule) | **~50** (22.75 new leaves since planting) | **0.55–0.70 m** | **0.80–1.00 m** | [CV] S1, S3, S4; [EST height/spread] |
| 9 months (if not forced) | ~1.4 kg | ~57 g | ~56+ | 0.65–0.75 m | 0.9–1.1 m | [CV] S3 (read off); [EST] |
| 12 months (highland, at forcing) | ~1.0–1.2 kg | 50 g | ~50–55 | 0.6–0.75 m | 0.9–1.0 m | [CV] S4; [EST] |
| 18 months, Indian 'Queen' (natural flowering) | — | D-leaf **69 × 5.2 cm** | **67** | **0.90 m** | — | [GR] S9 |

- **Leaf emission.** **0.17 leaves/day** (about 5 a month) under normal fertilisation, and 0.13/day under organic
  fertilisation (S1). S3's regression gives about 0.13/day (28 leaves at 30 d → 56 at 245 d).
- **Height and spread.** No Victoria height has been published. Model height at about **1.0–1.1 × D-leaf length**
  (the leaves arch: the outer ones lie at 40–60°, the D leaves at about 30° from vertical) and spread at about
  **1.5 × D-leaf length** [EST].

**Flowering and fruit (from induction)**

| Day after induction | Stage | Source |
|---|---|---|
| 0 | forcing (ethephon 0.48 g/L + 2.5 % urea) or natural differentiation (short, cool, cloudy days, June–August) | [CV] S1, S2 |
| ~30, ~40 | stages A and B: the apex swells, the peduncle starts to lengthen; nothing shows outside. The heart leaves bunch and pale at the base | [CV] S2 (photo plate p. 31, 33) |
| **~60** | **red heart**: the young fruit appears in the heart of the rosette (stage C). Ring of 5–7 short red bracts | [CV] S2; bracts [SP] S6 |
| **~75** | **first flowers open** at the base of the spike (stage D). The inflorescence is ~5–6 cm tall, still inside the upper leaves | [CV] S2; size [EST from the photo scale bar] |
| ~75–92 | flowering runs base to top, **5–10 flowers a day**. With 75–86 flowers that is **~10–17 days** | [CV] S1 (flower count); [SP] S6 (rate) |
| ~90 | **dry petal**: the top perianths and styles dry; the fruit is a cone ~8 × 5 cm, the crown bud just showing | [CV] S2 (last photo); size [EST] |
| **150–200** (summer 150, winter 200) | **harvest**: the "floraison" (stage C) to harvest is **88–137 d** (S2) | [CV] S2; S1 implies ~208 d (cool season) [EST] |

**Fruit at harvest**

- **Fruit.** **0.70–0.95 kg** (Réunion trials: 951, 900 and 710 g; S1). It is a cylinder narrowing to a cone at the
  top. **~13–15 cm long × 9.5–11 cm across** [EST from mass; the Indian 'Queen' at 1.2 kg was 19.6 cm × 12.5 cm, S9].
- **Eyes.** **75–86** per fruit (S1), in **8 and 13 spirals** (S10).
- **Brix and acidity.** **17.2–18.9 °Brix** (S1).
- **Crown.** **120–160 g** (S1). Model it at **~15–20 cm** tall [EST]; the Indian 'Queen' crown is 24.7 cm (S9).
- **Ripening.** Shell yellows **from the base up**. C2 is half yellow; C4 is all yellow (S1).

**Suckers, slips and ratoons**

- **Many suckers ("cayeux").** 'Victoria' makes many: a second crop and more can follow without replanting, but the
  suckers must be thinned (S7). The Indian 'Queen' averages **2.2 suckers** a plant (S9).
- **Where they rise.**
  - **Stem (aerial) suckers** come from leaf axils on the stem, under the fruit and a third to halfway up the
    stem, inside the rosette. They start growing at differentiation [SP] S8.
  - **Ground suckers** come from the buried base [CV] S2.
- **Size at harvest.** About **0.25–0.5 kg**, 30–45 cm long [EST from S2's sucker grades and S8]. Use one or two as
  the ratoon followers.

---

## 0. The cultivar in one paragraph

- **What it is.** 'Victoria' is the Queen-group pineapple of Réunion. It is grown from 50 to 900 m in very different
  climates, so its fruit size varies a great deal (S11). It also grows in Mauritius ('Queen Victoria', exported by air).
  In 2006 the Réunion "Ananas Victoria" became the **first tropical fruit to get the Label Rouge** (S12 [2nd], S13
  [2nd]).
  - Note: the Label Rouge is the quality sign. I found no IGP specification for it; see Gaps.
- **Its marks** (Queen group):
  - **Plant.** Small, compact and dwarf. Short, stiff leaves with **spines along the whole margin**, grey-green with a
    silvery underside.
  - **Fruit.** Small, conical to cylindrical and golden-yellow. **Deep eyes**, deep-yellow crisp flesh, and a very
    sweet, fragrant taste.
  - **Hardiness.** More cold- and disease-tolerant than 'Smooth Cayenne'.
  - Sources: [GR] S14 (Morton 1987 via S14 [2nd]), S15 [2nd], S16 [2nd].
- **Victoria in particular.**
  - It makes **very many suckers and no slips** (S2, S7).
  - **Natural flowering is very strong**: 54.5 % of plants flowered in August alone, because of the short, cool,
    cloudy days around 21 June, and so a glut of fruit comes in December (S2).
  - It is more sensitive than 'Smooth Cayenne' to fruitlet diseases in Réunion (S7).
- **Rules for the model.**
  - Each axis flowers once and ends in the fruit and its crown (hapaxanthic).
  - It is replaced by a sucker from a leaf axil of the same stem, so a ratoon plant shows mother and daughters on one
    stump.
  - It is seedless: parthenocarpic and self-incompatible, so it never has seeds.
  - It is one clone, so plants vary only with planting weight, site (altitude) and season.

## Name

| Row | Value |
|---|---|
| Genus, species, author | *Ananas comosus* (L.) Merr. (Bromeliaceae) |
| Subspecies / group / cultivar | var. *comosus*; **Queen group** (one of the four trade groups: Smooth Cayenne, Spanish, Queen, Pernambuco, S6, S8); 'Queen Victoria' = 'Victoria' (Réunion). Coppens d'Eeckenbrugge & Leal treat 'Queen' as one cultivar, with 'Ripley Queen', 'Alexandra' and 'McGregor' as clones of it (S17 [2nd]) |
| Common and local names | ananas Victoria, ananas Queen Victoria (Réunion, Mauritius); Queen, Natal Queen, Common Rough (Australia, South Africa); Moris (Malaysia, Queen group) |
| Why this one | the small, very sweet, air-freighted premium pineapple of Réunion; first Label Rouge tropical fruit; a compact, spiny rosette that reads well as a model |
| Food-forest layer | herb / low shrub layer (0.6–0.9 m), in full sun, in rows on ridges |
| Architecture (Hallé–Oldeman model) | a monocot rosette whose single axis ends in a terminal inflorescence (hapaxanthic) and is relayed by axillary suckers: **Tomlinson's model** (as for banana), the relay suckers coming from stem axils rather than only the base [EST classification; the habit is from S6, S8] |

## 1. Planting material (in place of seed: clonal, seedless)

| Item | Value | Source |
|---|---|---|
| Seeds | none in the field: self-incompatible, the fruit develops parthenocarpically. If hand-crossed: seeds 3–5 × 1–2 mm, hard brown coat | [SP] S6 |
| Planting material used in Réunion | **suckers only** (*rejets*). Crowns stay on the sold fruit and Victoria makes no slips (*bulbilles*) | [CV] S2 |
| Sucker mass | **250 g** in the 2009 CIRAD trial (S1). Aubert's grades were 100, 200, 300 and 400 g (± 50 g) (S2). India used 300–400 g suckers of 'Queen' (S9) | [CV]; [GR] |
| Too-large suckers | > 500 g gives **40–50 % spontaneous flowering** in the weeks after planting (S2). Many Réunion suckers are "underground", already rooted, and the planting shock can make them flower | [CV] S2 |
| Planting depth | suckers 10–15 cm; crowns 5–10 cm | [SP] S6 |
| Rank of growth rate | aerial (stem) suckers > slips > crowns, "whatever the variety" | [SP] S5 |
| Sucker look | a curved base (it grew out from the stem), short stiff spiny leaves, the outer ones browning. **30–40 cm** long at 250 g [EST]. Leaf count at planting **~27** (S3, regression at day 30 = 28) | [CV] S3; [EST] |
| Crown as planting (species) | crown planting takes up to 22–24 months to fruit, slips ~20 months, shoots 15–18 months (SC) | [SP] S6 |

## 2. Growth and form

### Stem ("stump") and peduncle

| Item | Value | Source |
|---|---|---|
| Stem (species) | erect, club-shaped, **25–50 cm long, 2–5 cm across at the base, 5–8 cm at the top**, with short internodes, wholly hidden by the leaf bases | [SP] S6 |
| Stem, Victoria | smaller: **~20–30 cm** long, ~3 cm at the base, **~5 cm** below the fruit. The lowest 5–10 cm are buried; it leans or lies on old plants (ratoons) | [EST], scaled from S6 by Queen's plant mass of 1.0 kg against 2 kg for SC at forcing (S5) |
| Peduncle | it lengthens from the start of flowering (S6). The fruit rises clear of the heart by harvest. Victoria: **~8–15 cm long, ~2 cm thick**, green, with 5–7 small red-tinged bracts that grade into leaves | [SP] S6, S8; Victoria length [EST from the photos in S2] |

### Leaves through time (see "For the model" for the full table)

- **Leaf emission.** **0.17 leaves/day** with conventional NPK; 0.13/day with organic fertiliser (S1, Table 3). This
  is about **4–5 leaves a month** in warm Réunion lowlands [CV]. In the cool highland at 750 m it is slower: forcing
  takes 11–12 months instead of ~6 (S4).
- **Leaves at forcing.** About **22–23 new leaves** from planting to forcing (149 d), plus the sucker's own ~27, so
  **~50 leaves** [CV] S1, S3. The species flowers after 70–80 leaves (S6), but that is SC; Victoria is forced smaller.
- **Plant mass** grows on a convex curve and is "smaller for the 'Queen Victoria'" than SC, MD-2 or Flhoran 41 (S5).
  Read off S3 Fig. 1: ~0.2 kg at 30 d, 0.35 at 90 d, 0.65 at 150 d, 0.8 at 180 d, 1.2 at 240 d, 1.8 at 300 d. Its gain
  is **linear in the sum of temperatures** (degree-days) (S3, S4). [CV]
- **D-leaf mass** follows a sigmoid: ~10 g to day 80, 20 g at 120 d, 30 g at 150 d, 40 g at 180 d, 50 g at 210 d,
  levelling at ~58–60 g by 300–340 d (S3 Fig. 2, read off). Forcing at **D-leaf 50 g ↔ plant 1.0 kg ↔ fruit ~0.7 kg**
  (S3, S5). [CV]

### Phyllotaxis, branching, roots

| Item | Value | Source |
|---|---|---|
| Leaf phyllotaxis | a dense spiral rosette. Leaves clasp two-thirds of the stem with a broad sheath. No Victoria divergence angle was found: use the Fibonacci **~137.5°** (the 5/13 and 8/13 parastichies of the rosette) | [SP] S6; angle [EST] |
| Leaf types A–F (Py) | **A** the oldest leaves, already grown on the planting sucker; **B** the next, older outer leaves; **C** leaves with a widened sheath, still arching out; **D** the youngest fully grown leaves, the **longest**, standing at ~45°, with parallel margins at the base: the sampling leaf; **E** still growing, shorter, more upright; **F** the youngest, centre leaves, short and upright | [SP] Py et al. 1987 (S18) as used in S1, S5 [2nd: the definitions are from the standard summary, not reread] |
| Branching: suckers | axillary buds on the stem grow into **stem suckers** from differentiation. Victoria makes **many** ("production très importante de cayeux"), so a plantation gives a second crop without replanting, but suckers must be thinned ("oeilletonnage") | [CV] S7; [SP] S8 |
| Branching: ground suckers | from the buried stem base; "souterrains" suckers with their own roots | [CV] S2 |
| Branching: slips | on the peduncle under the fruit; **none** on Victoria in Réunion (S2). The Indian 'Queen' averages 2.1 (S9). When present they curve out and up from under the fruit and are visible when the fruit is half grown (S8) | [CV]; [GR]; [SP] |
| Hapas, collar of slips | hapas (between slips and suckers, at the peduncle base) are rare; a "collar of slips" (10+) is a mutation. Do not model | [SP] S8 |
| Aerial roots | adventitious roots grow out of the stem and **wind round it between the leaf bases**, a brown tuft visible when the old leaves are pulled back; the leaf bases hold water | [SP] S6 |
| Roots: depth and spread | adventitious; up to **1–2 m sideways and 0.85 m deep** in the best soil (SC). Most lie in the **top 15–30 cm** under the ridge [EST]. Root growth slows after induction; maximum root mass at anthesis | [SP] S6 |

## 3. Leaves

| Item | Value | Source |
|---|---|---|
| D-leaf mass at forcing | **50 g** (Victoria) against **80 g** (SC, MD-2) and 70–75 g (Flhoran 41) | [CV] S1, S3, S5 |
| D-leaf L × W | Indian 'Queen' at 18 months: **69.4 × 5.21 cm**, 361 cm² (S9). For Victoria at 50 g use **55–65 cm × 4.5–5 cm** | [GR] S9; Victoria [EST, scaled by D-leaf mass ~ L² against S9's larger plants] |
| Leaf length by type | A (on the sucker): 20–35 cm; B: 35–50; C: 50–60; **D: 55–65 (longest)**; E: 30–50; F: 5–25, upright | [EST] from the D-leaf and the A–F definitions (S18) |
| Maximum, species | up to **100 × 7 cm** (SC) | [SP] S6 (Py et al. 1987); S8 |
| Shape | sword-shaped, channelled (U in section), thick and stiff (Queen leaves are "short" and stiff). The base is a broad, pale, clasping sheath; the tip is a hard sharp point | [GR] S14 [2nd]; [SP] S6 |
| Spines | **along the whole margin** (Queen group is spiny; SC has only the tip spine). Small, hooked teeth curving **towards the leaf tip**. Model them at ~1–2 mm long, **~3–6 mm apart**, closer near the base, and a 3–5 mm terminal spine | [GR] S15 [2nd] (Mauritius-grown Queen: "spiny along the whole margin", crown spiny too), S14, S16; size and spacing [EST from photos] |
| Spine colour | green to pale cream at the leaf base, **reddish-brown to dark brown** at the tips (they darken with age) | [EST from photos] |
| Colour, upper face | **grey-green to mid green**, slightly glaucous (≈ #5d7a50) | [GR] S16 "compact grey green" [2nd]; hex [EST] |
| Colour, lower face | **silvery**, from a dense coat of peltate trichomes, in fine lengthwise stripes (≈ #aab5a2). Hairs "more pronounced on the lower surface" | [SP] S6; [GR] "silvery" S16 [2nd]; hex [EST] |
| Red / anthocyanin tints | Queen leaves are described as "dark purplish-green". In full sun and cool dry seasons, model a **red-bronze to purplish flush** along the margins, the tips and the exposed upper face of the outer (A–C) leaves (≈ #7a4a45), strongest in winter and on hungry plants. The heart (E–F) leaves stay green | [GR] S19 [2nd] ("dark purplish-green"); pattern [EST]: no measured description for Victoria found |
| Dying leaf | the outer A leaves yellow, then brown, from the tip; they dry and lie flat on the ridge | [SP]; [EST] |
| Leaves alive at forcing | ~40–50 (the A leaves of the sucker are dying) | [EST] from S1, S3 |
| Leaves stop | at induction, new leaves stop; leaves already started stay short (the short heart leaves around the young fruit) | [SP] S6 |

## 4. Inflorescence and flowers

| Item | Value | Source |
|---|---|---|
| Where borne | terminal, from the apical meristem; it rises through the heart on the lengthening peduncle | [SP] S6, S8 |
| Induction, natural | in Réunion (21° S) natural differentiation follows **shorter days, cooler air and a sudden rise in cloudiness**. It is centred on the June solstice: **54.5 % of all plants flowered in August** (stage C), so differentiation is about 60 days earlier. Small suckers (100 g) flowered 68 % in August, 400 g suckers only 42 % | [CV] S2 (Tables 1–2) |
| Induction, forced | **ethephon 0.48 g/L + 2.5 % urea** at 4 L/ha (sic: the published rate) when the D leaf reaches 50 g (S1). Earlier: calcium carbide (acetylene), as a saturated aqueous solution or solid, best given in a cloudy spell (S2) | [CV] S1, S2 |
| Stages after induction | 30 d stage A, 40 d stage B (apex swelling, peduncle starting); **60 d: young fruit visible in the heart** ("red heart"); **75 d: first perianths out at the base of the spike**; then dry perianths and styles at the top | [CV] S2 (photo plate) |
| Same, species (SC, Hawaii) | not visible for **45–60 d**; then "½-inch" and "1-inch open heart" (1.25 and 2.5 cm openings) with the red inflorescence below; **blue petals 3–4 weeks later**; then "dry petal" | [SP] S8 |
| Red heart bracts | **5–7** peduncle bracts at the base of the inflorescence, **red to reddish-orange**, shorter and narrower than leaves; the heart leaves around them also flush red | [SP] S6 |
| Floral bracts | one under each flower, thick, pointed, trichome-covered; **red-pink at emergence**, turning green-bronze as the fruit grows, then yellow-orange with the ripe shell [EST colours] | [SP] S6; colours [EST] |
| Flower count | equals the eye count: **75–86** (Réunion trials, by fertilisation) (S1); 107 (Indian 'Queen', S9); 37–61 (small Thai 'Queen', Phu Lae, S20 [2nd]). The species range is 50–200 (S6), 100–200 in SC (S10) | [CV] S1 |
| Flower | perfect, trimerous: **3 sepals** (short, fleshy, triangular, coloured like the bract), **3 petals** (tongue-shaped, **white at the base, violet-blue / lilac at the tip**, ~2 cm, they form a tube), **6 stamens** in two whorls (about half the petal length), a trifid style longer than the stamens, an inferior 3-loculed ovary with 3 nectaries | [SP] S6, S8; violet colour on Victoria [CV] S13 [2nd] ("épi dense de fleurs violettes") |
| Opening | in sequence from the base up, in spirals; **5–10 flowers a day**; flowering lasts **10–30 days** (15–25 by temperature and flower number). Each flower opens at night and closes by sunset the same day | [SP] S6 |
| Victoria flowering length | with 75–86 flowers at 5–10 a day: **~10–17 days** (stage D at 75 d to dry petals at about 90 d) | [EST] from S1, S2, S6 |
| Pollen | Queen pollen grains 36–68 µm (SC 35–81 µm) | [GR/SP] S6 |
| Pollination | self-sterile; commercial fruit is seedless. Hummingbirds pollinate in the Americas; bees and ants only visit | [SP] S6 |

## 5. Fruit

| Item | Value | Source |
|---|---|---|
| Mass | **951 ± 149 g** (NPK), **900 ± 153 g** (integrated), **710 ± 124 g** (organic), Saint-Pierre, Réunion 150 m (S1). Air-freight standard **~700 g**; export range **600–900 g** (S1, S5). Natural-flowering trial, Bassin-Martin 300 m: **0.80–1.15 kg** (mean of plots), best 1.15 kg from 300 g suckers planted in March and harvested at 500 d (S2) | [CV] |
| Mass, other Queen | India 'Queen' 1.20 kg with crown, 0.97 kg without (S9); South Africa (Zululand) export grades 250–500 g, local market 450 g to > 1.2 kg (S21); Morton: 0.45–1.13 kg (S14 [2nd]) | [GR] |
| Mass grows with | planting weight and plant mass at forcing (D-leaf). The SC rule is fruit ≈ plant mass at flowering (S8); Victoria gives ~0.7 kg from a 1.0 kg plant (S5) | [CV] S5; [SP] S8 |
| Shape | **conical** (Morton) to **cylindrical** (Nancy); most Réunion fruit is a short cylinder with the top third tapering to the crown | [GR] S14 [2nd]; [CV] S13 [2nd] |
| L × D | no measured Victoria value was found. Use **13–15 cm × 9.5–11 cm** (L/D ≈ 1.35) for 0.75–0.95 kg; **11–12 × 8.5–9 cm** for a 0.5 kg "baby" | [EST] from mass with density ~1.0 and form factor 0.85; checked against Indian 'Queen' 19.6 cm × 12.5 cm (circumference 39.4 cm) at 0.97 kg without crown (S9) and the trade claim of 10–12 × 7–8 cm (S22 [2nd]) |
| Eyes (fruitlets) | **75–86** (S1). Arranged in parastichies of **8** (less steep) and **13** (steep), sometimes also 5 (very flat) and 21 (near vertical) visible; small "runt" fruits are 5-8-13 (S10). With ~80 eyes: ~10 eyes along each 8-spiral, ~6 along each 13-spiral. Handedness is random (49.4 % right, 50.6 % left of 9,008 fruits) | [CV] S1; [SP] S10 |
| Eye size and depth | Queen has **deep eyes** (S14). On a 14 × 10 cm fruit with 80 eyes, each eye is **~2.2–2.5 cm across** (hexagonal, wider than tall). Use a bract tip 3–5 mm proud, eye cavities ~8–12 mm deep into the flesh | [GR] S14 [2nd]; size [EST] from the surface area / eye count; depth [EST] |
| Core | a small core [GR] S23 [2nd] (Moris). Use **1.5–2 cm** across | [EST] |
| Flesh | **deep golden-yellow**, crisp, less juicy than SC, aromatic | [GR] S24, S14 [2nd]; [CV] S13 [2nd] |
| Brix | **17.2 ± 1.0** (NPK), **17.8 ± 0.9** (integrated), **18.9 ± 0.9** (organic) | [CV] S1 (Table 5) |
| Brix, other | Indian 'Queen' 18.0 (S9); 15–16 (NHB India, S24); Codex minimum for trade 12 (S6) | [GR] |
| Acidity | 12.95–16.32 meq/100 mL (S1); Indian Queen TSS:acid 27 (S9) | [CV]; [GR] |
| Crown | **119–160 g** (S1). The Indian 'Queen' crown is **24.7 cm** long, ~230 g, 19 % of the fruit with crown (S9). In South Africa, a 487 g fruit had a 30 g crown (S21). For Victoria use **15–20 cm** tall, **12–16 cm** across, **~30–50 visible spiny leaves**, grey-green, often with crownlets at its base on large fruit | [CV] S1; [GR] S9, S21; dimensions and leaf count [EST]; the species crown has ~150 short leaves (S6) |
| Growth by days | the inflorescence is ~5–6 cm at first flowers (75 d after induction) and ~8 × 5 cm at dry petal (~90 d). Fruit mass grows about 20-fold from flower to ripe (S6). Use a sigmoid in mass: **10 % of final mass at dry petal, 50 % halfway between dry petal and harvest, 90 % at three-quarters**, then a slow final fill as sugar comes in (sugars and carotenoids mostly in the last weeks) | [CV] S2 for the stage dates; [SP] S6; curve shape [EST] |
| Days to harvest | from stage C (fruit visible in the heart) to harvest: **88–137 days** (S2, Table 4). Shortest for flowering in November–December (summer), longest for April–August (winter). For August flowerings it fell from 133 d (early August) to 119 d (late August) (S2). So **150–200 days from induction** | [CV] S2 |
| Colour by stage | green (with red-pink bracts) from emergence; dull, pointed eyes at dry petal; dark green, then grey-green as it fills; ripening yellows **from the base up**. Harvested from **C2 (the basal half yellow)** to **C4 (all yellow)** (S1). Fully ripe: golden-yellow to orange-yellow shell (≈ #d9a521), the bract tips bronze | [CV] S1; [SP] S6, S8; hex [EST] |
| Seeds | none | [SP] S6 |
| Yield | **61.2 t/ha** (NPK), 52.5 (integrated), 47.3 (organic) at 66,000 plants/ha (S1). A farm reference in East Réunion (350 m, with ratoons, a 24-month cycle): **30 t/ha** (S25) | [CV] |

## 6. "Bark": stump, sheaths and surface

| Item | Value | Source |
|---|---|---|
| Leaf base / sheath | broad, pale (cream-white to pale green), thick, clasping; holds water and debris; aerial roots wind between the sheaths | [SP] S6 |
| Old stump | after harvest the stem with its dry lower leaves stays as the ratoon's base. It leans; the brown, dry leaves form a skirt; suckers grow from its axils. In South Africa, old stumps with suckers are cut and replanted ("stumps") | [SP] S6, S8; [GR] S21 |
| Trichomes | peltate scales on both faces, densest below, giving the silvery, striped look | [SP] S6 |

## 7. Suckers and the ratoon cycle

| Item | Value | Source |
|---|---|---|
| Suckers per plant | Victoria: "très importante" (too many; thinning needed) (S7). Indian 'Queen': **2.2 suckers + 2.1 slips** (S9) | [CV] S7; [GR] S9 |
| When they grow | they start at floral differentiation; ratoon crops are forced 5–7 months after the plant-crop harvest (Hawaii, SC) | [SP] S8 |
| Ratoon fruit | smaller, sweeter, less acid, more aromatic than the plant crop | [SP] S8 |
| Ratoon practice in Réunion | Victoria can be "oeilletonnée" (suckers thinned, the best kept) when it fruits in late summer, when the suckers are well grown. Aubert: planned production mostly replants after each harvest | [CV] S2, S7 |
| South Africa (Queen) | from suckers, cycles of **12–15 months** in Zululand; with "stumps", 3 harvests a year per field and **6–8 fruits per original plant in 6 years** | [GR] S21 |

## Where it grows (for worlds)

| Row | Value | Source |
|---|---|---|
| Range in Réunion | **50–900 m** elevation; mean annual temperature **19–25 °C**; humid east and dry west | [CV] S11 |
| A lowland site | Saint-Pierre, 150 m: rain **940 mm** a year; the cool, dry months (July–September) average 17.7 °C min / 25.8 °C max; the hot, rainy months (January–March) 22.6 / 30 °C | [CV] S1 |
| Natural-flowering site | Bassin-Martin, 300 m. Day length varies by 2 h 26 min over the year at 21°06′ S | [CV] S2 |
| Temperature (species) | growth and fruit are hurt above **35 °C** and below **10 °C**; no frost tolerance; cold makes the fruit more acid | [SP] S6 |
| Minimum for Victoria | grown where temperatures stay above **15 °C** | [CV] S13 [2nd] |
| Water | ~50 mm a month; tolerates drought (CAM); irrigated for 3 months after planting at ≥ 120 mm a month in S2 | [SP] S6; [CV] S2 |
| Soil | well drained, sandy or loamy, pH 4.5–6.5; ridges (*billons*) in rainy zones against *Phytophthora* | [SP] S6; [CV] S25 |
| Planting layout, Réunion | **double rows on ridges under black polyethylene mulch**. 1974: **90 × 40 × 30 cm** (90 cm path, 40 cm between the two rows, 30 cm in the row) ≈ **51,000 plants/ha** [EST arithmetic]. 2009: **66,000 plants/ha** on drip-irrigated ridges, 3 ridges per 5.7 m plot | [CV] S2, S1 |
| Planting layout, elsewhere | India 'Queen': double rows 25 cm × 35 cm, beds 90 cm apart (S9). South Africa: Zululand suckers in 3–4 rows, 76,000–288,000 plants/ha, mean **120,000**; East London 2 rows of stumps at 30 cm on 169 cm ridges ≈ 40,000/ha (S21). Hawaii SC: 122 cm beds, rows 55–60 cm, 28 cm in row ≈ 58,700/ha; to 75,000 for fresh fruit; fruit ~45 g lighter per +2,470 plants/ha (S8) | [GR], [SP] |
| Whole cycle, Réunion | **12–22 months** planting to harvest in natural flowering (Table 6, S2): 12–13 months for November and February plantings, ~18 months for winter plantings, ~22 months for 100 g suckers planted in March. With forcing: about **12 months** (forced at ~5 months + ~7 months to harvest, S1 [EST arithmetic]) in the lowlands, about **17–19 months** at 750 m (S4). A general figure is **14–20 months** (S13 [2nd]). Farm cycle with a ratoon: 24 months (S25) | [CV] |
| Harvest season | all year by forcing; the natural glut is **December–January**; full season **November–March** | [CV] S2, S13 [2nd] |
| Productive life | 1 plant crop + 1–2 ratoons, then replant | [CV] S7; [SP] S8 |

## 8. Timeline for the growth driver (lowland Réunion, ~23 °C, 250 g sucker, forced)

| Day | Event | Source |
|---|---|---|
| 0 | 250 g sucker planted through black mulch in a double row; ~27 short spiny leaves, 30–40 cm | S1, S2, S3 |
| 0–30 | transplant check, mass flat or dips (~0.2 kg); roots out from the base; new leaves pale in the heart | S3 (Fig. 1) |
| 30–150 | ~0.17 leaves a day; D leaves grow from 10 to 30 g; plant 0.2 → 0.65 kg; first sucker buds still dormant | S1, S3 |
| ~150–210 | D leaf 50 g, plant ~1.0 kg, ~50 leaves: **forcing** (ethephon) | S1, S3, S5 |
| +30 / +40 | heart leaves bunch and pale (stages A, B); the peduncle starts to lengthen | S2 |
| +60 | **red heart**: young red fruit visible in the heart, red bracts | S2, S6 |
| +75 | **first violet flowers** at the base of the 5–6 cm cone | S2 |
| +75 to +90 | 5–10 flowers a day, base to top; then dry petals; the crown starts; stem suckers start in the leaf axils | S2, S6, S8 |
| +90 to +150…200 | fruit fills: green → grey-green, eyes flatten; the crown grows to 15–20 cm | S2, [EST] |
| harvest (~+150 to +200; ~11–13 months after planting) | shell yellow from the base (C2) to all yellow (C4); 0.7–0.95 kg; the crown stays on | S1, S2 |
| harvest + 5–7 months | the best 1–2 suckers, thinned, are forced as the ratoon | S7, S8 |

## Gaps

These rows have no published number for 'Queen Victoria'. Each is marked [EST] above with how it was estimated.

- **Plant height and spread at each age.** No Victoria measurement was found.
  - I set height ≈ 1.0–1.1 × the D-leaf length and spread ≈ 1.5 × it.
  - D-leaf length was scaled from the Indian 'Queen' (69 cm at 18 months, S9) by D-leaf mass.
- **D-leaf length and width at 50 g.** Estimated as 55–65 × 4.5–5 cm. Fournier et al. 2010 (S3's journal version)
  and Py et al. 1987 probably give these; I could not read them.
- **Fruit length and diameter, core diameter, eye depth.** No measured Victoria values were found.
  - I derived them from mass (density ~1.0, form factor 0.85) and checked them against the Indian 'Queen' (S9).
  - The **Label Rouge specification** for Ananas Victoria (INAO, 2006) probably sets mass grades and a minimum Brix.
    I could not find its text, and I found **no IGP**.
- **Crown length, width and leaf count.** Only crown mass was measured in Réunion (S1). The length comes from the
  Indian 'Queen' (S9), and the leaf count is my estimate.
- **Leaf colours and the red tint.** Only qualitative words are published: "grey-green", "silvery", "dark
  purplish-green" (S14, S16, S19, all [2nd]). Where the red flush appears is my estimate from the Queen group's look.
  The hex values are estimates.
- **Spine size, spacing and colour.** Only "spiny along the whole margin" is published (S15 [2nd]). Size, spacing and
  colour are estimated from photos.
- **Bract colours after flowering, petal length.** These are species descriptions plus my estimates.
- **Stem and peduncle size for Victoria.** Scaled from the SC stem (S6) by plant mass.
- **Fruit growth curve in days.** Only the stage dates (S2) and harvest days (S1, S2) are measured. The sigmoid split
  is my estimate.
- **Leaf types A–F.** These follow the standard summary of Py et al.'s scheme. I did not reread the book.
- **Phyllotaxis angle of the rosette.** Estimated at 137.5°.
- **Hallé–Oldeman model.** The classification is mine; the habit itself is published.
- **Second-hand rows ([2nd]).**
  - S12, S13: the Label Rouge, the 14–20-month cycle, violet flowers, cylindrical fruit.
  - S14: Morton via growables.org.
  - S15, S16, S19: trade and extension pages on Queen.
  - S17: Coppens d'Eeckenbrugge & Leal quoted on a blog.
  - S20, S22, S23, S24: snippets.
- **S3 site and dates.** The S3 poster gives growth curves for 'Queen Victoria' in Réunion and Martinique without the
  site or the planting date. Its values were read off the figures by eye (±10 %).
- **Not read, but the standard references to fill the gaps:**
  - Py, C., Lacoeuilhe, J.J. & Teisson, C. (1987), *The Pineapple: Cultivation and Uses*, G.-P. Maisonneuve & Larose.
    (The second author is Lacoeuilhe, not "Lacoville".)
  - Bartholomew, D.P., Paull, R.E. & Rohrbach, K.G. (eds) (2003; 2nd ed. Sanewski, Bartholomew & Paull 2018), *The
    Pineapple: Botany, Production and Uses*, CABI. In particular Coppens d'Eeckenbrugge & Leal, "Morphology, anatomy
    and taxonomy", pp. 13–32, and the chapter on inflorescence and fruit development.
  - Fournier, P., Dubois, C., Benneveau, A. & Soler, A. (2010), *Agronomy Journal* (the full paper behind S3).
  - Malézieux, E., Côte, F. & Bartholomew, D.P. (2003), "Crop environment, plant growth and physiology", in the
    CABI volume.
  - The Label Rouge Ananas Victoria specification (INAO).
  - The 1996 Nancy/Lorraine thesis on sucker development in Smooth Cayenne and Queen Victoria in Réunion
    (hal.univ-lorraine.fr tel-01753681). It was blocked by a bot wall.

---

## Sources

- **S1** Darnaudery, M., Fournier, P. & Léchaudel, M. (2018). Low-input pineapple crops with high quality fruit:
  promising impacts of locally integrated and organic fertilisation compared to chemical fertilisers. *Experimental
  Agriculture* 54(2): 286–302. doi:10.1017/S0014479716000284 (read in full: methods pp. 288–289, Tables 3 and 5)
- **S2** Aubert, B. (1977). Étude du cycle de floraison naturelle de l'ananas 'Victoria' à La Réunion. *Fruits*
  32(1): 25–41. https://revues.cirad.fr/index.php/fruits/article/download/34294/33546/36811 (read in full: Tables
  1–6, photo plate p. 31, planting calendar)
- **S3** Fournier, P., Dubois, C. & Soler, A. (2007). Considerations on growth characteristics of different pineapple
  varieties in Ivory Coast, Reunion Island and Caribbean Islands. Poster, VI International Pineapple Symposium, João
  Pessoa. https://agritrop.cirad.fr/542374/1/document_542374.pdf (read; Figs 1–3 read off by eye)
- **S4** Dubois, C., Fournier, P., Marie-Alphonsine, P.A. & Soler, A. (2011). Temperatures, basis for a heat-unit
  model of vegetative growth. *Acta Hortic.* 902: 263–274. https://agritrop.cirad.fr/561777/ [2nd: abstract]
- **S5** Fournier, P., Dubois, C., Benneveau, A. & Soler, A. (2010). Growth indicators for different pineapple
  cultivars compared with the current standard 'Smooth Cayenne' in West Africa and Reunion Island. *Agronomy Journal*.
  https://agritrop.cirad.fr/558882/ [2nd: abstract; the D-leaf rule also on the S3 poster]
- **S6** OGTR (2008). *The Biology of Ananas comosus var. comosus (Pineapple)*, version 2. Office of the Gene
  Technology Regulator, Australia (read in full: §3 morphology, §4 development; it summarises Purseglove 1972, Py et
  al. 1987, Bartholomew et al. 2003, Coppens d'Eeckenbrugge & Leal 2003). Copy read at
  https://bangladeshbiosafety.org/wp-content/uploads/2017/06/Biology_of_Pineapple_Au.pdf
- **S7** Py, C. (1983). Réunion organisée par l'IRFA … Ananas et thèmes généraux. *Fruits* 38(5): 389–. (C.
  Vuillaume on 'Victoria': very many suckers, a second crop without replanting, thinning needed; fruitlet disease.)
  https://revues.cirad.fr/index.php/fruits/article/download/34729/33962/37227
- **S8** Bartholomew, D.P., Rohrbach, K.G. & Evans, D.O. (2002). *Pineapple Cultivation in Hawaii*. CTAHR Fruits and
  Nuts F&N-7 (read: flowering stages, crop cycle, planting materials, population).
  https://mail.growables.org/information/TropicalFruit/documents/PineappleCultivationHawaii.pdf
- **S9** Bhowmick, N., Deb, P., Munsi, P. & Ghosh, S.K. (2022). Morphological characterization and performance of
  different pineapple varieties in northern parts of West Bengal. *Indian J. Agric. Sci.* 92(5): 567–571.
  doi:10.56093/ijas.v92i5.124625 (read in full: Tables 1–2, 'Queen')
- **S10** Onderdonk, P.B. (1970). Pineapples and Fibonacci numbers. *Fibonacci Quarterly* 8(5): 507–508, quoting
  Linford, M.B. (1933), *Pineapple Quarterly* 3(4): 185–195. https://www.mathstat.dal.ca/FQ/Scanned/8-5/onderdonk.pdf
- **S11** Dorey, E., Cambournac, T., Michels, T., Rothe, M. & Tixier, P. (2018). Designing new management sequences for
  pineapple production using the SIMPIÑA model. *Agricultural Systems*. https://agritrop.cirad.fr/586260/ [2nd:
  abstract]
- **S12** Gault&Millau, "L'ananas, fruit exquis" (Label Rouge, first tropical fruit).
  https://fr.gaultmillau.com/fr/news/l-ananas--fruit-exquis [2nd]
- **S13** Jardin botanique Jean-Marie Pelt, Nancy (2025). La plante du mois: *Ananas comosus* 'Victoria'.
  https://www.jardinbotaniquedenancy.eu/fileadmin/CJBN/Plante_du_mois/11.25.ananas_comosus__2_.pdf [2nd]
- **S14** Morton, J.F. (1987). *Fruits of Warm Climates*, "Pineapple" ('Queen': dwarf, compact; conical, deep-yellow
  fruit with deep eyes, 0.45–1.13 kg). Quoted at https://growables.org/information/TropicalFruit/pineaplevarieties.htm
  [2nd: the original page at hort.purdue.edu was unreachable]
- **S15** Mauritius / Queen group description (yellowish-green leaves spiny along the whole margin, spiny crown).
  https://issuu.com/kisanadmin/docs/pineapple1/16 [2nd: snippet]
- **S16** worldfloradb, *Ananas comosus* 'Queen' ("leaves short and very spiny, silvery").
  https://worldfloradb.net/plants/ananas-comosus-queen; Northern Territory Government, Pineapple ("compact, grey green
  leaves"). https://nt.gov.au/environment/home-gardens/growing-vegetables-at-home/pineapple [2nd: snippets]
- **S17** Coppens d'Eeckenbrugge, G. & Leal, F. (2000). The application of the International Code of Nomenclature to
  pineapple cultivars, quoted at https://tinypineapple.com/2007/02 [2nd]
- **S18** Py, C., Lacoeuilhe, J.J. & Teisson, C. (1987). *The Pineapple: Cultivation and Uses*. Paris: G.-P.
  Maisonneuve & Larose (A–F leaf types; max leaf 100 × 7 cm via S6) [2nd]
- **S19** Afrimash, Queen pineapple suckers ("dwarf, short, very spiny … dark purplish-green leaves").
  https://afrimash.com/?p=80666 [2nd: snippet]
- **S20** Quyen et al. (2010), Thai 'Queen' cv. Phu Lae (160 g, 64.6 × 61.3 mm, 37–61 fruitlets) [2nd: abstract
  snippet]
- **S21** Bouffin, J. (1991). L'ananas en Afrique du Sud. *Fruits* 46(1): 35–45 (read: Queen planting, density,
  grades, crown trial). https://revues.cirad.fr/index.php/fruits/article/download/35228/35413/38890
- **S22** Specialty Produce, Reunion Island Queen Victoria pineapples (10–12 × 7–8 cm).
  https://specialtyproduce.com/produce/pineapples/reunion_island_queen_victoria_25304.php [2nd]
- **S23** The Borneo Post (2018), "Getting to know the pineapple and its various cultivars" (Moris: small core).
  https://www.pressreader.com/malaysia/the-borneo-post/20180610/281865824170831 [2nd: snippet]
- **S24** National Horticulture Board, India, pineapple varieties ('Queen': 1–1.5 kg, golden-yellow, TSS 15–16 °Brix).
  https://nhb.gov.in/pdf/fruits/pineapple/pin013.pdf
- **S25** RRDV (2024). Cas-type Ananas: exploitation spécialisée en ananas Queen Victoria, dans les Bas en zone Est de
  La Réunion, cycle sept. 2021–août 2023 (350 m, 24-month cycle with ratoon, 30 t/ha, ridges).
  https://www.acta.asso.fr/wp-content/uploads/2024/04/RRDV_974_AQV_CT_21_Est-avec-rejets.pdf
