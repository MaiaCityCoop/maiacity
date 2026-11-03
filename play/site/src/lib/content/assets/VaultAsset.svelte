<!--
	ONE OF A VAULT'S ASSETS, SHOWN FROM THE VAULT ALONE — the avenDB app's Assets ($avendb/Assets.svelte): a build of
	a recipe the Maia City vault keeps, its source its entry's file, read from the vault and held to its hash before
	anything else (./sources/viewer.js `vaultBuild`), then this device's cache or the box, which runs it on the frozen
	engine its entry names, checked either way, and shown on the asset stage (./stage.js, ./hero.js) as every asset
	viewer shows a build (the viewer's core, ./viewer.js, and what it draws round the stage, ./ViewerParts.svelte), in
	the same turntable ($lib/app/Turntable.svelte, in its place in the page): above the canvas, staying at the top of
	the page's column, its name and the bar (a plant's stages and its Plant | Fruit, the moves:
	Grow, Run, its own, an actor's clips, Assemble; the views: Explode, Cut away, X-ray, Labels, Slow); round the canvas
	the panel (what its recipe is built with, from the card in its entry, changed here and built anew, its solver's
	sliders, and what the page says of its entry, `about`) and the readout (its solver's reading, its note, its measure,
	a plant's above and below its soil, the scale). A plant stands in its earth and grows smoothly (./grow.js). Drag to
	turn round it, scroll to come closer; ← → a plant's stage, space to grow it.

	Its parts are the page's to list (its card's catalog, `catalog`, as built): a part picked there or tapped on the
	canvas (`picked`) is shown on its own, the rest of the asset not drawn (`solo`, else in its place, its edges bright),
	and the camera glides to it; let go of, the whole asset comes back and the camera with it.

	There is no repo fallback (Samuel 2026-10-17): nothing here reads the repo's index or its libraries (./recipes.js,
	./load.js, AssetViewer). What the vault lacks, or holds otherwise, is said on the stage, naming its ref and why
	(NotInVault), and nothing is shown in its place.
