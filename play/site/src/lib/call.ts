/**
 * An animal's call, as the asset viewer plays it when an animal is picked: its recording (play's files, by hash, the
 * asset's `sound`) at its gain (`sound_gain`, bringing the recordings to one level), a few seconds of it faded in and
 * out. Web Audio, decoded once per recording: a browser lets a page make sound only once it has been touched, so the
 * audio is unlocked on the first touch or key anywhere in the page (`unlock`), and an iPad then plays a call picked after
 * an answer from the API, which a plain <audio> started that late would not.
 */
import { fileBytes } from '$lib/api';
import { resumeIfAllowed } from '$lib/kernel/media.js';

const LENGTH = 7; // seconds of a call
const FADE = 1.2;
const LEVEL = 0.5; // a call at gain 1

let ctx: AudioContext | null = null;
const decoded = new Map<string, Promise<AudioBuffer>>();
let playing: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

const audio = () => (ctx ??= new AudioContext());

/** the page's audio, unlocked by this touch or key (call it from one) */
export function unlock() {
	const c = audio();
	if (c.state === 'suspended') void c.resume();
}

const bufferOf = (hash: string) => {
	let b = decoded.get(hash);
	if (!b) {
		b = fileBytes(hash).then((bytes) => audio().decodeAudioData(bytes));
		b.catch(() => decoded.delete(hash));
		decoded.set(hash, b);
	}
	return b;
};

/** the call that plays, faded out and stopped */
export function stopCall() {
	if (!playing || !ctx) return;
	const { src, gain } = playing;
	playing = null;
	const t = ctx.currentTime;
	gain.gain.cancelScheduledValues(t);
	gain.gain.setValueAtTime(gain.gain.value, t);
	gain.gain.linearRampToValueAtTime(0, t + 0.25);
	src.stop(t + 0.3);
}

/** recording `hash` played at `gain`, a few seconds of it; resolves once it has ended (or was stopped) */
export async function playCall(hash: string, gain = 1, onEnd?: () => void): Promise<void> {
	stopCall();
	const c = audio();
	if (c.state === 'suspended') await resumeIfAllowed(c);
	const buffer = await bufferOf(hash);
	if (c.state !== 'running') return void onEnd?.(); // not yet touched: no sound allowed
	const src = c.createBufferSource();
	src.buffer = buffer;
	const g = c.createGain();
	src.connect(g).connect(c.destination);
	const t = c.currentTime;
	const length = Math.min(LENGTH, buffer.duration);
	const top = LEVEL * gain;
	g.gain.setValueAtTime(0, t);
	g.gain.linearRampToValueAtTime(top, t + Math.min(0.3, length / 4));
	g.gain.setValueAtTime(top, t + Math.max(0, length - FADE));
	g.gain.linearRampToValueAtTime(0, t + length);
	src.start(t, 0, length);
	const mine = { src, gain: g };
	playing = mine;
	src.onended = () => {
		if (playing === mine) playing = null;
		onEnd?.();
	};
}
