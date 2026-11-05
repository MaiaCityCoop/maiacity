<!--
	Sandbox 4, the dome cassette joint (Samuel 2026-11-05), laid out as Sandbox 2 is (play's asset viewer frame): the
	steps down the left with the part's facts; in the middle the stage, its step and its clock above a 3D view as tall as
	the page; down the right the joint in section and its numbers. The scene and its clock are ./scene.ts; this page only
	shows its state and hands it the buttons. In the light brand CI (play/site/src/app.css), scoped to its root.
	Once Sandbox 4 pins the Dome shell element of the asset library, the stage head offers its kinds (Triangle, Hexagon)
	and its values (Infill, a hexagon's Depth) to whoever is looking: a choice of this page, never saved.
-->
<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { mountJoint, STEPS, T, FACTS, type Joint, type JointInfo } from './scene';
	import './style.css';

	let viewport: HTMLDivElement | undefined = $state();
	let joint: Joint | undefined;
	let t = $state(0), step = $state(0), playing = $state(false), auto = $state(true), xray = $state(false);
	let failed = $state('');
	let info: JointInfo = $state({ mode: 'legacy', steps: STEPS, kinds: [], params: [], values: {}, variant: null, asset: null, what: '', specs: [], loading: false, error: '' });
	const steps = $derived(info.steps);
	const infill = $derived(info.params.find((p) => p.id === 'infill' && p.names?.length));
	const depth = $derived(info.variant === 'hexagon' ? info.params.find((p) => p.id === 'depth' && p.type === 'number') : undefined);

	onMount(() => {
		if (!viewport) return;
		try {
			joint = mountJoint(viewport, (s) => {
				if (s.t !== t) t = s.t;
				if (s.step !== step) step = s.step;
				if (s.playing !== playing) playing = s.playing;
				if (s.auto !== auto) auto = s.auto;
			}, (i) => (info = i));
		} catch (e) {
			failed = 'This device could not start the 3D view (WebGL is off or unavailable).';
			console.error(e);
		}
	});
	onDestroy(() => joint?.dispose());

	const playLabel = $derived(playing ? 'Pause' : t >= T.end ? 'Replay' : 'Play');
</script>

<div class="cassette-joint">
	<div class="cj-frame">
		<aside class="left" aria-label="Steps">
			<p class="eyebrow">Sandbox 4 · <span>The cassette joint</span></p>
			<h3 class="nav-group">Steps</h3>
			<nav class="cj-steps" aria-label="Steps">
				{#each steps as s, i (s.name)}
					<button type="button" class:active={i === step} aria-current={i === step ? 'step' : undefined} onclick={() => joint?.goto(i)}>
						<b>{i + 1}</b><span>{s.name}</span><small>{s.title}</small>
					</button>
				{/each}
			</nav>
			<h3 class="nav-group">The part</h3>
			{#if info.mode === 'asset'}
				<dl class="cj-facts">
					<dt>Dome</dt><dd>Ø 100 m, R 50 m</dd>
					{#each info.specs as [k, v] (k)}<dt>{k}</dt><dd>{v}</dd>{/each}
				</dl>
				{#if info.asset}<p class="cj-from">From the asset library: <a href={info.asset.href}>{info.asset.label} v{info.asset.v}</a></p>{/if}
			{:else}
				<dl class="cj-facts">
					<dt>Dome</dt><dd>Ø 100 m, R 50 m</dd>
					<dt>Grid</dt><dd>Geodesic, frequency ≈ 18</dd>
					<dt>Cassette</dt><dd>3.4 m triangle, cast</dd>
					<dt>Mass</dt><dd>≈ {FACTS.mass} t with its glass</dd>
				</dl>
			{/if}
		</aside>

		<main>
			<div class="stage-head">
				<h2>{steps[step].title}</h2>
				<div class="chips">
					<button type="button" class="primary" onclick={() => joint?.toggle()}>{playLabel}</button>
					<button type="button" onclick={() => joint?.restart()}>Restart</button>
					<label class="cj-toggle"><input type="checkbox" bind:checked={xray} onchange={() => joint?.setXray(xray)} /> X-ray</label>
					<span class="cj-clock">{t.toFixed(1).padStart(4, '0')} s</span>
				</div>
				{#if info.mode === 'asset'}
					<div class="chips cj-kinds">
						{#if info.kinds.length > 1}
							<span class="chip-label">Kind</span>
							{#each info.kinds as k (k.hash)}
								<button type="button" class:on={k.on} aria-pressed={k.on} disabled={info.loading} onclick={() => joint?.setKind(k.hash)}>{k.name}</button>
							{/each}
						{/if}
						{#if infill}
							<span class="chip-label">{infill.label}</span>
							{#each infill.names ?? [] as n, i (n)}
								<button type="button" class:on={Number(info.values.infill) === (infill.min ?? 0) + i} aria-pressed={Number(info.values.infill) === (infill.min ?? 0) + i} disabled={info.loading} onclick={() => joint?.setValue('infill', (infill.min ?? 0) + i)}>{n}</button>
							{/each}
						{/if}
						{#if depth}
							<label class="cj-depth">
								<span class="chip-label">Depth</span>
								<input type="range" min={depth.min ?? 0} max={depth.max ?? 1.2} step={depth.step ?? 0.1} value={Number(info.values.depth ?? depth.value)} disabled={info.loading} onchange={(e) => joint?.setValue('depth', parseFloat(e.currentTarget.value))} />
								<span class="cj-clock">{Number(info.values.depth ?? depth.value).toFixed(1)} m</span>
							</label>
						{/if}
					</div>
				{/if}
				<input
					class="cj-timeline"
					type="range"
					min="0"
					max={T.end}
					step="0.01"
					value={t}
					aria-label="Animation time"
					oninput={(e) => joint?.scrub(parseFloat(e.currentTarget.value))}
				/>
			</div>
			<div class="cj-viewport" bind:this={viewport}>
				{#if failed}<p class="cj-failed">{failed}</p>{/if}
				{#if info.loading}<p class="cj-building">Building it in the asset box…</p>{/if}
				{#if info.error}<p class="cj-building cj-error">{info.error}</p>{/if}
				<div class="cj-caption" aria-live="polite">
					<p class="cj-step">Step {step + 1} of {steps.length}</p>
					<p>{steps[step].text}</p>
				</div>
				{#if !auto}<button type="button" class="cj-follow" onclick={() => joint?.follow()}>Resume camera path</button>{/if}
			</div>
		</main>

		<aside class="right" aria-label="The joint">
			<figure class="cj-section">
				<figcaption>Section A–A through one joint · cm</figcaption>
				<svg viewBox="0 0 360 272" role="img" aria-labelledby="cj-sec-title cj-sec-desc">
					<title id="cj-sec-title">Section through one joint</title>
					<desc id="cj-sec-desc">Two half-ribs, each 16 cm wide and 45 cm deep, meet on the joint plane. Each has a dovetail groove 5 cm deep; together they form a bowtie channel that holds a basalt key with a duct for the ring cable. A seal covers the seam outside, and the glass sits 5 cm in from the outer face.</desc>
					<defs>
						<pattern id="cj-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
							<rect width="6" height="6" class="sv-cutbg"></rect>
							<line x1="0" y1="0" x2="0" y2="6" class="sv-hatch"></line>
						</pattern>
					</defs>
					<text x="36" y="30" class="sv-t">OUTSIDE</text>
					<text x="36" y="214" class="sv-t">INSIDE</text>
					<rect x="36" y="60" width="80" height="12" class="sv-glass"></rect>
					<rect x="244" y="60" width="80" height="12" class="sv-glass"></rect>
					<text x="40" y="90" class="sv-t">glass</text>
					<path d="M116 40H180V118L160 106V154L180 142V220H116Z" class="sv-cut"></path>
					<path d="M244 40H180V118L200 106V154L180 142V220H244Z" class="sv-cut"></path>
					<path d="M161.5 108L180 119.5L198.5 108V152L180 140.5L161.5 152Z" class="sv-key"></path>
					<circle cx="180" cy="130" r="4.5" class="sv-duct"></circle>
					<rect x="168" y="34" width="24" height="6" rx="1.5" class="sv-seal"></rect>
					<line x1="180" y1="16" x2="180" y2="246" class="sv-axis"></line>
					<text x="196" y="30" class="sv-t">seal</text>
					<path d="M200 152L252 186" class="sv-dim"></path>
					<text x="255" y="189" class="sv-t k">basalt key</text>
					<path d="M184 133L252 158" class="sv-dim"></path>
					<text x="255" y="161" class="sv-t k">cable duct</text>
					<path d="M22 40V220M18 40H26M18 220H26" class="sv-dim"></path>
					<text x="14" y="134" class="sv-t k" transform="rotate(-90 14 134)" text-anchor="middle">45</text>
					<path d="M116 232H244M116 228V236M180 228V236M244 228V236" class="sv-dim"></path>
					<text x="148" y="246" class="sv-t k" text-anchor="middle">16</text>
					<text x="212" y="246" class="sv-t k" text-anchor="middle">16</text>
					<text x="180" y="264" class="sv-t a" text-anchor="middle">joint plane, aimed at the dome's centre</text>
				</svg>
			</figure>

			{#if info.mode === 'asset' && info.what}
				<div class="cj-this">
					<h3 class="nav-group">This element</h3>
					<p>{info.what}</p>
				</div>
			{/if}
			<dl class="cj-specs">
				<dt>Rib</dt><dd>Each cassette carries half a rib, 16 × 45 cm, along every edge. Two neighbours make one 32 cm strut.</dd>
				<dt>Channel</dt><dd>6 cm wide at the seam, 12 cm inside, 5 cm deep in each half-rib.</dd>
				<dt>Keys</dt><dd>Basalt, 36 cm segments, 7 per edge, fed in at the node.</dd>
				<dt>Node</dt><dd>Corners cut back 30 cm. A cast cap closes the pocket after keying.</dd>
				<dt>Cables</dt><dd>Every row below about 31 m, where the half sphere is in hoop tension, tensioned once the row is keyed.</dd>
				{#if info.mode !== 'asset'}<dt>Per dome</dt><dd>≈ {FACTS.cassettes} cassettes · {FACTS.joints} joints · {FACTS.keys} key segments · {FACTS.caps} caps</dd>{/if}
			</dl>

			<p class="cj-note">A concept from rough hand calculations, not engineering. The two rows are drawn as a regular band of the frequency-18 grid. Drag to look around; pinch or scroll to come closer.</p>
		</aside>
	</div>
</div>
