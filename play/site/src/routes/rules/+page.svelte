<!--
	Rules (play/SPEC.md §4.12 "Auto-accept rules"; intent de24f1c5, Samuel 2026-11-07): the one rule set, a document
	`rules:<uuid>` of its own schema, read here, its rules in order (the first that matches an intent at a gate it names
	decides it there with no person) and its History tab on the right ($lib/app/History.svelte, the one History of every
	view). It changes only by an intent's Accept, over MCP (doc_edit, propose_doc_version); an intent whose work changes
	the rules or their schema is never decided by a rule. `?v=<n>` one of its versions, `?rules=<hash>` the version of
	that content hash (what an auto decision names), `&rule=<uuid>` one rule marked. Admins only.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { api } from '$lib/api';
	import { session } from '$lib/session.svelte';
	import Frame from '$lib/app/Frame.svelte';
	import History, { type Pick } from '$lib/app/History.svelte';

	type Match = Record<string, unknown>;
	type Rule = { id: string; label: string; gates: string[]; match: Match; reason: string };
	type RuleSet = { id: string; json: { label: string; note?: string; rules: Rule[] }; number: number; version?: number; edit?: number; intent?: { id: string; status: string; note: string } };
	type Item = { id: string; label: string; number: number };
	type Version = { number: number; contentHash: string };

	const admin = $derived(session.me?.level === 'admin');
	let item = $state<Item | null>(null);
	let set = $state<RuleSet | null>(null);
	let versions = $state<Version[]>([]);
	/** every schema's label, by its UUID (only shown: a rule names schemas by their UUIDs) */
	let schemas = $state<Map<string, string>>(new Map());
	let people = $state<Map<string, string>>(new Map());
	let error = $state('');
	const params = $derived(page.url.searchParams);
	const byHash = $derived(params.get('rules'));
	const wantV = $derived(params.get('v') ?? (byHash ? `${versions.find((v) => v.contentHash === byHash)?.number ?? ''}` : null));
	const marked = $derived(params.get('rule'));
	$effect(() => {
		if (!admin) return void (session.me && goto('/', { replaceState: true }));
		api<Item[]>('/docs?kind=rules').then((l) => (item = l[0] ?? null), (e) => (error = e.message));
		api<Item[]>('/docs?kind=schema').then((l) => (schemas = new Map(l.map((s) => [s.id, s.label]))), () => {});
		api<{ id: string; name: string }[]>('/members').then((l) => (people = new Map(l.map((m) => [m.id, m.name]))), () => {});
	});
	$effect(() => {
		if (!admin || !item) return;
		api<{ versions: Version[] }>(`/docs/${item.id}/history`).then((h) => (versions = h.versions ?? []), () => {});
	});
	$effect(() => {
		if (!admin || !item || (byHash && !versions.length)) return;
		const q = wantV ? `?v=${encodeURIComponent(wantV)}` : '';
		let gone = false;
		api<RuleSet>(`/docs/${item.id}${q}`).then(
			(s) => !gone && ((set = s), (error = '')),
			(e) => !gone && (error = e.message)
		);
		return () => (gone = true);
	});
	const at = (v?: number) => goto(v ? `?v=${v}` : '?', { keepFocus: true, noScroll: true });
	async function picked(p: Pick | null) {
		if (!set) return;
		if (!p) return void at();
		if ('version' in p) return void at(p.version === set.number ? undefined : p.version);
		set = await api<RuleSet>(`/docs/${set.id}?edit=${p.edit.seq}`);
	}
	const shownVersion = $derived(set ? (set.version ?? set.number) : null);
	const hashOf = (n: number | null) => versions.find((v) => v.number === n)?.contentHash ?? '';
	/** a field's values as people read them: a schema or a person by name, code as code */
	function value(k: string, v: unknown): string {
		const name = (x: unknown) => {
			const s = `${x}`;
			if (k === 'schemas' || k === 'work_kind') return s === 'code' ? 'code' : (schemas.get(s) ?? s);
			if (k === 'author' || k === 'proposed_by') return people.get(s) ?? s;
			return s;
		};
		return Array.isArray(v) ? v.map(name).join(' or ') : typeof v === 'boolean' ? (v ? 'yes' : 'no') : name(v);
	}
	const FIELD: Record<string, string> = {
		kind: 'its kind', via: 'it came', author: 'its author', work_kind: 'every kind of work it declares', proposed_by: 'its work proposed by', proposed_via: 'its work proposed', schemas: 'every document it changes of', code: 'its work is code', new_only: 'it only makes new documents', max_documents: 'documents at most', max_edits: 'edits at most'
	};
	const GATE: Record<string, string> = { approve: 'Approve spec', accept: 'Accept' };
</script>

<svelte:head><title>Rules · maiaCITY play</title></svelte:head>

