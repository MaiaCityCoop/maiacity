// node edit-piece.mjs <key> [docUuid] : doc_edit the piece's whole source onto the intent (a new piece document, or its variant)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { P, LABEL } from './build.mjs';
const [key, doc] = process.argv.slice(2);
const p = P[key]; const plan = JSON.parse(readFileSync('out/plan.json', 'utf8')); const m = plan.pieces.find((x) => x.key === key);
const src = readFileSync(`out/pieces/${key}.js`, 'utf8');
const note = `Shared code ${p.from.includes('cars') ? 'the old city\'s cars each copied' : 'legacy\'s bundler inlined whole into each asset that used it'}, kept once as a piece (intent 873c6ef2). Version ${p.v}: the copy in ${p.from}, as it was, below the requires that hand it what its host used to (three.js and the pieces it stands on) and above the module.exports that hands its names on. Source hash ${m.hash}.`;
const body = { intent: '873c6ef2-2bbe-49a3-9470-705cf1702b58', message: `${LABEL[p.doc]}, version ${p.v}: the copy in ${p.from}, as it was`, whole: { schema: 'piece/1', label: LABEL[p.doc], note, source: src } };
if (doc) body.doc = doc; else body.kind = 'piece';
writeFileSync(`req-${key}.json`, JSON.stringify(body));
const out = execFileSync('node', ['mcp.mjs', 'doc_edit', `@req-${key}.json`], { encoding: 'utf8' });
console.log(key, out.replace(/\s+/g, ' '));
const docs = existsSync('docs.json') ? JSON.parse(readFileSync('docs.json', 'utf8')) : {};
const r = JSON.parse(out); docs[p.doc] = r.doc; (docs.edits ??= {})[key] = { doc: r.doc, variant: r.variant, edit: r.edit, hash: m.hash };
writeFileSync('docs.json', JSON.stringify(docs, null, 1));
