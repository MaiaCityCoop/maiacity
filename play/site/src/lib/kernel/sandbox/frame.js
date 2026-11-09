// @ts-nocheck — plain JS
import { base } from '$app/paths';
import { hashBytes } from '../hash.js';
import { enginesOf, latestOf, pathOf } from '../engines.js';
import { BUDGETS, DENY, SANDBOX, SHELL_SCRIPT, frameCsp } from './policy.js';
/*
 * THE SHELL — where code we cannot trust runs in a page: a worker inside a frame with no origin. One shell for every
 * host; the asset box (../../content/assets/box/host.js) the only one today. Each runs a frozen engine of ours in the
 * worker, and nothing else ever starts there.
 *
 * - The frame: sandbox="allow-scripts" and NOT allow-same-origin, so its origin is opaque ("null"): no cookie, storage,
 *   OPFS, passkey or page of ours. A Permissions Policy turns every device feature off (./policy.js, the one deny list).
 * - Its Content Security Policy, which the blob: worker inherits: no connection of any kind, no script but the frame's
 *   own and the worker's blob (and WebAssembly for an engine that is one), no images, styles, frames or forms.
 * - The worker is a frozen engine, its bytes checked against its BLAKE3 hash and handed in whole: the shell loads
 *   nothing. Its first act is the second lock (the engine's own lockdown): every way out taken off its global scope.
 * - The frame only starts workers and passes messages, so code that never stops cannot freeze the page, not even in
 *   Safari, where a sandboxed frame shares the page's thread.
 * - Rooms keep code apart: each a worker no other room's job reaches, a job answered only from the room it was asked
 *   in. A spare is a worker made ahead with nothing run in it.
 * - Out comes plain data only, which the page checks. A job too long, or whose worker crashes, ends alone where rooms
 *   are kept apart (`apart`); with one room the frame goes and the next job starts a new shell. A crash before any room
 *   (the spare) is the engine's own, and the shell goes too.
 */

/** The frame's policy: nothing in or out but its own script, its worker's blob and, if `wasm`, WebAssembly. */
const csp = ({ wasm = false } = {}) => frameCsp({ script: `'unsafe-inline' blob:${wasm ? " 'wasm-unsafe-eval'" : ''}` });

// the frame: its policy, and its one script (./policy.js SHELL_SCRIPT), which the page's own policy names by its hash
const frameOf = (policy) => `<!doctype html><meta http-equiv="Content-Security-Policy" content="${policy}"><script>${SHELL_SCRIPT}<\/script>`;

/**
 * A frozen engine's code fetched from `path` (under the base path), its bytes checked against `hash`.
 * @param {string} path @param {string} hash @param {string} what what it is called in an error @returns {Promise<string>}
 */
export async function frozen(path, hash, what) {
	const res = await fetch(`${base}${path}`);
	if (!res.ok) throw new Error(`${what}: ${res.status}`);
	const bytes = new Uint8Array(await res.arrayBuffer());
	const named = hashBytes(bytes);
	if (named !== hash) throw new Error(`refused: ${what} hashes to ${named.slice(0, 12)}…, not ${hash.slice(0, 12)}…`);
	return new TextDecoder().decode(bytes);
}

/** each frozen engine's code as it was fetched and checked, by kind and version: once a page, for every host */
const engines = new Map();

/**
 * Frozen engine `v` of `kind` (latest when none: ../engines.js) checked (`frozen`), fetched once a page; a failed fetch
 * is tried again by the next ask. @param {string} kind @param {number} [v] @returns {Promise<string>}
 */
export function engineCode(kind, v = latestOf(kind)?.v) {
	const k = `${kind}-v${v}`;
	if (!engines.has(k)) {
		const e = enginesOf(kind).find((x) => x.v === v);
		const got = e ? frozen(pathOf(kind, e.v), e.blake3, `${kind} engine ${e.v}`) : Promise.reject(new Error(`no ${kind} engine ${v} is frozen`));
		got.catch(() => engines.delete(k));
		engines.set(k, got);
	}
	return engines.get(k);
}

/** How long a job may take before the shell is torn down (ms). Only in development may the render bench on a busy
 * machine (`/render/?slack=3`, scripts/render.mjs --slack) stretch it; a built site holds every job to its budget. */
const SLACK = import.meta.env?.DEV && typeof location !== 'undefined' ? Math.min(6, Math.max(1, Number(new URLSearchParams(location.search).get('slack')) || 1)) : 1;
export const TIMEOUT = BUDGETS.job * SLACK;

export class Shell {
	/**
	 * @param {{ code: () => Promise<string>, wasm?: boolean, timeout?: number, spare?: boolean, apart?: boolean }} o
	 *   `code`: the engine the workers run, checked (`frozen`); `wasm`: whether that engine compiles WebAssembly;
	 *   `spare`: a worker kept made ahead for the next new room (a host of many rooms); `apart`: a room whose job runs
	 *   too long, or whose worker crashes, ends alone, and the others go on (a host whose rooms hold code apart)
	 */
	constructor({ code, wasm = false, timeout = TIMEOUT, spare = false, apart = false }) {
		this.code = code;
		this.policy = csp({ wasm });
		this.timeout = timeout;
		this.spare = spare;
		this.apart = apart;
		this.frame = null;
		this.ready = null;
		this.jobs = new Map();
		this.next = 1;
		this.onmessage = (e) => this.#message(e);
	}

