<!-- One asset at one version (and variant) built by the asset box from play's catalog, on a paper stage: drag to turn
     round it, scroll to come closer. A rigged actor stands idle. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';

	let { ref }: { ref: string } = $props();
	let canvas = $state<HTMLCanvasElement>();
	let status = $state('Building…');

	onMount(() => {
		let gone = false;
		let dispose = () => {};
		(async () => {
			try {
				await (await import('$lib/recipes')).catalogReady();
				const { createDrawn } = await import('$lib/content/maiacity-v2/drawn.js');
				const { createControls, createRenderer } = await import('$lib/content/render/core.js');
				if (gone || !canvas) return;
				const renderer = createRenderer({ canvas, antialias: true, maxPixelRatio: 2, shadows: 'pcf', colorSpace: THREE.SRGBColorSpace });
				const scene = new THREE.Scene();
				scene.background = new THREE.Color(0xf1ede3);
				scene.add(new THREE.HemisphereLight(0xffffff, 0xa8b88a, 2.4));
				const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
				sun.position.set(4, 8, 6);
				scene.add(sun);
				const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: 0xe6e0d0, roughness: 1 }));
				floor.rotation.x = -Math.PI / 2;
				scene.add(floor);
				const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 2000);
				const controls = createControls(camera, renderer.domElement, { minDistance: 0.2, maxDistance: 400 });
				const drawn = createDrawn({ renderer, camera, scene });
				const anchor = new THREE.Group();
				scene.add(anchor);
				const size = () => {
					const w = canvas!.clientWidth, h = canvas!.clientHeight;
					renderer.setSize(w, h, false);
					camera.aspect = w / Math.max(1, h);
					camera.updateProjectionMatrix();
				};
				size();
				const resizing = new ResizeObserver(size);
				resizing.observe(canvas);
				camera.position.set(4, 3, 5);
				drawn.load(ref, anchor, { cast: true }).then(
					() => {
						// frame it: the whole asset in view, a little from above
						const box = new THREE.Box3().setFromObject(anchor);
						const s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
						const r = Math.max(s.x, s.y, s.z, 0.2);
						controls.target.copy(c);
						camera.position.copy(c).add(new THREE.Vector3(0.9, 0.55, 1.1).normalize().multiplyScalar(r * 2.2));
						camera.near = r / 100;
						camera.far = r * 200;
						camera.updateProjectionMatrix();
						status = '';
					},
					(e: Error) => (status = `Could not build it: ${e.message}`)
				);
				renderer.setAnimationLoop(() => {
					controls.update();
					drawn.update();
					renderer.render(scene, camera);
				});
				dispose = () => {
					renderer.setAnimationLoop(null);
					resizing.disconnect();
					drawn.dispose();
					controls.dispose();
					renderer.dispose();
				};
			} catch (e) {
				status = (e as Error).message;
			}
		})();
		return () => {
			gone = true;
			dispose();
		};
	});
</script>

<div class="preview">
	<canvas bind:this={canvas}></canvas>
	{#if status}<p class="status">{status}</p>{/if}
</div>

<style>
	.preview { position: relative; aspect-ratio: 4 / 3; border-radius: var(--radius); overflow: hidden; border: 1px solid var(--line); background: var(--cream); }
	canvas { display: block; width: 100%; height: 100%; touch-action: none; }
	.status { position: absolute; inset: auto 0 1rem; text-align: center; margin: 0; color: var(--muted); font-size: 0.9rem; }
</style>
