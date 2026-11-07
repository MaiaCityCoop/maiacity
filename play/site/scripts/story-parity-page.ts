// story-parity.ts's page: HyperFrames' player set up as the Stories player sets it up (play's sealed frame, the
// composition sealed, its files handed in by the page), and `at(t)`: the picture at second t, painted.
import '@hyperframes/player';
import { FRAME, feed, seal } from '../src/lib/stories/compose';

const player = document.createElement('hyperframes-player') as any;
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
player.addEventListener('ready', () => ((window as any).ready = true));
player.addEventListener('error', (e: any) => console.error('player error', JSON.stringify(e.detail)));
(window as any).player = player;
(window as any).at = async (t: number) => {
	player.seek(t);
	await new Promise((r) => setTimeout(r, 400));
	await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
};
const html = await (await fetch('/composition.html')).text();
player.setAttribute('srcdoc', seal(html));
