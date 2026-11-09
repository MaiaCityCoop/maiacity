<!--
	The Library (Samuel 2026-11-04): every image, video and recording play keeps among its files (play.files, the bytes in
	the bucket; play/api/src/library.ts), newest first, laid out as the Postgres page is (its Frame): the kinds and a
	search down the left, the files as a wall of tiles in the middle, and down the right the one opened whole: played or
	shown large, its label (renamed here; only shown, a file is named by its hash), its hash, type, size and date, and
	where the newest version of every story uses it, and which plants (asset versions) have it as their reference sheet. Maia City's admins alone (the API says so too).

	One Library for every account (intent 732d8a38, Samuel 2026-11-07): it shows the library of whoever you act as (the
	You menu's "Act as", $lib/acting.svelte.ts): yourself, your personal library, private to you; Maia City, the coop's,
	as before. Its owner is named on top. Nothing is uploaded here: files come in over MCP (add_story_frame, add_document,
	with `library: "personal"` for your own).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Frame from '$lib/app/Frame.svelte';
	import Icon from '$lib/app/Icon.svelte';
	import { api, fileText, fileUrl as url } from '$lib/api';
	import { session } from '$lib/session.svelte';
	import { acting, asCity } from '$lib/acting.svelte';

	const PAGE = 60;
	type StoryUse = { story: string; title: string; number: number | null; track: string; clip: string; as: 'frame' | 'video' | 'audio'; at: number };
	type SheetUse = { asset: string; label: string; group: string; number: number | null; version: string; as: 'sheet' | 'datasheet' | 'brief'; accepted: boolean };
	type Use = StoryUse | SheetUse;
	type File = { hash: string; size: number; media_type: string; created: string; label: string | null; used: Use[] };
	type Owner = { library: 'coop' | 'personal'; id: string; name: string };
	type Page = { owner: Owner; total: number; offset: number; limit: number; counts: Record<string, number>; files: File[] };
	const KINDS = [
		{ id: '', label: 'Everything', icon: 'library' },
		{ id: 'image', label: 'Images', icon: 'image' },
		{ id: 'video', label: 'Videos', icon: 'film' },
		{ id: 'audio', label: 'Recordings', icon: 'audio' },
		{ id: 'document', label: 'Documents', icon: 'article' }
	] as const;

	let kind = $state('');
	let query = $state('');
	let files = $state<File[]>([]);
	let total = $state(0);
	let counts = $state<Record<string, number>>({});
	let loaded = $state(false);
	let busy = $state(false);
	let error = $state('');
	let open = $state<File | null>(null);
	let label = $state('');
	let saving = $state(false);
	let copied = $state(false);
	let owner = $state<Owner | null>(null);
	const admin = $derived(session.me?.level === 'admin');
	/** the library of whoever the person acts as: Maia City's (the coop's) or their own */
	const library = $derived<'coop' | 'personal'>(asCity() ? 'coop' : 'personal');
	// a document is Markdown (a plant's data sheet, its sheet's brief); the rest by their media type
	const kindOf = (f: File) => (f.media_type === 'text/markdown' ? 'document' : f.media_type.split('/')[0]);
	/** what a plant version keeps a file as */
	const DOC_AS = { sheet: 'reference sheet', datasheet: 'data sheet', brief: 'sheet brief' };
	const size = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : n >= 1e3 ? `${Math.round(n / 1e3)} kB` : `${n} B`);
	const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	const AS = { frame: 'still', video: 'video', audio: 'recording' };

	/** a page of files: the first (again, for a new kind or search) or the next */
	async function load(more = false) {
		busy = true;
		error = '';
		try {
			const q = new URLSearchParams({ library, offset: String(more ? files.length : 0), limit: String(PAGE) });
			if (kind) q.set('kind', kind);
			if (query.trim()) q.set('q', query.trim());
			const page = await api<Page>(`/library?${q}`);
			files = more ? [...files, ...page.files] : page.files;
			owner = page.owner;
			total = page.total;
			counts = page.counts;
			const at = new URL(location.href);
			kind ? at.searchParams.set('kind', kind) : at.searchParams.delete('kind');
			history.replaceState(history.state, '', at);
		} catch (e) {
			error = (e as Error).message;
		}
		busy = false;
		loaded = true;
	}
	onMount(() => {
		if (!admin) return void goto('/', { replaceState: true });
		const given = new URLSearchParams(location.search);
		kind = given.get('kind') ?? '';
		// a link straight to one file (the asset library's data sheet and brief): the search for its hash
		query = given.get('q') ?? '';
	});
	// acting as someone else (the You menu) opens their library: the first page again, nothing opened
	let shown = '';
	$effect(() => {
		const now = `${library}:${acting.as}`;
		if (!admin || now === shown) return;
		shown = now;
		open = null;
		void load();
	});
	let searching: ReturnType<typeof setTimeout> | undefined;
	function search() {
		clearTimeout(searching);
		searching = setTimeout(() => load(), 250);
	}
	function choose(id: string) {
		kind = id;
		open = null;
		void load();
	}
	function show(f: File) {
		open = f;
		label = f.label ?? '';
		copied = false;
	}
	async function rename() {
		if (!open) return;
		saving = true;
		error = '';
		try {
			const r = await api<{ hash: string; label: string | null }>(`/library/${open.hash}/label`, { json: { label, library } });
			const f = files.find((x) => x.hash === r.hash);
			if (f) f.label = r.label;
			open = { ...open, label: r.label };
		} catch (e) {
			error = (e as Error).message;
		}
		saving = false;
	}
	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
		} catch {
			copied = false;
		}
	}
	const all = $derived(Object.values(counts).reduce((a, b) => a + b, 0));
