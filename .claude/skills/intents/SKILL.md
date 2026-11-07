---
name: intents
description: "What every agent is taught about intents: the lifecycle (its part of the system prompt) and what to do at each stage (an intent's brief)."
---

# Intents

Everything on the board is an **intent**: Idea → Specify → Build → Proposal → (Ship →) Accepted, or Archived (list_intents, get_intent). Sent to work on one, read it with get_intent: its `brief` says what to do at the stage it is at, this skill's part for that stage with its id and title filled in (prompts/list offers every stage's as a prompt, its argument the intent's id).

- **In:** add_intent is the only way an intent comes in. No work without an intent: add_intent first, then propose naming it (`intent`, in Build or at Proposal); only add_artifact and update_artifact make their own.
- **Idea → Specify:** specify it with specify_intent as the Idea part teaches (`stages.idea`), then stop: an admin approves the spec.
- **Build:** build it in avenBOX as the Build part teaches (`stages.build`); once every must passes, recorded, it moves to Proposal by itself.
- **Work of play's** (an asset or story version, a sandbox change, a factory, a config or a skill) is proposed naming the intent, which puts it at Proposal: play takes it only once every must passes.
- **Code** goes by a draft pull request into main, as the Build part teaches. An admin's Accept puts it in Ship, which merges it and follows it to production.
- **At Proposal** admins see the work on play's intents' board (an asset built in the sandboxed asset box, a story played) and accept or archive it. Nothing here approves a spec, accepts or marks an intent done; an agent archives only its own intents at Proposal put there over MCP (archive_intent); no proposed code runs on play's server.

## At idea

Specify Maia City's intent {intent} on play ("{title}"). Read it with the maia-play MCP tool get_intent, then specify it with specify_intent in two steps, in this order:

1. **Reduce:** what the intent removes, simplifies, consolidates or compacts before it adds anything. Never skipped for new work: building something new is the chance to harden what it touches and cut dependencies.
   - **Audit outward**, ring by ring: (1) the files and documents it touches; (2) their module and callers; (3) every sibling doing the same job elsewhere (repo-wide grep, other kinds of document, assets, stories or skills repeating the pattern); (4) the repository and its dependencies (package.json, workflows, scripts).
   - **Look for:** duplicates and parallel concepts (DRY: two functions or words for one thing); special cases a generic path could absorb; dead or legacy code, flags, fallbacks; dependencies that can go; files grown too large; slow steps in checks or deploys; assets or stories repeating a recipe one shared part could be; KISS, the simplest form that meets the goal.
   - **Each a must check that can fail**, `step: "reduce"`, its bound taken on main before the work: a byte, line or file-count bound (`wc -c` at most today's); a grep that the old name or special case is gone; a dependency gone from package.json; a time bound on a step.
   - **E.g.** one gate, `mayMove`, for five stage tests; one file per migration, not a hand-numbered array; `step_back_intent` over MCP, not a Back to Specify button; the board's dependency lines as one counts line; two plants sharing one leaf part by carry; a package dropped for the few lines play uses.
   - `nothing_to_reduce` only for a truly isolated change: its reason and the radius audited, accepted with the spec. Play refuses a spec without its reduce step, and an admin's approval of one.
2. **MVP:** its goal (what is true when it is done, in a sentence), its scope (what changes, named by UUIDs, hashes or paths, and what stays as it is), its checks with `step: "mvp"` (the default), and the kinds of work it brings (`work_kind`: schemas' UUIDs or code).

Each check is ONE statement that passes or fails, checked by a test (a command that passes), a measure (a value and its range from a named tool) or a look (against a named reference), must or nice; every check decidable by someone who reads only the intent and the result. Every test and measure check carries its run: the exact command that decides it in avenBOX, from the repository's root, as written, nothing in it left to fill in (a test passes when it exits 0; a measure prints its value and exits 0 only in its range); in Build bun play/avenbox/intent.ts runs them all, and main runs them again once the work is merged. Then stop: an admin approves the spec before anything is built.

## At specify

Intent {intent} ("{title}") is at Specify: its spec waits for an admin's approval on play's intents' board, and nothing is built before it. Change nothing unless you are asked to change the spec. If it has none yet, or you are asked to change it, specify it as the Idea part says (doc_at: this skill's `stages.idea`), reduce first, then the MVP; specified again, the spec is replaced.

## At build

Build Maia City's intent {intent} on play ("{title}") in avenBOX, the cloud environment our agents build in (Postgres up, TEST_DATABASE_URL set: play/avenbox/up.sh). Read it and its approved spec with the maia-play MCP tool get_intent, and build what its goal and scope say.

Keep your work where it outlives your session, as you go: a session that stops keeps only what it pushed or put on play. When it is done, test it with `bun play/avenbox/intent.ts {intent}` (it records nothing) and, for code, `bash play/avenbox/gate.sh` (what CI runs); record a look by hand with check_intent. Once every must check passes, recorded, the intent moves to Proposal by itself, where an admin decides it.

- **Work of play's** (an asset or story version, a sandbox change, a factory, a config or a skill): make it on play step by step, each a doc_edit on the intent's variant (a new asset's source, until its first propose, on a pushed branch `intent/<8 hex>-…`); record its checks, then propose it naming `intent: "{intent}"`. Play refuses it before every must check passes.
- **Code:** open a draft pull request into main with your first commit and push each commit as you make it, every message ending with `Intent: {intent}`. Tested, mark it ready: intents-pr.yml runs its checks in avenBOX on GitHub on its head and records them, again on each push (only the box's run is evidence). A red must leaves it in Build: fix and push. Play merges main in by itself; a conflict wakes you as *Merges with main*: resolve it and push. Never merge it; Accept is an admin's.

## At proposal

Intent {intent} ("{title}") is at Proposal: its work done and every must check passed, it waits for an admin's decision on play's intents' board. Accept puts it in Ship (the Ship part); a red step there brings it back with its report.

Until then change nothing. Here and in Ship, push nothing unless *Merges with main* is red: a push moves the head and sends it back. Back with a report (get_intent's `ship`): fix its red step in a new pull request of it (`Intent: {intent}` in its commits), marked ready, whose run records its checks on its head. New work of play's for it, proposed naming it again, replaces the old. If you put it here over MCP and no longer stand by its work, archive it (archive_intent); accepting stays a person's.

## At ship

Intent {intent} ("{title}") is in Ship: an admin accepted it. It waits its turn (one ship at a time, in the order accepted) and for GitHub (its mergeability worked out, its checks green); then play merges its pull request and follows it to production (main's checks, the release, the deploy's backup, image, server and website), each step on the intent with its link (get_intent's `ship`). Change nothing, merge nothing, and push nothing unless GitHub reports a merge conflict (a push sends it back): all green, it is Accepted; a red step brings it back to Proposal with its report, to be fixed there. After the merge main runs the checks again (.github/workflows/intents.yml) and records them as main's, a confirmation.

<!-- play skill a1d69c1b-4e2c-4516-bb6f-9b68ad29f06f v8, written from play's database (play/avenbox/skills.ts): change it there, by proposal. -->
