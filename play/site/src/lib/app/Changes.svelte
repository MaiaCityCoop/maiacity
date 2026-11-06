<!--
	What a change does to a document (play/SPEC.md §4.4), field by field: each field's path as people read it (a list's
	items named by their ids: line › stations › weld › servers), what it was and what it is now; a text read sentence by
	sentence, as the sentences that changed with one unchanged round each. Then the edits it was made in, each with its
	message, who made it, how and when. Read only.

	Shown wherever a change is read: an edit or an intent variant picked in a document's history (./History.svelte), and
	an intent's work on the intents' board. `changes` left out shows the edits alone (a story's or an asset's work, whose
	own preview says what changed); `fresh`, a document new with it, shows only what it holds.
-->
<script lang="ts" module>
	/** a field changed: its path ($.levels[id=l16].investor), and what it was and is now */
	export type Change = { path: string; kind: 'added' | 'removed' | 'changed'; from?: unknown; to?: unknown };
	/** an edit as play lists it: its message, who made it, how (site, mcp, import, system) and when */
	export type EditRow = { seq: number; message: string; author: string | null; via: string; at: string };
</script>

<script lang="ts">
	import { changesOnly, lineDiff } from '$lib/diff';

	let { changes = null, edits = [], fresh = false }: { changes?: Change[] | null; edits?: EditRow[] | null; fresh?: boolean } = $props();
	const made = $derived(edits ?? []);

	/** a path as people read it: $.line.stations[id=weld].servers → line › stations › weld › servers */
	const crumbs = (path: string) =>
		path
			.replace(/^\$\.?/, '')
			.replace(/\[[\w-]+=([^\]]+)\]/g, '.$1')
			.replace(/\[(\d+)\]/g, '.$1')
			.split('.')
			.filter(Boolean);
	/** a value as it is read: a text as it is, anything else as its JSON */
	const valueText = (v: unknown) => (v === undefined ? '(none)' : typeof v === 'string' ? v : JSON.stringify(v, null, 1));
	/** a text long enough to read as sentences rather than as two boxes */
	const long = (v: unknown) => typeof v === 'string' && (v.length > 90 || v.includes('\n'));
	const asText = (c: Change) => (typeof c.from === 'string' || typeof c.to === 'string') && (long(c.from) || long(c.to));
	/** a text as the diff reads it: one sentence a line */
	const sentenced = (v: unknown) => (typeof v === 'string' ? v.replace(/([.!?]) (?=[A-Z`"(])/g, '$1\n') : '');
	const textDiff = (c: Change) => changesOnly(lineDiff(c.kind === 'added' ? '' : sentenced(c.from), c.kind === 'removed' ? '' : sentenced(c.to)), 1);
	const when = (iso: string) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
	const how = (via: string) => (via === 'mcp' ? ' · MCP' : via === 'import' ? ' · imported' : '');
</script>

<div class="changes-of">
	{#if changes}
		{#if changes.length}
			<ol class="fields">
				{#each changes as c, i (i)}
					<li data-kind={c.kind}>
						<span class="where">
							{#each crumbs(c.path) as k, j (j)}{#if j}<span class="sep"> › </span>{/if}{k}{/each}
							{#if c.kind !== 'changed'}<span class="kind">{c.kind}</span>{/if}
						</span>
						{#if asText(c)}
							<pre class="text">{#each textDiff(c) as l, k (k)}<span class={l.op}>{l.op === 'add' ? '+ ' : l.op === 'del' ? '- ' : l.op === 'skip' ? '' : '  '}{l.text}
</span>{/each}</pre>
						{:else if fresh || c.kind === 'added'}
							<pre class="now">{valueText(c.to)}</pre>
						{:else if c.kind === 'removed'}
							<pre class="was">{valueText(c.from)}</pre>
						{:else}
							<div class="vals"><pre class="was">{valueText(c.from)}</pre><pre class="now">{valueText(c.to)}</pre></div>
						{/if}
					</li>
				{/each}
			</ol>
		{:else if !made.length}
			<p class="none">It changes nothing.</p>
		{/if}
	{/if}
	{#if made.length > 1}
		<h4 class="made">Made in {made.length} edits</h4>
		<ol class="edits">
			{#each made as e (e.seq)}
				<li>
					<span class="msg">{e.message}</span>
					<small>{e.author ?? 'play'}{how(e.via)} · {when(e.at)}</small>
				</li>
			{/each}
		</ol>
	{/if}
</div>

<style>
	.changes-of { display: grid; gap: 0.5rem; min-width: 0; font-size: 0.86rem; }
	.fields { margin: 0; padding-left: 1.3rem; display: grid; gap: 0.55rem; }
	.fields li { min-width: 0; }
	.where { font-weight: 600; overflow-wrap: anywhere; }
	.sep { color: var(--muted, #777); font-weight: 400; }
	.kind { margin-left: 0.4rem; padding: 0 0.4em; border-radius: 999px; font-size: 0.68rem; font-weight: 600; background: var(--paper, #f6f1e6); color: var(--muted, #777); }
	li[data-kind='added'] .kind { background: color-mix(in srgb, var(--sage, #8fae8b) 35%, transparent); color: var(--brand-green, #24452f); }
	li[data-kind='removed'] .kind { background: color-mix(in srgb, var(--terracotta, #c96f53) 22%, transparent); color: #9c3b22; }
	pre { margin: 0.25rem 0 0; padding: 0.45rem 0.6rem; border-radius: 8px; background: var(--paper, #f6f1e6); font-size: 0.76rem; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 16rem; overflow: auto; }
	.vals { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: 0.4rem; }
	pre.was { background: color-mix(in srgb, var(--terracotta, #c96f53) 14%, transparent); }
	pre.now { background: color-mix(in srgb, var(--sage, #8fae8b) 22%, transparent); }
	/* a text, sentence by sentence: what was taken out, what was put in, an unchanged sentence round each */
	.text .add { display: block; background: color-mix(in srgb, var(--sage, #8fae8b) 30%, transparent); }
	.text .del { display: block; background: color-mix(in srgb, var(--terracotta, #c96f53) 25%, transparent); }
	.text .same { display: block; opacity: 0.7; }
	.text .skip { display: block; opacity: 0.5; font-style: italic; padding: 0.15rem 0; }
	.none { margin: 0; color: var(--muted, #777); font-size: 0.8rem; }
	.made { margin: 0.4rem 0 0; font-family: var(--font-body); font-size: 0.7rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted, #777); }
	.edits { margin: 0; padding-left: 1.3rem; display: grid; gap: 0.3rem; }
	.edits li { display: grid; gap: 0.05rem; }
	.edits small { color: var(--muted, #777); font-size: 0.72rem; }
</style>
