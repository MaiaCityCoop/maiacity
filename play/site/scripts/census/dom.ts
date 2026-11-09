/*
 * THE CENSUS'S PAGE — the little of a browser page a world's code touches while it builds and draws, on the CPU in Bun
 * (intent bba45d6e): elements that hold children, a style and listeners, a window of the bench's size (1440×900, as the
 * Mac's runs), a canvas whose 2D context draws nothing and whose WebGL context is refused (no WebGL in the cloud, not
 * even SwiftShader: the counting renderer, ./counting.js, is the one renderer), a clock the census turns by hand
 * (`frame`), and no device features. It holds no layout: a world reads its container's size, never a layout.
 */

/** the viewport every census is taken at: the Mac's runs (selector-shots.mjs, 1440×900) */
export const VIEWPORT = { width: 1440, height: 900 };

/** every WebGL context asked for (the test fails on any): the counting renderer asks for none */
export const refusedContexts: string[] = [];
/** the smoke's WebGL 2 (intent c1bee1f8, ../census.ts --smoke): a context that only answers, for WebGPURenderer's WebGL 2
 *  backend to run its own code on (no pixel drawn); null: refused, as every census */
export const contexts: { webgl2: null | (() => any) } = { webgl2: null };

type Listener = EventListenerOrEventListenerObject;

/** a 2D context that takes every call and draws nothing: textures painted on a canvas are shapes' colours, never counts */
function context2d(canvas: El) {
	const noop = () => {};
	const gradient = { addColorStop: noop };
	const base: Record<string, unknown> = {
		canvas,
		createLinearGradient: () => gradient,
		createRadialGradient: () => gradient,
		createConicGradient: () => gradient,
		createPattern: () => ({ setTransform: noop }),
		measureText: (t: string) => ({ width: String(t).length * 8, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
		getImageData: (_x: number, _y: number, w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) }),
		createImageData: (w: number | { width: number; height: number }, h?: number) => {
			const W = typeof w === 'number' ? w : w.width, H = typeof w === 'number' ? h! : w.height;
			return { width: W, height: H, data: new Uint8ClampedArray(Math.max(1, W * H * 4)) };
		},
		getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
		isPointInPath: () => false,
		getLineDash: () => []
	};
	return new Proxy(base, {
		get: (t, k) => (k in t ? t[k as string] : typeof k === 'string' && /^[a-z]/.test(k) && !/(Style|Width|Alpha|Operation|font|Align|Baseline|filter|Smoothing|Cap|Join|Limit|Offset|Blur|Color|direction)$/.test(k) ? noop : undefined),
		set: (t, k, v) => ((t[k as string] = v), true)
	});
}

