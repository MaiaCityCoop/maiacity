/*
 * What a census built is kept (./kept.ts; intent 629840f2): an answer is read back only for the same code asked the
 * same question, by the box (./box.ts) and by a worker (`keptWorker`); anything else is built. Small workers that
 * count their own answers, no world, no clock, no network. Run by the site's suite (`bun run test`: *.bun.test.ts).
 *
 *   cd play/site && bun test scripts/census/kept.bun.test.ts
 */
import { expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { frameWindow } from './box';
import { El } from './dom';
import { atWork, codeOf, keptIn, keptWorker, keyOf, trimmed } from './kept';

const TMP = mkdtempSync(join(tmpdir(), 'census-kept-'));
const dir = (name: string) => join(TMP, name);

test('kept: a key is its parts, each whole', () => {
	expect(keyOf('ab', 'c')).toMatch(/^[0-9a-f]{64}$/);
	expect(keyOf('ab', 'c')).toBe(keyOf('ab', 'c'));
	expect(keyOf('ab', 'c')).not.toBe(keyOf('a', 'bc'));
	expect(keyOf('abc')).not.toBe(keyOf('ab', 'c'));
	expect(keyOf(new Uint8Array([97, 98]), 'c')).toBe(keyOf('ab', 'c'));
});

test('kept: an answer is read back as it was put, its arrays whole; nothing is kept where there is no folder', () => {
	const kept = keptIn(dir('store'));
	const answer = { ok: true, data: { positions: new Float32Array([1, 2.5, -3]), index: new Uint32Array([0, 1, 2]), names: ['a'], nested: { n: 7 } } };
	expect(kept.get(keyOf('q'))).toBeUndefined();
	kept.put(keyOf('q'), answer);
	expect(kept.get(keyOf('q'))).toEqual(answer);
	expect(kept.get(keyOf('another'))).toBeUndefined();
	expect(kept.counted).toEqual({ read: 1, made: 1 });
	// another census opening the same folder reads it
	expect(keptIn(dir('store')).get(keyOf('q'))).toEqual(answer);
	// a file cut short is as good as none
	const cut = keyOf('cut');
	mkdirSync(join(dir('store'), cut.slice(0, 2)), { recursive: true });
	writeFileSync(join(dir('store'), cut.slice(0, 2), cut), new Uint8Array([1, 2, 3]));
	expect(kept.get(cut)).toBeUndefined();
	const none = keptIn(null);
	none.put(keyOf('q'), answer);
	expect(none.get(keyOf('q'))).toBeUndefined();
});

test('kept: the code a module is: its text and what it imports, wherever it is checked out', () => {
	const tree = (name: string, b: string, version = '1.0.0') => {
		const d = dir(name);
		mkdirSync(join(d, 'src/lib'), { recursive: true });
		mkdirSync(join(d, 'node_modules/pkg'), { recursive: true });
		writeFileSync(join(d, 'src/worker.js'), "import { b } from './lib/b.js';\nimport 'pkg/deep.js';\nself.onmessage = () => b;\n");
		writeFileSync(join(d, 'src/lib/b.js'), b);
		writeFileSync(join(d, 'node_modules/pkg/package.json'), JSON.stringify({ version }));
		return codeOf(join(d, 'src/worker.js'), join(d, 'node_modules'));
	};
	const one = tree('one', 'export const b = 1;\n');
	expect(tree('two', 'export const b = 1;\n')).toBe(one);
	expect(tree('three', 'export const b = 2;\n')).not.toBe(one);
	expect(tree('four', 'export const b = 1;\n', '1.0.1')).not.toBe(one);
});

/** a worker that numbers its answers: 1, 2, 3 … so an answer read back is told from one made anew */
function counting() {
	let n = 0, made = 0;
	const make = () => {
		made++;
		const w = {
			onmessage: null as ((e: { data: any }) => void) | null,
			onerror: null,
			postMessage(m: { id: number; fail?: boolean }) {
				const answer = m.fail ? { id: m.id, error: 'refused' } : { id: m.id, out: { n: ++n } };
				queueMicrotask(() => w.onmessage?.({ data: answer }));
			},
			terminate() {}
		};
		return w as unknown as Worker;
	};
	return { make, made: () => made };
}
const asked = (w: ReturnType<typeof keptWorker>, m: object) =>
	new Promise<any>((ok) => {
		w.onmessage = (e) => ok(e.data);
		w.postMessage(m as { id: unknown });
	});

test('kept: a worker asked the same again answers from what was kept, and is not even started', async () => {
	const kept = keptIn(dir('worker'));
	const first = counting();
	const w = keptWorker(first.make, kept, 'code-1');
	const draws = { draws: [{ index: new Uint32Array([0, 1, 2]) }], plans: [{ budget: 100 }] };
	expect(await asked(w, { id: 1, ...draws })).toEqual({ id: 1, out: { n: 1 } });
	expect(await asked(w, { id: 2, ...draws, plans: [{ budget: 50 }] })).toEqual({ id: 2, out: { n: 2 } });
	// the same question under another id: the answer kept, under the id now asked
	expect(await asked(w, { id: 3, ...draws })).toEqual({ id: 3, out: { n: 1 } });
	expect(first.made()).toBe(1);

	// another run: everything asked before is read, and no worker starts
	const second = counting();
	const again = keptWorker(second.make, kept, 'code-1');
	expect(await asked(again, { id: 9, ...draws, plans: [{ budget: 50 }] })).toEqual({ id: 9, out: { n: 2 } });
	expect(second.made()).toBe(0);
	// a question not asked before starts it
	expect(await asked(again, { id: 10, ...draws, plans: [{ budget: 25 }] })).toEqual({ id: 10, out: { n: 1 } });
	expect(second.made()).toBe(1);

	// other code answers nothing kept for this one
	const other = counting();
	expect(await asked(keptWorker(other.make, kept, 'code-2'), { id: 1, ...draws })).toEqual({ id: 1, out: { n: 1 } });
	expect(other.made()).toBe(1);

	// an error is answered and never kept
	const failing = counting();
	const f = keptWorker(failing.make, kept, 'code-1');
	expect(await asked(f, { id: 1, fail: true })).toEqual({ id: 1, error: 'refused' });
	expect(await asked(f, { id: 2, fail: true })).toEqual({ id: 2, error: 'refused' });
	expect(kept.counted.made).toBe(4);
});

test('kept: a question is at work until its worker answers it, fails or ends; one read as kept never is', async () => {
	const kept = keptIn(dir('at-work'));
	/** a worker that answers only when told to */
	const held: { id: unknown }[] = [];
	const w = { onmessage: null as any, onerror: null as any, postMessage: (m: { id: unknown }) => void held.push(m), terminate() {} };
	const k = keptWorker(() => w as unknown as Worker, kept, 'code');
	const heard: any[] = [];
	k.onmessage = (e) => heard.push(e.data);
	expect(atWork.size).toBe(0);
	k.postMessage({ id: 1, q: 'a' } as { id: unknown });
	k.postMessage({ id: 2, q: 'b' } as { id: unknown });
	expect(atWork.size).toBe(2);
	w.onmessage({ data: { id: 1, out: 'A' } });
	expect(atWork.size).toBe(1);
	expect(heard).toEqual([{ id: 1, out: 'A' }]);
	// an error answers it too, and a worker that stops holds nothing more
	w.onmessage({ data: { id: 2, error: 'refused' } });
	expect(atWork.size).toBe(0);
	k.postMessage({ id: 3, q: 'c' } as { id: unknown });
	expect(atWork.size).toBe(1);
	w.onerror({ message: 'stopped' });
	expect(atWork.size).toBe(0);
	k.postMessage({ id: 4, q: 'd' } as { id: unknown });
	k.terminate();
	expect(atWork.size).toBe(0);
	// what was kept is read: no worker holds it
	k.postMessage({ id: 5, q: 'a' } as { id: unknown });
	expect(atWork.size).toBe(0);
	await new Promise((r) => setTimeout(r, 5));
	expect(heard.at(-1)).toEqual({ id: 5, out: 'A' });
});

/** a box whose engine numbers its builds, as the shell boots it (kernel/sandbox/frame.js): what the page hears */
function box(store: string, engine = '') {
	const heard: any[] = [];
	const frame = new El('iframe');
	const win = frameWindow(frame, keptIn(store));
	const listen = (e: Event) => {
		const [msg, room] = (e as MessageEvent).data;
		if ((e as MessageEvent).source === win) heard.push({ ...msg, room });
	};
	globalThis.addEventListener('message', listen);
	win.postMessage({ op: 'boot', code: `${engine}let n = 0; self.onmessage = (e) => self.postMessage([{ id: e.data.id, ok: true, op: e.data.op, n: ++n }]);` });
	const ask = async (room: number, job: object) => {
		const before = heard.length;
		win.postMessage({ op: 'job', room, job });
		for (let i = 0; i < 400 && heard.length === before; i++) await new Promise((r) => setTimeout(r, 5));
		return heard[heard.length - 1];
	};
	return { ask, close: () => (globalThis.removeEventListener('message', listen), frame.remove()) };
}

test('kept: the box builds a recipe once: the same recipe, values and engine asked again is read, anything else built', async () => {
	const recipe = { hash: 'a'.repeat(64), code: 'return 1' };
	const one = box(dir('box'));
	expect(await one.ask(1, { id: 1, op: 'build', recipe, given: { stage: '1' }, engine: 'e' })).toEqual({ id: 1, ok: true, op: 'build', n: 1, room: 1 });
	expect(await one.ask(1, { id: 2, op: 'build', recipe, given: { stage: '2' }, engine: 'e' })).toMatchObject({ id: 2, n: 2 });
	// answered, nothing is at work; a build left unanswered as its box goes is not left at work
	expect(atWork.size).toBe(0);
	one.close();

	// another run: a fresh worker would answer n 1; what was kept answers as it was built, in the room it is asked in
	const two = box(dir('box'));
	expect(await two.ask(4, { id: 7, op: 'build', recipe, given: { stage: '2' }, engine: 'e' })).toEqual({ id: 7, ok: true, op: 'build', n: 2, room: 4 });
	// other values, another recipe: built
	expect(await two.ask(4, { id: 8, op: 'build', recipe, given: { stage: '3' }, engine: 'e' })).toMatchObject({ id: 8, n: 1 });
	expect(await two.ask(5, { id: 9, op: 'build', recipe: { ...recipe, code: 'return 2' }, given: { stage: '2' }, engine: 'e' })).toMatchObject({ id: 9, n: 1 });
	// only a build is kept: a step of a running build is asked of its worker every time
	expect(await two.ask(4, { id: 10, op: 'tick', session: 1 })).toMatchObject({ id: 10, op: 'tick', n: 2 });
	expect(await two.ask(4, { id: 11, op: 'tick', session: 1 })).toMatchObject({ id: 11, op: 'tick', n: 3 });
	two.close();

	// another engine (the box's script) reads nothing of this one's
	const three = box(dir('box'), '/* engine 2 */ ');
	expect(await three.ask(1, { id: 1, op: 'build', recipe, given: { stage: '2' }, engine: 'e' })).toMatchObject({ id: 1, n: 1 });
	three.close();
});

test('kept: what was not used for long is let go, what was used stays', () => {
	const d = dir('trim');
	const kept = keptIn(d);
	kept.put(keyOf('old'), { n: 1 });
	kept.put(keyOf('used'), { n: 2 });
	const at = (k: string) => join(d, k.slice(0, 2), k);
	// a clock of the test's own: used ten days and one day before `now`
	const day = 86_400_000, now = Date.UTC(2026, 10, 20);
	utimesSync(at(keyOf('old')), new Date(now - 10 * day), new Date(now - 10 * day));
	utimesSync(at(keyOf('used')), new Date(now - day), new Date(now - day));
	expect(trimmed(d, 30, now)).toBe(0);
	expect(trimmed(d, 7, now)).toBe(1);
	expect(existsSync(at(keyOf('old')))).toBe(false);
	expect(kept.get(keyOf('used'))).toEqual({ n: 2 });
	expect(trimmed(dir('no-such-folder'), 7, now)).toBe(0);
});
