// The intents' tools over MCP (play/SPEC.md §4.12; served by ./mcp.ts): an agent lists and reads intents, adds one,
// specifies it, records its checks, steps it back, withdraws or retires a document of its work, archives its own; no
// tool approves, accepts or rejects one.
import { admin } from "./access";
import type { GitHub } from "./github";
import { intentOf } from "./review";
import { kinds, workKinds } from "./kinds";
import { addIntent, CHECK_HOWS, CHECKS_MOST, dependIntent, INTENT_KINDS, INTENT_STAGES, LINE_MOST, listIntents, OPEN_STAGES, recordChecks, specifyIntent, TITLE_MOST, WHERES, archiveOwn } from "./intents";
import { stepBack } from "./stepback";
import { withdrawDoc } from "./withdraw";
import { retireDoc } from "./retire";
import type { Tool, ToolCtx } from "./mcptool";

export const intentTools = ({ auto, commit, db, github, store }: ToolCtx): Tool[] => [
    {
      name: "list_intents",
      description:
        "Maia City's intents, the latest first: everything on the board, each something wanted made, fixed or improved, going Idea → Specify → Build → Proposal → Accepted (or Archived), code through Ship between Proposal and Accepted. Each has its id (a UUID), kind (idea, fix, improve), title, note, stage, who wrote it, its spec (goal, scope, checks) once specified, its checks' results while being built, its work once proposed (`work`: what it changes, the version it would be, who proposed it and how, its status), and its dependencies (`depends_on`, each with its stage; `held_by`, those not shipped yet, which hold it; `needed_by`, the intents waiting on it), and its sub-state (`sub`: { state: failed, waiting, working or idle, tag: a few words, why: its reason }; null once decided). One record: an intent at Proposal is the proposal, its work waiting for the decision. " +
        "Sent to work on an intent: read it with get_intent, whose `brief` says what to do at the stage it is at (the Intents skill's part for that stage: doc_at on the Intents skill).",
      inputSchema: {
        type: "object",
        properties: {
          stage: { type: "string", enum: [...INTENT_STAGES, "all"], description: "which intents: one stage, or all; those not yet done (idea, specify, build, proposal, ship) if left out" },
          work: { type: "string", enum: [...workKinds()], description: "only those holding work of this kind (an asset's or story's version, a factory's, config's, skill's or sandbox layout's version)" },
        },
        additionalProperties: false,
      },
      run: async ({ stage, work }, me) => listIntents(db, me, stage === "all" ? undefined : stage ? [`${stage}`] : OPEN_STAGES, work ? `${work}` : undefined),
    },
    {
      name: "get_intent",
      description: "One intent, whole: its kind, title, note, stage, who wrote, specified and approved it, its spec (goal, scope, checks: each its id, statement, how it is checked, must or nice), its checks' latest results with their evidence, its `brief` (what to do now, at the stage it is at: the Intents skill's part for that stage, filled for it; null where there is nothing to do), its work (`work`) with its review (`review`: what it changes, as the board shows it before it is decided), and its dependencies (`depends_on` each with its stage, `held_by` those not shipped yet, `needed_by` those waiting on it), and its sub-state (`sub`: failed, waiting, working or idle, its tag and why; only a waiting one is decided; null once decided). An old proposal's id finds the intent it is now.",
      inputSchema: {
        type: "object",
        properties: { intent: { type: "string", description: "the intent's id (a UUID: list_intents gives it)" } },
        required: ["intent"],
        additionalProperties: false,
      },
      run: async ({ intent }, me) => intentOf(db, me, `${intent ?? ""}`),
    },
    {
      name: "add_intent",
      description:
        "Add an intent at the Idea stage, in this token's admin's name: something to make, fix or improve, as the admin asked you to note it or as you found it and are not doing now (a bug seen while working, an idea for an asset, a story or a sandbox), for the admins to triage. This is the only way an intent comes in: no one adds one by hand. " +
        "Say it in the title, in a line, and the rest in the note: where it is (name assets, stories and sandboxes by their ids), what is wrong or wanted, and why.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", maxLength: TITLE_MOST, description: "what is to be made, fixed or improved, in a line" },
          note: { type: "string", description: "the rest: where, what and why (Markdown)" },
          kind: { type: "string", enum: [...INTENT_KINDS], description: "idea (something new), fix (something wrong) or improve (something there, made better); idea if left out" },
          depends_on: { type: "array", items: { type: "string" }, description: "the intents it depends on, each by its id (a UUID): while any of them is not shipped (Accepted) it is held at every forward gate (approve, Proposal, accept, Ship); no edge to itself, none closing a cycle" },
          work_kind: {
            type: "array",
            items: { type: "string" },
            description:
              "the kinds of work it will bring, declared up front: each a schema's UUID (an artifact's, an asset's, a story's …: list_docs with kind schema gives them) or code (a pull request). Work of another kind is refused; an auto-accept rule may match on it (Approve spec before anything is built). Left out or empty, it declares nothing: any kind, and no rule naming work_kind matches it",
          },
        },
        required: ["title"],
        additionalProperties: false,
      },
      run: async ({ title, note, kind, depends_on, work_kind }, me) => addIntent(db, me, { title, note, kind, depends_on, work_kind }),
    },
    {
      name: "depend_intent",
      description:
        "Add, or drop (drop: true), one dependency: intent `intent` depends on intent `on`, each by its id. While any intent it depends on is not shipped (Accepted; in Ship is not yet, archived holds until the edge is dropped or it is reopened and shipped), it is held: not approved, not moved to Proposal, given no work, not accepted, not shipped; going back is never held. " +
        "Refused: an edge to itself, one closing a cycle. Gives back the intent with depends_on, held_by and needed_by.",
      inputSchema: {
        type: "object",
        properties: {
          intent: { type: "string", description: "the intent that waits, by its id (a UUID)" },
          on: { type: "string", description: "the intent it depends on, by its id (a UUID)" },
          drop: { type: "boolean", description: "true drops the edge" },
        },
        required: ["intent", "on"],
        additionalProperties: false,
      },
      run: async ({ intent, on, drop }, me) => dependIntent(db, me, `${intent ?? ""}`, on, drop),
    },
    {
      name: "specify_intent",
      description:
        `Specify an intent at Idea or Specify: its goal, scope and 1 to ${CHECKS_MOST} checks, at least one a must, replacing any spec before. Its reduce step comes first: a check with step reduce (every one a must), or nothing_to_reduce. ` +
        "Gives back the intent at Specify, where an admin approves the spec. Refused: no reduce step, a reduce check marked nice, a test or measure without its run, a run holding a placeholder, an intent past Specify. How to write a spec is the Intents skill's (get_intent's brief).",
      inputSchema: {
        type: "object",
        properties: {
          intent: { type: "string", description: "the intent's id (a UUID: list_intents gives it)" },
          goal: { type: "string", description: "what is true when it is done, in a sentence" },
          scope: { type: "string", description: "what changes, named by UUIDs, hashes or paths, and what stays as it is (Markdown)" },
          checks: {
            type: "array",
            minItems: 1,
            maxItems: CHECKS_MOST,
            items: {
              type: "object",
              properties: {
                check: { type: "string", description: "one statement that passes or fails" },
                how: { type: "string", enum: [...CHECK_HOWS], description: "test and measure are deterministic: preferred over look" },
                by: { type: "string", description: "test: the command that passes; measure: the tool and the range; look: the reference it is judged against" },
                run: {
                  type: "string",
                  description:
                    "the command that decides it in avenBOX, run from the repository's root as written, no placeholder in it (TEST_DATABASE_URL is set already): required for test (passes when it exits 0) and measure (prints the value, exits 0 only in its range); for a look, optionally the command that makes what is looked at (screenshots)",
                },
                must: { type: "boolean", description: "true (the default): it must pass before the intent is proposed; false: nice to have" },
                step: { type: "string", enum: ["reduce", "mvp"], description: "reduce: what it removes, simplifies or compacts (a must); mvp (the default): what it does" },
              },
              required: ["check", "how", "by"],
              additionalProperties: false,
            },
          },
          nothing_to_reduce: { type: "string", description: "where no check is a reduction: why nothing is to be reduced" },
          title: { type: "string", maxLength: TITLE_MOST, description: "a sharper title, if it needs one" },
          kind: { type: "string", enum: [...INTENT_KINDS] },
          note: { type: "string", description: "a new note, if it needs one" },
          depends_on: { type: "array", items: { type: "string" }, description: "the intents it depends on, each by its id (a UUID): while any of them is not shipped (Accepted) it is held at every forward gate (approve, Proposal, accept, Ship); no edge to itself, none closing a cycle (given, it replaces those before; left out, they stay)" },
          work_kind: {
            type: "array",
            items: { type: "string" },
            description:
              "the kinds of work it will bring, declared up front: each a schema's UUID (an artifact's, an asset's, a story's …: list_docs with kind schema gives them) or code (a pull request). Work of another kind is refused; an auto-accept rule may match on it (Approve spec before anything is built). Given, it replaces the declaration (only while the intent holds no work); left out, it stays; empty, it declares nothing: any kind, and no rule naming work_kind matches it",
          },
        },
        required: ["intent", "goal", "scope", "checks"],
        additionalProperties: false,
      },
      run: async ({ intent, goal, scope, checks, nothing_to_reduce, title, kind, note, depends_on, work_kind }, me) =>
        auto(await specifyIntent(db, me, `${intent ?? ""}`, { goal, scope, checks, nothing_to_reduce, title, kind, note, depends_on, work_kind }), me),
    },
    {
      name: "step_back_intent",
      description:
        "Send an intent one stage back, always with its reason (kept with the step in its history and shown on the board under its note): from Build, or Proposal with no work of play's waiting, to Specify (its spec kept, its approval and results cleared: specify it again with specify_intent), or from Specify to Idea (its spec dropped, its whole text kept in the history). " +
        "Only an admin's Approve spec moves it forward again: until then no check is recorded and nothing is proposed for it. Refused: no reason, at Idea, at Proposal while work of play's waits there (decided first), in Ship, Accepted and Archived.",
      inputSchema: {
        type: "object",
        properties: {
          intent: { type: "string", description: "the intent's id (a UUID: list_intents gives it)" },
          reason: { type: "string", maxLength: LINE_MOST, description: "why it goes back, in one line" },
        },
        required: ["intent", "reason"],
        additionalProperties: false,
      },
      run: async ({ intent, reason }, me) => stepBack(db, me, `${intent ?? ""}`, reason),
    },
    {
      name: "withdraw_doc",
      description:
        "Take one document out of an intent before it is decided, always with its reason (a document proposed by mistake, or a draft gone stale): the intent's open variant of it, proposed or a draft, closed and kept in the history, the rest of the work as it was; the next doc_edit of it for the intent seeds a new variant from Main. " +
        "Only while the intent is in Build or at Proposal; at Proposal it goes back to Build, its results kept, the reason kept in its history and shown on the board. Refused: no reason, a decided intent (Ship, Accepted, Archived) or one not built yet, a document the intent has no open or proposed variant of.",
      inputSchema: {
        type: "object",
        properties: {
          intent: { type: "string", description: "the intent's id (a UUID: list_intents gives it)" },
          doc: { type: "string", description: "the document to take out: its UUID (get_intent's review.docs[].doc.id), or <kind>:<uuid>" },
          reason: { type: "string", maxLength: LINE_MOST, description: "why it goes, in one line" },
        },
        required: ["intent", "doc", "reason"],
        additionalProperties: false,
      },
      run: async ({ intent, doc, reason }, me) => withdrawDoc(db, me, `${intent ?? ""}`, doc, reason, "mcp"),
    },
    {
      name: "retire_doc",
      description:
        "Propose retiring an accepted document as an intent's work, always with its reason (a stray copy, one no longer wanted): an admin's Accept takes it off every list (list_docs, list_stories, Stories, the Library's uses), Main's content as it was, no new version; " +
        "its history stays, read by its UUID (doc_history, doc_at, get_story say `retired`: when, by which intent), and nothing that names it by hash changes (its files, its frozen versions, a story linking one). Archive leaves it as it was. " +
        "Only for an intent in Build or at Proposal, as any work. Refused: no reason, a document never accepted (withdraw_doc takes one out of an intent before its Accept), one retired already.",
      inputSchema: {
        type: "object",
        properties: {
          intent: { type: "string", description: "the intent's id (a UUID: list_intents gives it)" },
          doc: { type: "string", description: "the document to retire: its UUID (list_docs), or <kind>:<uuid>" },
          reason: { type: "string", maxLength: LINE_MOST, description: "why it goes, in one line" },
        },
        required: ["intent", "doc", "reason"],
        additionalProperties: false,
      },
      run: async ({ intent, doc, reason }, me) => retireDoc({ db, store }, me, `${intent ?? ""}`, doc, reason, "mcp"),
    },
    {
      name: "check_intent",
      description:
        "Record an intent's checks' results while it is being built, or at Proposal while no work of it waits: each check's id, pass, evidence, where and commit; the latest stands. Gives back the intent: at Proposal once every must passes, back at Build if a must fails there. main's results confirm, moving nothing. Refused: an unknown check, no evidence, an unapproved intent; from a token not avenBOX's, a pull request or a test or measure result that could decide a code intent (a commit, main, a pull request named): its run records them. The rest is the Intents skill's (get_intent's brief).",
      inputSchema: {
        type: "object",
        properties: {
          intent: { type: "string", description: "the intent's id (a UUID)" },
          results: {
            type: "array",
            description: "each check's result; may be left out when only pr is given",
            items: {
              type: "object",
              properties: {
                check: { type: "string", description: "the check's id: c1, c2 …" },
                pass: { type: "boolean" },
                evidence: { type: "string" },
                where: { type: "string", enum: [...WHERES], description: "where it ran: avenBOX (the default) or main (after the merge, by .github/workflows/intents.yml)" },
                commit: { type: "string", description: "the 40-character git hash it ran on" },
                link: { type: "string", description: "the https link of the GitHub run that ran it (avenBOX's token only)" },
              },
              required: ["check", "pass", "evidence"],
              additionalProperties: false,
            },
          },
          pr: { type: "integer", minimum: 1, description: "the number of the intent's pull request into main (its code), which an admin's Accept merges (in Ship, when its turn comes and GitHub is ready), only on the head every must check with a run last passed on; named while it is being built or at Proposal, a newer one replacing it; named by its run in avenBOX on GitHub (avenBOX's token only)" },
        },
        required: ["intent"],
        additionalProperties: false,
      },
      run: async ({ intent, results, pr }, me) => auto(await recordChecks(db, me, `${intent ?? ""}`, results, pr), me),
    },
    {
      name: "archive_intent",
      description:
        "Archive an intent of your own at Proposal, still waiting for a decision: one whose work you no longer stand by, or one newer work of yours replaces elsewhere (to replace an intent's own work, propose again naming it: the new work replaces the old). Only one this token's admin put at Proposal over MCP (its work proposed here, or, with no work, added here), never anyone else's or one proposed on the page. It ends archived, its work's branch kept as a side line in the history; accepting stays a person's, on the intents' board.",
      inputSchema: {
        type: "object",
        properties: { intent: { type: "string", description: "the intent's id (a UUID: list_intents gives it, with who proposed its work and how)" } },
        required: ["intent"],
        additionalProperties: false,
      },
      run: async ({ intent }, me) => archiveOwn(db, me, `${intent ?? ""}`),
    },
];
