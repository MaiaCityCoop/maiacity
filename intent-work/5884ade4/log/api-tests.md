# api-tests: decision 8 (Tests, last) for play/api

Builder's log, move by move: what moved, the problems it removes (`api-tests#n`, from `audit/api-tests.md`), how
behaviour is pinned, and for every test removed why it could not fail or only repeated the implementation.

## Moves

1. **Pinning tests first (F8), and the kit they stand on (`test/kit.ts`).** New suites pin what nothing pinned:
   `limits.test.ts` (the token bucket, `API_RATE`, the costly routes, the last X-Forwarded-For address, the app's 429
   with Retry-After for one address and not another), `site.test.ts` (index pages, the 200.html fallback, hashed chunks
   and engines immutable, media types, nothing outside the build, GET/HEAD only), `auth.test.ts` (a session token's
   30-day life, forged ids/expiries/signatures refused, the cookie's flags with and without Secure, `/api/me` with an
   expired or forged cookie, `/api/founders`), `bucket.test.ts` (bucketStore against a fake S3, `test/fixtures/s3.ts`:
   keys `blobs/<2>/<hash>`, the backups' root, held to the hash both ways, a missing setting named; blobStore's choice
   of folder, bucket, bucket with its second copy mending a lost file), `tobucket.test.ts` and `verify.test.ts` (each run
   as its workflow runs it, against a fresh database: copied, broken named, nothing copied again; ok vs. a broken and a
   missing file, exit 1). The kit (`freshDb`, `appOn`, `human`, `cookieFor`, `request`, `agentToken`, `rpc`, `tool`,
   `quiet`, `suite`) is what the next moves move every suite onto; its `suite` fails, never skips, without
   `TEST_DATABASE_URL` (api-tests#30). src/auth.ts exports the cookie's name `COOKIE` (export only; api-tests#4).
   Tests: 329 → 355 (26 added).
