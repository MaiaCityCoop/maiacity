// @ts-nocheck — plain JS
/*
 * The walls every sandboxed frame of ours shares (the asset box, the view frames): one list, so a feature turned off
 * for one is off for all. Part of the kernel: changing it changes every box at once. With them, the one script every
 * shell runs.
 */

/** Every powerful browser feature, off: no device, no passkey, no clipboard, no payment, no full screen. */
export const DENIED = [
	'camera', 'microphone', 'geolocation', 'display-capture', 'clipboard-read', 'clipboard-write', 'payment', 'usb',
	'serial', 'hid', 'bluetooth', 'midi', 'publickey-credentials-get', 'publickey-credentials-create', 'storage-access',
	'fullscreen', 'screen-wake-lock', 'idle-detection', 'local-fonts', 'otp-credentials', 'xr-spatial-tracking'
];

/** The frame's `allow` attribute: every feature in DENIED turned off. */
export const DENY = DENIED.map((f) => `${f} 'none'`).join('; ');

/** The `sandbox` attribute: scripts, and nothing else (no same origin, forms, popups, modals, downloads, top navigation). */
export const SANDBOX = 'allow-scripts';

/**
 * How long and how much the page lets code we cannot trust have, in one place (the page's side; what a frozen engine
 * holds code to inside its worker is frozen with it and changes only with a new version: the logic core's ticks and
 * memory; a view script's hold and its work budget; a formula's size and a batch's work).
 * - job: how long one job may hold a shell (the asset box) before its room, or the shell, is ended (ms)
 * - logicJob: the same for the logic host, far past the logic core's own limits (ms)
 * - mathJob: how long one batch of a doc's formulas may hold the math host's shell before its worker is ended, past
 *   the math engine's own budget for a batch (ms)
 * - message: the most a view may send the page in one message (characters of JSON)
 */
export const BUDGETS = { job: 20000, logicJob: 10000, mathJob: 6000, message: 4000 };

/** What a frame's own policy shuts, every one of them, unless the frame's kind opens one to what it names. */
const SHUT = ['connect-src', 'img-src', 'style-src', 'font-src', 'media-src', 'frame-src', 'object-src', 'manifest-src', 'form-action', 'base-uri'];

/** What no frame of ours may ever open, whatever its kind: no connection, no frame inside it, no plug-in, no form, no base. */
export const NEVER = ['connect-src', 'frame-src', 'object-src', 'manifest-src', 'form-action', 'base-uri'];

/**
 * A frame's Content Security Policy, one way for every kind (the shell's, ./frame.js; a view's): it
 * starts from nothing (default-src 'none'), runs the scripts `script` names, makes workers and children only from blob:
 * URLs, and shuts every directive in SHUT but those `open` names. A directive in NEVER cannot be opened.
 * @param {{ script: string, children?: boolean, open?: Record<string, string> }} o
 */
export function frameCsp({ script, children = false, open = {} }) {
	const opened = NEVER.find((d) => d in open);
	if (opened) throw new Error(`no frame of ours opens ${opened}`);
	return ["default-src 'none'", `script-src ${script}`, 'worker-src blob:', ...(children ? ['child-src blob:'] : []), ...SHUT.map((d) => `${d} ${open[d] ?? "'none'"}`)].join('; ');
}

/**
 * The script of every shell's frame (./frame.js), the same text in each. It makes a worker of the engine it is handed
 * for each room the page names, and never puts two rooms in one worker; it passes messages both ways, the arrays
 * moved, and names each one a worker sends by that worker's room, which nothing in the worker can set. A worker made
 * ahead, nothing run in it yet (the spare, when the page asks for one), is the next new room's.
 */
export const SHELL_SCRIPT = `let url, warm, spare;
const rooms = new Map(), roomOf = new WeakMap();
const fresh = () => {
	const w = new Worker(url);
	w.onmessage = (x) => parent.postMessage([x.data[0], roomOf.get(w) ?? null], '*', x.data[1]);
	w.onerror = (x) => { x.preventDefault(); parent.postMessage([{ op: 'crash', error: String(x.message) }, roomOf.get(w) ?? null], '*'); };
	return w;
};
addEventListener('message', (e) => {
	if (e.source !== parent) return;
	const m = e.data;
	if (m && m.op === 'boot' && !url) {
		url = URL.createObjectURL(new Blob([m.code], { type: 'text/javascript' }));
		warm = m.spare === true;
		spare = fresh();
		return;
	}
	if (!url || !m) return;
	if (m.op === 'leave') {
		rooms.get(m.room)?.terminate();
		rooms.delete(m.room);
		return;
	}
	if (m.op !== 'job') return;
	let w = rooms.get(m.room);
	if (!w) {
		w = spare ?? fresh();
		spare = warm ? fresh() : null;
		rooms.set(m.room, w);
		roomOf.set(w, m.room);
	}
	w.postMessage(m.job);
});`;
