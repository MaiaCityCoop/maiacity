/*
 * A COMMIT'S TREE, TO MEASURE IT — the one place a commit is checked out for a measure (intent f63774a3): the census's
 * `--at` (../census.ts) and the measures against main (play/avenbox/vs-main.ts).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, symlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const REPO = resolve(import.meta.dir, '../../../..');
export const CACHE = resolve(process.env.CENSUS_CACHE ?? join(process.env.HOME ?? '/tmp', '.cache/maiacity-census'));

const git = (repo: string, ...a: string[]) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function has(repo: string, c: string) {
	try {
		return git(repo, 'rev-parse', '--verify', '--quiet', `${c}^{commit}`);
	} catch {
		return '';
	}
}

export function treeAt(commit: string, repo = REPO) {
	let sha = has(repo, commit);
	// a commit not in this clone (a shallow one, as CI's) is fetched by its whole hash, the one way a server hands it out
	if (!sha && /^[0-9a-f]{40}$/.test(commit)) {
		git(repo, 'fetch', '--quiet', '--depth=1', 'origin', commit);
		sha = has(repo, commit);
	}
	if (!sha) throw new Error(`no commit ${commit} here (a shallow clone fetches a commit only by its whole 40-character hash)`);
	const dir = join(CACHE, 'trees', sha);
	if (!existsSync(join(dir, '.git'))) {
		mkdirSync(join(CACHE, 'trees'), { recursive: true });
		execFileSync('git', ['-C', repo, 'worktree', 'add', '--force', '--detach', dir, sha], { stdio: 'ignore' });
	}
	const nm = join(dir, 'play/site/node_modules');
	if (existsSync(join(dir, 'play/site')) && !existsSync(nm)) symlinkSync(join(repo, 'play/site/node_modules'), nm);
	return { sha, dir };
}