export class El extends EventTarget {
	tagName: string;
	nodeName: string;
	children: El[] = [];
	childNodes: El[] = [];
	parentNode: El | null = null;
	parentElement: El | null = null;
	style: Record<string, string> & { setProperty: (k: string, v: string) => void; removeProperty: (k: string) => void; cssText: string } = Object.assign(Object.create(null), { cssText: '', setProperty() {}, removeProperty() {} });
	dataset: Record<string, string> = {};
	attributes = new Map<string, string>();
	textContent = '';
	innerHTML = '';
	className = '';
	id = '';
	tabIndex = 0;
	width = 300;
	height = 150;
	classList = { add() {}, remove() {}, toggle() {}, contains: () => false };
	ownerDocument: unknown;
	#ctx: unknown;
	#gl: any;
	/** an iframe's window (./box.ts makes it a headless box frame) */
	contentWindow: unknown = null;
	srcdoc = '';
	constructor(tag: string) {
		super();
		this.tagName = tag.toUpperCase();
		this.nodeName = this.tagName;
	}
	get clientWidth() {
		return VIEWPORT.width;
	}
	get clientHeight() {
		return VIEWPORT.height;
	}
	get offsetWidth() {
		return VIEWPORT.width;
	}
	get offsetHeight() {
		return VIEWPORT.height;
	}
	get isConnected() {
		return true;
	}
	getBoundingClientRect() {
		return { x: 0, y: 0, left: 0, top: 0, right: VIEWPORT.width, bottom: VIEWPORT.height, width: VIEWPORT.width, height: VIEWPORT.height, toJSON() {} };
	}
	getContext(kind: string) {
		if (kind === 'webgl2' && contexts.webgl2) return (this.#gl ??= contexts.webgl2());
		if (/webgl|experimental-webgl|webgpu|bitmaprenderer/.test(kind)) {
			refusedContexts.push(kind);
			throw new Error(`census: a ${kind} context was asked for; the census draws nothing (no WebGL in the cloud)`);
		}
		return (this.#ctx ??= context2d(this));
	}
	toDataURL() {
		return 'data:image/png;base64,';
	}
	toBlob(cb: (b: Blob) => void) {
		cb(new Blob([]));
	}
	appendChild<T extends El>(c: T) {
		c.parentNode?.removeChild(c);
		this.children.push(c);
		this.childNodes.push(c);
		c.parentNode = c.parentElement = this;
		if (c.tagName === 'IFRAME') queueMicrotask(() => c.dispatchEvent(new Event('load')));
		return c;
	}
	append(...cs: (El | string)[]) {
		for (const c of cs) if (typeof c !== 'string') this.appendChild(c);
	}
	prepend(...cs: (El | string)[]) {
		this.append(...cs);
	}
	insertBefore<T extends El>(c: T) {
		return this.appendChild(c);
	}
	removeChild<T extends El>(c: T) {
		this.children = this.children.filter((x) => x !== c);
		this.childNodes = this.childNodes.filter((x) => x !== c);
		c.parentNode = c.parentElement = null;
		return c;
	}
	replaceChildren(...cs: El[]) {
		for (const c of [...this.children]) this.removeChild(c);
		this.append(...cs);
	}
	remove() {
		this.parentNode?.removeChild(this);
	}
	getRootNode(): unknown {
		let n: El = this;
		while (n.parentNode) n = n.parentNode;
		return n.tagName === 'HTML' ? n.ownerDocument : n;
	}
	contains(o: El | null): boolean {
		return o === this || this.children.some((c) => c.contains(o));
	}
	setAttribute(k: string, v: string) {
		this.attributes.set(k, String(v));
	}
	getAttribute(k: string) {
		return this.attributes.get(k) ?? null;
	}
	removeAttribute(k: string) {
		this.attributes.delete(k);
	}
	hasAttribute(k: string) {
		return this.attributes.has(k);
	}
	querySelector() {
		return null;
	}
	querySelectorAll() {
		return [];
	}
	closest() {
		return null;
	}
	focus() {}
	blur() {}
	click() {}
	setPointerCapture() {}
	releasePointerCapture() {}
	hasPointerCapture() {
		return false;
	}
	requestPointerLock() {}
	requestFullscreen() {
		return Promise.resolve();
	}
	animate() {
		return { cancel() {}, finished: Promise.resolve(), onfinish: null };
	}
	cloneNode() {
		return new El(this.tagName);
	}
}

/** the page's document: one body, nothing laid out */
export function makeDocument() {
	const listeners = new EventTarget();
	const html = new El('html'), head = new El('head'), body = new El('body');
	html.append(head, body);
	const doc = {
		documentElement: html,
		head,
		body,
		visibilityState: 'visible',
		hidden: false,
		readyState: 'complete',
		fonts: { ready: Promise.resolve(), load: () => Promise.resolve([]), check: () => true, add() {} },
		pointerLockElement: null,
		fullscreenElement: null,
		activeElement: body,
		createElement: (t: string) => {
			const e = new El(t);
			e.ownerDocument = doc;
			return e;
		},
		createElementNS: (_ns: string, t: string) => new El(t),
		createTextNode: (t: string) => Object.assign(new El('#text'), { textContent: t }),
		createDocumentFragment: () => new El('#fragment'),
		getElementById: () => null,
		querySelector: () => null,
		querySelectorAll: () => [],
		addEventListener: (t: string, l: Listener, o?: AddEventListenerOptions | boolean) => listeners.addEventListener(t, l, o),
		removeEventListener: (t: string, l: Listener) => listeners.removeEventListener(t, l),
		dispatchEvent: (e: Event) => listeners.dispatchEvent(e),
		exitPointerLock() {},
		exitFullscreen: () => Promise.resolve(),
		hasFocus: () => true
	};
	body.ownerDocument = html.ownerDocument = head.ownerDocument = doc;
	return doc;
}