	start() {
		if (this.ready) return this.ready;
		// a stop while it starts ends the start too (frame gone, load never comes): nothing waits for ever; after, nothing to end
		const halted = new Promise((_, no) => (this.halt = no));
		halted.catch(() => {});
		const ready = (this.ready = (async () => {
			const code = await Promise.race([this.code(), halted]);
			const frame = document.createElement('iframe');
			frame.setAttribute('sandbox', SANDBOX);
			frame.setAttribute('allow', DENY);
			frame.setAttribute('referrerpolicy', 'no-referrer');
			frame.setAttribute('aria-hidden', 'true');
			frame.tabIndex = -1;
			frame.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden;pointer-events:none';
			frame.srcdoc = frameOf(this.policy);
			this.frame = frame;
			const up = new Promise((ok, no) => {
				this.started = ok;
				setTimeout(() => no(new Error('the box did not start')), this.timeout);
			});
			addEventListener('message', this.onmessage);
			const loaded = new Promise((ok) => frame.addEventListener('load', ok, { once: true }));
			document.body.append(frame);
			await Promise.race([loaded, up, halted]);
			frame.contentWindow?.postMessage({ op: 'boot', code, spare: this.spare }, '*');
			await Promise.race([up, halted]);
		})());
		// a start that failed stops the shell, unless the shell was stopped or started again meanwhile
		ready.catch(() => this.ready === ready && this.stop('the box did not start'));
		return ready;
	}

	#message(e) {
		if (!this.frame || e.source !== this.frame.contentWindow) return;
		// [what a worker said, the room of that worker], the room named by the frame
		const [msg, room] = Array.isArray(e.data) ? e.data : [];
		if (!msg || typeof msg !== 'object') return;
		if (msg.op === 'ready') return this.started?.();
		// a room's worker that crashed ends alone where rooms are kept apart; one in no room yet (the spare: nothing but
		// the engine ran in it) failed as the engine, and the shell goes
		if (msg.op === 'crash') return this.apart && room != null ? this.leave(room, `its worker crashed: ${msg.error}`) : this.stop(`the box crashed: ${msg.error}`);
		const job = this.jobs.get(msg.id);
		// a job is answered only from the room it was asked in, whatever number another room's code guesses
		if (!job || job.room !== room) return;
		this.jobs.delete(msg.id);
		clearInterval(job.timer);
		if (msg.ok === true) job.ok(msg);
		else job.no(new Error(String(msg.error ?? 'the box failed')));
	}

	/** One job, { op, …args }, answered with the engine's answer in `room` (or the room a function names when its turn
	 * comes). Past `timeout` it ends its room where rooms are apart, else tears the shell down, unless `soft` (a step
	 * waiting behind a build is late, not lost: only it fails). Jobs not soft go in one at a time, whatever their room,
	 * so each one's time is its own. */
	ask(op, payload = {}, { timeout = this.timeout, soft = false, room = 0 } = {}) {
		if (soft) return this.#post(op, payload, timeout, soft, room);
		const turn = (this.queue ?? Promise.resolve()).then(() => this.#post(op, payload, timeout, soft, room));
		// the line waits for the job but keeps nothing of its answer (a build's whole data, held till the next job)
		this.queue = turn.then(
			() => {},
			() => {}
		);
		return turn;
	}

	async #post(op, payload, timeout, soft, room) {
		await this.start();
		if (typeof room === 'function') room = room();
		const id = this.next++;
		return new Promise((ok, no) => {
			// counted a second at a time, at most 1.5 s each: a page too busy to listen (compiling shaders on a slow
			// machine) uses up none of the shell's time
			let had = 0, last = performance.now();
			const timer = setInterval(() => {
				const t = performance.now();
				had += Math.min(t - last, 1500);
				last = t;
				if (had < timeout) return;
				clearInterval(timer);
				const why = `${op} ran longer than ${timeout} ms`;
				if (!soft) return this.apart ? this.leave(room, why) : this.stop(why);
				this.jobs.delete(id);
				no(new Error(why));
			}, Math.min(1000, timeout));
			this.jobs.set(id, { ok, no, timer, room });
			this.frame.contentWindow.postMessage({ op: 'job', room, job: { id, op, ...payload } }, '*');
		});
	}

	/** A room let go: its worker ended, its open job failed with `why`; asked again, it starts a fresh worker; others go on. */
	leave(room, why = 'its room was let go') {
		for (const [id, job] of this.jobs) {
			if (job.room !== room) continue;
			clearInterval(job.timer);
			this.jobs.delete(id);
			job.no(new Error(why));
		}
		this.frame?.contentWindow?.postMessage({ op: 'leave', room }, '*');
	}

	stop(why = 'the box was stopped') {
		this.halt?.(new Error(why));
		this.halt = null;
		removeEventListener('message', this.onmessage);
		this.frame?.remove();
		this.frame = null;
		this.ready = null;
		// what ran in it went with it
		this.generation = (this.generation ?? 0) + 1;
		for (const job of this.jobs.values()) {
			clearInterval(job.timer);
			job.no(new Error(why));
		}
		this.jobs.clear();
	}
}
