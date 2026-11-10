# Intent 7a6c3f1b: where a first visit's work goes (avenBOX, 2026-11-10)

`summary.json` holds the numbers and the reading; `out/` each run's raw probe (every build's answer, every page worker's
jobs). Made on origin/main 34424dfa in avenBOX's Chromium with the graphics card stood in for (`probe.ts`), the traces
counted by `upto.py` and `count.py` (the traces themselves, 0.5 GB each, are not kept). `bench.ts` is the worker
microbench, `beside.ts` the prototype of the spec's measure, `calibration-*.diff` the local change (never committed to
main's files) that showed what "a build before a level" gives.

    bun probe.ts /sandbox-1/ <boxes> <tag> [timeout s]     # needs play/site built, copied to ./build, its budget's builds patched (see summary.json `box`)
    python3 upto.py out/<tag>-trace.json <seconds>
