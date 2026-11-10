# c4 of intent 4a199916: Sandbox 5's food forest, main and head

Taken on 2026-11-10 in avenBOX's Chromium (SwiftShader, software rendering, no GPU) by `shoot.cjs`, 1440×900, then
scaled to 960×600. They were taken after intents 0c095468 (the seven plants' cards) and 500e67f8 (Sandbox 1's garden
pinned to those versions) were accepted.

- **main:** play.maia.city as deployed. Play's token went to play only.
- **head:** this branch's play/site build (`bun run build`), served as play serves it (play/api's `siteHandler`), with
  `/api` read from play with the token.

Each page was opened at `/sandbox-5/`, left until the forest had grown (main 292 s, head 266 s), then shot from where
it opens and from inside the dome (`__walker.place`). The world's clock runs on its own ("Auto"), so the light differs:
main by day, head in the evening and at night. What stands is the same.

| shot | what it shows |
|---|---|
| `*-open.png` | the forest dome in its food forest, from where Sandbox 5 opens |
| `*-in-south.png` | inside the dome, looking south over the central clearing to the tropical planting under the glass |
| `*-in-east.png` | inside the dome, in the canopy: a mango hanging with its fruit (Tommy Atkins, narrow drooping leaves) |

Every "did not grow" the page logged was counted from its console: **0 on main, 0 on head**. Before the two data
intents, the census's near view of Sandbox 1, whose domes hold Sandbox 5's food forest, logged 43: moringa, cassava,
yam, mango, chestnut, hazel and walnut. Head's code changes only how such a plant is reported (a counted failure in the
census instead of a console warning), not what is drawn, so main and head draw the same forest.
