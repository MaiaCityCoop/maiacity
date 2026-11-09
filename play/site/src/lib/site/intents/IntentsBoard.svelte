<!--
	INTENTS, AS A BOARD (Samuel 2026-11-03; the proposals' board until 2026-11-06) — every intent of Maia City's as a card in its column,
	newest first. A card opened is reviewed over the whole board: the version built in the asset box as large as it can
	be, what it says of itself folded to two lines, its source (beside its base's, as the lines that changed) a button
	away. Admins decide here; nothing is proposed or edited here: versions come over MCP only (play/api/src/mcp.ts).

	A MODAL, NOT A PAGE (Samuel 2026-11-05): the board opens from the nav pill's star over whatever page is open
	(./IntentsModal.svelte), the way back closing first what is open on it (a review, an intent), then the board.

	INTENTS (Samuel 2026-11-06, play/SPEC.md §4.12): every card is an intent, something Maia City wants made, fixed or
	improved, in its stage's column: Idea → Specify → Build → Proposal → Ship → Accepted (or Archived), Accepted and
	Archived folded at first. Agents add and specify intents over MCP (never typed in here): a spec is a goal, a scope and checks,
	each one statement that passes or fails, checked by a test, a measure or a look, must or nice. Here an admin approves
	a spec (Specify → Build), and an agent builds it, recording each check's result, until every must check passes:
	then it moves to Proposal by itself (Samuel 2026-11-06), the one gate after the spec, where an admin decides it.

	ONE RECORD (Samuel 2026-11-06: "not a proposal belongs to an intent: the intent has a state, proposal"): an intent's
	work (an asset's, story's, factory's, config's, skill's or sandbox layout's version) is on the intent itself, and
	Proposal is only its stage. Only a whole intent is decided, in its dialog (Samuel 2026-11-07): its Accept applies all its work,
	its Reject archives it; its work's review, opened from it, is read only. No work without an intent (intent 706ed873):
	every intent with work has an approved spec, so every intent opens its dialog. Nothing is accepted from Build.

	SUB-STATES (Samuel 2026-11-07, play/api/src/substate.ts): every open card is failed, waiting, working or idle, its
	reason its one status line, each column grouped under those dividers; Approve spec and Accept only on a waiting one.

	ACCEPT SHIPS IT (Samuel 2026-11-06, play/api/src/ship.ts): code's Accept ("Accept and ship") puts it in Ship, where
	it waits its turn, then play merges it and its way to production shows live (merged, main's checks, the release, the
	deploy's jobs, each with its link), read again every 3 s while any ships. All green, it is Accepted; a red step
	brings it back to Proposal with the report atop its dialog, and Accept there ships it again.

	THE DETAIL, BY STAGE (intent bb3b0773, Samuel 2026-11-07): an intent opened is ./IntentDetail.svelte, on top what its
	stage asks of a person and its one decision, the rest in tabs, as ./detail.ts's detailOf says; the board holds the board.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { isAdmin } from '$lib/session.svelte';
	import { wayBack } from '$lib/site/app/back.svelte.js';
	import { intentsModal } from '../app/intents.svelte';
	import { initialsOf, shortWhen } from '$lib/format';
	import IntentDetail from './IntentDetail.svelte';
	import WorkReview, { type Opened } from './WorkReview.svelte';
	import { vaultViewer, worldViewer } from './BuildView.svelte';
	import { createDecider, type Verdict } from './decide';
	import { createOpened, type Listed } from './opened';
	import { notLive, type Intent } from './detail';
	import { kindName, typeOf } from './names';
	import { bySub, CLOSED, columnOf, EMPTY, isClosed, loadOpen, loadPage, type ClosedStage, type Paged } from './board';

	// the viewers a review draws its build in, loaded as the board opens
	vaultViewer();
	worldViewer();

	/** how the board is closed (the modal's ×, Escape with nothing open on it) */
	let { onclose }: { onclose?: () => void } = $props();
	// admins only for now (Samuel 2026-11-02): the nav pill's star is greyed out for everyone else
	const admin = $derived(isAdmin());

	const COLUMNS = [
		['idea', 'Idea'],
		['specify', 'Specify'],
		['build', 'Build'],
		['proposal', 'Proposal'],
		['ship', 'Ship'],
		['accepted', 'Accepted'],
		['archived', 'Archived']
	] as const;
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
		// Accepted and Archived are fetched only once unfolded (intent 2cb70fb8)
		if (!folded[s] && isClosed(s) && !paged[s]?.loaded) more(s);
	}
	const columnsTemplate = $derived(COLUMNS.map(([s]) => (folded[s] ? '2.6rem' : 'minmax(14rem, 1fr)')).join(' '));
	let intents = $state<Intent[]>([]);
	let loaded = $state(false);
	let error = $state('');
	// THE BOARD OPENS FAST (intent 2cb70fb8, ./board.ts): the open columns whole and every column's count in one
	// request; Accepted and Archived only once unfolded, a page at a time
	let counts = $state<Record<string, number>>({});
	let paged = $state<Partial<Record<ClosedStage, Paged & { busy?: boolean }>>>({});
	const load = async () => {
		try {
			const before = new Set(intents.filter((i) => !isClosed(i.stage)).map((i) => i.id));
			const r = await loadOpen<Intent>(api, intents);
			intents = r.cards;
			counts = r.counts;
			error = '';
			// an open one gone from the open columns (shipped, decided elsewhere): the loaded closed columns' first pages again
			const still = new Set(r.cards.filter((i) => !isClosed(i.stage)).map((i) => i.id));
			if ([...before].some((id) => !still.has(id) && !intents.some((i) => i.id === id)))
				for (const s of CLOSED) if (paged[s]?.loaded) await more(s, true);
		} catch (e) {
			error = (e as Error).message;
		}
		loaded = true;
	};
	/** a closed column's next page (its first, the first time; with `fresh`, its first again for what is new) */
	async function more(s: ClosedStage, fresh = false) {
		const was = paged[s] ?? null;
		if (was?.busy) return;
		paged = { ...paged, [s]: { loaded: false, next: null, ...was, busy: true } };
		try {
			const r = await loadPage<Intent>(api, intents, s, was, fresh);
			intents = r.cards;
			paged = { ...paged, [s]: r.paged };
		} catch (e) {
			error = (e as Error).message;
			paged = { ...paged, [s]: was ?? undefined };
		}
	}
	onMount(async () => {
		if (!admin) return;
		api<{ id: string; label: string }[]>('/docs?kind=schema').then((l) => (schemaNames = new Map(l.map((x) => [x.id, x.label]))), (e) => (error = `The schemas' names could not be read: ${(e as Error).message}`));
		await load();
		for (const s of CLOSED) if (!folded[s]) more(s);
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
	// ---- Accept ships it (play/api/src/ship.ts): an intent of code, its pull request named, merged by its Accept
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
	/** the work of intent `i`, opened for review */
	const cardOf = (i: Intent): Opened => ({ ...i.work!, id: i.id, intent_id: i.id, intent_title: i.title, intent_spec: i.spec, intent_results: i.results });
	/** a note's first line, for its card */
	const gist = (s: string) => (s ?? '').split('\n')[0];

	/** an intent's tag: what its work is (a plant, a story …) where it has some, else its kind */
	const tagOf = (i: Intent) => (i.work ? typeOf(i.work) : kindName(i.kind));
	/** the schemas' labels by their UUIDs, to name an intent's declared work (only shown) */
	let schemaNames = $state<Map<string, string>>(new Map());
	/** what a rule decided of an intent, in a line (its card's Auto mark) */
	const autoTitle = (i: Intent) =>
		[i.auto?.approve ? `Spec approved by rule ${i.auto.approve.label}` : '', i.auto?.accept ? `Accepted by rule ${i.auto.accept.label}` : ''].filter(Boolean).join(' · ');
	// every document its work changes, and the intent itself, read once (intent 2df30a21: ./opened.ts), for the review and
	// the detail alike
	const opened = createOpened((path) => api<any>(path));
	// the work opened for review over the board, on the document picked first (./WorkReview.svelte)
	let open = $state<Opened | null>(null);
	let openFocus = $state<Listed | undefined>(undefined);
	function openCard(p: Opened, focus?: Listed) {
		intent = null;
		openFocus = focus;
		open = p;
	}
	const close = () => (open = null);
	// ---- an intent opened: its spec and checks, its work a click away, the brief that sends an agent to it, and the
	// admin's decision
	let intent = $state<Intent | null>(null);
	let intentError = $state('');
	/** an intent as the board holds it, else as play reads it */
	const intentOf = async (id: string) => intents.find((x) => x.id === id) ?? (await api<Intent>(`/intents/${id}`));
	/** the intent a proposal was made for, from its review */
	async function openIntentOf(id: string) {
		try {
			openIntentDialog(await intentOf(id));
		} catch (e) {
			error = (e as Error).message;
		}
	}
	/** the intent's own dialog (its spec, checks and work), even where it is only its work */
	const depsTitle = (i: Intent) => [i.depends_on?.length ? `Waits for: ${i.depends_on.map((d) => d.title).join(', ')}.` : '', i.needed_by?.length ? `Needed by: ${i.needed_by.map((d) => d.title).join(', ')}.` : ''].filter(Boolean).join(' ')
	async function openIntentDialog(i: Intent) {
		open = null;
		intent = i;
		intentError = '';
	}
	const closeIntent = () => {
		intent = null;
		intentError = '';
	};
	/** the decision on its way (intent 2df30a21): one at a time, its button saying so for every intent, its answer or the
	 *  reason it failed said where the button is; where play gives no answer, the intent read again until it is decided */
	let busy = $state<{ id: string; verdict: Verdict } | null>(null);
	const decider = createDecider<Intent>({
		post: (id, verdict) => api<Intent & { message?: string }>(`/intents/${id}/${verdict}`, { method: 'POST' }),
		read: (id) => api<Intent>(`/intents/${id}`),
		onchange: (b) => (busy = b)
	});
	const busyOn = (id: string | undefined) => (busy && busy.id === id ? busy.verdict : null);
	/** a decision taken on the work's review: the intent's own, and the review closes once it is taken */
	async function decideWork(id: string, verdict: Verdict) {
		intentError = '';
		try {
			const r = await decider.decide(await intentOf(id), verdict);
			if (!r) return;
			error = r.message;
			intents = intents.map((x) => (x.id === r.intent.id ? r.intent : x));
			if (open?.intent_id === id) open = null;
			load();
		} catch (e) {
			intentError = (e as Error).message;
		}
	}
	async function decideIntent(id: string, verdict: Verdict) {
		intentError = '';
		try {
			// accepted, its work is applied (or archived, where its base moved and the two touch the same field: why, here)
			const r = await decider.decide(intent?.id === id ? intent : await intentOf(id), verdict);
			if (!r) return;
			error = r.message;
			intents = intents.map((x) => (x.id === r.intent.id ? r.intent : x));
			load();
			if (intent?.id !== id) return;
			// shipped: the dialog stays, its way to production ticking
			if (r.intent.stage === 'ship') intent = r.intent;
			else closeIntent();
		} catch (e) {
			if (intent?.id === id) intentError = (e as Error).message;
			else error = (e as Error).message;
		}
	}

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
			<a class="btn small ghost delivery" href="/delivery/" title="Where the intents' time goes: each stage, CI, the budgets">Delivery</a>
			{#if onclose}<button class="btn small ghost close" onclick={onclose} aria-label="Close the intents" title="Close (Esc)">Close</button>{/if}
		</header>
		{#if error}<p class="error">{error}</p>{/if}
		<div class="board" style:grid-template-columns={columnsTemplate}>
			{#each COLUMNS as [s, name] (s)}
				{@const cards = columnOf(intents, s)}
				<!-- the column's header stays; only its cards scroll (Samuel 2026-11-04); a column folds away to a strip -->
				<section class="column" class:folded={folded[s]} data-status={s}>
					<h2>
						<button class="fold" onclick={() => fold(s)} aria-expanded={!folded[s]} title={folded[s] ? `Open ${name}` : `Fold ${name} away`}>
							<span class="name">{name}</span> <span class="count">{isClosed(s) ? (counts[s] ?? cards.length) : cards.length}</span>
						</button>
					</h2>
					{#if !folded[s]}
						<!-- a closed column scrolled near its end loads its next page -->
						<div class="cards" onscroll={isClosed(s) ? (e) => { const c = e.currentTarget; if (paged[s]?.next && !paged[s]?.busy && c.scrollTop + c.clientHeight > c.scrollHeight - 200) more(s); } : undefined}>
							{#each bySub(cards) as g (g.k)}
							{#if g.k}<h3 class="sub" data-sub={g.k}>{g.name} <span class="count">{g.cards.length}</span></h3>{/if}
							{#each g.cards as i (i.id)}
								<!-- an intent: its title, its sub-state and why, who it is by, its type and its date -->
								<article class="card item" class:held={!!i.held_by?.length} data-kind={i.kind}>
									<button class="open" onclick={() => openIntentDialog(i)} title={i.note ? gist(i.note) : undefined}>
										<span class="title">{i.title}</span>
										{#if notLive(i) || i.sub}<span class="for" data-sub={notLive(i) ? 'failed' : i.sub?.state} title={notLive(i) || i.sub?.why}>{notLive(i) || i.sub?.why}</span>{/if}
										<span class="meta">
											<span class="avatar" aria-hidden="true">{initialsOf(i.author)}</span>
											<span class="author">{i.author ?? 'someone'}</span>
											<span class="type" data-type={tagOf(i)} data-kind={i.work ? undefined : i.kind} title={i.via === 'mcp' ? `${tagOf(i)} · by an agent working for them over MCP` : tagOf(i)}>{tagOf(i)}</span>
											{#if i.auto?.approve || i.auto?.accept}<span class="auto" title={autoTitle(i)}>Auto</span>{/if}
											<span class="date">{shortWhen(i.decided_at ?? i.created)}</span>
										</span>
									</button>
									<!-- intents depend on intents: one line, Held and counts; hover names them, the dialog lists them -->
									{#if i.depends_on?.length || i.needed_by?.length}
										<button class="deps" onclick={() => openIntentDialog(i)} title={depsTitle(i)}>{#if i.held_by?.length}<span class="held-tag">Held</span>{/if}<span>{[i.depends_on?.length ? `waits for ${i.depends_on.length}` : '', i.needed_by?.length ? `needed by ${i.needed_by.length}` : ''].filter(Boolean).join(' · ')}</span></button>
									{/if}
								</article>
							{/each}
							{:else}
								<p class="empty muted">{!loaded || (isClosed(s) && !paged[s]?.loaded) ? '…' : (EMPTY[s] ?? 'None')}</p>
							{/each}
							{#if isClosed(s) && paged[s]?.next}
								<button class="more page" disabled={paged[s]?.busy} onclick={() => more(s)}>{paged[s]?.busy ? 'Loading…' : `More (${(counts[s] ?? 0) - cards.length} older)`}</button>
							{/if}
						</div>
					{/if}
				</section>
			{/each}
		</div>

	{#if intent}
		<!-- an intent opened: on top what its stage asks of a person, the rest in tabs (./IntentDetail.svelte, ./detail.ts) -->
		<IntentDetail intent={intent} cameWith={intent.came_with ? (intents.find((x) => x.id === intent!.came_with)?.title ?? null) : null} {schemaNames} {now} error={intentError} busy={busyOn(intent.id)} onclose={closeIntent} ondecide={(v) => decideIntent(intent!.id, v)} onopenwork={(d) => openCard(cardOf(intent!), d)} onopenintent={openIntentOf} />
	{/if}

	{#if open}
		<WorkReview p={open} focus={openFocus} of={intents.find((x) => x.id === open!.intent_id)} {opened} busy={busyOn(open.intent_id)} error={intentError} ondecide={(v) => decideWork(open!.intent_id, v)} onclose={close} onopenintent={openIntentOf} />
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
	.head .delivery { margin-left: auto; }
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
	.empty { margin: 0.2rem; font-size: 0.85rem; }
	.type { display: inline-block; padding: 0 0.45em; border-radius: 999px; background: var(--mustard-soft); color: var(--ink); font-size: 0.72rem; font-weight: 600; white-space: nowrap; }
	.type[data-type='Building'], .type[data-type='World'], .type[data-type='Sandbox'] { background: color-mix(in srgb, var(--terracotta, #c4673f) 22%, transparent); }
	.type[data-type='Plant'], .type[data-type='Biome'] { background: color-mix(in srgb, var(--sage, #8fa67a) 30%, transparent); }
	.type[data-type='Story'] { background: color-mix(in srgb, var(--ink, #1f3a2c) 14%, transparent); }
	/* decided by a rule, not a person (play/SPEC.md §4.12 "Auto-accept rules") */
	.auto { display: inline-block; padding: 0 0.45em; border-radius: 999px; background: color-mix(in srgb, var(--brand-green, #26382c) 18%, transparent); color: var(--ink); font-size: 0.72rem; font-weight: 600; }
	/* an intent's kind its colour, the card of one added over MCP (not only a proposal's) marked with it down its left edge */
	[data-kind='idea'] { --kind: var(--mustard, #efb54d); }
	[data-kind='fix'] { --kind: var(--terracotta, #c8744f); }
	[data-kind='improve'] { --kind: var(--sage, #a8b88a); }
	.type[data-kind] { background: color-mix(in srgb, var(--kind) 35%, transparent); }
	.card.item { border-left: 4px solid var(--kind); }
	/* intents depend on intents: a held card dimmed and marked, its links to what it waits for and what waits on it */
	.card.held { background: repeating-linear-gradient(135deg, transparent 0 8px, color-mix(in srgb, var(--muted, #777) 7%, transparent) 8px 16px), var(--card, #fff); }
	.deps { all: unset; box-sizing: border-box; display: block; width: 100%; cursor: pointer; padding: 0 0.65rem 0.5rem; font-size: 0.74rem; line-height: 1.35; color: var(--muted, #777); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.deps .held-tag { margin-right: 0.4em; }
	.held-tag { display: inline-block; padding: 0 0.5em; border-radius: 999px; background: color-mix(in srgb, #9c3b22 15%, transparent); color: #9c3b22; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.02em; }
	.for { font-size: 0.76rem; color: var(--ink-soft, #4d5d51); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	/* the sub-states: a divider over each group of a column's cards, and each card's reason in its colour */
	.sub { margin: 0.3rem 0.2rem 0; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--sub); }
	[data-sub] { --sub: var(--ink-soft, #4d5d51); }
	[data-sub='failed'] { --sub: #9c3b22; }
	[data-sub='waiting'] { --sub: var(--brand-green, #24452f); }
	.for[data-sub] { color: var(--sub); font-weight: 600; }
	.for[data-sub='failed']::before { content: '✗ '; }
	.for[data-sub='working']::before { content: '● '; color: var(--mustard, #efb54d); }
	.more.page { margin: 0.3rem auto 0; }
	.more { all: unset; flex: 0 0 auto; cursor: pointer; font-size: 0.8rem; font-weight: 600; text-decoration: underline; width: fit-content; }
</style>
