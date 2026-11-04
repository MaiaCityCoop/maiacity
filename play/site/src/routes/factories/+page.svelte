<!--
	Factories: every production line play shows ($lib/content/factories), in the asset viewer's layout ($lib/app/Frame,
	as the asset library has it; Samuel 2026-11-04): on the left the factories to pick from, in the middle the one picked
	as a live 3D miniature on a real discrete event simulation — AirSup's factory skill (.claude/skills/factory-skill),
	its runtime as legacy ported it, its HUD theirs (hud.css, scoped to its host): the day's output against the target,
	every station's busy, blocked, down and starved, the bottleneck, an inspector with the sizing rule and the what-ifs.
	On the right, ours: what the line is, its versions, and its bill of process, every part of what it builds with what it
	is made from and every operation it goes through, at which station and for how long; a part picked lights up its
	route through the factory, and a station picked lists what it does for one machine. What the line builds is our own
	asset, by its slot of the Factories' pins (the LifeTrac), built in the asset box. `?factory=<id>` picks a line;
	AirSup's queries still work (`?select=weld`, `?assemble=0`, `?film=1`).
-->
<script lang="ts">
	import { tick } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { session } from '$lib/session.svelte';
	import Frame from '$lib/app/Frame.svelte';
	import Icon from '$lib/app/Icon.svelte';
	import { FACTORIES } from '$lib/content/factories/index.js';
	import { ASSEMBLIES, STOCK, opsAt, totals } from '$lib/content/factories/lifetrac-bom.js';
	import '$lib/content/factories/hud.css';

	type Op = { at: string; s: number; what: string };
	type Part = { id: string; label: string; assembly: string; qty: number; raw: { stock?: string; size?: string; kg?: number; bought?: string; also?: string[] }; ops: Op[] };
	type App = { dispose: () => void; select: (id: string | null) => void; showRoute: (ids: string[] | null) => void; camTo: (v: object, s?: number) => void; stationCenter: (id: string) => unknown };

	let host = $state<HTMLDivElement>();
	let error = $state('');
	let phase = $state('Building the line…');
	let missing = $state<{ ref: string; why: string }[]>([]);
	let app: App | undefined;

	// the factory picked in the left column, by its address
	const factory = $derived(FACTORIES.find((f) => f.id === page.url.searchParams.get('factory')) ?? FACTORIES[0]);
	const spec = $derived(factory.build());
	const parts = $derived((factory.parts ?? []) as Part[]);
	const T = totals();
	const stationOf = $derived(new Map(spec.stations.map((s) => [s.id, s])));
	const pick = (id: string) => goto(id === FACTORIES[0].id ? '?' : `?factory=${id}`, { keepFocus: true, noScroll: true });
	const stock = STOCK as Record<string, { label: string }>;

	/** the bill of process: the filter, the part whose route is shown, the station picked in the factory */
	let q = $state('');
	let shown = $state<string | null>(null);
	let picked = $state<string | null>(null);

	const groups = $derived.by(() => {
		const f = q.trim().toLowerCase();
		const hit = (p: Part) => !f || p.label.toLowerCase().includes(f) || (p.raw.bought ?? '').toLowerCase().includes(f) || (p.raw.stock ? stock[p.raw.stock].label.toLowerCase().includes(f) : false);
		return ASSEMBLIES.map(([id, label]) => ({ id, label, parts: parts.filter((p) => p.assembly === id && hit(p)) })).filter((g) => g.parts.length);
	});

	const secs = (s: number) => (s >= 90 ? `${(s / 60).toFixed(s >= 600 ? 0 : 1)} min` : `${Math.round(s)} s`);
	const routeOf = (p: Part) => p.ops.filter((o) => o.s > 0 || o.at);
	const stationsOf = (p: Part) => [...new Set(p.ops.filter((o) => o.s > 0).map((o) => o.at))];
	const timeOf = (p: Part) => p.ops.reduce((s, o) => s + o.s, 0);

	async function show(p: Part) {
		shown = shown === p.id ? null : p.id;
		app?.showRoute(shown ? stationsOf(p) : null);
		await tick();
		if (shown) document.getElementById(`part-${shown}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}
	function goTo(id: string) {
		app?.select(id);
		const c = app?.stationCenter(id);
		if (c) app?.camTo({ az: 0.62, el: 0.62, dist: 34, target: c }, 1.6);
	}

	const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
	/** what the runtime's inspector adds for a station: everything it does for one machine, part by part */
	function extra(d: { id: string }) {
		const ops = opsAt(d.id).filter((o: Op & { label: string }) => o.s > 0).sort((a: Op, b: Op) => b.s - a.s) as (Op & { label: string })[];
		if (!ops.length) return '';
		const rows = ops.map((o) => `<li><span>${esc(o.label)}</span><b>${esc(secs(o.s))}</b><i>${esc(o.what)}</i></li>`).join('');
		return `<div class="fs-ops"><div class="fs-lab">For one LifeTrac, here · ${ops.length} operations</div><ol>${rows}</ol></div>`;
	}

	// admins only for now (Samuel 2026-11-03): anyone else is taken back to the dashboard, and the API hands the
	// Factories' pins to admins alone
	const admin = $derived(session.me?.level === 'admin');

	// the line picked, built and booted in its host; again whenever another is picked
	$effect(() => {
		if (!admin) return void goto('/', { replaceState: true });
		const spec_ = spec, el = host;
		if (!el) return;
		let gone = false;
		error = '';
		missing = [];
		shown = null;
		picked = null;
		phase = 'Building the line…';
		(async () => {
			try {
				// our machines and shapes into the kit first, then the asset the line builds, in the asset box
				const [{ boot }, { assetsOf }] = await Promise.all([import('$lib/content/factories/app.js'), import('$lib/content/factories/assets.js'), import('$lib/content/factories/lifetrac-kit.js')]);
				phase = 'Building the LifeTrac in the asset box…';
				const got = await assetsOf(spec_);
				if (gone) return;
				missing = got.missing;
				phase = '';
				app = boot(spec_, el, { assets: got.assets, extra, onSelect: (id: string | null) => (picked = id) }) as App;
			} catch (e) {
				error = e instanceof Error ? e.message : String(e);
			}
		})();
		return () => {
			gone = true;
			app?.dispose();
			app = undefined;
		};
	});
</script>

<svelte:head>
	<title>{factory.label} · Factories · maiaCITY play</title>
</svelte:head>

{#snippet shelf()}
	<h3 class="nav-group">Factories</h3>
	{#each FACTORIES as f (f.id)}
		<a class="nav-item" class:on={factory.id === f.id} href={f.id === FACTORIES[0].id ? '?' : `?factory=${f.id}`} onclick={(e) => (e.preventDefault(), pick(f.id))} aria-current={factory.id === f.id ? 'page' : undefined}
			><Icon name="flow" size={16} /><span>{f.label}</span><small>v{f.version}</small></a
		>
	{/each}
{/snippet}

{#snippet about()}
	<header class="about-head">
		<small>Factory · owned by Maia City</small>
		<h3>{factory.label}</h3>
		<p class="note">{factory.note}</p>
		<p class="from">{factory.from}</p>
		{#if missing.length}
			<p class="missing">Drawn with the line’s own model of the LifeTrac and pallet: {[...new Set(missing.map((m) => m.why))].join('; ')}</p>
		{/if}
	</header>
	<h4 class="side-head">Versions</h4>
	<ol class="chain">
		{#each [...factory.versions].reverse() as v (v.v)}
			<li class:on={v.v === factory.version}><b>v{v.v}</b> <span class="from">{v.date}</span><p class="note">{v.note}</p></li>
		{/each}
	</ol>
	{#if parts.length}
		<section class="parts" aria-label="Every part of what it builds and how it is made">
			<h4 class="side-head">Bill of process</h4>
			<p class="sum">{T.parts} parts, {T.pieces} pieces, {T.kg.toLocaleString('en-US')} kg: {T.made} made here from raw stock, {T.bought} bought. Pick one to light up its route through the factory.</p>
			<input type="search" placeholder="Filter: panel, hose, 4140, Parker…" bind:value={q} />
			<div class="list">
				{#each groups as g (g.id)}
					<h5 class="grp">{g.label}</h5>
					{#each g.parts as p (p.id)}
						<div class="part" class:sel={shown === p.id} id="part-{p.id}">
							<button class="head" onclick={() => show(p)}>
								<span class="name">{p.label}{p.qty > 1 ? ` ×${p.qty}` : ''}</span>
								<span class="tag" class:made={!!p.raw.stock}>{p.raw.stock ? 'made' : 'bought'}</span>
							</button>
							{#if shown === p.id}
								<div class="route">
									<p class="raw">
										{#if p.raw.stock}<b>From</b> {stock[p.raw.stock].label}{#each p.raw.also ?? [] as a}; {stock[a].label}{/each}{p.raw.size ? ` · ${p.raw.size}` : ''}{:else}{p.raw.bought}{/if}{p.raw.kg ? ` · ${p.raw.kg} kg` : ''}
									</p>
									{#if p.raw.stock && p.raw.bought}<p class="raw">{p.raw.bought}</p>{/if}
									<ol>
										{#each routeOf(p) as o, i (i)}
											<li class:zero={!o.s}>
												<button class="st" class:here={picked === o.at} onclick={() => goTo(o.at)}>{stationOf.get(o.at)?.name ?? o.at}</button>
												<span class="s">{o.s ? secs(o.s) : '—'}</span>
												<span class="what">{o.what}</span>
											</li>
										{/each}
									</ol>
									<p class="total">{secs(timeOf(p))} of work for one LifeTrac, at {stationsOf(p).length} stations</p>
								</div>
							{/if}
						</div>
					{/each}
				{/each}
			</div>
		</section>
	{/if}
{/snippet}

{#if admin}
	<div class="factories">
		<Frame nav={shelf} aside={about} navLabel="Maia City's factories" asideLabel="The factory, its versions and its bill of process" navIcon="board" flush>
			<div class="stage">
				{#key factory.id}<div class="factory" bind:this={host}></div>{/key}
				{#if phase && !error}<p class="phase">{phase}</p>{/if}
				{#if error}<p class="bad">The factory could not be built: {error}</p>{/if}
			</div>
		</Frame>
	</div>
{/if}

<style>
	/* the whole screen, in the asset library's frame; the nav pill floats over it */
	.factories { position: fixed; inset: 0; background: var(--cream); --soft: rgb(38 56 44 / 0.6); --accent: var(--brand-green); }
	.factories :global(.soft) { color: var(--soft); }
	/* the middle: the runtime's host, its canvas and HUD (.fs-root, hud.css) kept inside the column, not the screen */
	.stage { position: relative; height: 100%; overflow: hidden; }
	.factory { position: absolute; inset: 0; background: #ece6da; }
	.stage :global(.fs-root) { position: absolute; }
	.phase, .bad {
		position: absolute; left: 50%; top: 42%; transform: translateX(-50%); z-index: 5; width: max-content; max-width: min(36rem, 90%); margin: 0;
		padding: 0.8rem 1.1rem; border-radius: 12px; background: rgb(250 247 240 / 0.92); color: var(--ink);
		font: 500 0.95rem/1.4 var(--font-body); box-shadow: var(--shadow);
	}
	.bad { color: #c23a22; }
	.missing { margin: 0.5rem 0 0; padding: 0.45rem 0.6rem; border-radius: 8px; background: rgb(0 0 0 / 0.04); color: #77736a; font: 500 11px/1.4 ui-monospace, Menlo, monospace; }
	/* the right column, as the asset library's */
	.about-head { margin: 0 0 0.9rem 0.35rem; }
	.about-head small { color: var(--accent); font-size: 0.7rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
	.about-head h3 { margin: 0.15rem 0 0.3rem; font-size: 1.15rem; font-family: var(--font-body); font-weight: 600; }
	.note { margin: 0.1rem 0 0; font-size: 0.8rem; line-height: 1.4; color: var(--ink-soft); }
	.from { margin: 0.3rem 0 0; font-size: 0.74rem; color: var(--soft); }
	.side-head { margin: 0 0 0.5rem 0.35rem; color: var(--soft); font-family: var(--font-body); font-size: 0.68rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
	.chain { list-style: none; padding: 0; margin: 0 0 1.2rem 0.4rem; border-left: 2px solid var(--line); }
	.chain li { position: relative; display: block; padding: 0.35rem 0 0.6rem 0.9rem; border: 0; font-size: 0.9rem; }
	.chain li::before { content: ''; position: absolute; left: -7px; top: 0.75rem; width: 10px; height: 10px; border-radius: 50%; background: var(--paper); border: 2px solid var(--sage); }
	.chain li.on::before { background: var(--mustard); border-color: var(--mustard); }
	.chain .note { font-size: 0.76rem; }
	.parts { margin: 0 0 0 0.35rem; color: #24262a; }
	.sum { margin: 0 0 8px; font-size: 0.78rem; line-height: 1.4; color: #5d5a52; }
	input { width: 100%; height: 32px; padding: 0 10px; border: 1px solid rgb(36 38 42 / 0.16); border-radius: 8px; background: #fff; font: inherit; font-size: 0.82rem; }
	.list { padding: 4px 0 14px; }
	.grp { margin: 12px 6px 4px; font: 500 10px/1 ui-monospace, Menlo, monospace; letter-spacing: 0.14em; text-transform: uppercase; color: #77736a; }
	.part { border-radius: 9px; }
	.part.sel { background: rgb(63 207 142 / 0.12); }
	.head { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px; border: 0; border-radius: 9px; background: none; cursor: pointer; text-align: left; font: 500 0.8rem/1.25 var(--font-body); color: inherit; }
	.head:hover { background: rgb(36 38 42 / 0.05); }
	.tag { flex: none; padding: 2px 6px; border-radius: 6px; background: rgb(36 38 42 / 0.07); font: 600 9.5px/1.2 ui-monospace, Menlo, monospace; letter-spacing: 0.08em; text-transform: uppercase; color: #77736a; }
	.tag.made { background: rgb(63 154 106 / 0.16); color: #2e7a52; }
	.route { padding: 2px 8px 10px; }
	.raw { margin: 2px 0 6px; font-size: 0.74rem; line-height: 1.4; color: #4d4a43; }
	.route ol { margin: 0; padding: 0; list-style: none; }
	.route li { display: grid; grid-template-columns: 1fr auto; gap: 1px 8px; padding: 5px 0; border-top: 1px solid rgb(36 38 42 / 0.07); }
	.route li.zero { opacity: 0.6; }
	.st { justify-self: start; padding: 0; border: 0; background: none; cursor: pointer; font: 600 0.74rem/1.3 var(--font-body); color: #2e7a52; text-align: left; }
	.st.here { color: #c23a22; }
	.s { font: 600 10.5px/1.3 ui-monospace, Menlo, monospace; font-variant-numeric: tabular-nums; }
	.what { grid-column: 1 / 3; font-size: 0.72rem; line-height: 1.35; color: #5d5a52; }
	.total { margin: 6px 0 0; font: 500 10.5px/1.3 ui-monospace, Menlo, monospace; color: #77736a; }
	/* the runtime's inspector, our list of what a station does (hud.css is AirSup's; these are ours) */
	:global(.fs-root .fs-insp) { overflow: auto; max-height: 56vh; flex: none; }
	:global(.fs-ops) { margin-top: 10px; }
	:global(.fs-ops ol) { margin: 6px 0 0; padding: 0; list-style: none; max-height: 30vh; overflow: auto; }
	:global(.fs-ops li) { display: grid; grid-template-columns: 1fr auto; gap: 1px 8px; padding: 5px 0; border-top: 1px solid rgb(36 38 42 / 0.08); font: 500 11.5px/1.3 var(--font-body); }
	:global(.fs-ops li b) { font: 600 10.5px/1.3 ui-monospace, Menlo, monospace; font-variant-numeric: tabular-nums; }
	:global(.fs-ops li i) { grid-column: 1 / 3; font-style: normal; font-size: 10.5px; color: #77736a; }
</style>