</script>

<svelte:head><title>Library · maiaCITY play</title></svelte:head>

{#snippet shelf()}
	<input class="nav-search" type="search" placeholder="Find by label or hash" bind:value={query} oninput={search} aria-label="Find a file by its label or hash" />
	<h3 class="nav-group">{owner?.library === 'personal' ? 'Your library · private to you' : "Maia City's library"}</h3>
	{#each KINDS as k (k.id)}
		<a class="nav-item" class:on={kind === k.id} href="?kind={k.id}" onclick={(e) => (e.preventDefault(), choose(k.id))} aria-current={kind === k.id ? 'page' : undefined}
			><Icon name={k.icon} size={16} /><span>{k.label}</span><small>{(k.id ? counts[k.id] ?? 0 : all).toLocaleString('en-US')}</small></a
		>
	{/each}
{/snippet}

{#snippet about()}
	{#if open}
		<header class="about-head">
			<small>{kindOf(open)} · {open.media_type}</small>
			<h3>{open.label ?? 'No label yet'}</h3>
			<p class="soft">{size(open.size)} · kept {when(open.created)}</p>
		</header>
		<div class="large">
			{#if kindOf(open) === 'video'}
				<!-- svelte-ignore a11y_media_has_caption -->
				<video src={url(open.hash)} controls autoplay muted loop playsinline></video>
			{:else if kindOf(open) === 'audio'}
				<audio src={url(open.hash)} controls></audio>
			{:else if kindOf(open) === 'document'}
				{#await fileText(open.hash)}
					<p class="soft">Reading it…</p>
				{:then text}
					<pre class="doc">{text}</pre>
				{:catch}
					<p class="soft">It could not be read.</p>
				{/await}
			{:else}
				<a href={url(open.hash)} target="_blank" rel="noopener"><img src={url(open.hash)} alt={open.label ?? 'An image'} /></a>
			{/if}
		</div>
		<form class="rename" onsubmit={(e) => (e.preventDefault(), rename())}>
			<label for="label" class="side-head">Label <small>only shown; the file is named by its hash</small></label>
			<div class="row">
				<input id="label" type="text" maxlength="200" bind:value={label} placeholder="What it is, where it came from" />
				<button class="chip" type="submit" disabled={saving || label.trim() === (open.label ?? '')}>{saving ? 'Saving…' : 'Save'}</button>
			</div>
		</form>
		<h4 class="side-head">Hash</h4>
		<p class="hash mono"><span>{open.hash}</span> <button class="chip" onclick={() => open && copy(open.hash)}>{copied ? 'Copied' : 'Copy'}</button></p>
		<h4 class="side-head">Used in</h4>
		{#if open.used.length}
			<ul class="uses">
				{#each open.used as u ('version' in u ? u.version + u.as : u.story + u.track + u.clip + u.as)}
					{#if 'version' in u}
						<li>
							{#if u.accepted}<a href="/assets/#{u.asset}">{u.label}</a> <span class="soft">v{u.number} · its {DOC_AS[u.as]}</span>
							{:else}<a href="/intents/">{u.label}</a> <span class="soft">a proposed version · its {DOC_AS[u.as]}</span>{/if}
						</li>
					{:else}
						<li><a href="/stories/#{u.story}">{u.title}</a> <span class="soft">v{u.number ?? '?'} · {u.track} · {u.clip} at {u.at} s · its {AS[u.as]}</span></li>
					{/if}
				{/each}
			</ul>
		{:else}
			<p class="soft hint">No story's newest version uses it, and no plant has it as its sheet yet.</p>
		{/if}
	{/if}
{/snippet}

{#if admin}
	<div class="pg">
		<Frame nav={loaded ? shelf : undefined} aside={open ? about : undefined} navLabel="The Library's kinds" asideLabel="The file opened" navIcon="library" asideIcon="info" flush>
			{#if !loaded}
				<p class="note soft">Opening the Library…</p>
			{:else}
				<div class="sheet">
					{#if owner}
						<header class="owner" class:own={owner.library === 'personal'}>
							<span class="who"><Icon name={owner.library === 'personal' ? 'lock' : 'users'} size={18} /></span>
							<span class="what">
								<b>{owner.library === 'personal' ? `${owner.name}'s library` : "Maia City's library"}</b>
								<small>{owner.library === 'personal' ? 'Private to you: no one else sees or lists these files. Act as Maia City for the coop’s.' : 'The coop’s files, for its admins. Act as yourself for your own library.'}</small>
							</span>
						</header>
					{/if}
					<div class="bar">
						<b>{KINDS.find((k) => k.id === kind)?.label}</b>
						<span class="soft">{total.toLocaleString('en-US')} {total === 1 ? 'file' : 'files'}{query.trim() ? ` matching “${query.trim()}”` : ''} · newest first</span>
					</div>
					{#if error}<p class="bad">{error}</p>{/if}
					<div class="wall" class:busy>
						{#each files as f (f.hash)}
							<button class="tile" class:on={open?.hash === f.hash} onclick={() => show(f)} title={f.label ?? f.hash}>
								<span class="pic">
									{#if kindOf(f) === 'video'}
										<video src="{url(f.hash)}#t=0.5" muted playsinline preload="metadata" onmouseenter={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => {})} onmouseleave={(e) => (e.currentTarget as HTMLVideoElement).pause()}></video>
										<span class="badge">Video</span>
									{:else if kindOf(f) === 'audio'}
										<span class="sound"><Icon name="audio" size={30} /></span>
										<span class="badge">Recording</span>
									{:else if kindOf(f) === 'document'}
										<span class="sound"><Icon name="article" size={30} /></span>
										<span class="badge">Document</span>
									{:else}
										<img src={url(f.hash)} alt="" loading="lazy" />
									{/if}
									{#if f.used.length}<span class="used">{f.used.length} {f.used.length === 1 ? 'use' : 'uses'}</span>{/if}
								</span>
								<span class="name">{f.label ?? f.hash.slice(0, 12)}</span>
								<small class="soft">{f.media_type.split('/')[1]} · {size(f.size)}</small>
							</button>
						{:else}
							<p class="note soft">
								Nothing here{query.trim() ? ' matches that' : ' yet'}.{#if !query.trim() && owner?.library === 'personal'}
									Your files come in over MCP: your agent adds them with <code>add_story_frame</code> or <code>add_document</code> and <code>library: "personal"</code>.{/if}
							</p>
						{/each}
						{#if files.length < total}
							<div class="more"><button class="chip" disabled={busy} onclick={() => load(true)}>{busy ? 'Loading…' : `Show more (${total - files.length} left)`}</button></div>
						{/if}
					</div>
				</div>
			{/if}
		</Frame>
	</div>
{/if}

<style>
	.pg {
		position: fixed;
		inset: 0;
		background: var(--cream);
		--soft: rgb(38 56 44 / 0.6);
	}
	.pg :global(.soft) { color: var(--soft); }
	.pg :global(.chip) { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.15rem 0.6rem; border: 0; border-radius: 999px; background: rgb(0 0 0 / 0.06); font: inherit; font-size: 0.74rem; font-weight: 500; color: inherit; cursor: pointer; }
	.pg :global(.chip:disabled) { opacity: 0.45; cursor: default; }
	.mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
	.note { margin: 1rem clamp(1rem, 3vw, 2.4rem); }
	.bad { margin: 0.5rem 1rem; color: var(--terracotta); font-size: 0.85rem; }

	.sheet { display: flex; flex-direction: column; height: 100%; }
	.bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem 0.9rem; padding: 0.7rem 1rem; border-bottom: 1px solid var(--line); background: rgb(255 255 255 / 0.94); font-size: 0.85rem; }
	.bar b { font-size: 1rem; }
	/* whose library it is, on top */
	.owner { display: flex; align-items: center; gap: 0.6rem; padding: 0.65rem 1rem; border-bottom: 1px solid var(--line); background: var(--mustard-soft, #f3e3b5); }
	.owner.own { background: rgb(36 69 47 / 0.1); }
	.owner .who { display: grid; place-items: center; width: 2rem; height: 2rem; border-radius: 999px; background: #fff; color: var(--brand-green, #24452f); flex: none; }
	.owner .what { display: flex; flex-direction: column; min-width: 0; }
	.owner b { font-size: 0.95rem; }
	.owner small { font-size: 0.75rem; color: var(--soft); }
	.note code { font-size: 0.78rem; }

	/* the wall: square tiles, as many across as fit */
	.wall { flex: 1; min-height: 0; overflow: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(10.5rem, 1fr)); gap: 0.9rem; align-content: start; padding: 1rem 1rem var(--nav-room); }
	.wall.busy { opacity: 0.55; }
	.tile { display: flex; flex-direction: column; gap: 0.2rem; padding: 0; border: 0; background: none; font: inherit; color: inherit; text-align: left; cursor: pointer; min-width: 0; }
	.pic { position: relative; display: block; aspect-ratio: 1; border-radius: 12px; overflow: hidden; background: #e9e4d8; box-shadow: 0 1px 2px rgb(0 0 0 / 0.08); }
	.tile.on .pic { outline: 3px solid var(--terracotta, #c96f53); outline-offset: 2px; }
	.pic img, .pic video { width: 100%; height: 100%; object-fit: cover; display: block; }
	.sound { display: grid; place-items: center; width: 100%; height: 100%; color: var(--brand-green, #24452f); }
	.badge, .used { position: absolute; left: 0.4rem; padding: 0.05rem 0.45rem; border-radius: 999px; background: rgb(255 255 255 / 0.9); font-size: 0.66rem; font-weight: 600; }
	.badge { top: 0.4rem; }
	.used { bottom: 0.4rem; background: var(--mustard-soft, #f3e3b5); }
	.name { font-size: 0.8rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.tile small { font-size: 0.7rem; }
	.more { grid-column: 1 / -1; display: flex; justify-content: center; padding: 0.5rem 0 1rem; }

	/* the right: the file opened */
	.about-head { margin: 0 0 0.8rem 0.35rem; }
	.about-head small { color: var(--brand-green); font-size: 0.7rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
	.about-head h3 { margin: 0.15rem 0 0; font-size: 1rem; font-weight: 600; overflow-wrap: anywhere; }
	.about-head p { margin: 0.1rem 0 0; font-size: 0.8rem; }
	.large { margin: 0 0 0.9rem 0.35rem; border-radius: 12px; overflow: hidden; background: #15130f; }
	.large img, .large video { display: block; width: 100%; height: auto; max-height: 60vh; object-fit: contain; }
	.large audio { display: block; width: 100%; background: #fff; }
	.side-head { display: block; margin: 0.8rem 0 0.4rem 0.35rem; color: var(--soft); font-family: var(--font-body); font-size: 0.68rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
	.side-head small { text-transform: none; letter-spacing: 0; font-weight: 400; }
	.rename .row { display: flex; gap: 0.4rem; margin-left: 0.35rem; }
	.rename input { flex: 1; min-width: 0; padding: 0.35rem 0.55rem; border: 1px solid var(--line); border-radius: 8px; font: inherit; font-size: 0.85rem; background: #fff; }
	.hash { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 0 0.35rem; font-size: 0.72rem; }
	.hash span { overflow-wrap: anywhere; }
	.uses { margin: 0 0 0 0.35rem; padding: 0; list-style: none; display: grid; gap: 0.35rem; font-size: 0.82rem; }
	.uses a { font-weight: 600; }
	.hint { margin: 0 0 0 0.35rem; font-size: 0.8rem; }
	/* a document opened whole: its Markdown as it is written */
	.doc { max-height: 60vh; overflow: auto; margin: 0; padding: 0.75rem; white-space: pre-wrap; font-size: 0.78rem; line-height: 1.45; background: rgb(0 0 0 / 0.03); border-radius: 0.5rem; }
</style>
