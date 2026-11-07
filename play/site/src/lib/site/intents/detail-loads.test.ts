// An intent's detail opens fast and its Accept always answers (intent 2df30a21, check c3: `vitest run -t "detail
// loads"`), the API mocked: each document of an intent's work is read alone when it is opened (./opened.ts), a piece's
// review shows its source and what changed (../../app/Changes.svelte, as the board draws it), and a decision shows it's
// working, can't be pressed twice, and shows the reason the API gives (./decide.ts, ./Decision.svelte,
// ./IntentDetail.svelte).
import { describe, expect, test, vi } from 'vitest';
import { render } from 'svelte/server';
import { ApiError } from '$lib/api';
import Changes from '$lib/app/Changes.svelte';
import Decision from './Decision.svelte';
import IntentDetail from './IntentDetail.svelte';
import { createDecider, type Decidable } from './decide';
import { createOpened, docPath, summaryText, type Listed } from './opened';
import type { Intent } from './detail';

const ID = '99b612ec-afa2-4dad-820b-cd2e0aff6bf5';
const SKELETON = '0e7a9a4e-1d5c-4a5b-9a0e-6a1c2b3d4e5f';
/** 99b612ec's documents as its detail lists them: in brief, no content */
const listed: Listed[] = [
	{ doc: { id: SKELETON, kind: 'piece', what: 'piece', label: 'Person skeleton' }, variant: 11, seedNumber: null, status: 'proposed', summary: { changes: 3, fields: ['schema', 'label', 'source'] } },
	{ doc: { id: SKELETON, kind: 'piece', what: 'piece', label: 'Person skeleton' }, variant: 19, seedNumber: null, status: 'proposed', summary: { changes: 1, fields: ['source'] } },
	{ doc: { id: 'b1c2d3e4-0000-4000-8000-000000000001', kind: 'asset', what: 'asset', label: 'Stand-in' }, variant: 30, seedNumber: 10, status: 'proposed', summary: { changes: 2, fields: ['source', 'card'] } }
];
const v1 = '// Person skeleton, a piece\nmodule.exports.bones = 52;\nmodule.exports.height = 1.75;\n';
const v2 = '// Person skeleton, a piece\nmodule.exports.bones = 53;\nmodule.exports.height = 1.75;\n';

/** a deferred answer, to hold a request open */
const later = <T,>() => {
	let ok!: (v: T) => void, no!: (e: unknown) => void;
	const p = new Promise<T>((a, b) => ((ok = a), (no = b)));
	return { p, ok, no };
};
const waiting: Decidable = { id: ID, stage: 'proposal', decided_at: null };

