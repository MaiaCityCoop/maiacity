# Intent 1893a631: the build's rounds (avenBOX; `play/site/scripts/memory.ts`, the page told 8 cores unless said)

| round | change | Sandbox | peak MB | rest MB | world s | kept? |
|---|---|---|---|---|---|---|
| main eadbf2f7 | — | 1 (told 4) | 7,060 | 5,741 | 132 | |
| main eadbf2f7 | — | 5 | 8,614 | 5,220 | 127 | |
| main eadbf2f7 | — | 3 | 992 | 517 | 10 | |
| 1 | one level maker a page (`lowerer()`), a job's arrays handed over, a worker ended when none waits or after a heavy shape (150,000 triangles), one heavy shape at a time | 5 | 3,978 | 2,094 | 183 | kept. The world shows 56 s later in the box (4 real cores told 8): the heavy trees near the start are now made lighter one after another, and the cover waits up to two minutes for them |
| 2 | a kind's full build let go 15 s after no copy is drawn at it, once its lighter levels stand, its picture is taken and the cache keeps it (`render/hold.js`); every device lets go of an array once the card has it (`budget().release` gone) | 1 | 4,878 | 1,985 | 172 | kept. Rest 5,741 → 1,985. The peak (207 s, "Welcome") is the inside dome's renderer building its plants while the outside's heavy trees are still being made lighter |
| 3 | the shapes made lighter at once hold at most 150,000 triangles between them (a heavy one alone) | 1 | 4,305 | 1,796 | 174 | kept, then widened in round 4: too strict for the world's time |
| 3 | the same | 5 | 4,123 | 1,207 | 179 | |
| 3 | the same | 3 | 1,125 | 524 | 8 | holds (bound 1,200 / 700) |
| 4 | at once at most 1.7 million triangles (what the heaviest tree holds alone): middling trees side by side, two great ones never; the pool's boxes keep no spare worker (seven engines held for a 29 ms start) | | | | | measuring (the container restarted during the first try; nothing of it was kept) |
