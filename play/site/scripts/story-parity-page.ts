// story-parity.ts's page: HyperFrames' player set up as the Stories player sets it up (play's sealed frame, the
// composition sealed, its files handed in by the page), and `at(t)`: the picture at second t, painted.
import type { HyperframesPlayer } from '@hyperframes/player';
import '@hyperframes/player';
import { FRAME, feed, seal } from '../src/lib/stories/compose';

const player = document.createElement('hyperframes-player') as HyperframesPlayer;
const open = /[?&]open\b/.test(location.search); // ?open: the frame left same-origin, only to look inside it while debugging
if (!open) player.setAttribute('sandbox-origin', 'opaque');
player.setAttribute('no-load-timeout', '');
player.setAttribute('disable-click-to-play', '');
player.setAttribute('assets-loading-ui', 'none');
document.body.append(player);
const frame: HTMLIFrameElement = player.iframeElement;
if (!open) frame.setAttribute('sandbox', FRAME.sandbox);
frame.setAttribute('allow', FRAME.allow);
addEventListener('message', (e) => {
	if (e.source !== frame.contentWindow || e.data?.play !== 1 || e.data.op !== 'need') return;
	feed(frame.contentWindow!, e.data, (h) => fetch(`/api/files/${h}`).then((r) => r.blob())).catch((x) => console.error(String(x)));
});
/** what story-parity.ts reads of this page (`__renderReady`: of the composition's frame, set by HyperFrames) */
export type ParityWindow = Window & { ready?: boolean; player?: HyperframesPlayer; at?: (t: number) => Promise<void>; __renderReady?: boolean };
const w = window as ParityWindow;
player.addEventListener('ready', () => (w.ready = true));
player.addEventListener('error', (e: Event) => console.error('player error', JSON.stringify((e as CustomEvent).detail)));
w.player = player;
w.at = async (t: number) => {
	player.seek(t);
	await new Promise((r) => setTimeout(r, 400));
	await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
};
const html = await (await fetch('/composition.html')).text();
player.setAttribute('srcdoc', seal(html));