describe('detail loads', () => {
	test('detail loads: opening a document fetches that document alone, once', async () => {
		const get = vi.fn(async (path: string) => ({ path }));
		const opened = createOpened(get);
		// nothing is read until one is opened
		expect(get).not.toHaveBeenCalled();
		expect(await opened.read(ID, listed[1])).toEqual({ path: `/intents/${ID}/docs/${SKELETON}?variant=19` });
		expect(get).toHaveBeenCalledTimes(1);
		// opened again: the same answer, not asked again; another one: asked for alone
		await opened.read(ID, listed[1]);
		expect(get).toHaveBeenCalledTimes(1);
		await opened.read(ID, listed[2]);
		expect(get.mock.calls.map((c) => c[0])).toEqual([docPath(ID, listed[1]), `/intents/${ID}/docs/${listed[2].doc!.id}?variant=30`]);
		// a failed read is asked again when opened again
		const flaky = vi.fn().mockRejectedValueOnce(new Error('gone')).mockResolvedValue({ ok: true });
		const o2 = createOpened(flaky);
		await expect(o2.read(ID, listed[0])).rejects.toThrow('gone');
		expect(await o2.read(ID, listed[0])).toEqual({ ok: true });
		expect(summaryText(listed[0])).toBe('3 changes: schema, label, source');
	});

	test("detail loads: a piece's review renders its source and its diff", () => {
		// as GET /api/intents/:id/docs/:doc gives a piece's second version: read against the one before it
		const { body } = render(Changes, { props: { changes: [{ path: '$.source', kind: 'changed', from: v1, to: v2 }], edits: [], seed: null } });
		expect(body).toContain('source');
		expect(body).toContain('- module.exports.bones = 52;');
		expect(body).toContain('+ module.exports.bones = 53;');
		// its first version, new: the source it brings, line by line
		const first = render(Changes, { props: { changes: [{ path: '$.label', kind: 'added', to: 'Person skeleton' }, { path: '$.source', kind: 'added', to: v1 }] } }).body;
		expect(first).toContain('+ module.exports.bones = 52;');
		expect(first).toContain('Person skeleton');
		expect(first).not.toContain('Reading it');
	});

	test("detail loads: Accept shows it's working and can't be pressed twice", async () => {
		const answer = later<Decidable & { message?: string }>();
		const post = vi.fn(() => answer.p);
		const states: unknown[] = [];
		const d = createDecider({ post, read: vi.fn(), onchange: (b) => states.push(b) });
		const first = d.decide(waiting, 'accept');
		expect(d.busy).toEqual({ id: ID, verdict: 'accept' });
		// a second press while it runs does nothing
		expect(await d.decide(waiting, 'accept')).toBeNull();
		expect(await d.decide(waiting, 'reject')).toBeNull();
		expect(post).toHaveBeenCalledTimes(1);
		answer.ok({ id: ID, stage: 'accepted', decided_at: '2026-11-07T14:46:22Z' });
		expect(await first).toEqual({ intent: { id: ID, stage: 'accepted', decided_at: '2026-11-07T14:46:22Z' }, message: '', reread: false });
		expect(states).toEqual([{ id: ID, verdict: 'accept' }, null]);
		// the bar: its button says it's working, and neither button can be pressed
		const bar = render(Decision, { props: { detail: { decision: { verdict: 'accept', label: 'Accept', enabled: true, why: '' } as any, reject: true }, busy: 'accept', ondecide: () => {} } }).body;
		expect(bar).toContain('Accepting…');
		expect(bar.match(/<button[^>]*disabled/g)?.length).toBe(2);
		expect(bar).toContain('aria-busy="true"');
		const idle = render(Decision, { props: { detail: { decision: { verdict: 'accept', label: 'Accept', enabled: true, why: '' } as any, reject: true }, ondecide: () => {} } }).body;
		expect(idle).not.toContain('disabled');
		// Approve and Reject the same, for any intent
		expect(render(Decision, { props: { detail: { decision: { verdict: 'approve', label: 'Approve spec', enabled: true, why: '' } as any, reject: true }, busy: 'approve', ondecide: () => {} } }).body).toContain('Approving…');
		expect(render(Decision, { props: { detail: { decision: { verdict: 'approve', label: 'Approve spec', enabled: true, why: '' } as any, reject: true }, busy: 'reject', ondecide: () => {} } }).body).toContain('Rejecting…');
	});

	test('detail loads: an error returned by the API is shown where the button is', async () => {
		const refuse = async (): Promise<Decidable> => Promise.reject(new ApiError('This intent is at the build stage: only one at Proposal is decided.', 409));
		const d = createDecider<Decidable>({ post: vi.fn(refuse), read: vi.fn(async () => waiting) });
		await expect(d.decide(waiting, 'accept')).rejects.toThrow('only one at Proposal is decided');
		expect(d.busy).toBeNull();
		// drawn right above the decision's buttons in the intent's detail
		const intent = {
			id: ID, kind: 'improve', title: 'People move like people', note: '', stage: 'proposal', via: 'mcp', created: '2026-11-07T12:00:00Z', author: 'Samuel',
			spec: null, results: null, specified_at: null, specified_by: null, approved_at: null, approved_by: null, decided_at: null, decided_by: null, came_with: null,
			work: null, pull_request: null, ship: null, sub: { state: 'waiting', tag: 'Accept', why: 'Accept' }
		} as unknown as Intent;
		const body = render(IntentDetail, { props: { intent, error: 'This intent is at the build stage: only one at Proposal is decided.', onclose() {}, ondecide() {}, onopenwork() {}, onopenintent() {} } }).body;
		const at = body.indexOf('only one at Proposal is decided');
		expect(at).toBeGreaterThan(-1);
		expect(body.slice(at - 200, at)).toContain('role="alert"');
		expect(body.slice(at).search(/<footer class="decide\b/)).toBeGreaterThan(0);
	});

	test('detail loads: no answer from play (a 502 while it restarts): the intent read again until it is decided, else why', async () => {
		const sleep = vi.fn(async () => {});
		const read = vi.fn<(id: string) => Promise<Decidable>>().mockResolvedValueOnce(waiting).mockRejectedValueOnce(new ApiError('busy', 502)).mockResolvedValue({ id: ID, stage: 'accepted', decided_at: '2026-11-07T14:46:22Z' });
		const d = createDecider({ post: vi.fn(async () => Promise.reject(new ApiError('play is busy for a moment', 502))), read, sleep, waits: [1, 1, 1, 1] });
		expect(await d.decide(waiting, 'accept')).toEqual({ intent: { id: ID, stage: 'accepted', decided_at: '2026-11-07T14:46:22Z' }, message: '', reread: true });
		expect(read).toHaveBeenCalledTimes(3);
		// never decided: it says so, to press again
		const never = createDecider({ post: vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))), read: vi.fn(async () => waiting), sleep, waits: [1, 1] });
		await expect(never.decide(waiting, 'accept')).rejects.toThrow(/no answer to the Accept.*not taken\. Press it again/);
		expect(never.busy).toBeNull();
	});
});
