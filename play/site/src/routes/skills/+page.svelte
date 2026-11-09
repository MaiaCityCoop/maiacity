<!--
	Skills (play/SPEC.md §4.14, "Version control"; Samuel 2026-11-06): what play teaches its agents, kept once in play's
	Postgres, each skill a Loro document (play/api/src/skills.ts, one kind of play/api/src/versioned.ts). On the left the
	skills, by their group (only shown: a skill is named by its id); in the middle the one picked, as it is taught: its
	part of the system prompt every agent connected over MCP gets, and, for the Intents skill, what to do at each of an
	intent's stages; on the right the one aside ($lib/app/Aside.svelte): its Info and its History. A skill changes only by proposal, over MCP (doc_edit,
	propose_doc_version), decided on the intents' board. `?skill=<id>` picks one, `&v=<n>` one of its versions,
	`&intent=<id>` the skill as an intent's work at Proposal would make it. Admins only.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { api } from '$lib/api';
	import { session } from '$lib/session.svelte';
	import Frame from '$lib/app/Frame.svelte';
	import Icon from '$lib/app/Icon.svelte';
	import Aside, { type Pick } from '$lib/app/Aside.svelte';
	import { markdown } from '$lib/site/markdown/index.js';

	type Item = { id: string; label: string; group: string; note: string; stages: string[]; number: number; versions: number };
	type Skill = { id: string; json: { label: string; group: string; note?: string; system: string; stages?: Record<string, string> }; number: number; version?: number; edit?: number; intent?: { id: string; status: string; note: string } };
	const STAGES = ['idea', 'specify', 'build', 'proposal', 'ship', 'accepted', 'archived'];

	const admin = $derived(session.me?.level === 'admin');
	let list = $state<Item[]>([]);
	let skill = $state<Skill | null>(null);
	let error = $state('');
	const params = $derived(page.url.searchParams);
	const id = $derived(params.get('skill') ?? list[0]?.id ?? '');
	const wantV = $derived(params.get('v'));
	const wantIntent = $derived(params.get('intent'));
	$effect(() => {
		if (!admin) return void (session.me && goto('/', { replaceState: true }));
		api<Item[]>('/docs?kind=skill').then((l) => (list = l), (e) => (error = e.message));
	});
	const query = () => (wantIntent ? `?intent=${encodeURIComponent(wantIntent)}` : wantV ? `?v=${encodeURIComponent(wantV)}` : '');
	$effect(() => {
		if (!admin || !id) return;
		const q = query();
		let gone = false;
		api<Skill>(`/docs/${id}${q}`).then(
			(s) => !gone && ((skill = s), (error = '')),
			(e) => !gone && (error = e.message)
		);
		return () => (gone = true);
	});
	const at = (s: string, v?: number) => goto(`?skill=${s}${v ? `&v=${v}` : ''}`, { keepFocus: true, noScroll: true });
	/** its History: a version picked is that version; an edit picked, the skill as it stood at it */
	async function picked(p: Pick | null) {
		if (!skill) return;
		if (!p) return void (skill = await api<Skill>(`/docs/${skill.id}${query()}`));
		if ('version' in p) return void at(skill.id, p.version === skill.number ? undefined : p.version);
		skill = await api<Skill>(`/docs/${skill.id}?edit=${p.edit.seq}`);
	}
	const groups = $derived.by(() => {
		const out = new Map<string, Item[]>();
		for (const s of list) out.set(s.group, [...(out.get(s.group) ?? []), s]);
		return [...out];
	});
	const md = (s: string | null | undefined) => markdown(s ?? '');
	const name = (st: string) => st[0].toUpperCase() + st.slice(1);
</script>

<svelte:head><title>{skill?.json.label ?? 'Skills'} · Skills · maiaCITY play</title></svelte:head>

{#snippet shelf()}
	{#each groups as [g, items] (g)}
		<h3 class="nav-group">{g}</h3>
		{#each items as s (s.id)}
			<a class="nav-item" class:on={id === s.id} href="?skill={s.id}" onclick={(e) => (e.preventDefault(), at(s.id))} aria-current={id === s.id ? 'page' : undefined}
				><Icon name="note" size={16} /><span>{s.label}</span><small>v{s.number}</small></a
			>
		{/each}
	{:else}
		<p class="soft none">{error ? '' : 'No skills yet.'}</p>
	{/each}
{/snippet}

{#snippet side()}
	<Aside doc={skill!} where="Skills / {skill!.json.group}" label={skill!.json.label} shown={wantV ? Number(wantV) : null} propose="Propose v{skill!.number + 1} over MCP (doc_edit, propose_doc_version): taught from the next request on." onPick={picked} />
{/snippet}

{#if admin}
	<div class="skills">
		<Frame nav={list.length ? shelf : undefined} aside={skill ? side : undefined} navLabel="What play teaches its agents" asideLabel="The skill's history" navIcon="board">
			<article class="body">
				{#if error}<p class="bad">{error}</p>{/if}
				{#if skill}
					<p class="eyebrow">Skills · {skill.json.group}</p>
					<h1>{skill.json.label}</h1>
					{#if skill.json.note}<p class="lead">{skill.json.note}</p>{/if}
					<section>
						<h2>What every agent is taught</h2>
						<div class="md">{@html md(skill.json.system)}</div>
					</section>
					{#if skill.json.stages}
						{#each STAGES.filter((st) => `${skill!.json.stages?.[st] ?? ''}`.trim()) as st (st)}
							<section>
								<h2>At {name(st)}</h2>
								<div class="md">{@html md(skill.json.stages[st])}</div>
							</section>
						{/each}
					{/if}
				{/if}
			</article>
		</Frame>
	</div>
{/if}

<style>
	.skills { position: fixed; inset: 0; background: var(--cream); --soft: rgb(38 56 44 / 0.6); --accent: var(--brand-green); }
	.skills :global(.soft) { color: var(--soft); }
	.body { max-width: 46rem; padding: 0.4rem 0 3rem; }
	.eyebrow { margin: 0; color: var(--accent); font-size: 0.7rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
	h1 { margin: 0.2rem 0 0.5rem; font-size: clamp(1.5rem, 3vw, 2rem); }
	.lead { margin: 0 0 1.2rem; color: var(--ink-soft); }
	section { margin: 1.4rem 0 0; }
	h2 { margin: 0 0 0.4rem; font-size: 0.78rem; font-family: var(--font-body); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--soft); }
	.md { font-size: 0.92rem; line-height: 1.55; overflow-wrap: anywhere; }
	.md :global(p) { margin: 0 0 0.7rem; }
	.md :global(code) { font-size: 0.85em; }
	.bad { color: var(--terracotta, #c23a22); }
	.none { padding: 0.4rem 0.6rem; font-size: 0.84rem; }
</style>
