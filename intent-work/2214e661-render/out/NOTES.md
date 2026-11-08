# 2214e661 c8, second Mac run (2026-11-08): passes on 6fdca60

head = 6fdca60 (the sun near white by 25°, the old city's lens closed a little); base = main f93ccba. GPU: ANGLE (Apple,
ANGLE Metal Renderer: Apple M1). `look.mjs` as the builder pushed it (b091550, with determinism.mjs).

## The look now meets the spec

Judged beside Poly Haven's autumn_meadow and evening_field:

- **Noon:** the peach cast is gone. The dome's stone is light and near neutral, greens read green, and the sun is still
  the key.
- **8°:** golden, low light with long shadows; haze deepens toward the horizon.
- **The old city:** no longer pale. It is muted, as AgX forms the picture, with the grass's contrast back.

No shader errors (the 401 is main's too).

## Frame time: within budget against main's valid measurements

This run's base is broken (see below), so head is compared with base runs of the same views from today's other jobs:

| view | head | comparison base | delta |
|---|---|---|---|
| noon near | 23.1 | 25.7 (f93ccba, cb16b7a5's job) | −2.6 |
| noon mid | 30.2 | 31.3 (f93ccba) | −1.1 |
| noon far | 16.7 | 16.7 | 0 |
| 8° near | 25.8 | 24.9 (57d0c71, this job's first run) | +0.9 |
| 8° mid | 30.1 | 32.6 (57d0c71) | −2.5 |
| 8° far | 16.7 | 16.7 | 0 |
| old city | 16.7 | 16.7 | 0 |

Every view is within +1.0 ms.

## This run's base is not usable

Every base shot shows the same close-up of an arcade wall at 16.7 ms: the camera isn't where `__walker.place` puts it.

- The call ran, and no error was thrown.
- Head's shots of the same views are right.
- It first appears with the seeded `Math.random` on main f93ccba. Its cause is for the render box to find before
  main's baseline (queued) is trusted.
