/*
 * The dry run's checks (intent cb52fbd9): fixture jobs (./fixtures, no world) each told as they would fail on the Mac,
 * with what kind of failure it is, and a clean one passed.
 *
 *   cd play/site && bun test scripts/macjob
 */
import { describe, expect, test } from 'bun:test';
import { join, relative, resolve } from 'node:path';

const REPO = resolve(import.meta.dir, '../../../..');
const dry = (fixture: string, timeout = 60) => {
	const p = Bun.spawnSync(['bun', join(import.meta.dir, 'dry.ts'), relative(REPO, join(import.meta.dir, 'fixtures', fixture)), '--timeout', String(timeout)], { cwd: REPO, env: { ...process.env, DRY_EVAL_S: '5' }, stdout: 'pipe', stderr: 'pipe' });
	return { code: p.exitCode, out: p.stdout.toString() + p.stderr.toString() };
};

describe('a Mac job dry-run on the CPU', () => {
	test('a clean job passes, its clock warped past its own waits', () => {
		const r = dry('clean');
		expect(r.out).toContain('two: 2');
		expect(r.out).toContain('DRY RUN PASSED');
		expect(r.code).toBe(0);
	}, 60_000);

	test('a step that throws fails with its stack and the job line that called it', () => {
		const r = dry('throws');
		expect(r.code).toBe(1);
		expect(r.out).toContain('DRY RUN FAILED: throw');
		expect(r.out).toContain('a step that throws');
		expect(r.out).toMatch(/called .*fixtures\/throws\/job\.mjs/);
	}, 60_000);

	test('a global the page lacks fails, worded as Chromium words it', () => {
		const r = dry('missing');
		expect(r.code).toBe(1);
		expect(r.out).toContain('DRY RUN FAILED: throw');
		expect(r.out).toContain('film.advance');
		expect(r.out).toContain("Cannot read properties of undefined (reading 'film')");
	}, 60_000);

	test('a page call that never settles is a hang, told with its line', () => {
		const r = dry('hangs');
		expect(r.code).toBe(1);
		expect(r.out).toContain('DRY RUN FAILED: hang');
		expect(r.out).toMatch(/called .*fixtures\/hangs\/job\.mjs/);
	}, 60_000);

	test('a run.sh whose server holds its command substitution open is a hang at that step', () => {
		const r = dry('serve', 8);
		expect(r.code).toBe(1);
		expect(r.out).toContain('DRY RUN FAILED: hang');
		expect(r.out).toContain('serve');
	}, 60_000);
});
