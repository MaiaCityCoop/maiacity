# site-app builder's log (fix 2 of decisions.md: one wire and one client for play/site)

Problems cited as `site-app#n` (audit/site-app.md). Each move: what, the problems it removes, how behaviour is pinned.

## Moves

1. **Play's files through one client.** `lib/api.ts` gains `fileUrl(hash)`, `fileBlob`, `fileBytes` and `fileText`
   (a text held to its hash, a failure an `ApiError` naming the file) and exports `NO_ANSWER` (502/503/504), which
   `decide.ts`'s `noAnswer` now reads; `lib/site/media/url.ts` and `lib/call.ts` use them. Removes site-app#10 and the
   first of #11. Pinned by `lib/site/intents/*.test.ts` (decide) and the build; the URLs are the same strings.
