#!/usr/bin/env bun
// A command timed (intent bba45d6e, c4): `bun timed.ts <most seconds> -- <command…>` runs it, prints its wall time, and
// exits 0 only if it succeeded within the bound.
const argv = process.argv.slice(2);
const most = Number(argv[0]);
const cmd = argv.slice(argv.indexOf('--') + 1);
if (!(most > 0) || !cmd.length) throw new Error('usage: bun timed.ts <most seconds> -- <command…>');
const t0 = performance.now();
const p = Bun.spawnSync(cmd, { stdout: 'inherit', stderr: 'inherit' });
const s = (performance.now() - t0) / 1000;
console.log(`timed: ${s.toFixed(1)} s (at most ${most} s), exit ${p.exitCode}`);
process.exit(p.exitCode === 0 && s <= most ? 0 : 1);
