# site-app builder's log (fix 2 of decisions.md: one wire and one client for play/site)

Problems cited as `site-app#n` (audit/site-app.md). Each move: what, the problems it removes, how behaviour is pinned.

## Moves

1. **Play's files through one client.** `lib/api.ts` gains `fileUrl(hash)`, `fileBlob`, `fileBytes` and `fileText`
   (a text held to its hash, a failure an `ApiError` naming the file) and exports `NO_ANSWER` (502/503/504), which
   `decide.ts`'s `noAnswer` now reads; `lib/site/media/url.ts` and `lib/call.ts` use them. Removes site-app#10 and the
   first of #11. Pinned by `lib/site/intents/*.test.ts` (decide) and the build; the URLs are the same strings.
2. **Skills shows Build** (a live bug, allowed by the spec). `routes/skills/+page.svelte`'s stage list said
   `'prototype'` for `'build'`, so a skill's Build text never showed. Removes site-app#8's bug (the list is tied to the
   API's stages in move 4).
3. **The dashboard's Rules tile draws its icon** (the other live bug). `'check'` was in neither icon set the tile's
   type allowed; it is added to `lib/site/app/Icon.svelte` (a ticked square in that set's line style) and to the
   dashboard's `Tile` type. Removes site-app#40. Pinned by svelte-check (the one error in routes/+page.svelte is gone).
