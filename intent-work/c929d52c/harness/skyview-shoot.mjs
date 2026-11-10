import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
const [,, bundle, out, w = '960', h = '600'] = process.argv;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'] });
const page = await b.newPage({ viewport: { width: +w, height: +h } });
page.on('console', (c) => console.log('page:', c.text().slice(0, 1500)));
page.on('pageerror', (e) => console.log('error:', e.message.slice(0, 300)));
await page.setContent(`<body style="margin:0;background:#000"><canvas width="${w}" height="${h}" style="display:block"></canvas></body>`);
await page.addScriptTag({ content: 'window.$state = (v) => v;' + readFileSync(bundle, 'utf8') });
console.log('gpu:', await page.evaluate(async () => !!(await navigator.gpu?.requestAdapter())));
await page.evaluate(() => window.go(null, 0.42, 0.4));
for (const [label, hour] of [['dawn', 5.6], ['noon', 12.5], ['afternoon', 16], ['dusk', 19.4], ['night', 23]]) {
	await page.evaluate((hr) => window.shot(hr), hour);
	await page.waitForTimeout(300);
	await page.screenshot({ path: `${out}/${label}.png` });
}
await b.close();
