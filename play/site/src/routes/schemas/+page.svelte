<!--
	Schemas (play/SPEC.md "Version control"; Samuel 2026-11-06): every type of document play keeps is itself a document,
	a schema of the meta-schema (play/api/src/docs/schemas.ts), named by its UUID and versioned like every other. On the
	left the schemas (the meta-schema first: it describes every schema, itself too); in the middle the one picked: what
	its documents are (their id's prefix, its old name, only shown), its node field by field (the JSON Schema subset play
	checks every edit against, "text" where a field is kept character by character), and the documents written against
	it, each with the version of the schema it was last written against; on the right the one aside
	($lib/app/Aside.svelte: its Info and History). A schema changes only by proposal, over MCP (doc_edit,
	propose_doc_version), and its Accept is refused while any document on Main fails the new version. `?schema=<id>`
	picks one, `&v=<n>` one of its versions, `&intent=<id>` the schema as an intent's work would make it. Admins only.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { api } from '$lib/api';
	import { session } from '$lib/session.svelte';
	import Frame from '$lib/app/Frame.svelte';
	import Icon from '$lib/app/Icon.svelte';
	import Aside, { type Pick } from '$lib/app/Aside.svelte';

	type Node = { type?: string; const?: unknown; enum?: unknown[]; properties?: Record<string, Node>; required?: string[]; additionalProperties?: boolean | Node; items?: Node; minItems?: number; maxItems?: number; minimum?: number; maximum?: number; minLength?: number; maxLength?: number; pattern?: string; 'x-loro'?: string };
	type Written = { id: string; kind: string | null; schemaVersion: number | null };
	type Item = { id: string; label: string; type: string; name: string; note: string; number: number; versions: number; documents: Written[] };
	type Schema = { id: string; json: { label: string; type: string; name: string; note?: string; node: Node }; number: number; version?: number; edit?: number; intent?: { id: string; status: string; note: string } };
	type Doc = { id: string; kind: string; label: string; number: number };

	const admin = $derived(session.me?.level === 'admin');
	let list = $state<Item[]>([]);
	let all = $state<Map<string, Doc>>(new Map());
	let schema = $state<Schema | null>(null);
	let error = $state('');
	const params = $derived(page.url.searchParams);
	const id = $derived(params.get('schema') ?? list[0]?.id ?? '');
	const wantV = $derived(params.get('v'));
	const wantIntent = $derived(params.get('intent'));
	$effect(() => {
		if (!admin) return void (session.me && goto('/', { replaceState: true }));
		api<Item[]>('/docs?kind=schema').then((l) => (list = [...l].sort((a, b) => (a.type === 'schema' ? -1 : b.type === 'schema' ? 1 : 0))), (e) => (error = e.message));
		// every document's label (only shown), to name the documents a schema holds
		api<Doc[]>('/docs').then((l) => (all = new Map(l.map((d) => [d.id, d]))), () => {});
	});
	const query = () => (wantIntent ? `?intent=${encodeURIComponent(wantIntent)}` : wantV ? `?v=${encodeURIComponent(wantV)}` : '');
	$effect(() => {
		if (!admin || !id) return;
		const q = query();
		let gone = false;
		api<Schema>(`/docs/${id}${q}`).then(
			(s) => !gone && ((schema = s), (error = '')),
			(e) => !gone && (error = e.message)
		);
		return () => (gone = true);
	});
	const at = (s: string, v?: number) => goto(`?schema=${s}${v ? `&v=${v}` : ''}`, { keepFocus: true, noScroll: true });
	/** its History: a version picked is that version; an edit picked, the schema as it stood at it */
	async function picked(p: Pick | null) {
		if (!schema) return;
		if (!p) return void (schema = await api<Schema>(`/docs/${schema.id}${query()}`));
		if ('version' in p) return void at(schema.id, p.version === schema.number ? undefined : p.version);
		schema = await api<Schema>(`/docs/${schema.id}?edit=${p.edit.seq}`);
	}
	const item = $derived(list.find((s) => s.id === schema?.id) ?? null);
	/** a node's kind as one word, and what bounds it */
	function kindOf(n: Node): string {
		if (n.const !== undefined) return `always ${JSON.stringify(n.const)}`;
		if (n.enum) return `one of ${n.enum.map((e) => JSON.stringify(e)).join(', ')}`;
		if (n['x-loro'] === 'text') return 'text';
		if (n.type === 'array') return `list of ${n.items ? kindOf(n.items) : 'anything'}`;
		return n.type ?? 'anything';
	}
	function bounds(n: Node): string {
		const out: string[] = [];
		const range = (lo?: number, hi?: number, unit = '') => (lo !== undefined && hi !== undefined ? `${lo}–${hi}${unit}` : lo !== undefined ? `≥ ${lo}${unit}` : hi !== undefined ? `≤ ${hi}${unit}` : '');
		const r = range(n.minimum, n.maximum);
		if (r) out.push(r);
		const l = range(n.minLength, n.maxLength, ' characters');
		if (l) out.push(l);
		const i = range(n.minItems, n.maxItems, ' items');
		if (i) out.push(i);
		if (n.pattern) out.push(`matches ${n.pattern}`);
		return out.join(' · ');
	}
	const fields = (n: Node) => Object.entries(n.properties ?? {});
	const open = (n: Node) => (n.additionalProperties === false ? 'no other field' : typeof n.additionalProperties === 'object' ? `any other field: ${kindOf(n.additionalProperties)}` : n.additionalProperties ? 'other fields kept as they are' : '');
	const sub = (n: Node): Node | null => (n.properties ? n : n.type === 'array' && n.items?.properties ? n.items : typeof n.additionalProperties === 'object' && n.additionalProperties.properties ? n.additionalProperties : null);
	const route: Record<string, (id: string) => string> = { asset: (d) => `/assets/#${d}`, story: (d) => `/stories/?story=${d}`, factory: (d) => `/factories/?factory=${d}`, game_config: (d) => `/game-editor/?config=${d}`, skill: (d) => `/skills/?skill=${d}`, schema: (d) => `/schemas/?schema=${d}` };
