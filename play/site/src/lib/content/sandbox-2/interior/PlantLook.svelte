<!--
	PLANT LOOK — the picked plant alone, small, at the top of its card in Sandbox 5: the same plant (its id, version,
	stage and seed) as it stands in the forest, built a little finer in the asset box ($content/assets/load.js, at the
	`look` tier's detail of ./sandbox5.js `TIERS`), what is under the soil cut away, turning slowly on a patch of soil,
	in its own light, with the asset viewers' frame loop and their way of keeping only the plant last asked for
	($content/assets/viewer.js). Drag to turn it round yourself.
-->
<script>
	import { onDestroy, onMount } from 'svelte';

	/** @type {{ kind: import('./sandbox5.js').Kind }} */
	let { kind } = $props();

	/** @type {HTMLDivElement} */
	let box;
	let growing = $state(true);
	let failed = $state(false);
	/** @type {((kind: import('./sandbox5.js').Kind) => void) | null} */
	let show = null;
	/** @type {(() => void) | null} */
	let stop = null;

	onMount(() => {
		let gone = false;
		(async () => {
			const THREE = await import('three');
			const [{ createStageRenderer }, { disposeObject }, { asker, loop }] = await Promise.all([import('$lib/content/render/stage.js'), import('$lib/content/render/core.js'), import('$lib/content/assets/viewer.js')]);
			const [{ loadAsset }, { buildAt, loadRecipes }, { refOf }, { TIERS }] = await Promise.all([import('$lib/content/assets/load.js'), import('$lib/content/assets/catalog.js'), import('./flora.js'), import('./sandbox5.js')]);
			// the plant's recipe is the Maia City vault's ($content/assets/vault.js)
			await loadRecipes();
			if (gone) return;
			// the stage renderer ($content/render/stage.js), see-through over the card; what is under the soil cut away, as it
			// is in the forest, where no one sees it
			const view = createStageRenderer(box, { alpha: true, clipping: true, toneMapping: 'agx', exposure: 1.6, fov: 32, near: 0.01, far: 400, style: false, controls: { enablePan: false, autoRotate: true, autoRotateSpeed: 1.6, maxPolarAngle: Math.PI * 0.55 } });
			// drawn once the renderer is ready (WebGPU's device asked for; on WebGL at once)
			await view.ready;
			if (gone) return view.dispose();
			const { renderer, camera, controls } = view;
			const soilLine = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.01)];
			const scene = new THREE.Scene();
			scene.add(new THREE.HemisphereLight('#ffffff', '#b9b2a6', 1.3));
			const key = new THREE.DirectionalLight('#fff4e6', 2.2);
			key.position.set(1.2, 2.2, 0.9);
			scene.add(key);
			// a patch of soil under it, fading out at its rim (its colour written as it is: ../../render/tsl.js `raw`)
			const { OwnBasic } = await import('$lib/content/render/tsl.js');
			const { length, positionLocal, smoothstep, vec3 } = await import('three/tsl');
			const soilLook = new OwnBasic({ transparent: true, depthWrite: false });
			soilLook.userData.raw = true;
			soilLook.colorNode = vec3(0.48, 0.38, 0.27);
			soilLook.opacityNode = smoothstep(0.35, 1, length(positionLocal.xz)).oneMinus().mul(0.55);
			const soil = new THREE.Mesh(new THREE.CircleGeometry(1, 64).rotateX(-Math.PI / 2), soilLook);
			scene.add(soil);
			/** @type {import('three').Object3D | null} */
			let plant = null;
			/** a plant built and its parts' meshes, let go @param {import('three').Object3D} o */
			const letGo = (o) => disposeObject(o, { textures: false });
			/** how tall it stands and how far it reaches out over the soil @param {import('three').Object3D} o */
			const measure = (o) => {
				let height = 0, reach = 0;
				const v = new THREE.Vector3();
				o.updateMatrixWorld(true);
				o.traverse((c) => {
					const mesh = /** @type {import('three').Mesh} */ (c);
					const P = mesh.isMesh ? mesh.geometry.attributes.position : null;
					if (!P) return;
					for (let i = 0; i < P.count; i++) {
						v.fromBufferAttribute(P, i).applyMatrix4(mesh.matrixWorld);
						if (v.y > height) height = v.y;
						if (v.y > 0) reach = Math.max(reach, Math.hypot(v.x, v.z));
					}
				});
				return { height, reach };
			};

			const asks = asker();
			show = async (k) => {
				growing = true;
				failed = false;
				const mine = asks.ask();
				let got;
				try {
					got = await loadAsset(buildAt(`${refOf(k)}&detail=${TIERS.look.level}`));
				} catch (err) {
					console.warn('plant look: not built', err);
					if (asks.is(mine)) failed = true;
					return;
				}
				if (!asks.is(mine) || gone) return letGo(got.obj);
				if (plant) {
					letGo(plant);
					scene.remove(plant);
				}
				plant = got.obj;
				plant.traverse((c) => {
					const mesh = /** @type {import('three').Mesh} */ (c);
					if (mesh.isMesh) for (const mt of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) mt.clippingPlanes = soilLine;
				});
				scene.add(plant);
				const shape = measure(plant);
				// framed whole: its height and its reach, from a little above
				const size = Math.max(0.05, shape.height, shape.reach * 2);
				soil.scale.setScalar(Math.max(0.1, shape.reach * 1.5, shape.height * 0.35));
				controls.target.set(0, shape.height * 0.48, 0);
				const away = (size / 2 / Math.tan((camera.fov * Math.PI) / 360)) * 1.25;
				camera.position.copy(controls.target).add(new THREE.Vector3(0.75, 0.32, 1).normalize().multiplyScalar(away));
				camera.near = away / 100;
				camera.far = away * 10;
				camera.updateProjectionMatrix();
				controls.update();
				growing = false;
			};
			show($state.snapshot(kind));

			view.resize();
			const halt = loop(() => {
				controls.update();
				renderer.render(scene, camera);
			});
			stop = () => {
				halt();
				asks.drop();
				if (plant) letGo(plant);
				soil.geometry.dispose();
				soil.material.dispose();
				view.dispose();
			};
		})();
		return () => (gone = true);
	});
	onDestroy(() => stop?.());

	// another plant picked while the card is open: grow that one
	$effect(() => {
		// its asset too: the build it is grown from (./flora.js refOf); without it nothing can be built
		const k = { id: kind.id, v: kind.v, ...(kind.asset ? { asset: kind.asset } : {}), stage: kind.stage, seed: kind.seed };
		show?.(k);
	});
</script>

<div class="look" bind:this={box}>
	{#if failed}<p>Couldn't grow it</p>{:else if growing}<p>Growing it…</p>{/if}
</div>

<style>
	.look {
		position: relative;
		width: 100%;
		height: 100%;
		border-radius: 12px;
		overflow: hidden;
		background: radial-gradient(120% 90% at 50% 20%, #f4f1ea 0%, #e3ddd1 100%);
		touch-action: none;
	}

	.look :global(canvas) {
		display: block;
		width: 100%;
		height: 100%;
		cursor: grab;
	}

	p {
		position: absolute;
		inset: auto 0 0.6rem;
		margin: 0;
		text-align: center;
		font-size: 0.72rem;
		opacity: 0.55;
		pointer-events: none;
	}
</style>
