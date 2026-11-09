import { afterEach, describe, expect, it, vi } from 'vitest';
import { playIfAllowed, resumeIfAllowed } from './media.js';

const refused = (name) => Object.assign(new Error(name), { name });
afterEach(() => vi.restoreAllMocks());

describe('sound and video, as the browser allows', () => {
	it('plays, or waits quietly for a touch, or says what else went wrong', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(await playIfAllowed({ play: async () => {} })).toBe(true);
		expect(await playIfAllowed({ play: () => Promise.reject(refused('NotAllowedError')) })).toBe(false);
		expect(await playIfAllowed({ play: () => Promise.reject(refused('AbortError')) })).toBe(false);
		expect(warn).not.toHaveBeenCalled();
		expect(await playIfAllowed({ play: () => Promise.reject(refused('NotSupportedError')) })).toBe(false);
		expect(warn).toHaveBeenCalledOnce();
	});
	it('resumes an audio context: true only once it runs', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const ctx = { state: 'suspended', resume: async () => void (ctx.state = 'running') };
		expect(await resumeIfAllowed(ctx)).toBe(true);
		expect(await resumeIfAllowed({ state: 'suspended', resume: async () => {} })).toBe(false);
		expect(await resumeIfAllowed({ state: 'closed', resume: () => Promise.reject(refused('InvalidStateError')) })).toBe(false);
		expect(console.warn).toHaveBeenCalledOnce();
	});
});
