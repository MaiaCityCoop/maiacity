<!--
	PROPOSALS, AS A BOARD (Samuel 2026-11-03) — every proposed version of Maia City's assets as a card in its column,
	newest first. A card opened is reviewed over the whole board: the version built in the asset box as large as it can
	be, what it says of itself folded to two lines, its source (beside its base's, as the lines that changed) a button
	away. Admins decide here; nothing is proposed or edited here: versions come over MCP only (play/api/src/mcp.ts).

	A MODAL, NOT A PAGE (Samuel 2026-11-05): the board opens from the nav pill's star over whatever page is open
	(./ProposalsModal.svelte), the way back closing first what is open on it (a review, an item), then the board.

	ITS STAGES (Samuel 2026-11-05, play/SPEC.md §4.12): Inbox, Specify, Proposed, Accepted, Archived, each column folded
	away or open (Archived folded at first). The Inbox is what Maia City wants made, fixed or improved, as it came: added
	by agents over MCP only, never typed in here. Specify is the items specified, over MCP too: their definition, and
	their metric of what is good. What an agent proposes for a specified item names it, so the item lists its proposals
	and each proposal its item. Here an admin reads them, hands one to an agent by the brief its card gives, archives it,
	marks it done (it moves to Accepted) or brings it back.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { api, may } from '$lib/api';
	import { session } from '$lib/session.svelte';
	import { wayBack } from '$lib/site/app/back.svelte.js';
	import { markdown } from '$lib/site/markdown/index.js';
	import { admitProposed, source as catalogSource } from '$lib/content/assets/catalog.js';
	import { changesOnly, lineDiff } from '$lib/diff';
	import StoryPlayer from '$lib/stories/StoryPlayer.svelte';
	import StoryChanges, { type StoryDiff } from '$lib/stories/StoryChanges.svelte';
	import type { Story } from '$lib/stories/timeline';

	const viewer = import('$lib/content/assets/VaultAsset.svelte');

	/** how the board is closed (the modal's ×, Escape with nothing open on it) */
	let { onclose }: { onclose?: () => void } = $props();
	// admins only for now (Samuel 2026-11-02): the nav pill's star is greyed out for everyone else
	const admin = $derived(session.me?.level === 'admin');

	type P = { id: string; kind?: 'asset_version' | 'story_version' | 'sandbox_change' | 'factory_version' | 'game_config_version'; asset_id: string | null; label: string; grp: string; slug: string | null; version_label: string | null; number: number | null; changes?: number; status: string; note: string; author: string | null; decided_by: string | null; created: string; decided_at?: string | null; via?: 'web' | 'mcp'; inbox_id?: string | null; inbox_title?: string | null };
	// an item of the Inbox (play/api/src/inbox.ts): its kind, title and note, its spec once specified (its definition and
	// its metric of what is good), and the proposals made for it
	type Kind = 'idea' | 'fix' | 'improve';
	type Item = { id: string; kind: Kind; title: string; note: string; status: 'inbox' | 'specify' | 'done' | 'archived'; via: 'web' | 'mcp'; created: string; author: string | null; definition: string | null; metric: string | null; specified_at: string | null; specified_by: string | null; decided_at: string | null; decided_by: string | null; proposals: { id: string; status: string }[] };
	const KINDS: [Kind, string][] = [
		['idea', 'Idea'],
		['fix', 'Fix'],
		['improve', 'Improve']
	];
	const kindName = (k: Kind) => KINDS.find(([x]) => x === k)?.[1] ?? k;
	const COLUMNS = [
		['inbox', 'Inbox'],
		['specify', 'Specify'],
		['proposed', 'Proposed'],
		['accepted', 'Accepted'],
		['archived', 'Archived']
	] as const;
	type Column = (typeof COLUMNS)[number][0];
	// a column folded away or open, each viewer's own (kept in this browser): Archived folded at first
	const FOLDED = 'play:proposals:folded';
	let folded = $state<Record<string, boolean>>({ archived: true });
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
	let list = $state<P[]>([]);
	let items = $state<Item[]>([]);
	let loaded = $state(false);
	let error = $state('');
	const load = async () => {
		try {
			[list, items] = await Promise.all([api<P[]>('/proposals'), api<Item[]>('/inbox')]);
			error = '';
		} catch (e) {
			error = (e as Error).message;
		}
		loaded = true;
	};
	onMount(() => {
		if (admin) load();
	});
	// a column's cards: its proposals and, where an item stands at that stage, its items (an item done is accepted);
	// newest first, those decided by when they were
	type Entry = { proposal: P; item?: undefined; at: string } | { item: Item; proposal?: undefined; at: string };
	const ITEM_STAGE: Record<Item['status'], Column> = { inbox: 'inbox', specify: 'specify', done: 'accepted', archived: 'archived' };
	const inColumn = (s: string): Entry[] =>
		[
			...list.filter((p) => p.status === s).map((p) => ({ proposal: p, at: p.decided_at ?? p.created })),
			...items.filter((i) => ITEM_STAGE[i.status] === s).map((i) => ({ item: i, at: i.decided_at ?? i.created }))
		].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
	/** what has been proposed for an item, by status: "2 proposed · 1 accepted" */
	const proposedFor = (i: Item) => {
		const n: Record<string, number> = {};
		for (const p of i.proposals) n[p.status] = (n[p.status] ?? 0) + 1;
		return ['proposed', 'accepted', 'archived'].filter((s) => n[s]).map((s) => `${n[s]} ${s}`).join(' · ');
	};
	async function act(id: string, verdict: string) {
		try {
			// accepting may still archive it (its head moved and the two changes touch the same field): say why
			const r = await api<{ status: string; message?: string }>(`/proposals/${id}/${verdict}`, { method: 'POST' });
			error = r?.message ?? '';
			await load();
		} catch (e) {
			error = (e as Error).message;
		}
	}
	const deciding = $derived(may(session.me, 'decide', 'asset_version'));
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
	type Review = { id: string; source: string | null; recipe: string | null; baseVersion: { number: number; source: string | null } | null; builds: Build[]; steps?: Step[] };
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
	// a story's proposal (play/api/src/stories.ts): its timeline played in the Stories player, beside what changed
	/** each step the proposal was made in (its branch of the story's Loro document, play/SPEC.md §4.4) */
	type Step = { seq: number; message: string; author: string | null; via: string; at: string };
	type StoryReview = { story: Story; baseStory: (Story & { number: number }) | null; diff: StoryDiff; steps?: Step[] };
	let storyReview = $state<StoryReview | null>(null);
	// a sandbox's change (play/api/src/sandboxes.ts): what each edit changes, before and after, and the sandbox as it would be
	type PinShown = { label: string; group: string; slug: string; number: number; variant: string | null; usedVariant: string | null; params: Record<string, string> | null } | null;
	type SandboxChange =
		| { kind: 'pin'; slot: string; before: PinShown; after: PinShown }
		| { kind: 'config'; config: string; path: (string | number)[]; before: unknown; after: unknown };
	type SandboxReview = { sandbox: { id: string; title: string; route: string }; changes: SandboxChange[]; holds: boolean; why: string | null; moved: boolean };
	let sandboxReview = $state<SandboxReview | null>(null);
	// a factory's: what changed, field by field (its document's paths, list items named by their ids), and its steps
	type FactoryReview = { factory: { id: string; label: string }; baseNumber: number | null; moved: boolean; changes: { path: string; kind: 'added' | 'removed' | 'changed'; from?: unknown; to?: unknown }[]; steps: { seq: number; message: string; author: string | null; via: string; at: string }[] };
	let factoryReview = $state<FactoryReview | null>(null);
	// a game config's: the same, field by field (the Game editor, routes/game-editor)
	type ConfigReview = Omit<FactoryReview, 'factory'> & { config: { id: string; label: string } };
	let configReview = $state<ConfigReview | null>(null);
	/** a document path as people read it: $.line.stations[id=weld].servers → line › stations › weld › servers */
	const pathText = (path: string) => path.replace(/^\$\.?/, '').replace(/\[id=([^\]]+)\]/g, '.$1').replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
	const pinText = (x: PinShown) =>
		x ? `${x.label} v${x.number}${x.usedVariant ? ` · ${x.usedVariant}${x.variant ? '' : ' (default)'}` : ''}${x.params ? ` · ${Object.entries(x.params).map(([k, v]) => `${k} ${v}`).join(', ')}` : ''}` : 'none';
	const valueText = (v: unknown) => (v === undefined ? '(none)' : JSON.stringify(v, null, 1));
	/** a title for a card: an asset's or story's version, or a sandbox's change */
	/** what a proposal is of, its card's tag (Samuel 2026-11-05: the type, not how it came; that it came over MCP is in its title and its review) */
	const GROUP_TYPE: Record<string, string> = { plants: 'Plant', things: 'Thing', machines: 'Machine', buildings: 'Building', actors: 'Actor', biomes: 'Biome', worlds: 'World' };
	const typeOf = (p: P) =>
		p.kind === 'story_version' ? 'Story' : p.kind === 'sandbox_change' ? 'Sandbox' : p.kind === 'factory_version' ? 'Factory' : p.kind === 'game_config_version' ? 'Game config' : (GROUP_TYPE[p.grp] ?? p.grp);
	const titleOf = (p: P) => (p.kind === 'sandbox_change' ? `${p.changes ?? 0} change${p.changes === 1 ? '' : 's'}` : `v${p.number}`);
	async function openCard(p: P) {
		item = null;
		open = p;
		review = null;
		storyReview = null;
		sandboxReview = null;
		factoryReview = null;
		configReview = null;
		code = '';
		baseCode = null;
		shown = '';
		showSource = false;
		noteOpen = false;
		reviewError = '';
		if (p.kind === 'story_version') {
			try {
				const r = await api<StoryReview>(`/proposals/${p.id}`);
				if (open?.id === p.id) storyReview = r;
			} catch (e) {
				reviewError = (e as Error).message;
			}
			return;
		}
		if (p.kind === 'sandbox_change') {
			try {
				const r = await api<SandboxReview>(`/proposals/${p.id}`);
				if (open?.id === p.id) sandboxReview = r;
			} catch (e) {
				reviewError = (e as Error).message;
			}
			return;
		}
		if (p.kind === 'factory_version') {
			try {
				const r = await api<FactoryReview>(`/proposals/${p.id}`);
				if (open?.id === p.id) factoryReview = r;
			} catch (e) {
				reviewError = (e as Error).message;
			}
			return;
		}
		if (p.kind === 'game_config_version') {
			try {
				const r = await api<ConfigReview>(`/proposals/${p.id}`);
				if (open?.id === p.id) configReview = r;
			} catch (e) {
				reviewError = (e as Error).message;
			}
			return;
		}
		try {
			const r = await api<Review & { builds: any[] }>(`/proposals/${p.id}`);
			if (open?.id !== p.id) return;
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

	// ---- an item of the Inbox or Specify opened: read, handed to an agent by its brief, archived, done or brought back
	let item = $state<Item | null>(null);
	/** the item's proposals as the board lists them (null while they are read) */
	let itemProposals = $state<P[] | null>(null);
	let itemError = $state('');
	let copied = $state(false);
	async function openItem(i: Item) {
		open = null;
		item = i;
		itemProposals = null;
		itemError = '';
		copied = false;
		try {
			const r = await api<Item & { proposals: P[] }>(`/inbox/${i.id}`);
			if (item?.id === i.id) itemProposals = r.proposals;
		} catch (e) {
			itemError = (e as Error).message;
		}
	}
	/** the item a proposal was made for, from its review */
	async function openItemOf(id: string) {
		const i = items.find((x) => x.id === id) ?? (await api<Item>(`/inbox/${id}`).catch(() => null));
		if (i) openItem({ ...i, proposals: i.proposals.map((p: any) => ({ id: p.id, status: p.status })) });
	}
	const closeItem = () => (item = null);
	async function decideItem(id: string, verdict: 'done' | 'archive' | 'reopen') {
		try {
			const r = await api<Item>(`/inbox/${id}/${verdict}`, { method: 'POST' });
			items = items.map((x) => (x.id === r.id ? r : x));
			closeItem();
		} catch (e) {
			itemError = (e as Error).message;
		}
	}
	/** what to tell an agent sent to an item: the item by its id (its title only shown), to specify it first if it is
	 *  not yet, then to make it, check it against its metric and propose it naming the item */
	const briefOf = (i: Item) =>
		i.status === 'inbox'
			? `Take up Maia City's Inbox item ${i.id} on play ("${i.title}"). Read it with the maia-play MCP tool get_inbox_item, then specify it with specify_inbox_item: its definition (what is to be made, precisely) and its metric (what good is: how a proposal for it is judged, measurable where it can be). Then make it, check it against that metric, and propose it with the propose tool's inbox: "${i.id}", saying in its note how it meets the metric.`
			: `Make Maia City's Inbox item ${i.id} on play ("${i.title}"). Read it and its spec with the maia-play MCP tool get_inbox_item, make what its definition says, check it against its metric, and propose it with the propose tool's inbox: "${i.id}", saying in its note how it meets the metric.`;
	async function copyBrief(i: Item) {
		try {
			await navigator.clipboard.writeText(briefOf(i));
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			itemError = 'The brief could not be copied here: select it and copy it by hand.';
		}
	}
	/** Markdown, as the site's one engine writes it (safe to show: nothing in it can run or load) */
	const md = (s: string | null | undefined) => markdown(s ?? '');

	// the way back (the nav pill's Back) closes what is open on the board first, then the board itself (the modal's)
	$effect(() => {
		if (!open) return;
		return wayBack('Back to the proposals', close);
	});
	$effect(() => {
		if (!item) return;
		return wayBack('Back to the proposals', closeItem);
	});

	const onKey = (e: KeyboardEvent) => {
		if (e.key !== 'Escape') return;
		if (item) closeItem();
		else if (open) close();
		else onclose?.();
	};
</script>

<svelte:window onkeydown={onKey} />

<div class="proposals">
{#if !admin}
	<p class="muted">The proposals are Maia City's admins' for now.</p>
{:else}
		<header class="head">
			<div>
				<h1>Proposals</h1>
				<p class="muted">What Maia City wants made, fixed or improved comes into the Inbox and is specified (its definition, and its metric of what is good) by agents over MCP; what they make of it, and every other new version of the assets, stories, factories and configs and change of the sandboxes, comes in as Proposed. Open one to see it and decide.</p>
			</div>
			{#if onclose}<button class="btn small ghost close" onclick={onclose} aria-label="Close the proposals" title="Close (Esc)">Close</button>{/if}
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
							{#each cards as c (c.item?.id ?? c.proposal?.id)}
								{#if c.item}
									{@const i = c.item}
									<!-- an item: its title, how far what was proposed for it got, who wrote it and its kind -->
									<article class="card item" data-kind={i.kind}>
										<button class="open" onclick={() => openItem(i)} title={i.note ? gist(i.note) : undefined}>
											<span class="title">{i.title}</span>
											{#if i.proposals.length}<span class="for">{proposedFor(i)}</span>{/if}
											<span class="meta">
												<span class="avatar" aria-hidden="true">{initialsOf(i.author)}</span>
												<span class="author">{i.author ?? 'someone'}</span>
												<span class="type" data-kind={i.kind} title="{kindName(i.kind)} · added by an agent working for them over MCP">{kindName(i.kind)}</span>
												<span class="date">{shortWhen(i.created)}</span>
											</span>
										</button>
									</article>
								{:else}
									{@const p = c.proposal!}
									<!-- compact: the title and who, when; the note, the review and the decision open with it -->
									<article class="card">
										<button class="open" onclick={() => openCard(p)} title={p.note ? gist(p.note) : undefined}>
											<span class="title">{p.label} <span class="muted">{titleOf(p)}</span></span>
											{#if p.inbox_title}<span class="for" title="Made for this item of the Inbox">↳ {p.inbox_title}</span>{/if}
											<span class="meta">
												<span class="avatar" aria-hidden="true">{initialsOf(p.author)}</span>
												<span class="author">{p.author ?? 'someone'}</span>
												<span class="type" data-type={typeOf(p)} title={p.via === 'mcp' ? `${typeOf(p)} · proposed by an agent working for them over MCP` : typeOf(p)}>{typeOf(p)}</span>
												<span class="date">{shortWhen(p.created)}</span>
											</span>
										</button>
									</article>
								{/if}
							{:else}
								<p class="empty muted">{!loaded ? '…' : s === 'inbox' ? 'None. Agents add here over MCP (add_inbox_item).' : s === 'specify' ? 'None. Agents specify an item over MCP (specify_inbox_item).' : 'None'}</p>
							{/each}
						</div>
					{/if}
				</section>
			{/each}
		</div>

	{#if item}
		{@const i = item}
		<!-- an item opened: read here (it is added and specified over MCP only), its proposals a click away, the brief
		     that hands it to an agent, and the admins' decision on it -->
		<button class="scrim" onclick={closeItem} aria-label="Close" tabindex="-1"></button>
		<div class="review item-review" role="dialog" aria-modal="true" aria-label={i.title}>
			<header class="review-head">
				<div class="who">
					<p class="tags"><span class="type" data-kind={i.kind}>{kindName(i.kind)}</span> <span class="pill">{i.status === 'inbox' ? 'in the Inbox' : i.status === 'specify' ? 'specified' : i.status}</span></p>
					<h2>{i.title}</h2>
					<p class="meta">by {i.author ?? 'someone'}{' '}<span class="via" title="Added by an agent working for them over MCP">via MCP</span> · {when(i.created)}{i.specified_by && i.specified_at ? ` · specified by ${i.specified_by}, ${when(i.specified_at)}` : ''}{i.decided_by ? ` · ${i.status} by ${i.decided_by}` : ''}</p>
				</div>
				<div class="actions">
					{#if i.status === 'specify'}<button class="btn small" onclick={() => decideItem(i.id, 'done')} title="What it asked is in">Done</button>{/if}
					{#if i.status === 'inbox' || i.status === 'specify'}
						<button class="btn small ghost" onclick={() => decideItem(i.id, 'archive')}>Archive</button>
					{:else}
						<button class="btn small ghost" onclick={() => decideItem(i.id, 'reopen')}>Back to {i.definition ? 'Specify' : 'the Inbox'}</button>
					{/if}
					<button class="btn small ghost" onclick={closeItem} aria-label="Close">Close</button>
				</div>
			</header>
			{#if itemError}<p class="error">{itemError}</p>{/if}
			{#if i.note}<div class="md">{@html md(i.note)}</div>{/if}
			<section class="spec" class:none={!i.definition}>
				{#if i.definition}
					<div>
						<h3>Definition</h3>
						<div class="md">{@html md(i.definition)}</div>
					</div>
					<div>
						<h3>Metric of what is good</h3>
						<div class="md">{@html md(i.metric)}</div>
					</div>
				{:else}
					<h3>Not specified yet</h3>
					<p class="muted small">Its definition and its metric of what is good are written over MCP (specify_inbox_item) before anything is proposed for it: the brief below asks an agent to do that first.</p>
				{/if}
			</section>
			<section>
				<h3>Proposed for it</h3>
				{#if itemProposals === null}<p class="muted small">Reading them…</p>
				{:else if !itemProposals.length}<p class="muted small">Nothing yet. Send an agent to it with the brief below.</p>
				{:else}
					<ul class="linked">
						{#each itemProposals as p (p.id)}
							<li>
								<button class="open" onclick={() => openCard(p)}>
									<span class="type" data-type={typeOf(p)}>{typeOf(p)}</span>
									<span class="what">{p.label} <span class="muted">{titleOf(p)}</span></span>
									<span class="pill">{p.status}</span>
									<span class="date muted">{shortWhen(p.created)}</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
			{#if i.status === 'inbox' || i.status === 'specify'}
				<section class="agent">
					<h3>For an agent</h3>
					<p class="muted small">Give this to an agent with play's MCP server (maia-play): {i.status === 'inbox' ? 'it specifies the item, makes it' : 'it makes the item'} and names it in what it proposes.</p>
					<pre class="brief">{briefOf(i)}</pre>
					<button class="btn small ghost" onclick={() => copyBrief(i)}>{copied ? 'Copied' : 'Copy the brief'}</button>
				</section>
			{/if}
		</div>
	{/if}

	{#if open}
		{@const p = open}
		<div class="review" role="dialog" aria-modal="true" aria-label="{p.label} {titleOf(p)}">
			<header class="review-head">
				<div class="who">
					<h2>{p.label} <span class="muted">{titleOf(p)}</span> <span class="pill">{p.status}</span></h2>
					<p class="meta">{p.grp} · by {p.author ?? 'someone'}{#if p.via === 'mcp'}{' '}<span class="via" title="Proposed by an agent working for them over MCP">via MCP</span>{/if} · {when(p.created)}{p.decided_by ? ` · ${p.status} by ${p.decided_by}` : ''}{#if p.inbox_id}{' · for '}<button class="link" onclick={() => openItemOf(p.inbox_id!)} title="The item of the Inbox it was made for">{p.inbox_title}</button>{/if}</p>
				</div>
				<div class="actions">
					{#if p.status === 'proposed' && deciding}<button class="btn small" onclick={() => (act(p.id, 'accept'), close())}>Accept</button>{/if}
					{#if p.status === 'proposed' && (deciding || p.author === session.me?.name)}<button class="btn small ghost" onclick={() => (act(p.id, 'archive'), close())}>Archive</button>{/if}
					{#if review}<button class="btn small ghost" class:on={showSource} onclick={() => (showSource = !showSource)}>{showSource ? 'Hide source' : review.source ? 'Source' : 'Recipe file'}</button>{/if}
					<button class="btn small ghost" onclick={close} aria-label="Close">Close</button>
				</div>
			</header>
			{#if p.note}
				<div class="note" class:folded={!noteOpen}>
					<p>{p.note}</p>
				</div>
				<button class="more" onclick={() => (noteOpen = !noteOpen)}>{noteOpen ? 'Less' : 'More'}</button>
			{/if}
			{#if p.kind === 'sandbox_change'}
				<div class="sandbox-review">
					{#if reviewError}<p class="error">{reviewError}</p>
					{:else if !sandboxReview}<p class="muted">Reading it…</p>
					{:else}
						{@const r = sandboxReview}
						{#if p.status === 'proposed'}
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
			{:else if p.kind === 'factory_version'}
				<div class="sandbox-review">
					{#if reviewError}<p class="error">{reviewError}</p>
					{:else if !factoryReview}<p class="muted">Reading it…</p>
					{:else}
						{@const r = factoryReview}
						<p>
							<a class="btn small" href="/factories/?factory={encodeURIComponent(r.factory.id)}&proposal={encodeURIComponent(p.id)}" target="_blank" rel="noopener">Open {r.factory.label} as it would be</a>
							{#if r.moved}<span class="muted small"> It was made on v{r.baseNumber}; the factory has a newer version since. Accepting merges it where the two touch different fields, and archives it where they touch the same.</span>{/if}
						</p>
						<h3>{p.status === 'accepted' ? 'What it changed' : 'What it changes'}{r.baseNumber ? ` from v${r.baseNumber}` : ''}</h3>
						<ol class="changes">
							{#each r.changes as c, i (i)}
								<li>
									<span class="where">{#each pathText(c.path) as k, j}{#if j}<span class="muted"> › </span>{/if}{k}{/each}</span>
									<div class="vals"><pre class="was">{c.kind === 'added' ? '(none)' : valueText(c.from)}</pre><pre class="now">{c.kind === 'removed' ? '(none)' : valueText(c.to)}</pre></div>
								</li>
							{/each}
						</ol>
						{#if r.steps.length > 1}
							<h3 class="steps-head">Made in {r.steps.length} steps</h3>
							<ol class="steps">
								{#each r.steps as s (s.seq)}
									<li>
										<span class="msg">{s.message}</span>
										<span class="muted small">{s.author ?? 'play'}{s.via === 'mcp' ? ' · MCP' : ''} · {new Date(s.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
									</li>
								{/each}
							</ol>
						{/if}
					{/if}
				</div>
			{:else if p.kind === 'game_config_version'}
				<div class="sandbox-review">
					{#if reviewError}<p class="error">{reviewError}</p>
					{:else if !configReview}<p class="muted">Reading it…</p>
					{:else}
						{@const r = configReview}
						<p>
							<a class="btn small" href="/game-editor/?config={encodeURIComponent(r.config.id)}&proposal={encodeURIComponent(p.id)}" target="_blank" rel="noopener">Open {r.config.label} as it would be</a>
							{#if r.moved}<span class="muted small"> It was made on v{r.baseNumber}; the config has a newer version since. Accepting merges it where the two touch different fields, and archives it where they touch the same.</span>{/if}
						</p>
						<h3>{p.status === 'accepted' ? 'What it changed' : 'What it changes'}{r.baseNumber ? ` from v${r.baseNumber}` : ''}</h3>
						<ol class="changes">
							{#each r.changes as c, i (i)}
								<li>
									<span class="where">{#each pathText(c.path) as k, j}{#if j}<span class="muted"> › </span>{/if}{k}{/each}</span>
									<div class="vals"><pre class="was">{c.kind === 'added' ? '(none)' : valueText(c.from)}</pre><pre class="now">{c.kind === 'removed' ? '(none)' : valueText(c.to)}</pre></div>
								</li>
							{/each}
						</ol>
						{#if r.steps.length > 1}
							<h3 class="steps-head">Made in {r.steps.length} steps</h3>
							<ol class="steps">
								{#each r.steps as s (s.seq)}
									<li>
										<span class="msg">{s.message}</span>
										<span class="muted small">{s.author ?? 'play'}{s.via === 'mcp' ? ' · MCP' : ''} · {new Date(s.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
									</li>
								{/each}
							</ol>
						{/if}
					{/if}
				</div>
			{:else if p.kind === 'story_version'}
				<div class="story-review">
					{#if reviewError}<p class="error">{reviewError}</p>
					{:else if !storyReview}<p class="muted">Reading it…</p>
					{:else}
						<div class="story-play"><StoryPlayer story={storyReview.story} compact /></div>
						<div class="story-diff">
							<h3>{storyReview.baseStory ? `Changes from v${storyReview.baseStory.number}` : 'A new story'}</h3>
							<StoryChanges diff={storyReview.diff} fresh={!storyReview.baseStory} links={{ ...storyReview.baseStory?.links, ...storyReview.story.links }} />
							{#if (storyReview.steps?.length ?? 0) > 1}
								<h3 class="steps-head">Made in {storyReview.steps!.length} steps</h3>
								<ol class="steps">
									{#each storyReview.steps! as s (s.seq)}
										<li>
											<span class="msg">{s.message}</span>
											<span class="muted small">{s.author ?? 'play'}{s.via === 'mcp' ? ' · MCP' : ''} · {new Date(s.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
										</li>
									{/each}
								</ol>
							{/if}
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
									{#await viewer then { default: VaultAsset }}
										<VaultAsset source={catalogSource} hash={shown} title="{p.label} v{p.number} (proposed)" fill />
									{/await}
								{/key}
							</div>
						{/if}
						<p class="muted small">Built in the asset box: a sandboxed frame with no origin, running the frozen engine in a worker, with no network, no storage and no access to this page.</p>
						{#if (review.steps?.length ?? 0) > 1}
							<!-- the steps it was made in: its branch of the asset's Loro document (play/SPEC.md §4.4) -->
							<h3 class="steps-head">Made in {review.steps!.length} steps</h3>
							<ol class="steps">
								{#each review.steps! as s (s.seq)}
									<li>
										<span class="msg">{s.message}</span>
										<span class="muted small">{s.author ?? 'play'}{s.via === 'mcp' ? ' · MCP' : ''} · {new Date(s.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
									</li>
								{/each}
							</ol>
						{/if}
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
		</div>
	{/if}
{/if}
</div>

<style>
	/* the board as tall as the modal it is in: its title and the columns' headers stay, each column scrolls its own
	   cards, the board sideways on a narrow screen (Samuel 2026-11-04); what is opened on it covers it, inside the modal */
	.proposals { position: relative; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; padding: 1rem 1rem 0.8rem; }
	.head { flex: 0 0 auto; display: flex; gap: 1rem; align-items: flex-start; justify-content: space-between; }
	.head h1 { margin: 0; font-size: clamp(1.6rem, 3.5vw, 2.2rem); }
	.head p { margin: 0.2rem 0 0.8rem; font-size: 0.92rem; max-width: 62rem; }
	.head .close { flex: 0 0 auto; }
	/* a phone: the board's own words give way to its columns */
	@media (max-width: 640px) { .head p { display: none; } .head h1 { margin-bottom: 0.6rem; } .proposals { padding: 0.8rem 0.7rem 0.6rem; } }
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
	/* the Inbox: each kind its colour, an item's card marked with it down its left edge */
	[data-kind='idea'] { --kind: var(--mustard, #efb54d); }
	[data-kind='fix'] { --kind: var(--terracotta, #c8744f); }
	[data-kind='improve'] { --kind: var(--sage, #a8b88a); }
	.type[data-kind] { background: color-mix(in srgb, var(--kind) 35%, transparent); }
	.card.item { border-left: 4px solid var(--kind); }
	.for { font-size: 0.76rem; color: var(--ink-soft, #4d5d51); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	/* an item opened: a panel in the middle of the screen over a scrim, not the whole screen a version's build takes */
	.scrim { all: unset; position: absolute; inset: 0; z-index: 9; border-radius: inherit; background: rgb(38 56 44 / 0.28); }
	.review.item-review { inset: auto; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(48rem, calc(100% - 1rem)); max-height: calc(100% - 1rem); overflow: auto; gap: 0.7rem; padding: 1rem 1.1rem 1.1rem; }
	.item-review .tags { margin: 0 0 0.3rem; display: flex; gap: 0.35rem; align-items: center; }
	.item-review .review-head h2 { font-size: 1.35rem; }
	/* an item's note and its spec, as Markdown */
	.md { font-size: 0.92rem; line-height: 1.5; overflow-wrap: anywhere; }
	.md :global(:first-child) { margin-top: 0; }
	.md :global(:last-child) { margin-bottom: 0; }
	.md :global(ul), .md :global(ol) { padding-left: 1.3rem; }
	.md :global(pre) { white-space: pre-wrap; background: var(--paper, #faf8f2); padding: 0.5rem 0.7rem; border-radius: 8px; }
	.spec { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: 0.8rem; padding: 0.8rem 0.9rem; border-radius: 12px; background: color-mix(in srgb, var(--sage, #a8b88a) 16%, var(--paper, #faf8f2)); border: 1px solid color-mix(in srgb, var(--sage, #a8b88a) 45%, transparent); }
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
	.review-head h2 { margin: 0; font-size: 1.3rem; display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
	.review-head .meta { margin: 0.15rem 0 0; }
	.review-head .actions { display: flex; gap: 0.35rem; flex-wrap: wrap; }
	.btn.on { background: var(--ink, #222); color: var(--bg, #fff); }
	.note { flex: 0 0 auto; }
	.note p { margin: 0; font-size: 0.88rem; white-space: pre-line; }
	.note.folded p { display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
	.note:not(.folded) { max-height: 30vh; overflow: auto; }
	.more { all: unset; flex: 0 0 auto; cursor: pointer; font-size: 0.8rem; font-weight: 600; text-decoration: underline; width: fit-content; }
	.review-body { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.8rem; }
	.review-body.split { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); }
	@media (max-width: 900px) { .review-body.split { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 3fr) minmax(0, 2fr); } }
	.built { min-height: 0; display: flex; flex-direction: column; gap: 0.3rem; }
	.stage { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
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
	.story-diff .steps-head { margin-top: 1rem; }
	.steps { margin: 0; padding-left: 1.3rem; display: grid; gap: 0.35rem; font-size: 0.85rem; }
	.steps li { display: grid; gap: 0.05rem; }
	.steps .small { font-size: 0.74rem; }
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
