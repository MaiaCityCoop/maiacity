// The planet as its layout's v1 holds it (play/api/import/sandboxes/sandbox-7) and its four maps from play/media, for
// the tests: built once, shared.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import planetJson from '../../../../../api/import/sandboxes/sandbox-7/planet.json';
import biomesJson from '../../../../../api/import/sandboxes/sandbox-7/biomes.json';
import sitesJson from '../../../../../api/import/sandboxes/sandbox-7/sites.json';
import { buildGlobe, type Tile } from './globe';
import { mapsOf, type GridFile } from './maps';
import type { Biomes, Planet } from './scene';
import type { Sites } from './sites';

export const planet = planetJson as unknown as Planet;
export const biomes = biomesJson as unknown as Biomes;
export const sites = sitesJson as unknown as Sites;
const MEDIA = join(import.meta.dir, '../../../../../media');
export const mapFile = (file: string) => JSON.parse(readFileSync(join(MEDIA, file), 'utf8')) as GridFile;

let built: Tile[] | null = null;
export function tiles(): Tile[] {
	if (!built) {
		const m = planet.maps;
		const maps = mapsOf({ land: mapFile(m.land.file), biomes: mapFile(m.biomes.file), depth: mapFile(m.depth.file), mountains: mapFile(m.mountains.file) });
		built = buildGlobe({ frequency: planet.frequency, land: planet.land, seed: planet.seed, poles: planet.poles, deepest: planet.seaFloor.deepest, maps });
	}
	return built;
}
