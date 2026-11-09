/*
 * A COMMIT'S TREE, TO MEASURE IT — the one place a commit is checked out for a measure (intent f63774a3): the census's
 * `--at` (../census.ts) and the measures against main (play/avenbox/vs-main.ts). Each commit is checked out once,
 * detached, under `<cache>/trees/<sha>`, with this checkout's play/site/node_modules linked in, and kept for the next.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, symlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** this repository's root */
export const REPO = resolve(import.meta.dir, '../../../..');
/** the census's cache (trees, pinned files): CENSUS_CACHE, else ~/.cache/maiacity-census */
export const CACHE = resolve(process.env.CENSUS_CACHE ?? join(process.env.HOME ?? '/tmp', '.cache/maiacity-census'));

const git = (...a: string[]) => execFileSync('git', ['-C', REPO, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** the commit's whole hash, or '' if this clone hasn't it */
function has(c: string) {
	try {
		return git('rev-parse', '--verify', '--quiet', `${c}^{commit}`);
	} catch {
		return '';
	}
}

/** a commit's tree (the repository's root in it), checked out once under the cache; `sha` its whole hash */
export function treeAt(commit: string) {
	let sha = has(commit);
	// a commit not in this clone (a shallow one, as CI's) is fetched by its whole hash, the one way a server hands it out
	if (!sha && /^[0-9a-f]{40}$/.test(commit)) {
		git('fetch', '--quiet', '--depth=1', 'origin', commit);
		sha = has(commit);
	}
	if (!sha) throw new Error(`no commit ${commit} here (a shallow clone fetches a commit only by its whole 40-character hash)`);
	const dir = join(CACHE, 'trees', sha);
	if (!existsSync(join(dir, 'play'))) {
		mkdirSync(join(CACHE, 'trees'), { recursive: true });
		execFileSync('git', ['-C', REPO, 'worktree', 'add', '--force', '--detach', dir, sha], { stdio: 'ignore' });
	}
	const nm = join(dir, 'play/site/node_modules');
	if (!existsSync(nm)) symlinkSync(join(REPO, 'play/site/node_modules'), nm);
	return { sha, dir };
}
