#!/usr/bin/env bun
/*
 * EVERY REFERENCE A UUID OR A HASH, IN EVERY ASSET'S SOURCE (intent 5723e301; CLAUDE.md, play/SPEC.md §4.7): no asset
 * of any group names an asset by group, slug and version (`machines/powercube@3`, `plants/papaya@3:male`,
 * `biomes/cover@${V}:${kind}`), anywhere in its source: code, strings and comments alike, by the one rule play refuses
 * a new source by (play/api/src/recipes.ts `namedAssets`). Each asset's newest accepted sources are read, or, with
 * `--intent`, the source that intent's variant of it makes (./sources.ts; play's routes pinned in ./inputs).
 *
 *   bun play/site/scripts/census/refs.ts --all [--intent <uuid>] [--record]
 */
import { namedAssets } from '../../../api/src/recipes';
import { checkAll } from './sources';

const argv = process.argv.slice(2);
if (!argv.includes('--all')) throw new Error('refs: --all [--intent <uuid>] [--record]');
const intent = argv.includes('--intent') ? argv[argv.indexOf('--intent') + 1] : undefined;
const ok = await checkAll({ intent, record: argv.includes('--record') }, (text) => namedAssets(text).map((n) => `names ${n}`), 'name an asset by group, slug and version');
process.exit(ok ? 0 : 1);
