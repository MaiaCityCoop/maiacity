<script lang="ts">
	import { page } from '$app/state';
	import { api, may } from '$lib/api';
	import { session } from '$lib/session.svelte';
	import AssetPreview from '$lib/AssetPreview.svelte';

	type Variant = { name: string; recipe: string; label: string | null };
	type Version = { id: string; number: number; parents: string[]; recipe: string | null; defaultVariant: string | null; note: string; created: string; author: string | null; approvedBy: string | null; imported: boolean; variants: Variant[]; cardLabel: string | null; triangles: number | null; size: number[] | null };
	type Asset = { id: string; grp: string; slug: string; label: string; versions: Version[] };

	let asset = $state<Asset | null>(null);
	let error = $state('');
	let at = $state<number | null>(null);
	let variant = $state<string | null>(null);
	const id = $derived(`${page.params.grp}/${page.params.slug}`);
	$effect(() => {
		const want = id;
		api<Asset>(`/assets/${want}`).then(
			(a) => ((asset = a), (at = a.versions[0]?.number ?? null), (variant = a.versions[0]?.defaultVariant ?? null)),
			(e) => (error = e.message)
		);
	});
	const version = $derived(asset?.versions.find((v) => v.number === at) ?? null);
	const ref = $derived(version ? `${id}@${version.number}${variant ? `:${variant}` : ''}` : '');
	const short = (h: string | null) => (h ? `${h.slice(0, 10)}…` : '—');

	// a citizen proposes the next version: its recipe file, made by the asset box for version head + 1
	let file = $state<FileList | null>(null);
	let note = $state('');
	let sent = $state('');
	async function propose() {
		sent = '';
		try {
			const recipe = await file![0].text();
			const r = await api('/proposals', { json: { asset: id, base: asset?.versions[0]?.id ?? null, recipe, note } });
			sent = `Proposed as v${r.number}: an admin will look at it.`;
		} catch (e) {
			sent = (e as Error).message;
		}
	}
</script>

<svelte:head><title>{asset?.label ?? id} · Assets · maiaCITY play</title></svelte:head>

<main class="page">
	<p><a href="/assets/">← The asset library</a></p>
	{#if error}<p class="error">{error}</p>{/if}
	{#if asset}
		<h1>{asset.label}</h1>
		<p class="muted"><span class="pill">{asset.grp}</span> {asset.id} · owned by Maia City · {asset.versions.length} version{asset.versions.length === 1 ? '' : 's'}</p>
		<div class="layout">
			<section>
				{#key ref}{#if ref}<AssetPreview {ref} />{/if}{/key}
				<p class="ref"><code>{ref}</code></p>
				{#if version && version.variants.length}
					<div class="variants">
						{#each version.variants as x}<button class="btn small" class:ghost={variant !== x.name} onclick={() => (variant = x.name)}>{x.label?.split(': ').at(-1) ?? x.name}</button>{/each}
					</div>
				{/if}
			</section>
			<section>
				<h2>Versions</h2>
				<ol class="chain">
					{#each asset.versions as v (v.id)}
						<li class:on={v.number === at}>
							<button class="link" onclick={() => ((at = v.number), (variant = v.defaultVariant))}>
								<strong>v{v.number}</strong>
								<span>{v.cardLabel ?? asset.label}</span>
							</button>
							<p class="muted">
								{v.imported ? 'From legacy avenDB' : `By ${v.author ?? 'someone'}`}{v.approvedBy ? ` · accepted by ${v.approvedBy}` : ''}
								· {new Date(v.created).toLocaleDateString()}
								{#if v.triangles} · {v.triangles.toLocaleString()} triangles{/if}
								{#if v.size} · {v.size.map((n) => n.toFixed(2)).join(' × ')} m{/if}
							</p>
							{#if v.note}<p class="note">{v.note}</p>{/if}
							<p class="muted mono">id {short(v.id)} · recipe {short(v.recipe ?? v.variants.find((x) => x.name === v.defaultVariant)?.recipe ?? null)}{v.parents.length ? ` · after ${short(v.parents[0])}` : ''}</p>
						</li>
					{/each}
				</ol>
				{#if may(session.me, 'propose', 'asset_version')}
					<div class="card propose">
						<h3>Propose v{(asset.versions[0]?.number ?? 0) + 1}</h3>
						<p class="muted">Upload the recipe file the asset box made for <code>{asset.id}@{(asset.versions[0]?.number ?? 0) + 1}</code>. An admin accepts or rejects it.</p>
						<input type="file" accept=".js,text/javascript" bind:files={file} />
						<input placeholder="What changed" bind:value={note} />
						<button class="btn" disabled={!file?.length} onclick={propose}>Propose</button>
						{#if sent}<p>{sent}</p>{/if}
					</div>
				{/if}
			</section>
		</div>
	{/if}
</main>

<style>
	.layout { display: grid; grid-template-columns: 1.3fr 1fr; gap: 2rem; margin-top: 1.5rem; align-items: start; }
	.ref { margin: 0.6rem 0; }
	.variants { display: flex; gap: 0.4rem; flex-wrap: wrap; }
	.chain { list-style: none; padding: 0; margin: 0; border-left: 2px solid var(--line); }
	.chain li { padding: 0.6rem 0 0.8rem 1rem; position: relative; }
	.chain li::before { content: ''; position: absolute; left: -7px; top: 1rem; width: 12px; height: 12px; border-radius: 50%; background: var(--paper); border: 2px solid var(--sage); }
	.chain li.on::before { background: var(--mustard); border-color: var(--mustard); }
	.chain p { margin: 0.15rem 0; font-size: 0.85rem; }
	.link { background: none; border: 0; padding: 0; font: inherit; color: inherit; cursor: pointer; display: flex; gap: 0.6rem; align-items: baseline; }
	.note { color: var(--ink-soft); }
	.mono { font-family: ui-monospace, monospace; font-size: 0.75rem !important; }
	.propose { padding: 1.2rem; margin-top: 1.5rem; display: grid; gap: 0.6rem; }
	.propose h3 { margin: 0; }
	@media (max-width: 860px) { .layout { grid-template-columns: 1fr; } }
</style>
