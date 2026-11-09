/**
 * SANDBOX 7 · THE WORLD — the hex planet raised in a page's stage: its four maps fetched from play's files by the hashes
 * its planet config names, the globe built from them (./globe.ts), drawn as its biomes config paints it (./scene.ts),
 * the candidate sites pinned on it, and the camera rig from orbit to a walk (./rig.ts). Lit by the sun of the world's
 * hour (the kit's sky clock: the time control's, or the hour a film pins) as it stands over the point beneath the camera, with a soft fill so the night side still
 * reads, on play's light ground. Answers WorldPage's `move`, `look` and `dispose`, and flies to a site or picks a pin.
 */
import * as THREE from 'three';
import { createSkyClock, createStage, disposeObject } from '$lib/content/sandbox-kit';
import { asset } from '$lib/site/media/url';
import { buildGlobe } from './globe';
import { latLonOf, mapsOf, unitAt, type GridFile, type PlanetMaps } from './maps';
import { GlobeRig } from './rig';
import { buildPlanet, type Biomes, type Pin, type Planet } from './scene';

/** the sun's declination on a day of the year, degrees: the season's tilt */
export const declination = (day: number) => -23.44 * Math.cos(((2 * Math.PI) / 365) * (day + 10));

/** where the sun stands over the planet at an hour of the place at longitude `lon`: the point it is overhead */
export function subsolar(hour: number, lon: number, day: number): { lat: number; lon: number } {
	return { lat: declination(day), lon: ((((lon - (hour - 12) * 15 + 180) % 360) + 360) % 360) - 180 };
}

async function readMaps(planet: Planet): Promise<PlanetMaps> {
	const get = async (file: string): Promise<GridFile> => {
		const r = await fetch(asset(file), { credentials: 'same-origin' });
		if (!r.ok) throw new Error(`the planet's map ${file} could not be read (HTTP ${r.status})`);
		return r.json();
	};
	const [land, biomes, depth, mountains] = await Promise.all([get(planet.maps.land.file), get(planet.maps.biomes.file), get(planet.maps.depth.file), get(planet.maps.mountains.file)]);
	return { land, biomes, depth, mountains };
}

export type PlanetHandle = {
	move: (x: number, y: number, hurry: boolean) => void;
	look: (dx: number, dy: number) => void;
	/** fly the camera to a point, coming down over it */
	flyTo: (lat: number, lon: number) => void;
	/** the pin under a point of the page, by its index, or null */
	pick: (x: number, y: number) => number | null;
	dispose: () => void;
};

export async function mountPlanet(stage: HTMLDivElement, onProgress: (label: string) => void, planet: Planet, biomes: Biomes, pins: Pin[]): Promise<PlanetHandle> {
	onProgress('Fetching the maps of the Earth');
	const maps = mapsOf(await readMaps(planet));
	onProgress('Laying the cards on the globe');
	// let the label paint before the globe takes the main thread
	await new Promise((r) => setTimeout(r, 0));
	const tiles = buildGlobe({ frequency: planet.frequency, land: planet.land, seed: planet.seed, poles: planet.poles, deepest: planet.seaFloor.deepest, maps });
	onProgress('Painting the biomes and growing the forests');
	await new Promise((r) => setTimeout(r, 0));
	const built = buildPlanet(tiles, planet, biomes, pins);

	const world = createStage(stage, { fov: 40, near: 0.05, far: planet.radius * 12 });
	const { renderer, scene, camera } = world;
	scene.background = new THREE.Color(planet.view.background);
	scene.add(built.root);
	// the sun, and a fill from the sky all round so the night side still reads
	const sun = new THREE.DirectionalLight(0xfff4e6, 3.2);
	const fill = new THREE.HemisphereLight(0xeaf3ff, 0x6f7a72, planet.view.fill * 2.6);
	scene.add(sun, sun.target, fill);

	const surface = planet.radius + Math.max(...Object.values(biomes.kinds).map((b) => b.lift));
	const reticle = document.createElement('div');
	reticle.className = 'hud-reticle';
	reticle.hidden = true;
	stage.appendChild(reticle);
	const rig = new GlobeRig(camera, { surface, eye: planet.view.eye, ceiling: planet.radius * planet.view.ceiling, start: planet.view.start, altitude: planet.radius * planet.view.altitude, reticle });
	rig.listen(renderer.domElement);

	const clock = createSkyClock();
	const day = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 864e5);
	const toSun = new THREE.Vector3();
	const placeSun = () => {
		// the hour is the hour where you are: the sun stands where it would over the point beneath the camera
		const s = subsolar(clock.hour(), latLonOf(rig.pos.toArray())[1], day);
		toSun.set(...unitAt(s.lat, s.lon));
		sun.position.copy(toSun).multiplyScalar(planet.radius * 6);
		// the fill's sky is up where you are
		fill.position.copy(rig.pos);
	};

	onProgress('ready');
	let last = performance.now(), live = true;
	renderer.setAnimationLoop((now: number) => {
		if (!live) return;
		rig.update((now - last) / 1000);
		last = now;
		placeSun();
		// the pins big enough to see from orbit, a tree's height on the ground
		built.sizePins(Math.min(4, Math.max(0.5, rig.altitude * 0.03)));
		world.adapt(now);
		renderer.render(scene, camera);
	});

	const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
	return {
		move: (x, y, hurry) => rig.move(x, y, hurry),
		look: () => {},
		flyTo: (lat, lon) => rig.flyTo(lat, lon),
		pick(x, y) {
			const r = renderer.domElement.getBoundingClientRect();
			ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
			ray.setFromCamera(ndc, camera);
			const hit = ray.intersectObject(built.markers, false)[0];
			return hit?.instanceId ?? null;
		},
		dispose() {
			live = false;
			renderer.setAnimationLoop(null);
			rig.dispose();
			reticle.remove();
			built.dispose();
			disposeObject(scene);
			world.dispose();
		}
	};
}
