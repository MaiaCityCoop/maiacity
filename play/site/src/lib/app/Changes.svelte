<!--
	What a change changes, once for every versioned kind (play/SPEC.md "Version control", play/api/src/versioned.ts): its
	field diff (each document path as people read it, before and after; a text sentence by sentence, code line by line)
	and the edits that made it, each with who made it, how and when. The History tab shows it under the edit or the
	intent variant picked; every review on the intents' board shows it beside an asset's build or a story's player.

	Given `changes` and `edits` (a review's), it shows them; given `doc` and an `edit` or a `variant`, it reads them
	(GET /api/docs/<uuid>/changes).
-->
<script lang="ts" module>
	export type Change = { path: string; kind: 'added' | 'removed' | 'changed'; from?: unknown; to?: unknown };
	export type Edit = { seq: number; variant: number | null; kind: string; author: string | null; via: string; message: string; at: string; version: number | null };
</script>

<script lang="ts">
	import { api } from '$lib/api';
	import { changesOnly, lineDiff } from '$lib/diff';

	let {
		changes = $bindable(null),
		edits = $bindable(null),
		doc = null,
		edit = null,
		variant = null,
		seed = null,
		heading = 'What it changes',
		skip = []
	}: {
		changes?: Change[] | null;
		edits?: Edit[] | null;
		/** the document's UUID, to read what `edit` or `variant` changes */
		doc?: string | null;
		edit?: number | null;
		variant?: number | null;
		/** the version it grew from, to name in its heading */
		seed?: number | null;
		heading?: string;
		/** paths shown elsewhere (an asset's source, beside its build) */
		skip?: string[];
	} = $props();

	let failed = $state('');
	$effect(() => {
		if (!doc || (edit == null && variant == null)) return;
		const q = edit != null ? `edit=${edit}` : `variant=${variant}`;
		let gone = false;
		failed = '';
		api<{ changes: Change[]; edits: Edit[]; seed?: number | null }>(`/docs/${doc}/changes?${q}`).then(
			(r) => {
				if (gone) return;
				changes = r.changes;
				edits = r.edits;
				if (r.seed !== undefined) seed = r.seed;
			},
			(e) => !gone && (failed = (e as Error).message)
		);
		return () => (gone = true);
	});

	/** a document path as people read it: $.line.stations[id=weld].servers → line › stations › weld › servers */
	const pathText = (path: string) => path.replace(/^\$\.?/, '').replace(/\[id=([^\]]+)\]/g, '.$1').replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
	const valueText = (v: unknown) => (v === undefined ? '(none)' : JSON.stringify(v, null, 1));
	/** a text as the diff reads it: code line by line, prose one sentence a line */
	const sentenced = (v: unknown) => (typeof v !== 'string' ? '' : v.includes('\n') ? v : v.replace(/([.!?]) (?=[A-Z`"(])/g, '$1\n'));
	const textDiff = (c: Change) => changesOnly(lineDiff(c.kind === 'added' ? '' : sentenced(c.from), c.kind === 'removed' ? '' : sentenced(c.to)), 1);
	const when = (iso: string) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
	const shown = $derived((changes ?? []).filter((c) => !skip.includes(c.path)));
</script>

<div class="changes-of">
	{#if failed}
		<p class="error">{failed}</p>
	{:else if changes}
		<h4>{heading}{seed ? ` from v${seed}` : ''}</h4>
		{#if !shown.length}
			<p class="soft small">{changes.length ? 'Nothing more than what is shown beside it.' : 'Nothing: it is the document as it was.'}</p>
		{:else}
			<ol class="fields">
				{#each shown as c, i (i)}
					<li>
						<span class="where">{#each pathText(c.path) as k, j}{#if j}<span class="soft"> › </span>{/if}{k}{/each}</span>
						{#if typeof c.from === 'string' || typeof c.to === 'string'}
							<pre class="src">{#each textDiff(c) as l, k (k)}<span class={l.op}>{l.op === 'add' ? '+ ' : l.op === 'del' ? '- ' : l.op === 'skip' ? '' : '  '}{l.text}
</span>{/each}</pre>
						{:else}
							<div class="vals"><pre class="was">{c.kind === 'added' ? '(none)' : valueText(c.from)}</pre><pre class="now">{c.kind === 'removed' ? '(none)' : valueText(c.to)}</pre></div>
						{/if}
					</li>
				{/each}
			</ol>
		{/if}
	{/if}
	{#if edits?.length}
		<h4>Made in {edits.length} edit{edits.length === 1 ? '' : 's'}</h4>
		<ol class="made">
			{#each edits as e (e.seq)}
				<li>
					<span class="msg">{e.message}</span>
					<span class="soft small">{e.author ?? 'play'}{e.via === 'mcp' ? ' · MCP' : e.via === 'import' ? ' · imported' : ''}{e.kind === 'merge' ? ' · merge' : ''} · {when(e.at)}</span>
				</li>
			{/each}
		</ol>
	{/if}
</div>

<style>
	.changes-of { display: grid; gap: 0.45rem; min-width: 0; }
	h4 { margin: 0.4rem 0 0; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--soft, rgb(38 56 44 / 0.6)); }
	.soft { color: var(--soft, rgb(38 56 44 / 0.6)); }
	.small { font-size: 0.74rem; }
	.error { color: var(--terracotta, #a11); font-size: 0.8rem; }
	.fields, .made { margin: 0; padding-left: 1.3rem; display: grid; gap: 0.45rem; font-size: 0.82rem; min-width: 0; }
	.fields li, .made li { min-width: 0; }
	.made li { display: grid; gap: 0.05rem; }
	.where { display: inline-block; font-weight: 600; margin: 0 0 0.2rem; overflow-wrap: anywhere; }
	.vals { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0.3rem; }
	.vals pre, .src { margin: 0; padding: 0.4rem 0.5rem; border-radius: 8px; background: var(--paper, #f6f1e6); font-size: 0.74rem; line-height: 1.4; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 18rem; overflow: auto; }
	.was { color: var(--soft, #777); text-decoration: line-through; text-decoration-color: color-mix(in srgb, var(--terracotta, #c96f53) 70%, transparent); }
	.src .add { background: color-mix(in srgb, var(--sage, #8fae8b) 30%, transparent); display: block; }
	.src .del { background: color-mix(in srgb, var(--terracotta, #c96f53) 25%, transparent); display: block; }
	.src .same { display: block; opacity: 0.7; }
	.src .skip { display: block; opacity: 0.5; font-style: italic; padding: 0.2rem 0; }
	@media (max-width: 480px) { .vals { grid-template-columns: minmax(0, 1fr); } }
</style>
