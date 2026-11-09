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
4. **The app's pages read play's files through the client.** AssetLibrary's reference sheet, the Artifacts' kept page,
   the Stories list's covers and the Library's links use `fileUrl`; the Library's document view and the board's source
   diff use `fileText`, so both are now held to the hash (the board's read was not; the Library's showed an error
   page's body as the document). Removes site-app#11 outside StoryPlayer. Pinned by the build and svelte-check.
5. **The Stories player's inputs load in `lib/stories/inputs.ts`.** The compositions, the live shots' asset versions,
   the world shots' worlds and guests, and the files the sealed frame asks for (`fileOf`) moved out of
   StoryPlayer.svelte, read through `api`, `fileText`, `fileBlob` and `siteBlob` (lib/api.ts); the vendor files by
   package specifier where the package exports them (gsap, the font), and `@hyperframes/core` declared in package.json
   (its runtime is not in its exports, so it is still read from its folder). An input play cannot give is still left
   out (its shot shows its still, as compose.ts designs), now with a warning naming it instead of nothing. Removes
   site-app#24 (loading), #28, StoryPlayer's part of #11 and #35. Pinned by the new `inputs.test.ts` (fetch mocked:
   compositions held to their hash, a version's own or default variant's recipe, pieces, a failure named) and
   `world-build.test.ts` (the player's failure and progress texts).
