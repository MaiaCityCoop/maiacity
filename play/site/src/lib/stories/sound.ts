// THE STORY'S SOUND — the timeline's recordings (./timeline.ts `soundsOf`) laid on one Web Audio clock, as the old
// studio did (SNAPSHOT_2611101 maia/content/studio/studio.svelte.js `schedule`): each clip an AudioBufferSourceNode
// started at its place, through its EQ (biquads), its gain automation, its fades and, for music, the dip under the
// voice; all into one bus. The player's t follows this clock while it plays, so picture and sound never drift; a
// seek lays everything again from the new t. Files are fetched from /api/files/<hash> and decoded once.
import { DUCK, dbToGain, keyDb, soundsOf, voiceSpans, type Sound, type StoryBody } from './timeline';

const webAudioQ = (b: { type: string; q: number }) => (b.type === 'highpass' || b.type === 'lowpass' ? 20 * Math.log10(b.q) : b.q);

export class StorySound {
	private ctx: AudioContext | null = null;
	/** a context made in the user's own tap, waiting for the start it was made for */
	private primed: AudioContext | null = null;
	private bus: GainNode | null = null;
	private buffers = new Map<string, AudioBuffer>();
	private loading = new Map<string, Promise<AudioBuffer | null>>();
	private nodes: AudioScheduledSourceNode[] = [];
	private sounds: Sound[] = [];
	private spans: [number, number][] = [];
	/** the context time and the story time the clock started at, and how fast the story runs */
	private ctxStart = 0;
	private timeStart = 0;
	private rate = 1;
	running = false;
	volume = 1;
	failed: string[] = [];

	/** the story's sounds, their files fetched and decoded ahead (resolves once all are in, or failed) */
	async load(story: StoryBody | null | undefined, url: (hash: string) => string) {
		this.sounds = soundsOf(story);
		this.spans = voiceSpans(this.sounds);
		this.failed = [];
		const hashes = [...new Set(this.sounds.map((s) => s.hash))];
		await Promise.all(hashes.map((h) => this.buffer(h, url)));
		return this.sounds.length;
	}

	get count() {
		return this.sounds.length;
	}

	private decoder() {
		// decoding needs no running context; a small offline one does it before the first press of Play
		return new OfflineAudioContext(2, 48000, 48000);
	}