-->
<script>
	// @ts-nocheck — plain JS
	import { onDestroy, onMount, untrack } from 'svelte';
	import Turntable from '$lib/site/app/Turntable.svelte';
	import { AssetBox } from './box/host.js';
	import { growth, stageAt } from './grow.js';
	import { forStage, heroOf, runner, walkOf } from './hero.js';
	import TouchStick from '$lib/site/touch/TouchStick.svelte';
	import { valuesOf } from './params.js';
	import { groundOf, groundsIn } from './ground.js';
	import { buildName, vaultBuild } from './sources/viewer.js';
	import { VIEWS, asker, camerawork, letGoOf, loop, measure, movesOf, onTap, openStage, safeArea, tabbed, viewsOf } from './viewer.js';
	import { builtRows, heroReading, labRows, longNote, moveChips, paramTabs, scaleBar, tagLines, viewChips } from './ViewerParts.svelte';

	/**
	 * @type {{ source: typeof import('./catalog.js').source, hash: string, title?: string,
	 *   note?: string, about?: import('svelte').Snippet, catalog?: any, picked?: string | null, solo?: boolean,
	 *   compact?: boolean, fill?: boolean, named?: boolean, details?: HTMLElement | null, onStir?: (read: () => void) => (() => void) }}
	 *   `source` the vault's recipes ($avendb/assets.js `vaultSource`), `hash` the recipe shown, `title` and `note`
	 *   what its entry calls it and says of it, `about` what the page says of its entry, at the foot of the panel;
	 *   `catalog` its parts as built (null where it lists none), `picked` the part picked, `solo` whether it is shown on
	 *   its own; `compact`, its name, its moves and views and a short canvas alone, in a card with its own answers
	 *   ($avendb/Hitl.svelte, an AIP's); `onStir` the page's watch of the device's sync ($avendb/stirs.svelte.js),
	 *   so a file still arriving is read again as it moves; `fill`, the canvas as tall as the page's column; `named`,
	 *   false where the page names it already (its aside), its name not repeated over the canvas; `details`, an element
	 *   of the page (its aside) that what is said of the asset (the readout, then the panel) goes into instead of round
	 *   the canvas
	 */
	let { source, hash, title = '', note = '', about, catalog = $bindable(null), picked = $bindable(null), solo = true, compact = false, fill = false, named = true, details = null, onStir } = $props();

	/** a node moved into `target`, an element elsewhere in the page, and taken out with it @param {HTMLElement} node @param {HTMLElement} target */
	const into = (node, target) => {
		target.appendChild(node);
		return { update: (/** @type {HTMLElement} */ t) => t.appendChild(node), destroy: () => node.remove() };
	};

	const at = $derived(Object.hasOwn(source.index.recipes, hash) ? source.index.recipes[hash] : null);
	/** what its recipe is built with, as its card declares it; detail is the renderer's */
	const params = $derived((at?.params ?? []).filter((p) => p.id !== 'detail'));
	/** the values changed here, as text, of the recipe shown */
	let given = $state(/** @type {Record<string, string>} */ ({}));
	/** the recipe they were changed for: another one starts at its own */
	let givenFor = $state('');
	const asked = $derived(givenFor === hash ? Object.fromEntries(Object.entries(given).filter(([k]) => params.some((p) => p.id === k))) : {});
	const values = $derived.by(() => {
		try {
			return at?.params?.length ? valuesOf(at.params, asked) : {};
		} catch {
			return {};
		}
	});
	/** the build asked for: its recipe and the values changed here (one the vault doesn't hold is refused as it is asked) */
	const wanted = $derived(hash ? buildName(hash, asked) : '');
	/** the parameter it grows by (a plant's stage), and the stage it stands at, named */
	const staged = $derived(params.find((p) => p.id === 'stage' && tabbed(p)) ?? null);
	/**
	 * a plant's view of itself or of its fruit (its `fruit` parameter: Plant | Fruit), a switch of its own at the top of
	 * the bar, never lost along the row of stages; the bar's other tabs without it
	 */
	const fruitView = $derived(params.find((p) => p.id === 'fruit' && tabbed(p)) ?? null);
	const barParams = $derived(fruitView ? params.filter((p) => p !== fruitView) : params);
	const stageName = $derived(staged && Number.isFinite(values.stage) ? staged.names[Math.min(staged.names.length - 1, Math.round(values.stage - staged.min))] : '');

	let canvasBox = $state();
	let hero = $state.raw(null);
	let building = $state(false);
	let buildPhase = $state('file');
	let error = $state('');
	/** its file is still arriving on this device (`Unread`: read while the device was behind, Freshness.lean): shown as
	 *  loading, and built again by itself as the device's sync moves, never "Not shown" */
	let arriving = $state(false);
	let lost = $state(false);
	/** where the build came from (this device's cache or the box), its measure, and a plant's above and below its soil */
	let from = $state('');
	let size = $state.raw(null);
	let rise = $state.raw(null);
	let modes = $state({ run: true, explode: false, cut: false, xray: false, labels: false, slow: false });
	/** the biomes a plant can be shown standing on (./ground.js), the one it stands on, and the soil under it */
	let grounds = $state.raw([]);
	let groundId = $state(savedGround());
	let soilShown = $state.raw(null);
	/** the ground last chosen on this device, if it can say */
	function savedGround() {
		try {
			return localStorage.getItem('play.ground') ?? 'food-forest';
		} catch {
			return 'food-forest';
		}
	}
	let pickGround = null;
	let moving = $state('run');
	/** its solver's sliders and its reading */
	let sliders = $state({});
	let reading = $state.raw({ value: 0, state: '', sub: '', bad: false });
	let tags = $state.raw([]);
	let scale = $state.raw([0, '']);
	/** its note in full (a long one is cut to a few lines, so the card covers less of it) */
	let more = $state(false);
	/** a plant growing: on smoothly by the clock (./grow.js), built where it has grown to each time its last build is shown */
	let growing = $state(false);
	let grower = null;

	const clips = $derived(hero?.clips ?? null);
	const lab = $derived(hero?.lab ?? null);
	/** the pose a rig is drawn apart in, which its Explode view holds */
	const rigApart = $derived(!hero?.explodes && clips?.poses?.includes('exploded') ? 'exploded' : null);
	let drawnApart = $state(false);
	/** the moves it plays: Grow, Run, its own, an actor's clips, Assemble */
	const moves = $derived(movesOf(hero, { staged, growing, rigApart }));
	const views = $derived(viewsOf(hero, rigApart));
	const said = $derived(hero?.view.note ?? note);
	/** a build that shows nothing and says why (a plant's fruit that has not set yet): its word over the canvas, no measure */
	const blank = $derived(!!hero?.view.note && !!size && Math.max(size[0], size[1], size[2]) < 1e-6);

	let stage = null;
	let show = null;
	let focus = null;
	let dispose = null;
	/** whether the stage is up, and the build last asked of it */
	let ready = $state(false);
	let shown = '';
	/** the boxes this viewer builds in and keeps builds running in, on the engine the vault's recipes are made for */
	let boxes = null;
	const boxesOf = () => (boxes ??= { build: new AssetBox({ engine: source.index.engine }), live: new AssetBox({ engine: source.index.engine }) });

	/** walked in (a building that says where its door is, `view.walk`): the sandboxes' first-person walker */
	let walking = $state(false);
	/** @type {null | (() => void)} */
	let walkIn = null;
	/** @type {null | (() => void)} */
	let walkOut = null;
	/** @type {null | { move: (x: number, y: number, h: boolean) => void, look: (dx: number, dy: number) => void }} */
	let stick = $state(null);

	onMount(async () => {
		const box = canvasBox;
		if (!box) return;
		/** @type {any} */
		let up;
		try {
			// the stage renderer and the paper studio on it (./viewer.js `openStage`)
			up = await openStage(box, { onLost: () => (lost = true), hold: () => building });
		} catch (e) {
			// a browser that gives this page no 3D drawing: said on the stage, the rest of the page goes on
			error = `This browser couldn’t open the 3D stage: ${String(e?.message ?? e)}`;
			console.error(e);
			return;
		}
		const { THREE, view, renderer, camera, controls, adapt, resize } = up;
		const { createWalker, PACE } = await import('$lib/content/sandbox-kit/walker.js');
		stage = up.stage;
		if (gone) {
			stage.dispose();
			view.dispose();
			return;
		}
		// for a test in a browser to read what is shown, as AssetViewer's `__viewer`
		window.__vaultAsset = { stage, camera, controls, get hero() { return hero; }, get picked() { return picked; }, get building() { return building; }, get phase() { return buildPhase; }, get error() { return error; }, get values() { return values; }, get wanted() { return wanted; }, set: (id, v) => setParam(id, v) };
		// a plant's ground: its biome's floor to the horizon, the soil under it and a pit in front of it, its roots seen
		// in it (./ground.js); never under its fruit on its own, which stands on the studio's floor
		const earth = groundOf(stage);
		grounds = groundsIn(source);
		pickGround = (id) => {
			const g = grounds.find((x) => x.id === id) ?? grounds[0];
			groundId = g?.id ?? id;
			earth.biome(g?.recipe ?? null, g?.id);
			soilShown = earth.soil;
			try {
				localStorage.setItem('play.ground', groundId);
			} catch {
				/* kept for this visit only */
			}
		};
		pickGround(groundId);

		const letGo = letGoOf(stage);
		const asks = asker();
		let shownHash = '';
		/** the camera on what is shown, as built: framed, gliding to a new framing, following a plant as it grows */
		const cam = camerawork(THREE, camera, controls);
		/** the part the camera was last brought to, if one */
		let focused = null;
		show = async (h0, given) => {
			walkOut?.();
			const ask = asks.ask();
			building = true;
			error = '';
			try {
				const { build, live } = boxesOf();
				// a plant growing is built where it has grown to, mostly between two of its stages: none of it kept
				const got = await vaultBuild(source, h0, given, { box: build, keep: !growing, phase: (step) => { if (asks.is(ask)) buildPhase = step; } });
				if (!asks.is(ask)) return void letGo(heroOf(got));
				forStage(got.obj);
				const h = heroOf(got, { start: runner(live, got.recipe, got.given) });
				const was = hero;
				const bounds = new THREE.Box3().setFromObject(got.obj);
				// a plant stands in its soil; its fruit, shown on its own, on the floor
				const soiled = got.card?.group === 'plants' && !(got.values?.fruit >= 1);
				const { centre, size: s } = stage.show(got.obj, { asset: h, ground: soiled ? 0 : undefined, keep: shownHash === h0, studio: !soiled });
				if (soiled) earth.fit(got.obj);
				earth.show(soiled);
				buildPhase = 'prepare';
				await stage.compile();
				if (!asks.is(ask)) {
					stage.clear();
					earth.show(false);
					return void letGo(h);
				}
				letGo(was);
				hero = h;
				catalog = h.catalog?.parts?.length ? h.catalog : null;
				// a part picked stays picked in the same recipe built anew, where it still has it, and is looked at again
				if (shownHash !== h0 || !catalog?.parts.some((p) => p.id === picked)) picked = null;
				focused = null;
				from = got.from;
				size = [s.x, s.y, s.z];
				rise = soiled ? [Math.max(0, bounds.max.y), Math.max(0, -bounds.min.y)] : null;
				drawnApart = false;
				if (shownHash !== h0) more = false;
				readValues();
				readModes();
				// a new recipe is framed as built; the same one built with other values keeps the camera where it is,
				// unless it grew or shrank by much; a plant growing, the camera follows it
				cam.reframe(centre, s, { fresh: shownHash !== h0, growing, ground: soiled ? 0 : undefined });
				shownHash = h0;
				arriving = false;
			} catch (e) {
				if (!asks.is(ask)) return;
				// nothing in its place: what failed is said, naming its ref
				letGo(hero);
				hero = null;
				catalog = picked = null;
				stage.clear();
				earth.show(false);
				size = rise = null;
				from = '';
				shownHash = '';
				cam.framed = null;
				growing = false;
				arriving = e?.name === 'Unread';
				if (arriving) return void (buildPhase = 'file');
				error = String(e?.message ?? e);
				console.error(e);
			}
			if (asks.is(ask)) building = false;
		};

		/** the camera on part `id`, smoothly, all of it in view; or, none, back on the whole asset */
		focus = (id) => {
			if (id === focused || !hero) return;
			focused = id;
			if (!id) return cam.frame(true);
			const b = hero.boxOf?.(id);
			const centre = b ? b.getCenter(new THREE.Vector3()) : stage.partCentre(id);
			if (!centre || !cam.framed) return;
			// a part found by its bone alone: aimed at, the camera as far back as for the whole
			cam.frame(true, { centre, size: b ? b.getSize(new THREE.Vector3()) : cam.framed.size });
		};
		// a tap, not a drag round it, picks the part under it (or, on nothing, lets go and shows all of it)
		onTap(renderer.domElement, (x, y) => {
			if (catalog && !walking) picked = stage.pick(x, y);
		});

		// walked in: on the floors and between the walls its own shape has (./hero.js walkOf), from where its door is, its
		// lamps lit; Escape, or Step outside, and the turntable is back where it was
		/** @type {any} */
		let walker = null;
		const lamps = [];
		/** the turntable's camera, kept while walking */
		let was = null;
		walkIn = () => {
			const w = hero?.view?.walk;
			if (!w || walker) return;
			const floors = walkOf(hero.root);
			was = { fov: camera.fov, near: camera.near, far: camera.far, turn: camera.userData.fov };
			controls.enabled = false;
			walker = createWalker(camera, renderer.domElement, {
				x: w.x,
				z: w.z,
				yaw: w.yaw,
				pitch: -0.05,
				walk: PACE.walk,
				hurry: PACE.hurry,
				canStand: floors.canStand,
				floorAt: floors.floorAt,
				onKey: (k, down) => {
					if (k !== 'escape' || !down) return false;
					walkOut?.();
					return true;
				}
			});
			for (const [x, y, z] of w.lamps ?? []) {
				const lamp = new THREE.PointLight('#fff1dc', 2.2, 6, 2);
				lamp.position.set(x, y, z);
				stage.scene.add(lamp);
				lamps.push(lamp);
			}
			camera.userData.fov = 0; // a walk sees as a walker does, upright or not
			camera.fov = 70;
			camera.near = 0.05;
			camera.far = 400;
			camera.updateProjectionMatrix();
			stick = { move: (x, y, h) => walker?.move(x, y, h), look: (dx, dy) => walker?.look(dx, dy) };
			walking = true;
		};
		walkOut = () => {
			if (!walker) return;
			walker.dispose();
			walker = null;
			stick = null;
			for (const lamp of lamps.splice(0)) lamp.removeFromParent();
			if (was) {
				camera.userData.fov = was.turn;
				camera.fov = was.fov;
				camera.near = was.near;
				camera.far = was.far;
				camera.updateProjectionMatrix();
			}
			controls.enabled = true;
			resize();
			walking = false;
			cam.frame(true);
		};

		let slow = 0;
		const stop = loop((wall, dt, now) => {
			adapt(now);
			stage.update(dt);
			earth.update(camera, wall);
			if (walker) walker.update(dt);
			else {
				cam.step(wall, growing);
				controls.update();
			}
			// growing on: built where it has grown to, each time its last build is shown
			if (growing && grower && hero) {
				grower.on(wall);
				if (!building) {
					const to = stageAt(grower.at);
					if (to !== values.stage) setParam('stage', to);
					else if (grower.done) growing = false;
				}
			}
			stage.render();
			if (stage.root && (stage.state?.labels > 0.01 || tags.length)) tags = stage.labels(box.clientWidth, box.clientHeight, safeArea(box, { inView: true }));
			else if (!stage.root && tags.length) tags = [];
			if ((slow += wall) > 0.12 && hero) {
				slow = 0;
				scale = stage.scaleBar(box.clientHeight, controls.target);
				if (lab) reading = { ...lab.read };
				// the sliders a move sets follow it
				if (stage.move !== 'run') readValues();
			}
		});
		dispose = () => {
			walkOut?.();
			stop();
			asks.drop();
			letGo(hero);
			hero = null;
			earth.dispose();
			stage.dispose();
			view.dispose();
			boxes?.build.stop('the viewer was left');
			boxes?.live.stop('the viewer was left');
		};
		shown = '';
		ready = true;
	});
	/** whether the viewer was left (perhaps before its stage was up) */
	let gone = false;
	onDestroy(() => {
		gone = true;
		dispose?.();
	});

	// another recipe picked: what grew here stops
	$effect(() => {
		void hash;
		untrack(() => (growing = false));
	});
	// a part picked, let go of, or shown otherwise: on the stage, and the camera brought to it; and again on each build
	$effect(() => {
		const [id, on, h] = [picked, solo, hero];
		if (!h) return;
		untrack(() => {
			stage?.setPick(id, false, on);
			focus?.(id);
		});
	});
	/** the part picked, as its catalog has it */
	const part = $derived(catalog && picked ? (catalog.parts.find((p) => p.id === picked) ?? null) : null);
	// a file still arriving is read again each time the device's sync moves, until it is here
	// (the page passes onStir in: nothing of the assets imports avenDB, sources/avendb.test.js)
	onMount(() => onStir?.(() => {
		if (arriving && ready) untrack(() => show?.(hash, asked));
	}));
	// a new build asked for whenever the recipe shown or what it is built with changes
	$effect(() => {
		const w = wanted;
		if (!ready || !w || w === shown) return;
		shown = w;
		untrack(() => show?.(hash, asked));
	});

	const readValues = () => (sliders = Object.fromEntries(Object.entries(lab?.controls ?? {}).map(([k, v]) => [k, v.value])));
	const readModes = () => {
		if (!stage) return;
		modes = Object.fromEntries(['run', ...VIEWS.map(([k]) => k)].map((k) => [k, stage.on(k)]));
		moving = stage.move === 'run' && hero?.doing?.kind === 'clip' ? `clip:${hero.doing.name}` : stage.move;
	};
	const playMove = (k) => {
		if (!stage) return;
		if (k === 'grow') return grow();
		if (k.startsWith('clip:')) {
			drawnApart = false;
			hero?.play(k.slice(5));
			stage.play('run');
		} else stage.play(k);
		readValues();
		readModes();
	};
	/** a slider of its solver moved: Run takes over from a move that set it */
	const slide = (k, v) => {
		if (stage?.drives(k)) playMove('run');
		if (lab) lab.controls[k].value = v;
		sliders = { ...sliders, [k]: v };
	};
	const setMode = (k) => {
		if (k === 'explode' && rigApart) {
			drawnApart = !drawnApart;
			if (drawnApart) hero.hold(rigApart, {});
			else hero.play(clips?.first ?? clips?.clips?.[0]);
			return void readModes();
		}
		stage?.toggle(k);
		readModes();
	};
	/** a value of what its recipe is built with, changed: built anew */
	const setParam = (id, v) => {
		given = { ...(givenFor === hash ? given : {}), [id]: String(v) };
		givenFor = hash;
	};
	/** grown from its first stage (or on from where it stands) to its last, smoothly; or stopped, at the stage nearest it */
	const grow = () => {
		if (!staged) return;
		if (growing) {
			growing = false;
			return setParam('stage', Math.round(values.stage));
		}
		grower = growth(staged, values.stage);
		growing = true;
	};
	/** a stage on or back (← →), grown (space): the keys a plant's page has always had */
	const key = (e) => {
		if (walking || !staged || !hero || e.target?.closest?.('input, textarea, select, [contenteditable]')) return;
		const at = Math.round(values.stage);
		if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
			growing = false;
			setParam('stage', Math.max(staged.min, Math.min(staged.max, at + (e.key === 'ArrowRight' ? 1 : -1))));
		} else if (e.key === ' ' && !e.target?.closest?.('button, a')) grow();
		else return;
		e.preventDefault();
	};
	const freshSeed = () => setParam('seed', Math.random().toString(36).slice(2, 7));
