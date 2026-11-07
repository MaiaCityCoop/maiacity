<!--
	INTENTS, AS A BOARD (Samuel 2026-11-03; the proposals' board until 2026-11-06) — every intent of Maia City's as a card in its column,
	newest first. A card opened is reviewed over the whole board: the version built in the asset box as large as it can
	be, what it says of itself folded to two lines, its source (beside its base's, as the lines that changed) a button
	away. Admins decide here; nothing is proposed or edited here: versions come over MCP only (play/api/src/mcp.ts).

	A MODAL, NOT A PAGE (Samuel 2026-11-05): the board opens from the nav pill's star over whatever page is open
	(./IntentsModal.svelte), the way back closing first what is open on it (a review, an intent), then the board.

	INTENTS (Samuel 2026-11-06, play/SPEC.md §4.12): every card is an intent, something Maia City wants made, fixed or
	improved, in its stage's column: Idea → Specify → Prototype → Proposal → Ship → Accepted (or Archived), Accepted and
	Archived folded at first. Agents add and specify intents over MCP (never typed in here): a spec is a goal, a scope and checks,
	each one statement that passes or fails, checked by a test, a measure or a look, must or nice. Here an admin approves
	a spec (Specify → Prototype), and an agent builds it, recording each check's result, until every must check passes:
	then it moves to Proposal by itself (Samuel 2026-11-06), the one gate after the spec, where an admin decides it.

	ONE RECORD (Samuel 2026-11-06: "not a proposal belongs to an intent: the intent has a state, proposal"): an intent's
	work (an asset's or story's version, a sandbox's change, a factory's or config's version) is on the intent itself, and
	Proposal is only its stage. Only a whole intent is decided, in its dialog (Samuel 2026-11-07): its Accept applies all its work,
	its Reject archives it; its work's review, opened from it, is read only. Work proposed without an intent is an intent
	of its own, with no spec. Nothing is accepted from Prototype.

	ACCEPT SHIPS IT (Samuel 2026-11-06, play/api/src/ship.ts): an intent whose work is code names its pull request, and
	its Accept ("Accept and ship") puts it in Ship at once: its first step, Ready to merge, waits with its reason for its
	turn (one ship at a time, in the order accepted: its card says "Queued · behind …") and for GitHub ("Waiting for #N's
	checks", "Waiting for GitHub"), then play merges it by itself, and its way to production shows live (merged, main's
	checks, the release, the deploy's backup, image, server and website, each with its link), the board read again every
	3 s while any intent ships. All green, it is Accepted; a red step brings it back to Proposal with
	the report at the top of its dialog (the step, its link, the log's last lines), and Accept there ships it again.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { session } from '$lib/session.svelte';
	import { wayBack } from '$lib/site/app/back.svelte.js';
	import { intentsModal } from './intents.svelte';
	import { markdown } from '$lib/site/markdown/index.js';
	import { INDEX, admitProposed, source as catalogSource } from '$lib/content/assets/catalog.js';
	import { changesOnly, lineDiff } from '$lib/diff';
	import Changes, { type Change, type Edit } from '$lib/app/Changes.svelte';
	import StoryPlayer from '$lib/stories/StoryPlayer.svelte';
	import StoryChanges, { type StoryDiff } from '$lib/stories/StoryChanges.svelte';
	import type { Story } from '$lib/stories/timeline';

	const viewer = import('$lib/content/assets/VaultAsset.svelte');
	// a world is shown as the Worlds page shows it (its own view: sky, lights, its guests at the sizes a world draws them,
	// one renderer let go of whole when it closes), not on the asset stage, whose studio, shadows and section cuts over
	// a whole city (most of a million triangles) crashed iPad Safari
	const worldViewer = import('$lib/content/worlds/WorldStage.svelte');

	/** how the board is closed (the modal's ×, Escape with nothing open on it) */
	let { onclose }: { onclose?: () => void } = $props();
	// admins only for now (Samuel 2026-11-02): the nav pill's star is greyed out for everyone else
	const admin = $derived(session.me?.level === 'admin');

	// an intent's work, as the board lists it (play/api/src/intents.ts): what it changes, the version it would be, who
	// proposed it and how, and its status (the intent's stage: waiting at Proposal, accepted, else archived)
	// its kind is a versioned kind's work (<kind>_version, play/api/src/versioned.ts) or a sandbox's change; `what` names it
	type Work = { kind: string; what: string | null; doc: string | null; doc_variant: number | null; asset_id: string | null; label: string; grp: string; slug: string | null; version_label: string | null; number: number | null; changes?: number; status: string; note: string; author: string | null; decided_by: string | null; created: string; decided_at?: string | null; via?: 'web' | 'mcp' };
	// the work opened for review: the intent's id, with the intent's title, spec and results beside it
	type P = Work & { id: string; intent_id: string; intent_title: string; intent_spec: Spec | null; intent_results: Results | null };
	// an intent (play/api/src/intents.ts): its kind, title and note, its stage, its spec once specified (a goal, a scope and
	// its checks), its checks' latest results while prototyped, and its work once proposed
	type Kind = 'idea' | 'fix' | 'improve';
	type Stage = 'idea' | 'specify' | 'prototype' | 'proposal' | 'ship' | 'accepted' | 'archived';
	// its way to production, once an Accept merged its pull request (play/api/src/ship.ts): each step's state, when, its
	// link; a red one's report
	type ShipStep = { key: string; name: string; state: 'queued' | 'running' | 'green' | 'red' | 'skipped'; started?: string; finished?: string; link?: string; note?: string };
	type Ship = { pr: number; head: string; merge: string; by: string; round: number; started: string; steps: ShipStep[]; report?: { step: string; why: string; link?: string; log: string; at: string } | null; ended?: string; outcome?: 'green' | 'red'; again?: 'main' | 'release'; pending?: { kind: 'merge' | 'main' | 'release'; head?: string } | null; accepted?: string };
	// run: the command that decides a check in avenBOX (test and measure checks since 2026-11-06; play/SPEC.md §4.12)
	// step: a spec's two steps, reduce first, then the MVP (specs from before have none: mvp; play/SPEC.md §4.12)
	type Check = { id: string; check: string; how: 'test' | 'measure' | 'look'; by: string; run?: string; must: boolean; step?: 'reduce' | 'mvp' };
	type Spec = { goal: string; scope: string; checks: Check[]; nothing_to_reduce?: string };
	// where: in avenBOX (the agent's), or on main after the merge (.github/workflows/intents.yml), on which commit
	type Results = Record<string, { pass: boolean; evidence: string; by: string | null; at: string; where?: 'avenBOX' | 'main'; commit?: string }>;
	type Intent = { id: string; kind: Kind; title: string; note: string; stage: Stage; via: 'web' | 'mcp'; created: string; author: string | null; spec: Spec | null; results: Results | null; specified_at: string | null; specified_by: string | null; approved_at: string | null; approved_by: string | null; decided_at: string | null; decided_by: string | null; came_with: string | null; work: Work | null; pull_request: number | null; ship: Ship | null };
	// an intent's kind, shown as what it asks (the kind 'idea' as Make, the stage Idea being its own; Samuel 2026-11-06)
	const KINDS: [Kind, string][] = [
		['idea', 'Make'],
		['fix', 'Fix'],
		['improve', 'Improve']
	];
	const kindName = (k: Kind) => KINDS.find(([x]) => x === k)?.[1] ?? k;
	const COLUMNS = [
		['idea', 'Idea'],
		['specify', 'Specify'],
		['prototype', 'Prototype'],
		['proposal', 'Proposal'],
		['ship', 'Ship'],
		['accepted', 'Accepted'],
		['archived', 'Archived']
	] as const;
	const STAGE_NAME: Record<Stage, string> = { idea: 'Idea', specify: 'Specify', prototype: 'Prototype', proposal: 'Proposal', ship: 'Ship', accepted: 'Accepted', archived: 'Archived' };
	type Column = (typeof COLUMNS)[number][0];
	// a column folded away or open, each viewer's own (kept in this browser): Accepted and Archived folded at first
	// (Samuel 2026-11-05; the key named for the intents' columns, Samuel 2026-11-06)
	const FOLDED = 'play:intents:folded';
	let folded = $state<Record<string, boolean>>({ accepted: true, archived: true });
	try {
		const kept = JSON.parse(localStorage.getItem(FOLDED) ?? 'null');
		if (kept && typeof kept === 'object') folded = kept;
	} catch {}
	function fold(s: Column) {
		folded = { ...folded, [s]: !folded[s] };
		try {
			localStorage.setItem(FOLDED, JSON.stringify(folded));
		} catch {}
	}
	const columnsTemplate = $derived(COLUMNS.map(([s]) => (folded[s] ? '2.6rem' : 'minmax(14rem, 1fr)')).join(' '));
	let intents = $state<Intent[]>([]);
	let loaded = $state(false);
	let error = $state('');
	const load = async () => {
		try {
			intents = await api<Intent[]>('/intents');
			error = '';
		} catch (e) {
			error = (e as Error).message;
		}
		loaded = true;
	};
	onMount(async () => {
		if (!admin) return;
		await load();
		// opened on an intent (/intents/#<id>): play finds it, and it opens
		const focus = intentsModal.focus;
		intentsModal.focus = null;
		if (!focus) return;
		try {
			const i = await api<Intent>(`/intents/${focus}`);
			openIntentDialog(intents.find((x) => x.id === i.id) ?? i);
		} catch (e) {
			error = (e as Error).message;
		}
	});
	// a column's cards: the intents at its stage, the latest first (those decided by when they were)
	const inColumn = (s: string): Intent[] => {
		const cards = intents.filter((i) => i.stage === s);
		// Ship is a queue: the one shipping, then the rest in the order accepted, first in line on top
		return s === 'ship' ? [...cards].sort((a, b) => Date.parse(a.decided_at ?? a.created) - Date.parse(b.decided_at ?? b.created)) : cards;
	};
	/** how far an intent's must checks are: "2/3 checks" */
	const checksDone = (i: { spec: Spec | null; results: Results | null }) => {
		const musts = i.spec?.checks.filter((c) => c.must) ?? [];
		return musts.length ? `${musts.filter((c) => i.results?.[c.id]?.pass === true).length}/${musts.length} checks` : '';
	};
	const allMustPass = (i: { spec: Spec | null; results: Results | null }) => !!i.spec && i.spec.checks.filter((c) => c.must).every((c) => i.results?.[c.id]?.pass === true);
	// ---- Accept ships it (play/api/src/ship.ts): an intent of code, its pull request named, merged by its Accept
	const REPO_URL = 'https://github.com/MyAvenCEO/maiacity';
	/** whether an intent's Accept ships it: its work is code, its pull request named */
	const isCode = (i: Intent) => !i.work && !!i.pull_request;
	/** its pull request merged by an earlier ship that went red: Accept ships that again */
	const shipsAgain = (i: Intent) => isCode(i) && !!i.ship?.merge && i.ship.pr === i.pull_request && i.ship.outcome === 'red';
	const doneStep = (s: ShipStep) => s.state === 'green' || s.state === 'skipped';
	/** where a ship is now: its red step, else the first not yet done */
	const shipNow = (sh: Ship) => sh.steps.find((s) => s.state === 'red') ?? sh.steps.find((s) => !doneStep(s));
	const STEP_MARK: Record<ShipStep['state'], string> = { queued: '·', running: '●', green: '✓', red: '✗', skipped: '–' };
	const STEP_WORD: Record<ShipStep['state'], string> = { queued: 'waiting', running: 'running', green: 'done', red: 'red', skipped: 'skipped' };
	/** a step's time: how long it took, or has run so far */
	const tookOf = (s: ShipStep, now: number) => {
		if (!s.started) return '';
		const ms = (s.finished ? Date.parse(s.finished) : now) - Date.parse(s.started);
		if (!(ms >= 0)) return '';
		const sec = Math.round(ms / 1000);
		return sec < 60 ? `${sec} s` : `${Math.floor(sec / 60)} min ${sec % 60} s`;
	};
	/** a card's line in Ship (its current step) or at Proposal after a red ship */
	const shipLine = (i: Intent) => {
		if (!i.ship) return '';
		if (i.stage === 'ship') {
			const n = shipNow(i.ship);
			// still waiting to start: why (its turn, GitHub, its checks), as the first step says
			if (n?.key === 'ready' && n.note) return n.note;
			return n ? `${n.name} · ${STEP_WORD[n.state]}` : 'in production';
		}
		if (i.stage === 'proposal' && i.ship.outcome === 'red' && i.ship.report) return `red at ${i.ship.report.step}`;
		return '';
	};
	/** a log shown from its end, where it went red */
	const toEnd = (el: HTMLElement) => {
		el.scrollTop = el.scrollHeight;
	};
	// while any intent ships, the board (and the intent open on it) is read again every 3 s
	const shipping = $derived(intents.some((i) => i.stage === 'ship'));
	let now = $state(Date.now());
	$effect(() => {
		if (!shipping) return;
		const t = setInterval(async () => {
			now = Date.now();
			await load();
			const o = intent;
			if (o) intent = intents.find((x) => x.id === o.id) ?? o;
		}, 3000);
		return () => clearInterval(t);
	});
	/** where a result ran, as its mark says: avenBOX, or main and its commit */
	const whereOf = (r: Results[string]) => (r.where === 'main' ? `main${r.commit ? ` @ ${r.commit.slice(0, 7)}` : ''}` : 'avenBOX');
	/** what an intent's work is, on its card: "v3 · waiting", "2 changes · accepted" */
	const workText = (i: Intent) => (i.work ? `${titleOf(i.work)} · ${i.work.status === 'proposal' ? 'waiting' : i.work.status}` : '');
	/** the work of intent `i`, opened for review */
	const cardOf = (i: Intent): P => ({ ...i.work!, id: i.id, intent_id: i.id, intent_title: i.title, intent_spec: i.spec, intent_results: i.results });
	const when = (s: string) => new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
	/** a card's date, short: "4 Nov, 16:27" */
	const shortWhen = (s: string) => new Date(s).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
	/** the author's mark on a card: their initials in a round badge */
	const initialsOf = (name: string | null | undefined) => (name ?? '?').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
	/** a note's first line, for its card */
	const gist = (s: string) => (s ?? '').split('\n')[0];

	// reviewing one: the version built in the asset box (the sandboxed frame every recipe runs in), large; its note
	// folded; its readable source beside its base's, as the lines that changed, a button away. Code is only text here.
	type Build = { hash: string; variant: string | null; label: string; first: boolean };
	/** every review of a document's version (play/api/src/versioned.ts reviewDoc): its document, what it changes field by
	 *  field against its seed, the edits that made it, whether Main moved since; an asset's adds its builds, a story's its
	 *  timelines */
	type DocReview = { doc: { id: string; kind: string; what: string; label: string; group?: string; open: string | null } | null; seedNumber: number | null; moved: boolean; changes: Change[]; edits: Edit[] };
	type Review = DocReview & { id: string; source: string | null; recipe: string | null; baseVersion: { number: number; source: string | null } | null; builds: Build[] };
	let open = $state<P | null>(null);
	let review = $state<Review | null>(null);
	let code = $state('');
	let baseCode = $state<string | null>(null);
	let shown = $state('');
	let changes = $state(true);
	let showSource = $state(false);
	let noteOpen = $state(false);
	let reviewError = $state('');
	const text = async (hash: string) => {
		const r = await fetch(`/api/files/${hash}`, { credentials: 'same-origin' });
		if (!r.ok) throw new Error(`The file could not be read (HTTP ${r.status}).`);
		return r.text();
	};
	// a story's (play/api/src/stories.ts): its timeline played in the Stories player, beside what changed clip by clip
	type StoryReview = DocReview & { story: Story; baseStory: (Story & { number: number }) | null; diff: StoryDiff };
	let storyReview = $state<StoryReview | null>(null);
	// a sandbox's change (play/api/src/sandboxes.ts): what each edit changes, before and after, and the sandbox as it would be
	type PinShown = { label: string; group: string; slug: string; number: number; variant: string | null; usedVariant: string | null; params: Record<string, string> | null } | null;
	type SandboxChange =
		| { kind: 'pin'; slot: string; before: PinShown; after: PinShown }
		| { kind: 'config'; config: string; path: (string | number)[]; before: unknown; after: unknown };
	type SandboxReview = { sandbox: { id: string; title: string; route: string }; changes: SandboxChange[]; holds: boolean; why: string | null; moved: boolean };
	let sandboxReview = $state<SandboxReview | null>(null);
	// any other document's (a factory's, a config's, a skill's, and every kind to come): field by field, opened as it would be
	let docReview = $state<DocReview | null>(null);
	const pinText = (x: PinShown) =>
		x ? `${x.label} v${x.number}${x.usedVariant ? ` · ${x.usedVariant}${x.variant ? '' : ' (default)'}` : ''}${x.params ? ` · ${Object.entries(x.params).map(([k, v]) => `${k} ${v}`).join(', ')}` : ''}` : 'none';
	const valueText = (v: unknown) => (v === undefined ? '(none)' : JSON.stringify(v, null, 1));
	/** a title for a card: an asset's or story's version, or a sandbox's change */
	/** what a proposal is of, its card's tag (Samuel 2026-11-05: the type, not how it came; that it came over MCP is in its title and its review) */
	const GROUP_TYPE: Record<string, string> = { plants: 'Plant', things: 'Thing', machines: 'Machine', buildings: 'Building', actors: 'Actor', biomes: 'Biome', worlds: 'World' };
	const typeOf = (p: { what?: string | null; grp: string | null }) => GROUP_TYPE[p.grp ?? ''] ?? (p.what ? p.what[0].toUpperCase() + p.what.slice(1) : (p.grp ?? ''));
	/** an intent's tag: what its work is (a plant, a story …) where it has some, else its kind */
	const tagOf = (i: Intent) => (i.work ? typeOf(i.work) : kindName(i.kind));
	const titleOf = (p: Work) => (p.number == null ? `${p.changes ?? 0} change${p.changes === 1 ? '' : 's'}` : `v${p.number}`);
	async function openCard(p: P) {
		intent = null;
		open = p;
		review = null;
		storyReview = null;
		sandboxReview = null;
		docReview = null;
		code = '';
		baseCode = null;
		shown = '';
		showSource = false;
		noteOpen = false;
		reviewError = '';
		// one review for every kind: a sandbox's change, an asset's build, a story's timelines, or any document's fields
		let got: any;
		try {
			got = (await api<{ review: any }>(`/intents/${p.id}`)).review;
		} catch (e) {
			reviewError = (e as Error).message;
			return;
		}
		if (open?.id !== p.id) return;
		if (got.sandbox) return void (sandboxReview = got);
		if (got.story) return void (storyReview = got);
		if (!got.builds) return void (docReview = got);
		try {
			const r = got as Review;
			await admitProposed(r.builds);
			review = r;
			shown = (r.builds.find((b) => b.first) ?? r.builds[0])?.hash ?? '';
			code = r.source ? await text(r.source) : r.recipe ? await text(r.recipe) : '';
			baseCode = r.baseVersion?.source ? await text(r.baseVersion.source) : null;
		} catch (e) {
			reviewError = (e as Error).message;
		}
	}
	const close = () => (open = null);
	const diff = $derived(baseCode !== null && code ? changesOnly(lineDiff(baseCode, code)) : null);

	// ---- an intent opened: its spec and checks, its work a click away, the brief that sends an agent to it, and the
	// admin's decision; one with no spec and a single proposal (one made without an intent) opens straight into its review
	let intent = $state<Intent | null>(null);
	let intentError = $state('');
	let copied = $state(false);
	/** what to tell an agent sent to the intent opened: play's (GET /api/intents/<id>'s brief, the Intents skill's part for
	 * its stage, play/api/src/skills.ts), never written here; null where there is nothing for an agent to do */
	let brief = $state<{ id: string; stage: Stage; text: string | null } | null>(null);
	// read again whenever the intent opened is another, or at another stage (an Accept that ships it, the board's refresh)
	$effect(() => {
		const i = intent;
		if (!i || (brief?.id === i.id && brief.stage === i.stage)) return;
		const { id, stage } = i;
		api<Intent & { brief: string | null }>(`/intents/${id}`)
			.then((r) => {
				if (intent?.id === id) brief = { id, stage, text: r.brief };
			})
			.catch((e) => {
				if (intent?.id === id) intentError = (e as Error).message;
			});
	});
	/** the intent a proposal was made for, from its review */
	function openIntentOf(id: string) {
		const i = intents.find((x) => x.id === id);
		if (i) openIntentDialog(i);
	}
	/** the intent's own dialog (its spec, checks and work), even where it is only its work */
	async function openIntentDialog(i: Intent) {
		open = null;
		intent = i;
		intentError = '';
		copied = false;
	}
	const closeIntent = () => {
		intent = null;
		intentError = '';
	};
	/** an Accept that merges (Accept and ship): GitHub takes a few seconds */
	let merging = $state(false);
	async function decideIntent(id: string, verdict: 'approve' | 'respecify' | 'accept' | 'reject' | 'reopen') {
		merging = verdict === 'accept' && !!intent && isCode(intent);
		intentError = '';
		try {
			// accepted, its work is applied (or archived, where its base moved and the two touch the same field: why, here)
			const r = await api<Intent & { message?: string }>(`/intents/${id}/${verdict}`, { method: 'POST' });
			error = r.message ?? '';
			intents = intents.map((x) => (x.id === r.id ? r : x));
			// shipped: the dialog stays, its way to production ticking
			if (r.stage === 'ship') intent = r;
			else closeIntent();
		} catch (e) {
			intentError = (e as Error).message;
		} finally {
			merging = false;
		}
	}
	async function copyBrief(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			intentError = 'The brief could not be copied here: select it and copy it by hand.';
		}
	}
	/** Markdown, as the site's one engine writes it (safe to show: nothing in it can run or load) */
	const md = (s: string | null | undefined) => markdown(s ?? '');

	// the way back (the nav pill's Back) closes what is open on the board first, then the board itself (the modal's)
	$effect(() => {
		if (!open) return;
		return wayBack('Back to the intents', close);
	});
	$effect(() => {
		if (!intent) return;
		return wayBack('Back to the intents', closeIntent);
	});

	const onKey = (e: KeyboardEvent) => {
		if (e.key !== 'Escape') return;
		if (intent) closeIntent();
		else if (open) close();
		else onclose?.();
	};
</script>

<svelte:window onkeydown={onKey} />

<div class="intents">
{#if !admin}
	<p class="muted">The intents are Maia City's admins' for now.</p>
{:else}
		<!-- the title alone above the columns: no words about the board (Samuel 2026-11-06) -->
		<header class="head">
			<h1>Intents</h1>
			{#if onclose}<button class="btn small ghost close" onclick={onclose} aria-label="Close the intents" title="Close (Esc)">Close</button>{/if}
		</header>
		{#if error}<p class="error">{error}</p>{/if}
		<div class="board" style:grid-template-columns={columnsTemplate}>
			{#each COLUMNS as [s, name] (s)}
				{@const cards = inColumn(s)}
				<!-- the column's header stays; only its cards scroll (Samuel 2026-11-04); a column folds away to a strip -->
				<section class="column" class:folded={folded[s]} data-status={s}>
					<h2>
						<button class="fold" onclick={() => fold(s)} aria-expanded={!folded[s]} title={folded[s] ? `Open ${name}` : `Fold ${name} away`}>
							<span class="name">{name}</span> <span class="count">{cards.length}</span>
						</button>
					</h2>
					{#if !folded[s]}
						<div class="cards">
							{#each cards as i (i.id)}
								{@const progress = s === 'prototype' ? checksDone(i) : ''}
								<!-- an intent: its title, how far its checks or its work got, who it is by, its type and its date -->
								<article class="card" class:item={!!i.spec || !i.work} data-kind={i.kind}>
									<button class="open" onclick={() => openIntentDialog(i)} title={i.note ? gist(i.note) : undefined}>
										<span class="title">{i.title}</span>
										{#if shipLine(i)}<span class="for ship" class:red={i.stage === 'proposal' || i.ship?.steps.some((x) => x.state === 'red')} class:running={i.stage === 'ship'}>{shipLine(i)}</span>
										{:else if progress}<span class="for" class:done={allMustPass(i)}>{progress}</span>
										{:else if i.spec && s === 'specify'}<span class="for">{i.spec.checks.length} check{i.spec.checks.length === 1 ? '' : 's'} · to approve</span>
										{:else if i.spec && i.work}<span class="for">{workText(i)}</span>{/if}
										<span class="meta">
											<span class="avatar" aria-hidden="true">{initialsOf(i.author)}</span>
											<span class="author">{i.author ?? 'someone'}</span>
											<span class="type" data-type={tagOf(i)} data-kind={i.work ? undefined : i.kind} title={i.via === 'mcp' ? `${tagOf(i)} · by an agent working for them over MCP` : tagOf(i)}>{tagOf(i)}</span>
											<span class="date">{shortWhen(i.decided_at ?? i.created)}</span>
										</span>
									</button>
								</article>
							{:else}
								<p class="empty muted">{!loaded ? '…' : s === 'idea' ? 'None. Agents add intents over MCP.' : s === 'specify' ? 'None. Agents specify an intent over MCP.' : s === 'prototype' ? 'None. An approved spec is built here.' : s === 'ship' ? 'None. Accepted code is shipped here.' : 'None'}</p>
							{/each}
						</div>
					{/if}
				</section>
			{/each}
		</div>

	{#if intent}
		{@const i = intent}
		{@const musts = i.spec?.checks.filter((c) => c.must) ?? []}
		<!-- an intent opened: read here (it is added and specified over MCP only), its spec and its checks with their
		     results, its work a click away, the brief that sends an agent to it, and the admins' decision on it -->
		<button class="scrim" onclick={closeIntent} aria-label="Close" tabindex="-1"></button>
		<div class="review item-review" role="dialog" aria-modal="true" aria-label={i.title}>
			<header class="review-head">
				<div class="who">
					<!-- the way back to the board, seen at once on a phone too, where the nav pill's arrow has no word (Samuel 2026-11-06) -->
					<button class="to-board" onclick={closeIntent} title="Back to the intents (Esc)">‹ Intents</button>
					<p class="tags"><span class="type" data-kind={i.kind}>{kindName(i.kind)}</span> <span class="pill" class:shipping={i.stage === 'ship'}>{STAGE_NAME[i.stage]}{#if i.stage === 'ship' && i.ship}{@const n = shipNow(i.ship)}{n ? ` · ${n.name}` : ''}{/if}</span>{#if (i.stage === 'prototype' || i.stage === 'proposal') && musts.length}{' '}<span class="pill" class:pass={allMustPass(i)}>{checksDone(i)}</span>{/if}</p>
					<h2>{i.title}</h2>
					<p class="meta">by {i.author ?? 'someone'}{#if i.via === 'mcp'}{' '}<span class="via" title="Added by an agent working for them over MCP">via MCP</span>{/if} · {when(i.created)}{i.specified_by && i.specified_at ? ` · specified by ${i.specified_by}, ${when(i.specified_at)}` : ''}{i.approved_by && i.approved_at ? ` · spec approved by ${i.approved_by}` : ''}{i.decided_by && i.decided_at ? ` · ${i.stage === 'ship' ? 'accepted' : i.stage} by ${i.decided_by}, ${when(i.decided_at)}` : ''}</p>
				</div>
			</header>
			<div class="item-body">
			{#if i.stage === 'proposal' && i.ship?.outcome === 'red' && i.ship.report}
				{@const rep = i.ship.report}
				<!-- a red ship: what went red, where, and the log's last lines; Accept ships it again -->
				<section class="ship-report" aria-label="The ship's report">
					<h3>Not shipped: red at {rep.step}</h3>
					<p class="small">{rep.why}{#if rep.link}{' · '}<a href={rep.link} target="_blank" rel="noopener">Open it on GitHub</a>{/if} <span class="muted">· {shortWhen(rep.at)}</span></p>
					{#if rep.log}<pre class="log" use:toEnd>{rep.log}</pre>{/if}
					<p class="muted small">{shipsAgain(i) ? `Accept ships it again (${i.ship.again === 'main' ? "main's failed jobs run again" : 'the release of ' + i.ship.merge.slice(0, 7) + ' again'}); or an agent fixes it in a new pull request of the intent, its checks recorded on its head.` : 'Accept merges its newer pull request and ships it.'}</p>
				</section>
			{/if}
			{#if i.ship && (i.stage === 'ship' || i.stage === 'accepted' || i.stage === 'proposal')}
				{@const sh = i.ship}
				<section class="ship" aria-label="Its way to production">
					<h3>{i.stage === 'ship' ? 'Shipping' : i.stage === 'accepted' ? 'Shipped' : 'Its last ship'} <span class="muted small">#{sh.pr}{sh.merge ? ` as ${sh.merge.slice(0, 7)}` : ''} · accepted by {sh.by}{sh.round > 1 ? ` · round ${sh.round}` : ''}</span></h3>
					<ol class="steps-live">
						{#each sh.steps as st (st.key)}
							<li data-state={st.state}>
								<span class="mark" title={STEP_WORD[st.state]}>{STEP_MARK[st.state]}</span>
								<span class="name">{st.name}</span>
								<span class="muted small">{st.note ?? ''}{st.note && tookOf(st, now) ? ' · ' : ''}{tookOf(st, now)}</span>
								{#if st.link}<a class="small" href={st.link} target="_blank" rel="noopener">GitHub</a>{/if}
							</li>
						{/each}
					</ol>
				</section>
			{/if}
			{#if i.note}<div class="md">{@html md(i.note)}</div>{/if}
			<section class="spec" class:none={!i.spec}>
				{#if i.spec}
					{@const reduce = i.spec.checks.filter((c) => c.step === 'reduce')}
					{@const mvp = i.spec.checks.filter((c) => c.step !== 'reduce')}
					{@const hint = i.stage === 'specify' ? 'what will be checked, once approved' : 'once every must check passes, it moves to Proposal by itself'}
					{#snippet checkList(list: Check[])}
						<ol class="checks">
							{#each list as c (c.id)}
								{@const r = i.results?.[c.id]}
								<li class:pass={r?.pass === true} class:fail={r?.pass === false}>
									<span class="mark" title={r ? (r.pass ? 'Passed' : 'Failed') : 'No result yet'}>{r ? (r.pass ? '✓' : '✗') : '·'}</span>
									<div class="what">
										<p><span class="cid">{c.id}</span> {c.check}{#if !c.must}{' '}<span class="pill nice" title="Nice to have: it does not hold the proposal back">nice</span>{/if}</p>
										<p class="muted small"><span class="how">{c.how}</span> · {c.by}</p>
										{#if c.run}<code class="run" title="Its run: the command that decides it in avenBOX, and on main once merged">{c.run}</code>{/if}
										{#if r}<p class="evidence small"><span class="where" class:main={r.where === 'main'} title={r.where === 'main' ? 'Run on main after the merge' : 'Run in avenBOX'}>{whereOf(r)}</span>{' '}{r.evidence}{#if r.by}{' '}<span class="muted">· {r.by}, {shortWhen(r.at)}</span>{/if}</p>{/if}
									</div>
								</li>
							{/each}
						</ol>
					{/snippet}
					<!-- its two steps (Samuel 2026-11-06): what it takes away first, then the MVP -->
					<div class="step reduce">
						<h3>Reduce <span class="muted small">what it removes, simplifies or compacts first</span></h3>
						{#if reduce.length}{@render checkList(reduce)}
						{:else if i.spec.nothing_to_reduce}<p class="small"><span class="muted">Nothing to reduce:</span> {i.spec.nothing_to_reduce}</p>
						{:else}<p class="muted small">Specified before the reduce step: none named.</p>{/if}
					</div>
					<h3 class="step">MVP</h3>
					<div>
						<h3>Goal</h3>
						<div class="md">{@html md(i.spec.goal)}</div>
					</div>
					<div>
						<h3>Scope</h3>
						<div class="md">{@html md(i.spec.scope)}</div>
					</div>
					<div class="checks-wrap">
						<h3>Checks <span class="muted small">{hint}</span></h3>
						{@render checkList(mvp)}
					</div>
				{:else}
					{#if i.stage === 'idea' || i.stage === 'specify'}
						<h3>Not specified yet</h3>
						<p class="muted small">Its spec (a goal, a scope and the checks that decide when it is done) is written over MCP before anything is built for it: the brief below asks an agent to do that, and an admin approves it here.</p>
					{:else}
						<h3>Without a spec</h3>
						<p class="muted small">It was proposed without a spec: what is proposed for it is judged by its review alone.{i.stage === 'accepted' || i.stage === 'archived' ? ' Reopened, it is specified first.' : ''}</p>
					{/if}
				{/if}
			</section>
			<section>
				<h3>Its work</h3>
				{#if !i.work && i.pull_request}<p class="small">Code: <a href="{REPO_URL}/pull/{i.pull_request}" target="_blank" rel="noopener">pull request #{i.pull_request}</a> <span class="muted">· {i.stage === 'proposal' ? 'Accept merges it into main and ships it' : i.stage === 'ship' ? (i.ship?.pending ? 'in Ship, merged when its turn comes and GitHub is ready' : 'merged, on its way to production') : i.stage === 'accepted' ? 'in production' : 'named by its agent'}</span></p>
				{:else if !i.work}<p class="muted small">Nothing yet.{i.stage === 'idea' || i.stage === 'specify' || i.stage === 'prototype' ? ' Send an agent to it with the brief below.' : ''}</p>
				{:else}
					{@const w = i.work}
					<ul class="linked">
						<li>
							<button class="open" onclick={() => openCard(cardOf(i))}>
								<span class="type" data-type={typeOf(w)}>{typeOf(w)}</span>
								<span class="what">{w.label} <span class="muted">{titleOf(w)}</span></span>
								<span class="pill">{w.status === 'proposal' ? 'waiting' : w.status}</span>
								<span class="date muted">{shortWhen(w.created)}</span>
							</button>
						</li>
					</ul>
				{/if}
				{#if i.came_with}<p class="muted small">Proposed for <button class="link" onclick={() => openIntentOf(i.came_with!)}>{intents.find((x) => x.id === i.came_with)?.title ?? 'another intent'}</button>, beside the work it kept.</p>{/if}
			</section>
			{#if brief?.id === i.id && brief.stage === i.stage && brief.text}
				{@const text = brief.text}
				<section class="agent">
					<h3>For an agent</h3>
					<p class="muted small">Give this to an agent with play's MCP server: what to do with the intent at its stage, the Intents skill's (get_intent gives it the same).</p>
					<pre class="brief">{text}</pre>
					<button class="btn small ghost" onclick={() => copyBrief(text)}>{copied ? 'Copied' : 'Copy the brief'}</button>
				</section>
			{/if}
			</div>
			<!-- a refused decision's reason at the foot, right above the buttons that were pressed, seen without scrolling
			     the dialog's body (Samuel 2026-11-06); gone once another decision is pressed or the dialog closes -->
			{#if intentError}<p class="refused" role="alert">{intentError}</p>{/if}
			<!-- the decision at its foot, in the middle: Reject (it ends archived) on the left, Approve or Accept on the right;
			     no Close: the nav pill's Back (or Escape, or the scrim) closes it, the star the board (Samuel 2026-11-06).
			     Accept only at Proposal (it moves there by itself once every must check passes; Samuel 2026-11-06). Only a
			     whole intent is decided, whatever its work: its Accept applies all of it, its Reject archives it (Samuel 2026-11-07) -->
			{#if i.stage !== 'ship'}
			<footer class="decide">
				{#if i.stage === 'idea' || i.stage === 'specify' || i.stage === 'prototype' || i.stage === 'proposal'}
					<button class="btn small reject" onclick={() => decideIntent(i.id, 'reject')} title="Not to be done: it ends archived">Reject</button>
				{/if}
				{#if i.stage === 'prototype' || (i.stage === 'proposal' && i.approved_at && i.work?.status !== 'proposal')}
					<button class="btn small ghost" onclick={() => decideIntent(i.id, 'respecify')} title="Its spec is to change: back to Specify, its approval and results cleared">Back to Specify</button>
				{:else if i.stage === 'accepted' || i.stage === 'archived'}
					<button class="btn small ghost" onclick={() => decideIntent(i.id, 'reopen')} title="Open again: back to {i.spec ? 'Specify' : 'Idea'}">Reopen</button>
				{/if}
				{#if i.stage === 'specify' && i.spec}<button class="btn small" onclick={() => decideIntent(i.id, 'approve')} title="The spec is right: an agent may build it">Approve spec</button>
				{:else if i.stage === 'proposal'}<button class="btn small" onclick={() => decideIntent(i.id, 'accept')} disabled={!allMustPass(i) || merging} title={!allMustPass(i) ? 'Every must check passes first' : isCode(i) ? (shipsAgain(i) ? 'Ship it again: its pull request is merged; the release (or main\'s failed jobs) runs again' : `Ship pull request #${i.pull_request}: in Ship at once, merged into main when its turn comes and GitHub is ready, then to production`) : i.work ? 'Applies its work: what it asked is in' : 'What it asked is in'}>{merging ? 'Accepting…' : isCode(i) ? (shipsAgain(i) ? 'Ship again' : 'Accept and ship') : 'Accept'}</button>{/if}
			</footer>
			{/if}
		</div>
	{/if}

	{#if open}
		{@const p = open}
		<div class="review" role="dialog" aria-modal="true" aria-label="{p.label} {titleOf(p)}">
			<header class="review-head">
				<div class="who">
					<button class="to-board" onclick={close} title="Back to the intents (Esc)">‹ Intents</button>
					<h2>{p.label} <span class="muted">{titleOf(p)}</span> <span class="pill">{p.status}</span></h2>
					<p class="meta">{p.grp} · by {p.author ?? 'someone'}{#if p.via === 'mcp'}{' '}<span class="via" title="Proposed by an agent working for them over MCP">via MCP</span>{/if} · {when(p.created)}{p.decided_by ? ` · ${p.status} by ${p.decided_by}` : ''}{#if p.intent_id}{' · for '}<button class="link" onclick={() => openIntentOf(p.intent_id!)} title="The intent it was made for: its spec and checks">{p.intent_title}</button>{/if}</p>
					{#if p.intent_spec}
						{@const checks = p.intent_spec.checks}
						<p class="gate small" title="The intent's checks, each as its last result: every must check passed before play took this">
							{#each checks as c (c.id)}
								{@const r = p.intent_results?.[c.id]}
								<span class="chk" class:pass={r?.pass === true} class:fail={r?.pass === false} title="{c.id} {c.check}{c.must ? '' : ' (nice)'}{r ? ` — ${r.evidence}` : ''}">{r ? (r.pass ? '✓' : '✗') : '·'} {c.id}</span>
							{/each}
						</p>
					{/if}
				</div>
			</header>
			{#if p.note}
				<div class="note" class:folded={!noteOpen}>
					<p>{p.note}</p>
				</div>
				<button class="more" onclick={() => (noteOpen = !noteOpen)}>{noteOpen ? 'Less' : 'More'}</button>
			{/if}
			{#if sandboxReview || (!review && !storyReview && !docReview)}
				<div class="sandbox-review">
					{#if reviewError}<p class="error">{reviewError}</p>
					{:else if !sandboxReview}<p class="muted">Reading it…</p>
					{:else}
						{@const r = sandboxReview}
						{#if p.status === 'proposal'}
							{#if !r.holds}<p class="error">It no longer holds on {r.sandbox.title} as it is now: {r.why} Accepting it archives it.</p>
							{:else}
								<p>
									<a class="btn small" href="{r.sandbox.route}?layout={encodeURIComponent(`${r.sandbox.id}/${p.id}`)}" target="_blank" rel="noopener">Open {r.sandbox.title} as it would be</a>
									{#if r.moved}<span class="muted small"> {r.sandbox.title} changed since it was proposed: shown as accepting would apply it now.</span>{/if}
								</p>
							{/if}
						{/if}
						<h3>{p.status === 'accepted' ? 'What it changed' : 'What it changes'}</h3>
						<ol class="changes">
							{#each r.changes as c, i (i)}
								<li>
									{#if c.kind === 'pin'}
										<span class="where">{c.slot}</span>
										<span class="was">{pinText(c.before)}</span> → <span class="now">{pinText(c.after)}</span>
									{:else}
										<span class="where">{c.config}{#each c.path as k}<span class="muted"> › </span>{k}{/each}</span>
										<div class="vals"><pre class="was">{valueText(c.before)}</pre><pre class="now">{valueText(c.after)}</pre></div>
									{/if}
								</li>
							{/each}
						</ol>
					{/if}
				</div>
			{:else if docReview}
				{@const r = docReview}
				<div class="sandbox-review">
					<p>
						{#if r.doc?.open}<a class="btn small" href={r.doc.open} target="_blank" rel="noopener">Open {r.doc.label} as it would be</a>{/if}
						{#if r.doc?.group}<span class="muted small"> What every agent is taught ({r.doc.what}s / {r.doc.group}): accepted, it is taught from the next request on.</span>{/if}
						{#if r.moved}<span class="muted small"> It was seeded from v{r.seedNumber}; the {r.doc?.what ?? 'document'} has a newer version since. Accepting merges it where the two touch different fields, and archives it where they touch the same.</span>{/if}
					</p>
					<Changes changes={r.changes} edits={r.edits} seed={r.seedNumber} heading={p.status === 'accepted' ? 'What it changed' : 'What it changes'} />
				</div>
			{:else if storyReview}
				<div class="story-review">
					{#if reviewError}<p class="error">{reviewError}</p>
					{:else}
						<div class="story-play"><StoryPlayer story={storyReview.story} compact /></div>
						<div class="story-diff">
							<h3>{storyReview.baseStory ? `Changes from v${storyReview.baseStory.number}` : 'A new story'}</h3>
							<StoryChanges diff={storyReview.diff} fresh={!storyReview.baseStory} links={{ ...storyReview.baseStory?.links, ...storyReview.story.links }} />
							<Changes edits={storyReview.edits} />
						</div>
					{/if}
				</div>
			{:else}
			<div class="review-body" class:split={showSource}>
				<div class="built">
					{#if reviewError}<p class="error">{reviewError}</p>
					{:else if !review}<p class="muted">Reading it…</p>
					{:else}
						{#if review.builds.length > 1}
							<div class="tabs">{#each review.builds as b (b.hash)}<button class="btn small" class:ghost={shown !== b.hash} onclick={() => (shown = b.hash)}>{b.variant ?? b.label}</button>{/each}</div>
						{/if}
						{#if shown}
							<div class="stage">
								{#key shown}
									{#if p.grp === 'worlds'}
										{#await worldViewer then { default: WorldStage }}
											<WorldStage source={catalogSource} engine={INDEX.engine} hash={shown} />
										{/await}
									{:else}
										{#await viewer then { default: VaultAsset }}
											<VaultAsset source={catalogSource} hash={shown} title="{p.label} v{p.number} (proposed)" fill />
										{/await}
									{/if}
								{/key}
							</div>
						{/if}
						<p class="muted small">Built in the asset box: a sandboxed frame with no origin, running the frozen engine in a worker, with no network, no storage and no access to this page.</p>
						<!-- what else it changes (its source is beside it, a button away) and the edits it was made in -->
						<Changes changes={review.changes} edits={review.edits} seed={review.seedNumber} skip={['$.source']} />
					{/if}
				</div>
				{#if showSource && review}
					<div class="code">
						<div class="codebar">
							{#if diff}<button class="btn small ghost" onclick={() => (changes = !changes)}>{changes ? 'Whole file' : `Changes from v${review.baseVersion?.number}`}</button>{/if}
							{#if !review.baseVersion?.source && review.baseVersion}<span class="muted small">v{review.baseVersion.number} has no source to compare (imported)</span>{/if}
						</div>
						{#if diff && changes}
							<pre class="src">{#each diff as l, i (i)}<span class={l.op}>{l.op === 'add' ? '+ ' : l.op === 'del' ? '- ' : l.op === 'skip' ? '' : '  '}{l.text}
</span>{/each}</pre>
						{:else}
							<pre class="src">{code || 'Reading it…'}</pre>
						{/if}
					</div>
				{/if}
			</div>
			{/if}
			<!-- read only: what the work changes; only its intent is decided, in the intent's dialog (Samuel 2026-11-07) -->
			{#if review}
			<footer class="decide">
				<button class="btn small ghost" class:on={showSource} onclick={() => (showSource = !showSource)}>{showSource ? 'Hide source' : review.source ? 'Source' : 'Recipe file'}</button>
			</footer>
			{/if}
		</div>
	{/if}
{/if}
</div>

<style>
	/* the board as tall as the modal it is in: its title and the columns' headers stay, each column scrolls its own
	   cards, the board sideways on a narrow screen (Samuel 2026-11-04); what is opened on it covers it, inside the modal */
	.intents { position: relative; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; padding: 1rem 1rem 0.8rem; }
	.head { flex: 0 0 auto; display: flex; gap: 1rem; align-items: center; justify-content: space-between; margin-bottom: 0.7rem; }
	.head h1 { margin: 0; font-size: clamp(1.6rem, 3.5vw, 2.2rem); }
	.head .close { flex: 0 0 auto; }
	@media (max-width: 640px) { .head { margin-bottom: 0.6rem; } .intents { padding: 0.8rem 0.7rem 0.6rem; } }
	.board { flex: 1 1 auto; min-height: 0; display: grid; grid-auto-flow: column; gap: 0.7rem; overflow-x: auto; align-items: stretch; }
	.column { background: color-mix(in srgb, var(--paper, #f6f1e6) 70%, transparent); border-radius: 14px; padding: 0.7rem 0.6rem 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; min-height: 0; }
	.column h2 { flex: 0 0 auto; margin: 0; font-size: 0.95rem; min-height: 1.5rem; }
	/* its header folds it away to a strip, its name down the strip, and opens it again */
	.fold { all: unset; box-sizing: border-box; cursor: pointer; width: 100%; display: flex; align-items: center; gap: 0.4rem; padding: 0.1rem 0.2rem; border-radius: 8px; }
	.fold:hover { background: color-mix(in srgb, var(--ink, #26382c) 6%, transparent); }
	.fold:focus-visible { outline: 2px solid var(--mustard); }
	.fold::after { content: '‹'; margin-left: auto; color: var(--muted); font-size: 1rem; line-height: 1; }
	.column.folded { padding: 0.7rem 0.25rem; cursor: pointer; }
	.column.folded h2 { flex: 1 1 auto; }
	.column.folded .fold { height: 100%; flex-direction: column; justify-content: flex-start; gap: 0.5rem; padding: 0.2rem 0; }
	.column.folded .fold::after { content: '›'; margin: 0; order: -1; }
	.column.folded .name { writing-mode: vertical-rl; }
	.cards { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 0.4rem; padding: 0.1rem 0.1rem 0.4rem; }
	/* each card keeps its own height; the column scrolls (a card that clips would otherwise be squeezed to fit) */
	.cards > :global(*) { flex: 0 0 auto; }
	.count { font-size: 0.75rem; font-weight: 600; padding: 0 0.5em; border-radius: 999px; background: var(--card, #fff); }
	.card { padding: 0; overflow: hidden; }
	.open { all: unset; box-sizing: border-box; cursor: pointer; display: grid; gap: 0.3rem; padding: 0.5rem 0.65rem; width: 100%; }
	.open:hover { background: color-mix(in srgb, var(--sage, #8fae8b) 10%, transparent); }
	.open:focus-visible { outline: 2px solid var(--ink, #222); outline-offset: -2px; }
	.title { font-weight: 600; font-size: 0.9rem; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
	.meta { font-size: 0.78rem; color: var(--muted, #777); }
	.card .meta { display: flex; align-items: center; gap: 0.35rem; min-width: 0; }
	.avatar { flex: 0 0 auto; display: grid; place-items: center; width: 1.35rem; height: 1.35rem; border-radius: 50%; background: #c8744f; color: #fff; font-size: 0.62rem; font-weight: 700; }
	.author { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.date { margin-left: auto; white-space: nowrap; }
	.gist { font-size: 0.85rem; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
	.empty { margin: 0.2rem; font-size: 0.85rem; }
	.type { display: inline-block; padding: 0 0.45em; border-radius: 999px; background: var(--mustard-soft); color: var(--ink); font-size: 0.72rem; font-weight: 600; white-space: nowrap; }
	.type[data-type='Building'], .type[data-type='World'], .type[data-type='Sandbox'] { background: color-mix(in srgb, var(--terracotta, #c4673f) 22%, transparent); }
	.type[data-type='Plant'], .type[data-type='Biome'] { background: color-mix(in srgb, var(--sage, #8fa67a) 30%, transparent); }
	.type[data-type='Story'] { background: color-mix(in srgb, var(--ink, #1f3a2c) 14%, transparent); }
	.via { display: inline-block; padding: 0 0.45em; border-radius: 999px; background: var(--mustard-soft); color: var(--ink); font-size: 0.72rem; font-weight: 600; }
	/* an intent's kind its colour, the card of one added over MCP (not only a proposal's) marked with it down its left edge */
	[data-kind='idea'] { --kind: var(--mustard, #efb54d); }
	[data-kind='fix'] { --kind: var(--terracotta, #c8744f); }
	[data-kind='improve'] { --kind: var(--sage, #a8b88a); }
	.type[data-kind] { background: color-mix(in srgb, var(--kind) 35%, transparent); }
	.card.item { border-left: 4px solid var(--kind); }
	.for { font-size: 0.76rem; color: var(--ink-soft, #4d5d51); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.for.done { color: var(--brand-green, #24452f); font-weight: 600; }
	.for.ship { font-weight: 600; color: var(--brand-green, #24452f); }
	.for.ship.running::before { content: '● '; color: var(--mustard, #efb54d); }
	.for.ship.red { color: #9c3b22; }
	.for.ship.red::before { content: '✗ '; }
	/* Ship: its way to production, step by step, live; a red ship's report */
	.pill.shipping { background: color-mix(in srgb, var(--mustard, #efb54d) 35%, transparent); }
	.ship, .ship-report { padding: 0.7rem 0.9rem; border-radius: 12px; border: 1px solid var(--line, #dcd5c4); background: var(--card, #fff); }
	.ship h3, .ship-report h3 { margin: 0 0 0.4rem; }
	.ship h3 .small { font-weight: 400; margin-left: 0.3rem; }
	.steps-live { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.25rem; }
	.steps-live li { display: grid; grid-template-columns: 1.4rem minmax(0, auto) 1fr auto; gap: 0.5rem; align-items: center; font-size: 0.88rem; }
	.steps-live .mark { width: 1.4rem; height: 1.4rem; display: grid; place-items: center; border-radius: 50%; font-weight: 700; font-size: 0.8rem; background: var(--paper, #f6f1e6); color: var(--muted, #777); }
	.steps-live li[data-state='green'] .mark { background: color-mix(in srgb, var(--sage, #8fae8b) 45%, transparent); color: var(--brand-green, #24452f); }
	.steps-live li[data-state='red'] .mark { background: color-mix(in srgb, var(--terracotta, #c8744f) 30%, transparent); color: #9c3b22; }
	.steps-live li[data-state='running'] .mark { background: color-mix(in srgb, var(--mustard, #efb54d) 40%, transparent); color: var(--ink, #1f2a22); animation: beat 1.2s ease-in-out infinite; }
	.steps-live li[data-state='queued'] .name { color: var(--muted, #777); }
	@keyframes beat { 50% { opacity: 0.45; } }
	@media (prefers-reduced-motion: reduce) { .steps-live li[data-state='running'] .mark { animation: none; } }
	.ship-report { border-color: color-mix(in srgb, var(--terracotta, #c8744f) 60%, transparent); background: color-mix(in srgb, var(--terracotta, #c8744f) 8%, var(--card, #fff)); }
	.ship-report p { margin: 0 0 0.4rem; }
	.ship-report .log { margin: 0 0 0.4rem; max-height: 16rem; overflow: auto; padding: 0.5rem 0.65rem; border-radius: 8px; background: #1f2a22; color: #e9efe6; font-size: 0.72rem; line-height: 1.4; white-space: pre-wrap; overflow-wrap: anywhere; }
	/* an intent opened: a panel in the middle of the screen over a scrim, not the whole screen a version's build takes */
	.scrim { all: unset; position: absolute; inset: 0; z-index: 9; border-radius: inherit; background: rgb(38 56 44 / 0.28); }
	.review.item-review { inset: auto; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(48rem, calc(100% - 1rem)); max-height: calc(100% - 1rem); gap: 0.7rem; padding: 1rem 1.1rem 0.8rem; }
	/* its header and its decision stay; what is between them scrolls */
	.item-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 0.7rem; }
	.item-review .tags { margin: 0 0 0.3rem; display: flex; gap: 0.35rem; align-items: center; }
	.item-review .review-head h2 { font-size: 1.35rem; }
	/* an intent's note and its spec, as Markdown */
	.md { font-size: 0.92rem; line-height: 1.5; overflow-wrap: anywhere; }
	.md :global(:first-child) { margin-top: 0; }
	.md :global(:last-child) { margin-bottom: 0; }
	.md :global(ul), .md :global(ol) { padding-left: 1.3rem; }
	.md :global(pre) { white-space: pre-wrap; background: var(--paper, #faf8f2); padding: 0.5rem 0.7rem; border-radius: 8px; }
	.spec { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: 0.8rem; padding: 0.8rem 0.9rem; border-radius: 12px; background: color-mix(in srgb, var(--sage, #a8b88a) 16%, var(--paper, #faf8f2)); border: 1px solid color-mix(in srgb, var(--sage, #a8b88a) 45%, transparent); }
	/* its checks, the whole width of the spec: each its mark (✓ passed, ✗ failed, · no result yet), its statement, how and
	   by what it is checked, and its last result's evidence */
	.checks-wrap, .step { grid-column: 1 / -1; }
	h3.step { margin: 0.2rem 0 -0.4rem; padding-top: 0.6rem; border-top: 1px solid color-mix(in srgb, var(--sage, #a8b88a) 45%, transparent); }
	.step h3 .small { font-weight: 400; margin-left: 0.3rem; }
	.checks-wrap h3 .small { font-weight: 400; margin-left: 0.3rem; }
	.checks { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.35rem; }
	.checks li { display: flex; gap: 0.55rem; align-items: flex-start; padding: 0.45rem 0.6rem; border-radius: 10px; background: var(--card, #fff); border: 1px solid var(--line, #dcd5c4); }
	.checks li.pass { border-color: color-mix(in srgb, var(--sage, #8fae8b) 70%, transparent); }
	.checks li.fail { border-color: color-mix(in srgb, var(--terracotta, #c8744f) 60%, transparent); }
	.checks .mark { flex: 0 0 1.4rem; height: 1.4rem; display: grid; place-items: center; border-radius: 50%; font-weight: 700; font-size: 0.8rem; background: var(--paper, #f6f1e6); color: var(--muted, #777); }
	.checks li.pass .mark { background: color-mix(in srgb, var(--sage, #8fae8b) 45%, transparent); color: var(--brand-green, #24452f); }
	.checks li.fail .mark { background: color-mix(in srgb, var(--terracotta, #c8744f) 30%, transparent); color: #9c3b22; }
	.checks .what { min-width: 0; flex: 1 1 auto; }
	.checks .what p { margin: 0; font-size: 0.88rem; overflow-wrap: anywhere; }
	.checks .what p + p { margin-top: 0.15rem; }
	.cid { font-family: ui-monospace, monospace; font-size: 0.76rem; color: var(--muted, #777); margin-right: 0.15rem; }
	.how { font-weight: 600; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.04em; }
	.evidence { white-space: pre-line; color: var(--ink-soft, #4d5d51); }
	/* a check's run, the command that decides it, and where its last result ran (avenBOX, or main @ its commit) */
	.checks code.run { display: block; margin-top: 0.2rem; padding: 0.25rem 0.45rem; border-radius: 6px; background: var(--paper, #f6f1e6); font-family: ui-monospace, monospace; font-size: 0.74rem; line-height: 1.4; white-space: pre-wrap; overflow-wrap: anywhere; color: var(--ink, #1f2a22); }
	.where { display: inline-block; padding: 0 0.4em; border-radius: 999px; font-size: 0.68rem; font-weight: 600; background: var(--paper, #f6f1e6); color: var(--muted, #777); white-space: nowrap; }
	.where.main { background: color-mix(in srgb, var(--sage, #8fae8b) 40%, transparent); color: var(--brand-green, #24452f); }
	.pill.nice { font-size: 0.68rem; padding: 0 0.45em; }
	.pill.pass { background: color-mix(in srgb, var(--sage, #8fae8b) 40%, transparent); }
	/* a proposal's review: its intent's checks as one strip of marks */
	.gate { margin: 0.25rem 0 0; display: flex; flex-wrap: wrap; gap: 0.3rem; }
	.chk { padding: 0 0.5em; border-radius: 999px; font-size: 0.72rem; font-weight: 600; background: var(--paper, #f6f1e6); color: var(--muted, #777); white-space: nowrap; }
	.chk.pass { background: color-mix(in srgb, var(--sage, #8fae8b) 40%, transparent); color: var(--brand-green, #24452f); }
	.chk.fail { background: color-mix(in srgb, var(--terracotta, #c8744f) 25%, transparent); color: #9c3b22; }
	.spec.none { display: block; background: var(--paper, #faf8f2); border-style: dashed; border-color: var(--line, #dcd5c4); }
	.item-review h3 { margin: 0 0 0.4rem; font-size: 1rem; }
	.item-review section > p { margin: 0 0 0.4rem; }
	.linked { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.3rem; }
	.linked .open { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.55rem; border-radius: 10px; background: var(--paper, #faf8f2); border: 1px solid var(--line, #dcd5c4); font-size: 0.88rem; }
	.linked .what { flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
	.linked .date { font-size: 0.76rem; white-space: nowrap; }
	@media (max-width: 520px) { .linked .date { display: none; } }

	.brief { margin: 0 0 0.5rem; padding: 0.6rem 0.75rem; border-radius: 10px; background: var(--paper, #faf8f2); border: 1px solid var(--line, #dcd5c4); font-size: 0.8rem; line-height: 1.45; white-space: pre-wrap; word-break: break-word; user-select: all; }
	.link { all: unset; cursor: pointer; text-decoration: underline; font-weight: 600; color: var(--brand-green, #24452f); }
	.link:focus-visible { outline: 2px solid var(--mustard); }
	/* reviewing one: nearly the whole screen, the build as large as it can be */
	.review { position: absolute; inset: 0.4rem; z-index: 10; background: var(--bg, #fbf8f2); border-radius: 16px; box-shadow: 0 20px 60px rgb(0 0 0 / 0.25); display: flex; flex-direction: column; padding: 0.8rem 1rem 0.6rem; gap: 0.4rem; overflow: hidden; }
	.review-head { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; align-items: flex-start; }
	/* ‹ Intents: back to the board from what is open on it; a tap's height (44 px), drawn as a quiet link */
	.to-board { all: unset; box-sizing: border-box; cursor: pointer; display: inline-flex; align-items: center; min-height: 44px; margin: -0.65rem 0 -0.35rem -0.45rem; padding: 0 0.6rem 0 0.45rem; border-radius: 10px; font-size: 0.88rem; font-weight: 600; color: var(--ink-soft, #4d5d51); }
	.to-board:hover { background: color-mix(in srgb, var(--ink, #26382c) 6%, transparent); color: var(--ink, #1f2a22); }
	.to-board:focus-visible { outline: 2px solid var(--ink, #222); outline-offset: -2px; }
	.review-head h2 { margin: 0; font-size: 1.3rem; display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
	.review-head .meta { margin: 0.15rem 0 0; }
	/* the decision at the foot of what is open, in its middle (Samuel 2026-11-05): Reject on the left, reddish, Accept
	   (or Done) on the right, the rest between */
	/* a refused decision's reason, at the foot: at most four lines, then it scrolls */
	.refused { flex: 0 0 auto; margin: 0; padding: 0.45rem 0.7rem; border-radius: 10px; font-size: 0.85rem; line-height: 1.4; max-height: 5.6em; overflow-y: auto; overflow-wrap: anywhere; color: #9c3b22; background: color-mix(in srgb, var(--terracotta, #c8744f) 12%, var(--card, #fff)); border: 1px solid color-mix(in srgb, var(--terracotta, #c8744f) 45%, transparent); }
	.decide { flex: 0 0 auto; display: flex; justify-content: center; align-items: center; gap: 0.5rem; flex-wrap: wrap; padding: 0.6rem 0 0.1rem; border-top: 1px solid var(--line, #dcd5c4); }
	.decide .btn { min-width: 6.2rem; justify-content: center; }
	@media (max-width: 520px) { .decide { flex-wrap: nowrap; gap: 0.35rem; } .decide .btn { min-width: 0; flex: 1 1 0; padding-inline: 0.4em; } }
	.btn.reject { background: color-mix(in srgb, var(--terracotta, #c8744f) 14%, transparent); color: #9c3b22; border-color: color-mix(in srgb, var(--terracotta, #c8744f) 55%, transparent); }
	.btn.reject:hover { background: color-mix(in srgb, var(--terracotta, #c8744f) 26%, transparent); filter: none; }
	.btn.on { background: var(--ink, #222); color: var(--bg, #fff); }
	.note { flex: 0 0 auto; }
	.note p { margin: 0; font-size: 0.88rem; white-space: pre-line; }
	.note.folded p { display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
	.note:not(.folded) { max-height: 30vh; overflow: auto; }
	.more { all: unset; flex: 0 0 auto; cursor: pointer; font-size: 0.8rem; font-weight: 600; text-decoration: underline; width: fit-content; }
	.review-body { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.8rem; }
	.review-body.split { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); }
	@media (max-width: 900px) { .review-body.split { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 3fr) minmax(0, 2fr); } }
	/* the build as large as there is room for, and never squeezed by what follows it (Samuel 2026-11-05: on a pad seven
	   steps squeezed it to a strip): the steps scroll below it */
	.built { min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 0.3rem; }
	.stage { flex: 1 0 auto; min-height: clamp(16rem, 58dvh, 42rem); display: flex; flex-direction: column; }
	.stage > :global(*) { flex: 1 1 auto; min-height: 0; }
	.tabs { display: flex; gap: 0.4rem; flex-wrap: wrap; }
	.code { min-height: 0; display: flex; flex-direction: column; gap: 0.4rem; }
	.codebar { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; }
	.src { flex: 1 1 auto; min-height: 0; overflow: auto; margin: 0; padding: 0.8rem; border-radius: 10px; background: var(--paper, #f6f1e6); font-size: 0.78rem; line-height: 1.45; white-space: pre; }
	.src .add { background: color-mix(in srgb, var(--sage, #8fae8b) 30%, transparent); display: block; }
	.src .del { background: color-mix(in srgb, var(--terracotta, #c96f53) 25%, transparent); display: block; }
	.src .same { display: block; opacity: 0.7; }
	.src .skip { display: block; opacity: 0.5; font-style: italic; padding: 0.2rem 0; }
	.small { font-size: 0.8rem; }
	/* a story's proposal: its timeline played, beside what changed against the head */
	.story-review { flex: 1 1 auto; min-height: 0; overflow: auto; display: grid; grid-template-columns: minmax(0, 3fr) minmax(16rem, 2fr); gap: 1rem; align-items: start; }
	.story-diff { min-width: 0; }
	.story-diff h3 { margin: 0 0 0.5rem; font-size: 1rem; }
	@media (max-width: 1000px) { .story-review { grid-template-columns: minmax(0, 1fr); } }
	/* a sandbox's change: each edit, before and after */
	.sandbox-review { flex: 1 1 auto; min-height: 0; overflow: auto; }
	.sandbox-review h3 { margin: 0.4rem 0 0.5rem; font-size: 1rem; }
	.changes { margin: 0; padding-left: 1.4rem; display: grid; gap: 0.55rem; font-size: 0.88rem; }
	.changes .where { font-weight: 600; margin-right: 0.5rem; }
	.changes .was { color: var(--muted, #777); text-decoration: line-through; text-decoration-color: color-mix(in srgb, var(--terracotta, #c96f53) 70%, transparent); }
	.changes .now { font-weight: 600; }
	.vals { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: 0.4rem; margin-top: 0.25rem; }
	.vals pre { margin: 0; padding: 0.45rem 0.6rem; border-radius: 8px; background: var(--paper, #f6f1e6); font-size: 0.76rem; white-space: pre-wrap; max-height: 14rem; overflow: auto; }
	.vals pre.was { text-decoration: none; background: color-mix(in srgb, var(--terracotta, #c96f53) 14%, transparent); }
	.vals pre.now { font-weight: 400; background: color-mix(in srgb, var(--sage, #8fae8b) 22%, transparent); }
</style>
