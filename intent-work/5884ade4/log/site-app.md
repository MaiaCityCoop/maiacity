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
6. **A story's links and section colours read in `timeline.ts`.** `slotsOf`, `linkName`, `newerOf`, `linkHref` and
   `colourOf` moved verbatim out of StoryPlayer.svelte (the player and the timeline split next both draw them), with
   tests first in `timeline.test.ts` (a link in its place, a lost one, a newer version, the colours as they were).
7. **The Stories timeline is its own component.** `lib/stories/StoryTimeline.svelte` draws the sections, the mood
   line, the lanes (links, shots, voice, sound) and the playhead, and scrubs (its `dragging` bound to the player, which
   holds the clock); StoryPlayer keeps the frame, playback, full screen, speech and the rail (655 → 418 lines). Removes
   site-app#24. Pinned by a server render of the player before and after on both fixture stories (identical markup,
   scoped class hashes aside; a throwaway test, not kept), the stories tests, the build and svelte-check.
8. **Turntable keeps only the layout its one caller uses.** The held `VaultAsset.svelte` always passes `inline`; the
   full-screen layouts (the list, `full`, the notch, the phone and tablet media queries, `immersive.svelte.ts`'s
   enter) were dead with `PickList.svelte` (355 lines, imported only by Turntable): both files deleted, Turntable
   660 → 408 lines. It still accepts `inline` (and every prop VaultAsset passes) so the held file is untouched; the
   base rules the inline layout overrode stay, so what is drawn is the same. Removes site-app#30 and Turntable's part of
   #34. Pinned by the build and svelte-check (VaultAsset compiles unchanged). Next untangle: once VaultAsset is free, drop
   `inline` and fold the base rules into the inline ones.
9. **The intents' board split: board, work review, build view.** `WorkReview.svelte` takes the review overlay (its
   state, the document list, the asset build, the source diff, the story and document reviews, their CSS moved line for
   line); `BuildView.svelte` is the one "a world in WorldStage, else VaultAsset" for the review and the detail;
   `names.ts` the kind and work-type names (the copied `GROUP_TYPE`/`KIND_NAME`/`titleOf`), `lib/format.ts` the dates
   and initials; `board.ts` gains `columnOf`, `bySub`, `EMPTY` (tests first in `board.test.ts`). The intent itself is
   read once per stage through `opened.ts`'s `intent()` for the review and the detail alike (test in
   `detail-loads.test.ts`); a withdraw forgets it. The board's three `.catch(() => null)` reads of an intent now say why
   they failed (a decision on an intent that could not be read did nothing), and the schemas' names' failure is shown.
   IntentsBoard 716 → 398 lines. The detail sheet (IntentDetail.svelte's sizing CSS and footer, which intent 96206162
   changes) is untouched: only its script and its build markup line changed. Removes site-app#7 (board/detail part),
   #9, #12 and #13 (board/detail part), #18, #23, #35 (board), #39 (board/detail). Pinned by the intents' vitest
   suites (56 tests), the build and svelte-check.
10. **One admin gate.** `isAdmin()` in `lib/session.svelte.ts` is the one `level === 'admin'` (25 → 1), and
    `adminsOnly()` (`lib/admins.svelte.ts`) the one redirect of an admins' page to the dashboard, called by the 14 pages
    that had it, written two ways (`goto('/', { replaceState: true })` in routes 15 → 1, the intents' link's own). The
    seven `session.me &&` guards were always true (the layout draws a page only once someone is signed in) and go with
    them. Pages that only hid things (profile, game editor, dashboard, Aside, History, the board) read `isAdmin()`.
    Removes site-app#21, #33. Behaviour unchanged: the same pages redirect, on the same condition. Pinned by the build
    and svelte-check.
11. **One wire: the API's answer types, imported by the site.** `play/api/src/wire.ts` (types only, no logic)
    re-exports from six API modules (intents, ship, substate, stories, docs/core, library); play/site imports it as
    `$wire` (an alias in svelte.config.js, `import type` only, so nothing of the API is bundled). The intent's `Ship`,
    `ShipStep`, `Check`, `Spec`, `Sub`, `Dep`, `Kind`, `Stage` and results (detail.ts), the story's `Clip`, `StoryBody`,
    `Linked`, `LinkedBy` (timeline.ts; its `Track` extends the API's with the `duck` and `name` the site reads, which
    the API's type lacks: the drift now shows), `StoryDiff` (StoryChanges), a document change (Changes), the Library's
    file, the Stories list's item and the Skills page's stages (typed by the API's `IntentStage`, so a stale
    `'prototype'` no longer compiles) are the API's own. Removes site-app#1, #2, #3 and #4 in part, #8. Note: the API's
    modules bring Bun's types into the site's type check, so svelte-check's count outside held files falls (29 → 12;
    `import.meta.dir` in old-city's worker now type-checks, though vitest still lacks it). Pinned by svelte-check (a
    stage or a ship's pending kind outside the API's is an error), the build, the intents' and stories' tests.
12. **Dates and initials written once, in `lib/format.ts`.** The Library, Artifacts, Delivery, profile, admin pages,
    History, Changes, Aside and the layout's and nav pill's initials use its functions (each the format it had: the
    reader's, `en-GB`, a calendar day in UTC, a weekday); `versions.js`'s unused `day` goes in move 13. Removes
    site-app#12, #13 (initials). Pinned by the build and svelte-check; each function is the expression it replaces.
