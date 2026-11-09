# The batch re-spec: every open intent's fixed census or size number, to the vs-main form

For intent f63774a3 (`play/avenbox/vs-main.ts`). Taken from `list_intents` on 2026-11-09: every open intent's check
whose `run` holds a number counted on one main commit. **Applied by the Orchestrator once f63774a3 is accepted**, in
one batch for one Approve spec; until then no other intent's spec changes.

Each row: the intent and check, what the bound meant, its run now (the evaluator after `&&` abbreviated), its run
after. A census check's run after measures main (the merge base) and the head in the same run; main is counted once
per main commit (`$VS_MAIN_CACHE`, in intents-pr.yml's job "main's measures"). A tolerance per view
(`near tris:7%,…`) keeps the headroom the fixed numbers gave, as a share of main's own count.

**To watch:** a bound that allowed for another intent's work not yet on main (c1bee1f8's "plus intent 7's grass")
compares with main without it: if the intent's branch carries that work, widen its tolerance or let it wait for the
other to land (its `depends_on`).

## Census, Sandbox 1, all passes (tris, draws)

| intent · check | meant | run after |
|---|---|---|
| 6fd5e63f c5 | main 6a01d98 + 3 % | `bun play/avenbox/vs-main.ts census --world sandbox-1 --within 3%` |
| 602a8849 c3 | main 6a01d98 + 3 % | `bun play/avenbox/vs-main.ts census --world sandbox-1 --within 3%` |
| 24454c2d c4 | main ff391a7 + 3 % + 400,000/150 near, + 200,000/100 mid and far | `bun play/avenbox/vs-main.ts census --world sandbox-1 --within 'near tris:7%,near draws:6%,mid tris:4.5%,mid draws:5.5%,far tris:10.6%,far draws:8.6%'` |
| 090168c8 c5 | the same as 24454c2d c4 (main ff391a7) | `bun play/avenbox/vs-main.ts census --world sandbox-1 --within 'near tris:7%,near draws:6%,mid tris:4.5%,mid draws:5.5%,far tris:10.6%,far draws:8.6%'` |

Run now (each): `cd play/site && bun scripts/census.ts --world sandbox-1 --view all --json /tmp/census-iN.json >/dev/null && bun -e '…process.exit(t.near.tris<=…&&…?0:1)'`.

## Census, Sandbox 1, main pass (mainTris, mainDraws): intent 9's bounds

Bounds near 3,786,190/2,031, mid 5,526,027/1,933, far 1,640,631/1,005 (main 06fc8c9 + 3 % + intent 7's grass).

| intent · check | run after |
|---|---|
| c1bee1f8 c5 | `bun play/avenbox/vs-main.ts census --world sandbox-1 --of mainTris,mainDraws --within 3%` |
| 1f0c6f79 c3 | `bun play/avenbox/vs-main.ts census --world sandbox-1 --of mainTris,mainDraws --within 3%` |
| 3a8b135a c3 | `bun play/avenbox/vs-main.ts census --world sandbox-1 --of mainTris,mainDraws --within 3%` |

## Census, Sandbox 3 (open)

| intent · check | meant | run after |
|---|---|---|
| 602a8849 c4 | ≤ 718,746/1,146 (main 06fc8c9 + 3 %) | `bun play/avenbox/vs-main.ts census --world sandbox-3 --within 3%` |
| c1bee1f8 c6 | ≤ 950,000/1,500 (intent 3's bound: main 06fc8c9 + 36 %/35 %) | `bun play/avenbox/vs-main.ts census --world sandbox-3 --within 'open tris:36%,open draws:35%'` |

## Sizes and counts

| intent · check | meant | run now | run after |
|---|---|---|---|
| 6fd5e63f c1 (reduce) | lines with `transparent: true` fewer than main's 55 (06fc8c9) | `n=$(grep -rn 'transparent: true' play/site/src … \| wc -l); [ "$n" -lt 55 ]` | `bun play/avenbox/vs-main.ts count "grep -rn 'transparent: true' play/site/src --include='*.js' --include='*.ts' --include='*.svelte' \| wc -l" --down 1%` |
| 3a8b135a c1 (reduce) | impostors.js + render/nodes/impostor*.js under impostors.js alone on main (17,318 B, 06fc8c9) | `n=$(cat …impostors.js …impostor*.js \| wc -c); [ "$n" -lt 17318 ]` | `bun play/avenbox/vs-main.ts bytes play/site/src/lib/content/assets/render/impostors.js play/site/src/lib/content/render/nodes/impostor*.js --down 0.01%` |
| 602a8849 c2 (reduce) | seven files under 190,982 B together (main 06fc8c9) | `cd play/site/src/lib/content && n=$(cat … \| wc -c); [ "$n" -lt 190982 ]` | `bun play/avenbox/vs-main.ts bytes play/site/src/lib/content/sandbox-2/interior/water.ts play/site/src/lib/content/sandbox-2/interior/interior.ts play/site/src/lib/content/worlds/lights.js play/site/src/lib/content/sandbox-2/interior/PlantLook.svelte play/site/src/lib/content/film/pipeline.js play/site/src/lib/content/factories/look.js play/site/src/lib/content/factories/three.js --down 0.01%` |

(In the size rows the `\|` is a table's escape: the run has a plain `|`.) A file missing on main or at the head
counts 0, as "those still there" meant. "Fewer than main" is `--down` a little: 1 % for the count (at least one fewer at 55), 0.01 % for bytes (at least 2 of 17,318).

After the batch, `list_intents` shows no open intent's run with a census or size number from one commit: each
`census.ts … && bun -e '…<=N…'` and `wc -c`/`wc -l` bound is a `vs-main.ts` call.
