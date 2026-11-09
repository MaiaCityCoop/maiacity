// Every surface is a real scanned material, kept by its hash, free to use (intent db87a28f, c4): each of SURFACES names
// its albedo with height, its normal and its AO/roughness as KTX2 files by their BLAKE3 hash, at most 2048 px, CC0,
// from a source page; the three maps are array textures, a layer a surface.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { blake3 } from '@noble/hashes/blake3.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { SETS } from './sets.js';
import { SURFACES } from './surfaces.js';
import { arrayOf } from '../render/arrays.js';

const MEDIA = join(import.meta.dirname, '../../../../../media');
/** a KTX2 file's identifier and its pixel width (its header: the 12-byte identifier, then vkFormat, typeSize, width) */
const KTX2 = [0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a];

describe('the scanned surfaces', () => {
	it('backs every surface, in their order', () => {
		expect(SETS.map((s) => s.surface)).toEqual(SURFACES);
	});
	for (const s of SETS)
		it(`${s.surface}: ${s.id}, CC0, three maps by their hashes`, () => {
			expect(s.licence).toBe('CC0');
			expect(s.source).toMatch(/^https:\/\/(polyhaven\.com|ambientcg\.com)\//);
			for (const k of /** @type {const} */ (['albedo', 'normal', 'ar'])) {
				const files = Object.entries(s.maps[k]);
				expect(files.length).toBeGreaterThan(0);
				for (const [px, f] of files) {
					expect(f).toMatch(/^[0-9a-f]{64}\.ktx2$/);
					expect(Number(px)).toBeLessThanOrEqual(2048);
					const p = join(MEDIA, f);
					expect(existsSync(p), `${f} in play/media`).toBe(true);
					const b = readFileSync(p);
					expect([...b.subarray(0, 12)]).toEqual(KTX2);
					expect(b.readUInt32LE(20)).toBe(Number(px));
					expect(`${bytesToHex(blake3(b))}.ktx2`).toBe(f);
				}
			}
		});
	it('makes each map one array texture, a layer a surface', () => {
		const t = arrayOf(SETS.map((s) => s.maps.albedo[1024]), { srgb: true });
		expect(t.isDataArrayTexture).toBe(true);
		expect(t.image.depth).toBe(SETS.length);
	});
});