</script>

<svelte:head><title>{schema?.json.label ?? 'Schemas'} · Schemas · maiaCITY play</title></svelte:head>

{#snippet shelf()}
	<h3 class="nav-group">Schemas</h3>
	{#each list as s (s.id)}
		<a class="nav-item" class:on={id === s.id} href="?schema={s.id}" onclick={(e) => (e.preventDefault(), at(s.id))} aria-current={id === s.id ? 'page' : undefined}
			><Icon name="note" size={16} /><span>{s.label} <code>{s.type}:</code></span><small>v{s.number}</small></a
		>
	{:else}
		<p class="soft none">{error ? '' : 'No schemas yet.'}</p>
	{/each}
{/snippet}

{#snippet side()}
	<Aside doc={schema!} where="Schemas · {schema!.json.name}" label={schema!.json.label} shown={wantV ? Number(wantV) : null} propose="Propose v{schema!.number + 1} over MCP (doc_edit, propose_doc_version): accepted only while every document on Main still validates against it." onPick={picked} />
{/snippet}

{#snippet tree(n: Node, depth: number)}
	<ul class="fields" class:deep={depth > 0}>
		{#each fields(n) as [k, f] (k)}
			<li>
				<div class="field">
					<code class="key">{k}</code>
					<span class="kind" class:text={f['x-loro'] === 'text'}>{kindOf(f)}</span>
					{#if n.required?.includes(k)}<span class="req">required</span>{/if}
					{#if bounds(f)}<span class="soft bounds">{bounds(f)}</span>{/if}
				</div>
				{#if sub(f) && depth < 6}{@render tree(sub(f)!, depth + 1)}{/if}
			</li>
		{/each}
		{#if open(n)}<li class="soft rest">{open(n)}</li>{/if}
	</ul>
{/snippet}

{#if admin}
	<div class="schemas">
		<Frame nav={list.length ? shelf : undefined} aside={schema ? side : undefined} navLabel="Every type of document" asideLabel="The schema's history" navIcon="board">
			<article class="body">
				{#if error}<p class="bad">{error}</p>{/if}
				{#if schema}
					<p class="eyebrow">Schemas · {schema.json.type === 'schema' ? 'the meta-schema' : schema.json.name}</p>
					<h1>{schema.json.label}</h1>
					{#if schema.json.note}<p class="lead">{schema.json.note}</p>{/if}
					<p class="facts"><span>Its documents <code>{schema.json.type}:&lt;uuid&gt;</code></span><span>Old name <code>{schema.json.name}</code> (only shown)</span><span>This schema <code>{schema.id}</code></span></p>
					<section>
						<h2>Its node, field by field</h2>
						{@render tree(schema.json.node, 0)}
						<details>
							<summary>The node as JSON</summary>
							<pre>{JSON.stringify(schema.json.node, null, 2)}</pre>
						</details>
					</section>
					<section>
						<h2>Written against it{item ? ` · ${item.documents.length}` : ''}</h2>
						{#if item?.documents.length}
							<ul class="docs">
								{#each item.documents as d (d.id)}
									{@const known = all.get(d.id)}
									<li>
										{#if d.kind && route[d.kind]}<a href={route[d.kind](d.id)}>{known?.label ?? d.id}</a>{:else}<span>{known?.label ?? d.id}</span>{/if}
										<span class="soft">{d.kind ?? 'unknown'}{known ? ` · v${known.number}` : ''}</span>
										<span class="soft ver">written against v{d.schemaVersion ?? '?'}</span>
									</li>
								{/each}
							</ul>
						{:else}
							<p class="soft">No document is written against it yet.</p>
						{/if}
					</section>
				{/if}
			</article>
		</Frame>
	</div>
{/if}

<style>
	.schemas { position: fixed; inset: 0; background: var(--cream); --soft: rgb(38 56 44 / 0.6); --accent: var(--brand-green); }
	.schemas :global(.soft) { color: var(--soft); }
	.body { max-width: 50rem; padding: 0.4rem 0 3rem; }
	.eyebrow { margin: 0; color: var(--accent); font-size: 0.7rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
	h1 { margin: 0.2rem 0 0.5rem; font-size: clamp(1.5rem, 3vw, 2rem); }
	.lead { margin: 0 0 0.8rem; color: var(--ink-soft); }
	.facts { display: flex; flex-wrap: wrap; gap: 0.4rem 1.2rem; margin: 0 0 1rem; font-size: 0.78rem; color: var(--soft); }
	code { font-size: 0.85em; overflow-wrap: anywhere; }
	section { margin: 1.4rem 0 0; }
	h2 { margin: 0 0 0.4rem; font-size: 0.78rem; font-family: var(--font-body); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--soft); }
	.fields { list-style: none; margin: 0; padding: 0; font-size: 0.86rem; }
	.fields.deep { margin: 0.2rem 0 0.3rem 0.4rem; padding-left: 0.8rem; border-left: 1px solid rgb(38 56 44 / 0.15); }
	.fields li { padding: 0.15rem 0; }
	.field { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.25rem 0.6rem; }
	.key { font-weight: 600; }
	.kind { color: var(--ink-soft); }
	.kind.text { color: var(--accent); }
	.req { font-size: 0.68rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--terracotta, #c23a22); }
	.bounds, .rest { font-size: 0.78rem; }
	details { margin: 0.8rem 0 0; font-size: 0.8rem; }
	pre { max-height: 24rem; overflow: auto; padding: 0.6rem; border-radius: 8px; background: rgb(38 56 44 / 0.06); font-size: 0.74rem; }
	.docs { list-style: none; margin: 0; padding: 0; font-size: 0.86rem; }
	.docs li { display: flex; flex-wrap: wrap; gap: 0.2rem 0.7rem; padding: 0.25rem 0; border-bottom: 1px solid rgb(38 56 44 / 0.08); }
	.ver { margin-left: auto; font-size: 0.78rem; }
	.bad { color: var(--terracotta, #c23a22); }
	.none { padding: 0.4rem 0.6rem; font-size: 0.84rem; }
</style>