{#snippet head()}
	{#if set}
		<header class="about-head">
			<small>Rules · owned by Maia City</small>
			<h3>{set.json.label}</h3>
			{#if set.edit}
				<p class="asif">As it stood at an edit of its history: <a href="?" onclick={(e) => (e.preventDefault(), at())}>its newest version</a></p>
			{:else if shownVersion !== set.number}
				<p class="asif">Version {shownVersion}, not its newest: <a href="?" onclick={(e) => (e.preventDefault(), at())}>v{set.number}</a></p>
			{/if}
		</header>
	{/if}
{/snippet}

{#snippet history()}
	{#if set}
		<History doc={set.id} shown={shownVersion ?? set.number} label="the rules" intent={null} onPick={picked} />
		<p class="soft propose">Propose v{set.number + 1} over MCP (doc_edit, propose_doc_version) as an intent's work; it is decided in <a href="/intents/">Intents</a>, always by a person.</p>
	{/if}
{/snippet}

{#if admin}
	<div class="rules">
		<Frame asideHead={set ? head : undefined} history={set ? history : undefined} asideLabel="The rules' history">
			<article class="body">
				{#if error}<p class="bad">{error}</p>{/if}
				{#if set}
					<p class="eyebrow">Rules · v{shownVersion}{hashOf(shownVersion) ? ` · ${hashOf(shownVersion).slice(0, 12)}` : ''}</p>
					<h1>{set.json.label}</h1>
					{#if set.json.note}<p class="lead">{set.json.note}</p>{/if}
					<p class="lead small">The first rule, in order, that names a gate and whose every field holds decides the intent there with no person: its spec approved, or it accepted (work of play's applied, code into Ship). Its dependencies and every must check still hold first. An intent whose work changes these rules or their schema is never decided by a rule.</p>
					<ol class="list">
						{#each set.json.rules as r, k (r.id)}
							<li class="rule" class:marked={marked === r.id} id="rule-{r.id}">
								<div class="top">
									<span class="n">{k + 1}</span>
									<h2>{r.label}</h2>
									{#each r.gates as g (g)}<span class="gate">{GATE[g] ?? g}</span>{/each}
								</div>
								<p class="reason">{r.reason}</p>
								<ul class="match">
									{#each Object.entries(r.match ?? {}) as [f, v] (f)}
										<li><span class="soft">{FIELD[f] ?? f}</span> <strong>{value(f, v)}</strong></li>
									{:else}
										<li class="soft">every intent</li>
									{/each}
								</ul>
								<p class="soft id">Rule <code>{r.id}</code></p>
							</li>
						{:else}
							<li class="soft">No rule: every intent waits for a person.</li>
						{/each}
					</ol>
				{:else if !error}
					<p class="soft">…</p>
				{/if}
			</article>
		</Frame>
	</div>
{/if}

<style>
	.rules { position: fixed; inset: 0; background: var(--cream); --soft: rgb(38 56 44 / 0.6); --accent: var(--brand-green); }
	.rules :global(.soft) { color: var(--soft); }
	.body { max-width: 50rem; padding: 0.4rem 0 3rem; }
	.eyebrow { margin: 0; color: var(--accent); font-size: 0.7rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
	h1 { margin: 0.2rem 0 0.5rem; font-size: clamp(1.5rem, 3vw, 2rem); }
	.lead { margin: 0 0 0.8rem; color: var(--ink-soft); }
	.small { font-size: 0.84rem; }
	code { font-size: 0.85em; overflow-wrap: anywhere; }
	.list { list-style: none; margin: 1rem 0 0; padding: 0; display: grid; gap: 0.7rem; }
	.rule { padding: 0.8rem 0.9rem; border-radius: 10px; background: rgb(255 255 255 / 0.6); border: 1px solid rgb(38 56 44 / 0.12); }
	.rule.marked { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent); }
	.top { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.3rem 0.6rem; }
	.n { font-size: 0.78rem; font-weight: 600; color: var(--soft); }
	h2 { margin: 0; font-size: 1.02rem; font-family: var(--font-body); font-weight: 600; }
	.gate { padding: 0 0.5em; border-radius: 999px; background: var(--mustard-soft, rgb(232 178 60 / 0.18)); font-size: 0.72rem; font-weight: 600; }
	.reason { margin: 0.35rem 0 0.4rem; font-size: 0.88rem; }
	.match { margin: 0; padding-left: 1.1rem; font-size: 0.84rem; }
	.id { margin: 0.4rem 0 0; font-size: 0.74rem; }
	.bad { color: var(--terracotta, #c23a22); }
	.about-head { margin: 0 0 0.9rem 0.35rem; }
	.about-head small { color: var(--accent); font-size: 0.7rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
	.about-head h3 { margin: 0.15rem 0 0.3rem; font-size: 1.15rem; font-family: var(--font-body); font-weight: 600; }
	.asif { margin: 0.4rem 0 0.5rem; padding: 0.45rem 0.6rem; border-radius: 8px; background: var(--mustard-soft, rgb(232 178 60 / 0.18)); font-size: 0.78rem; line-height: 1.4; }
	.propose { margin: 0 0 1.2rem 0.35rem; font-size: 0.76rem; }
</style>
