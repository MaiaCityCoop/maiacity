#!/usr/bin/env bun
/*
 * A MAC JOB'S DRY RUN — the job run in avenBOX on the CPU before it goes to the Mac (intent cb52fbd9; ./README.md), so a
 * step that throws, a global the world lacks, a call that never settles or a run.sh that blocks shows in minutes, not
 * after the Mac's queue. No browser, no WebGL, no GPU (Samuel's rule: GPU work only on his Mac).
 *
 *   bun play/site/scripts/macjob/dry.ts <job dir> [--at <commit>] [--timeout <s>]
 *
 * <job dir>       the job's folder, from the repository's root (intent-work/<intent>-render), holding its run.sh
 * --at <commit>   the job as it is at that commit (a worktree under the census's cache), else as in this checkout
 * --timeout <s>   the whole run's bound (default 480 s): past it the run is a hang, told with the step it hung at
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const arg = (k: string) => {
	const i = argv.indexOf(k);
	return i >= 0 ? argv[i + 1] : undefined;
};
const job = argv.find((a, i) => !a.startsWith('--') && !['--at', '--timeout'].includes(argv[i - 1]));
if (!job) throw new Error('usage: bun play/site/scripts/macjob/dry.ts <job dir> [--at <commit>] [--timeout <s>]');
const at = arg('--at');
const TIMEOUT = Number(arg('--timeout') ?? 480);
const HOME = join(import.meta.dir, 'dry');
const SITE = resolve(import.meta.dir, '../..');
const REPO = resolve(SITE, '../..');
const CACHE = resolve(process.env.CENSUS_CACHE ?? join(process.env.HOME ?? '/tmp', '.cache/maiacity-census'));
const git = (cwd: string, ...a: string[]) => execFileSync('git', ['-C', cwd, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function checkout() {
	if (!at) return REPO;
	let sha = '';
	try {
		sha = git(REPO, 'rev-parse', '--verify', '--quiet', `${at}^{commit}`);
	} catch {
		// a commit this clone lacks (a shallow one, as CI's): by its whole hash, else on the Mac jobs' branches
		if (/^[0-9a-f]{40}$/.test(at)) git(REPO, 'fetch', '--quiet', 'origin', at);
		else git(REPO, 'fetch', '--quiet', 'origin', '+refs/heads/intent-work/*:refs/remotes/origin/intent-work/*');
		sha = git(REPO, 'rev-parse', '--verify', `${at}^{commit}`);
	}
	const dir = join(CACHE, 'dry', sha.slice(0, 12));
	if (!existsSync(join(dir, '.git'))) {
		mkdirSync(join(CACHE, 'dry'), { recursive: true });
		git(REPO, 'worktree', 'add', '--quiet', '--detach', '--force', dir, sha);
	}
	return dir;
}

const root = checkout();
const runSh = join(root, job, 'run.sh');
if (!existsSync(runSh)) throw new Error(`dry: no run.sh in ${job}${at ? ` at ${at}` : ''}`);
const state = mkdtempSync(join(tmpdir(), 'dry-'));
const realPath = (process.env.PATH ?? '').split(':').filter((p) => resolve(p) !== join(HOME, 'bin')).join(':');
// the job's run.sh asks for play's token for its proxy, which no browser reaches here: a stand-in where there is none
const token = process.env.PLAY_MCP_TOKEN ?? '';
const env = { ...process.env, PLAY_MCP_TOKEN: token || 'play_dry_run_stand_in', DRY_PLAY_TOKEN: token, PATH: `${join(HOME, 'bin')}:${realPath}`, DRY_REAL_PATH: realPath, DRY_BUN: process.execPath, DRY_HOME: HOME, DRY_SITE: SITE, DRY_STATE: state, CENSUS_CACHE: CACHE, BASH_ENV: join(HOME, 'trace.sh') };
const trace = join(state, 'trace');

console.error(`dry: ${job}${at ? ` at ${at}` : ''}: bash ${runSh} on the CPU (stubs: ${join(HOME, 'bin')}), at most ${TIMEOUT} s`);
const t0 = performance.now();
const p = Bun.spawn(['setsid', 'bash', runSh], { cwd: root, env, stdout: 'pipe', stderr: 'pipe' });
let out = '';
const pipe = async (s: ReadableStream<Uint8Array>, to: NodeJS.WriteStream) => {
	const d = new TextDecoder();
	for await (const c of s) {
		const t = d.decode(c, { stream: true });
		out += t;
		to.write(t);
	}
};
const piping = Promise.all([pipe(p.stdout, process.stdout), pipe(p.stderr, process.stderr)]);
let hung = false;
const timer = setTimeout(() => {
	hung = true;
	kill();
}, TIMEOUT * 1000);
const kill = () => {
	try {
		process.kill(-p.pid, 'SIGKILL');
	} catch {}
};
const code = await Promise.race([p.exited, new Promise<number>((r) => setTimeout(() => r(p.exitCode ?? -1), TIMEOUT * 1000 + 2000))]);
clearTimeout(timer);
await Promise.race([piping, new Promise((r) => setTimeout(r, 1000))]);
kill(); // what it left running: the dev servers' stand-ins
const took = ((performance.now() - t0) / 1000).toFixed(1);

const lastStep = () => {
	const lines = existsSync(trace) ? readFileSync(trace, 'utf8').trim().split('\n') : [];
	return lines.slice(-3).join('\n    ');
};
const block = (tag: string) => {
	const i = out.indexOf(tag);
	if (i < 0) return null;
	const rest = out.slice(i).split('\n');
	const end = rest.findIndex((l) => /^\s*called /.test(l));
	return rest.slice(0, end < 0 ? 12 : end + 1).join('\n');
};
const hang = block('DRY HANG');
const thrown = block('DRY THROW');

let verdict: string;
if (hung) verdict = `DRY RUN FAILED: hang — run.sh did not end in ${TIMEOUT} s; it was at:\n    ${lastStep()}`;
else if (hang) verdict = `DRY RUN FAILED: hang\n${hang}`;
else if (code !== 0) verdict = `DRY RUN FAILED: ${thrown ? 'throw' : `exit ${code}`}\n${thrown ?? out.trim().split('\n').slice(-20).join('\n')}\n  run.sh was at:\n    ${lastStep()}`;
else verdict = `DRY RUN PASSED${thrown ? ` (a throw the job caught itself:\n${thrown})` : ''}`;
const pageErrors = out.split('\n').filter((l) => l.startsWith('dry: pageerror')).length;
if (pageErrors) verdict += `\n(${pageErrors} page error${pageErrors > 1 ? 's' : ''} above: what the page itself threw, as a browser's console shows it)`;
console.log(`\n${verdict}\n(${took} s, ${job}${at ? ` at ${at}` : ''})`);
process.exit(verdict.startsWith('DRY RUN PASSED') ? 0 : 1);