	private buffer(hash: string, url: (hash: string) => string): Promise<AudioBuffer | null> {
		const had = this.buffers.get(hash);
		if (had) return Promise.resolve(had);
		let p = this.loading.get(hash);
		if (!p) {
			p = fetch(url(hash), { credentials: 'same-origin' })
				.then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`))))
				.then((bytes) => this.decoder().decodeAudioData(bytes))
				.then((b) => (this.buffers.set(hash, b), this.arrived(hash), b))
				.catch((e) => (this.failed.push(`${hash.slice(0, 10)}: ${e?.message ?? e}`), null));
			this.loading.set(hash, p);
		}
		return p;
	}

	/** the story time now, by the audio clock (null when not running) */
	now(): number | null {
		if (!this.running || !this.ctx) return null;
		const ts = (this.ctx as any).getOutputTimestamp?.();
		const ctxNow = ts && Number.isFinite(ts.contextTime) && ts.contextTime > 0 ? ts.contextTime : this.ctx.currentTime;
		return this.timeStart + Math.max(0, ctxNow - this.ctxStart) * this.rate;
	}

	/**
	 * Called inside the user's tap or key press, before what it starts: Safari lets a Web Audio context sound only when it
	 * is made (or resumed) inside a gesture, and the start comes a moment later, from the player's effects. iOS also mutes
	 * Web Audio by its silent switch unless the page asks for playback (the Audio Session API, Safari 17).
	 */
	prime() {
		try {
			const session = (navigator as any).audioSession;
			if (session && session.type !== 'playback') session.type = 'playback';
		} catch {}
		if (!this.primed || this.primed.state === 'closed') this.primed = new AudioContext({ latencyHint: 'playback' });
		this.primed.resume?.().catch(() => {});
	}

	/** a recording that arrives while the story already plays is laid in from now, not lost until the next Play */
	private arrived(hash: string) {
		if (!this.running || !this.ctx) return;
		const now = this.now();
		if (now == null) return;
		for (const s of this.sounds)
			if (s.hash === hash)
				try {
					this.lay(s, now + 0.05);
				} catch (e: any) {
					this.failed.push(`${s.track}/${s.clip}: ${e?.message ?? e}`);
				}
	}

	/** start sounding from story time `t` at `rate` (a press of Play or a seek while playing) */
	start(t: number, rate = 1) {
		this.stop();
		// a fresh context on every start (WebKit keeps a stopped one's clock oddly): the one made in the tap if there is one
		this.ctx = this.primed && this.primed.state !== 'closed' ? this.primed : new AudioContext({ latencyHint: 'playback' });
		this.primed = null;
		this.ctx.resume?.().catch(() => {});
		this.bus = this.ctx.createGain();
		this.bus.gain.value = this.volume;
		this.bus.connect(this.ctx.destination);
		this.rate = rate;
		this.ctxStart = this.ctx.currentTime + 0.06;
		this.timeStart = t;
		this.running = true;
		for (const s of this.sounds) {
			try {
				this.lay(s, t);
			} catch (e: any) {
				this.failed.push(`${s.track}/${s.clip}: ${e?.message ?? e}`);
			}
		}
	}

	stop() {
		for (const n of this.nodes) {
			try {
				n.stop();
			} catch {}
		}
		this.nodes = [];
		this.running = false;
		const ctx = this.ctx;
		this.ctx = null;
		this.bus = null;
		ctx?.close().catch(() => {});
	}

	setVolume(v: number) {
		this.volume = v;
		if (this.bus && this.ctx) this.bus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
	}

	/** one clip on the clock, from story time `t` on */
	private lay(s: Sound, t: number) {
		const ac = this.ctx!, buf = this.buffers.get(s.hash);
		if (!buf || s.at + s.duration <= t) return;
		const r = this.rate;
		const begin = Math.max(t, s.at); // story time the sound begins
		const offset = s.from + (begin - s.at); // how far into the file
		const length = Math.min(s.at + s.duration - begin, buf.duration - offset); // story seconds it sounds
		if (length <= 0.01 || offset >= buf.duration) return;
		const when = (x: number) => Math.max(ac.currentTime, this.ctxStart + (x - this.timeStart) / r); // story time → context time
		const src = ac.createBufferSource();
		src.buffer = buf;
		src.playbackRate.value = r;
		const gain = ac.createGain();
		const fadeIn = begin === s.at ? Math.max(0.005, s.fadeIn) : 0.02;
		const fadeOut = Math.max(0.005, Math.min(s.fadeOut, length / 2));
		const v = s.vol;
		gain.gain.setValueAtTime(0, when(begin));
		gain.gain.linearRampToValueAtTime(v, when(begin + fadeIn));
		if (s.duck)
			for (const [a, b] of this.spans) {
				if (b <= begin || a >= begin + length || a < begin + fadeIn) continue;
				gain.gain.setValueAtTime(v, when(Math.max(begin + fadeIn, a - DUCK.down)));
				gain.gain.linearRampToValueAtTime(v * DUCK.level, when(a));
				gain.gain.setValueAtTime(v * DUCK.level, when(Math.min(b, begin + length - fadeOut)));
				if (b + DUCK.up < begin + length - fadeOut) gain.gain.linearRampToValueAtTime(v, when(b + DUCK.up));
			}
		const tail = Math.max(begin + fadeIn, begin + length - fadeOut);
		const under = s.duck && this.spans.some(([a, b]) => a <= tail && tail < b + DUCK.up);
		gain.gain.setValueAtTime(under ? v * DUCK.level : v, when(tail));
		gain.gain.linearRampToValueAtTime(0, when(begin + length));
		let node: AudioNode = src;
		for (const b of s.eq) {
			const f = ac.createBiquadFilter();
			f.type = b.type;
			f.frequency.value = b.f;
			f.gain.value = b.gain ?? 0;
			f.Q.value = webAudioQ(b);
			node = node.connect(f);
		}
		if (s.keys.length) {
			const kg = ac.createGain();
			const into = begin - s.at;
			kg.gain.setValueAtTime(dbToGain(keyDb(s.keys, into)), when(begin));
			for (const [k, db] of s.keys) if (k > into && k < into + length) kg.gain.linearRampToValueAtTime(dbToGain(db), when(s.at + k));
			node = node.connect(kg);
		}
		node.connect(gain).connect(this.bus!);
		src.start(when(begin), offset, length); // the length in the file's own seconds
		this.nodes.push(src);
	}
}
