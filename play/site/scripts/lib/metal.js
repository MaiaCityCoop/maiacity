/*
 * A MAC'S METAL — how Playwright's Chromium is launched to draw on the machine's GPU (Samuel's Mac, GitHub's macOS
 * runners), WebGPU on (intent c1bee1f8): the one place its flags are written, for every script that draws on a GPU
 * (../mac-page.mjs, ../render.mjs, ../gpu.ts).
 */
export const METAL = { channel: 'chromium', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] };
