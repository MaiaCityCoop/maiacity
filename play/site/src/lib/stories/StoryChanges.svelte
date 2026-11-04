<!--
	What a story's proposal changes against the head it was made on (play/api/src/stories.ts `diffStories`): the title,
	the format, frame rate and length, and track by track the clips added, removed and changed, each change its field
	from what it was to what it would be. Read only.
-->
<script lang="ts" module>
	export type Change = { field: string; from: unknown; to: unknown };
	export type DiffClip = { id: string; at: number; duration: number; [k: string]: unknown };
	export type StoryDiff = {
		title: { from: string; to: string } | null;
		settings: Change[];
		tracks: { id: string; kind: string; state: 'added' | 'removed' | 'same' | 'changed'; added: DiffClip[]; removed: DiffClip[]; changed: { id: string; changes: Change[] }[] }[];
	};
</script>

<script lang="ts">
	import { linkedOf, type Links } from './timeline';

	/** `links`: the versions both sides link (the proposal's and its base's), to name them by their story and number */
	let { diff, fresh = false, links = {} }: { diff: StoryDiff; fresh?: boolean; links?: Links | null } = $props();

	/** a hash said as what it names: a frame's image, a recording, a linked story's version (its number, where it is known) */
	const HASHED: Record<string, string> = { frame: 'image', audio: 'recording', version: 'version' };
	const short = (v: unknown, n = 600, field = 'frame') => {
		if (v === null || v === undefined || v === '') return '—';
		if (typeof v === 'number') return `${Math.round(v * 100) / 100}`;
		if (field === 'version' && typeof v === 'string' && links?.[v]) return `v${links[v].number}`;
		const s = typeof v === 'string' ? (/^[0-9a-f]{64}$/.test(v) ? `${HASHED[field] ?? 'file'} ${v.slice(0, 10)}…` : v) : JSON.stringify(v);
		return s.length > n ? s.slice(0, n - 1) + '…' : s;
	};
	/** the version a link clip plays, by its story's title and its number where it can be read ("The trailer · v3") */
	const linked = (c: DiffClip) => {
		const l = linkedOf(c, links);
		return `links ${l ? `“${l.title}” · v${l.number}` : `story ${String(c.story).slice(0, 8)}…`}`;
	};
	/** a clip in a few words: its time and what it holds */
	const gist = (c: DiffClip) => {
		const what = typeof c.story === 'string' ? linked(c) : c.line ?? c.text ?? c.section ?? c.transition ?? (c.frame ? 'a frame' : '');
		return `${short(c.at)}–${short(c.at + c.duration)} s${c.who ? ` · ${c.who}` : ''}${what ? ` · ${short(what, 90)}` : ''}`;
	};
	const touched = $derived(diff.tracks.filter((t) => t.state !== 'same'));
	/** a track's changed clips: those only moved in time, gathered into runs moved by the same amount, and the rest */
	function split(changed: { id: string; changes: Change[] }[]) {
		const moved: { from: string; to: string; n: number; by: number }[] = [];
		const rest: typeof changed = [];
		for (const c of changed) {
			const only = c.changes.length === 1 && c.changes[0].field === 'at' && typeof c.changes[0].from === 'number' && typeof c.changes[0].to === 'number';
			if (!only) {
				rest.push(c);
				continue;
			}
			const by = Math.round(((c.changes[0].to as number) - (c.changes[0].from as number)) * 1000) / 1000;
			const last = moved[moved.length - 1];
			if (last && last.by === by) {
				last.to = c.id;
				last.n++;
			} else moved.push({ from: c.id, to: c.id, n: 1, by });
		}
		return { moved, rest };
	}
	const later = (by: number) => `${Math.abs(by)} s ${by > 0 ? 'later' : 'earlier'}`;
</script>

<div class="changes">
	{#if diff.title}<p class="row"><b>Title</b> <span class="from">{diff.title.from}</span> → <span class="to">{diff.title.to}</span></p>{/if}
	{#each diff.settings as s (s.field)}
		<p class="row"><b>{s.field}</b> <span class="from">{short(s.from)}</span> → <span class="to">{short(s.to)}</span></p>
	{/each}
	{#each touched as t (t.id)}
		{@const parts = split(t.changed)}
		<section class="track">
			<h4>{t.id}{#if t.kind !== t.id} <span class="muted">{t.kind}</span>{/if} <span class="state {t.state}">{fresh ? `${t.added.length} clips` : t.state}</span></h4>
			{#if !fresh}
				{#each t.added as c (c.id)}<p class="clip add">+ {c.id} · {gist(c)}</p>{/each}
				{#each t.removed as c (c.id)}<p class="clip del">− {c.id} · {gist(c)}</p>{/each}
				{#each parts.moved as r (r.from)}<p class="clip mov">↔ {r.from === r.to ? r.from : `${r.from} … ${r.to} (${r.n} clips)`} moved {later(r.by)}</p>{/each}
				{#each parts.rest as c (c.id)}
					<div class="clip chg">
						<span>~ {c.id}</span>
						{#each c.changes as x (x.field)}
							<p class="row"><b>{x.field}</b> <span class="from">{short(x.from, 600, x.field)}</span> → <span class="to">{short(x.to, 600, x.field)}</span></p>
						{/each}
					</div>
				{/each}
			{/if}
		</section>
	{:else}
		{#if !diff.title && !diff.settings.length}<p class="muted">Nothing changed.</p>{/if}
	{/each}
</div>

<style>
	.changes { display: grid; gap: 0.6rem; font-size: 0.86rem; }
	.track { display: grid; gap: 0.25rem; padding: 0.6rem 0.7rem; border-radius: 10px; background: var(--paper); border: 1px solid var(--line); }
	h4 { margin: 0; font-size: 0.9rem; display: flex; gap: 0.4rem; align-items: center; }
	.state { font-size: 0.7rem; font-weight: 700; padding: 0 0.5em; border-radius: 999px; background: var(--sage-soft); }
	.state.removed { background: color-mix(in srgb, var(--terracotta, #c96f53) 25%, transparent); }
	.state.added { background: color-mix(in srgb, var(--sage, #8fae8b) 35%, transparent); }
	.clip { margin: 0; padding: 0.2rem 0.4rem; border-radius: 6px; line-height: 1.35; }
	.clip.add { background: color-mix(in srgb, var(--sage, #8fae8b) 22%, transparent); }
	.clip.del { background: color-mix(in srgb, var(--terracotta, #c96f53) 18%, transparent); }
	.clip.mov { background: color-mix(in srgb, var(--line) 45%, transparent); }
	.clip.chg { background: color-mix(in srgb, var(--mustard, #d9a441) 14%, transparent); display: grid; gap: 0.15rem; }
	.row { margin: 0; }
	.row b { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-right: 0.3rem; }
	.from { text-decoration: line-through; opacity: 0.7; }
	.to { font-weight: 600; }
</style>
