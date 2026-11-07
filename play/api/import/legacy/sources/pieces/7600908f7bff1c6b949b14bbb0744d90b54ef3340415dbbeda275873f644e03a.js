/**
* The master dome's working life: the ring under its gallery holds the
* village's workshops (co-working desks, a woodshop, an art studio, a pottery,
* a bakery and a cooking school, a library, a repair bench) and round it, just
* outside the arcade, a ring of café squares where people eat in the open.
*
* Each space is drawn in its own frame: x runs along the ring, +z points out
* toward the glass, and the space is placed on the ring by `place`. The
* workshops are Things of the library ($lib/models/domerooms.js), and the
* master dome puts copies of them down on its ring (./things.js `workshopsOf`).
