/**
 * Intent 4d47a98c's c3, scripted: on the dev server with story 60f6da00 (read over play's MCP with PLAY_MCP_TOKEN, sent to
 * play only), a wheel, a mouse drag and a click at 1440×900 (mouse), a vertical and a horizontal swipe and a tap at
 * 390×844 (touch): it prints the time and the lanes' scroll after each.
 *
 *   bun run dev &
 *   bun scripts/story-room-hands.ts
 */
import { chromium } from 'playwright';
const TOKEN = process.env.PLAY_MCP_TOKEN!; const STORY = '60f6da00-979d-89e4-b1e5-53667ba41fe4';
const r = await fetch('https://play.maia.city/api/mcp', { method: 'POST', headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_story', arguments: { story: STORY, links: true } } }) });
const story = JSON.parse((await r.json()).result.content[0].text);
const b = await chromium.launch();
for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const touch = size.width < 600;
  const p = await b.newPage({ viewport: size, hasTouch: touch, isMobile: touch });
  await p.route('**/api/**', async (route) => { const u = new URL(route.request().url()); const path = u.pathname.replace(/^\/api/, '');
    if (path === '/me') return route.fulfill({ json: { id: '00000000-0000-4000-8000-000000000001', name: 'Samuel', level: 'admin', may: {}, founder: 1 } });
    if (path === '/stories') return route.fulfill({ json: [{ id: STORY, title: story.title }] });
    if (path === `/stories/${STORY}`) return route.fulfill({ json: story });
    const x = await fetch(`https://play.maia.city/api${path}${u.search}`, { headers: { authorization: `Bearer ${TOKEN}` } });
    return route.fulfill({ status: x.status, contentType: x.headers.get('content-type') ?? '', body: Buffer.from(await x.arrayBuffer()) }); });
  await p.goto(`http://localhost:5173/stories/#${STORY}`, { waitUntil: 'networkidle' });
  await p.locator('.lanes .playhead').waitFor(); await p.waitForTimeout(1500);
  await p.locator('.timeline').evaluate((el) => el.scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
  const state = () => p.evaluate(() => ({ time: document.querySelector('.controls .time')?.textContent?.trim(), scroll: (document.querySelector('.lanes-scroll') as HTMLElement).scrollTop, page: Math.round(scrollY) }));
  const box = (await p.locator('.lanes-scroll').boundingBox())!;
  const cx = box.x + box.width * 0.5, cy = box.y + box.height * 0.6;
  const w = `${size.width}x${size.height}`;
  console.log(w, 'start', await state());
  if (!touch) {
    await p.mouse.move(cx, cy); await p.mouse.wheel(0, 120); await p.waitForTimeout(400);
    console.log(w, 'wheel down 120', await state());
    await p.mouse.move(box.x + box.width * 0.2, cy); await p.mouse.down(); await p.mouse.move(box.x + box.width * 0.4, cy, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
    console.log(w, 'drag 20%→40%', await state());
    await p.mouse.click(box.x + box.width * 0.75, cy); await p.waitForTimeout(300);
    console.log(w, 'click at 75%', await state());
    const title = await p.locator('.sound-lane').first().getAttribute('title'); const aria = await p.locator('.voice-lane').getAttribute('aria-label');
    console.log(w, 'lane names', { soundTitle: title, voiceAria: aria });
  } else {
    const cdp = await p.context().newCDPSession(p);
    const swipe = async (x0: number, y0: number, x1: number, y1: number) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
      for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / 10, y: y0 + ((y1 - y0) * i) / 10 }] }); await p.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(600);
    };
    await swipe(cx, box.y + box.height - 10, cx, box.y + 10);
    console.log(w, 'swipe up (vertical)', await state());
    await swipe(box.x + box.width * 0.2, cy, box.x + box.width * 0.5, cy);
    console.log(w, 'swipe right 20%→50% (horizontal)', await state());
    await p.touchscreen.tap(box.x + box.width * 0.8, cy); await p.waitForTimeout(400);
    console.log(w, 'tap at 80%', await state());
  }
  await p.close();
}
await b.close();