</script>

<svelte:window onkeydown={key} />

{#snippet panelBody()}
		{#if params.some((p) => !tabbed(p))}
			<div class="built">
				<span class="label">Built with</span>
				{@render builtRows(params, values, setParam, freshSeed)}
			</div>
		{/if}
		{#if lab}
			<div class="lab">{@render labRows(lab, sliders, slide)}</div>
		{/if}
		{#if about}
			<div class="about">
				{@render about()}
				{#if from}<small>{from === 'cache' ? 'Its file checked in the vault, its build from this device’s cache' : 'Built in the box from its entry’s file'}</small>{/if}
			</div>
		{/if}
{/snippet}
{#snippet readoutBody()}
		{#if lab && hero && !error}{@render heroReading(lab, reading)}{/if}
		{@render longNote(said, more, () => (more = !more))}
		{#if error}
			<span class="missing">Not shown.</span>
		{:else if blank}
		{:else if size}
			<span>{#if rise}{measure(rise[0])} above the soil · {measure(rise[1])} below · {measure(Math.max(size[0], size[2]))} across{:else}{measure(Math.max(size[0], size[2]))} long · {measure(size[1])} high{/if}</span>
			{#if rise && soilShown}<small class="soil">In {soilShown.label.toLowerCase()} ({soilShown.kind}): {soilShown.horizons.filter((h) => h.to < 5).map((h) => h.name).join(' · ')} over {soilShown.horizons.at(-1).name}</small>{/if}
		{/if}
		{#if scale[0] > 0 && hero && !error && !blank}{@render scaleBar(scale)}{/if}
		{#if walking}<small>Drag to look · WASD or the joystick to walk · Shift to hurry · Esc to step outside</small>
		{:else}<small>Drag to turn round it · pinch or scroll to come closer{catalog ? ' · tap a part to see it on its own' : ''}{hero?.view?.walk ? ' · Step inside to walk in' : ''}</small>{/if}
{/snippet}

{#if details}
	<div class="details" use:into={details}>
		<div class="said">{@render readoutBody()}</div>
		{#if params.some((p) => !tabbed(p)) || lab || about}<div class="said">{@render panelBody()}</div>{/if}
	</div>
{/if}

<Turntable name="vault-asset" inline {compact} {fill} panel={details ? undefined : panelBody} readout={details ? undefined : readoutBody} bind:canvas={canvasBox}>
	{#snippet head()}
		{#if named}<h2 class="name">{title || source.nameOf?.(hash) || 'An asset'}{#if stageName}<small>{` · ${stageName}`}</small>{/if}</h2>{/if}
		{#if fruitView}
			<!-- shown while it builds and where a fruit has not set yet too, so the plant is always one tap away -->
			<div class="views-of" role="group" aria-label={fruitView.label}>
				{#each fruitView.names as n, k (k)}
					<button class:on={Math.round(values[fruitView.id]) === fruitView.min + k} aria-pressed={Math.round(values[fruitView.id]) === fruitView.min + k} onclick={() => ((growing = false), setParam(fruitView.id, fruitView.min + k))}>{n}</button>
				{/each}
			</div>
		{/if}
		{#if hero && !error}
			<div class="chips">
				{@render paramTabs(barParams, values, (id, v) => ((growing = false), setParam(id, v)))}
				{@render moveChips(moves, (k) => (k === 'grow' ? growing : moving === k), lab, playMove)}
				{#if hero.view.ticks || hero.buildBy}<button class="chip" class:on={!modes.run} onclick={() => setMode('run')}>{modes.run ? 'Pause' : 'Play'}</button>{/if}
				{@render viewChips(views, (k) => (k === 'explode' && rigApart ? drawnApart : modes[k]), setMode)}
				{#if hero.view?.walk}<button class="chip walk" class:on={walking} onclick={() => (walking ? walkOut?.() : walkIn?.())}>{walking ? 'Step outside' : 'Step inside'}</button>{/if}
			</div>
			{#if rise && grounds.length > 1}
				<!-- the ground a plant stands on: a biome's floor, and the soil that biome lies on in the pit -->
				<div class="chips grounds" role="group" aria-label="Ground">
					<span class="grounds-label">Ground</span>
					{#each grounds as g (g.id)}
						<button class="chip" class:on={groundId === g.id} aria-pressed={groundId === g.id} onclick={() => pickGround?.(g.id)}>{g.label}</button>
					{/each}
				</div>
			{/if}
		{/if}
	{/snippet}
	{#if walking && stick}
		<TouchStick move={stick.move} look={stick.look} stage={canvasBox} />
	{/if}
	{#if part && !error}
		<div class="picked" role="status">
			<span><b>{part.label}</b>{solo ? ' on its own' : ''}</span>
			<button class="chip" onclick={() => (picked = null)}>Show all</button>
		</div>
	{/if}
	{#if tags.length}{@render tagLines(tags)}{/if}
	{#if lost}
		<button class="canvas-note lost" onclick={() => location.reload()}>This device’s graphics ran out of room. Tap to load it again.</button>
	{:else if error}
		<div class="canvas-note error" role="alert"><b>Not shown.</b> {error}
			{#if ready}<button class="chip" onclick={() => show?.(hash, asked)}>Try again</button>{/if}
		</div>
	{:else if blank && !building}
		<div class="canvas-note" role="status">{said}</div>
	{:else if building && !growing}
		<div class="canvas-note" role="status">
			{#if arriving}Catching up · the file of {title || at?.label || 'it'} is still arriving on this device…
			{:else if buildPhase === 'file'}Reading {title || at?.label || 'its'} entry file…
			{:else if buildPhase === 'cache'}Opening the saved build of {title || at?.label || 'it'}…
			{:else if buildPhase === 'prepare'}Preparing {title || at?.label || 'it'} for display…
			{:else}Building {title || at?.label || 'it'}…{/if}
		</div>
	{/if}
</Turntable>

<style>
	/* the ground a plant stands on: a row of chips under the bar's, named */
	.grounds {
		align-items: center;
	}
	.grounds-label {
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		opacity: 0.6;
		margin-right: 2px;
	}
	/* a plant's Plant | Fruit: one pill of two halves, the one shown pressed dark, like the bar's chips */
	.views-of {
		display: inline-flex;
		align-self: flex-start;
		gap: 2px;
		padding: 3px;
		border: 1px solid rgb(0 0 0 / 0.12);
		border-radius: 999px;
		background: rgb(255 255 255 / 0.7);
	}
	.views-of button {
		padding: 0.3rem 0.95rem;
		border: 0;
		border-radius: 999px;
		background: none;
		font: inherit;
		color: inherit;
		cursor: pointer;
	}
	.views-of button.on {
		background: #1f2a23;
		color: #fff;
	}
	/* what is said of it, in the page's aside: two cards */
	.details {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		margin: 0 0 1rem;
	}

	.said {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		padding: 0.7rem 0.85rem;
		border-radius: 12px;
		background: #fff;
		font-size: 0.84rem;
	}

	.said:not(:has(*)) {
		display: none;
	}

	.built,
	.lab,
	.about {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}

	.built + .lab,
	.built + .about,
	.lab + .about {
		border-top: 1px solid rgb(0 0 0 / 0.08);
		margin-top: 0.6rem;
		padding-top: 0.8rem;
	}

	.about {
		gap: 0.4rem;
	}

	.missing {
		color: #b3261e;
	}

	.name {
		margin: 0;
		font-size: 1.05rem;
		line-height: 1.25;
		overflow-wrap: anywhere;
	}

	.name small {
		font-size: inherit;
		font-weight: 500;
		opacity: 0.6;
	}

	/* the part shown on its own, and the way back to all of it, at the canvas's top left */
	.picked {
		position: absolute;
		top: 0.75rem;
		left: 0.75rem;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		max-width: calc(100% - 1.5rem);
		padding: 0.3rem 0.35rem 0.3rem 0.8rem;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.9);
		box-shadow: 0 4px 14px rgb(31 42 35 / 0.12);
		font-size: 0.82rem;
	}

	.picked span {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* while a build is made and its shaders compiled, or when it was refused, or the graphics card gave the canvas up */
	.canvas-note {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		max-width: calc(100% - 2rem);
		padding: 9px 16px;
		border: 1px solid #d9d4ca;
		border-radius: 999px;
		background: #fbfaf7;
		box-shadow: 0 6px 20px rgb(31 42 35 / 0.12);
		color: #1f2a23;
		font: inherit;
		font-size: 14px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		pointer-events: none;
	}

	.canvas-note.lost,
	.canvas-note.error {
		width: max-content;
		max-width: min(80%, 360px);
		white-space: normal;
		text-align: center;
		border-radius: 14px;
		overflow-wrap: anywhere;
	}

	.canvas-note.lost {
		pointer-events: auto;
		cursor: pointer;
	}

	.canvas-note.error {
		color: #b3261e;
	}</style>
