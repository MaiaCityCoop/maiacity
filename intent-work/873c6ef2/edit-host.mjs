// node edit-host.mjs <host> [--dry] : doc_edit the host's next source and its note onto the intent's variant of the asset
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { P, LABEL } from './build.mjs';
const [host, dry] = process.argv.slice(2);
const ID = Object.fromEntries(readFileSync('ids.txt', 'utf8').trim().split('\n').map((l) => l.split(' ')));
const plan = JSON.parse(readFileSync('out/plan.json', 'utf8')); const x = plan.hosts[host];
const docs = JSON.parse(readFileSync('docs.json', 'utf8'));
const head = JSON.parse(readFileSync(`heads/${host}.json`, 'utf8'));
const src = readFileSync(`out/hosts/${host}.js`, 'utf8');
const n = (v) => v.toLocaleString('en');
const fps = readFileSync(`fp/${host}.next.txt`, 'utf8').trim().split('\n').map((l) => l.split('\t'));
const pieces = x.pieces.map((hash) => { const p = plan.pieces.find((q) => q.hash === hash); return { ...p, uuid: docs[p.doc] }; });
if (pieces.some((p) => !p.uuid)) throw new Error('a piece has no document yet');
const recipes = fps.map((f) => `${f[0].includes(":") && !plan.hosts[host].pieces.includes("x") && ["hatchback","sedan","suv","taxi","police","ambulance","van"].includes(host) ? f[0].split(":")[1] : f[0]} (${n(Number(f[2].replace("tris ", "")))} triangles)`).join(", ");
const note = `Version ${head.number + 1}: the same ${head.json.label} as v${head.number}, its copied code now named by hash (intent 873c6ef2). In place of ${pieces.length === 1 ? 'the copy' : 'the copies'} it carried, it requires ${pieces.map((p) => `the piece ${LABEL[p.doc]} (piece:${p.uuid}), version ${p.v}, by its hash ${p.hash}`).join('; ')}. Its source shrinks from ${n(x.head)} to ${n(x.next)} characters.\n\nIt builds what v${head.number} built: every recipe its source holds (${recipes}) has the same geometry fingerprint (each mesh's attributes, index, groups, world matrix and materials, and the rig and catalog), triangles, meshes and materials, built headless in avenBOX, the pieces run as the box runs them.\n\n` + head.json.note;
const body = { intent: '873c6ef2-2bbe-49a3-9470-705cf1702b58', doc: ID[host], message: `Its copied code named by hash: ${pieces.map((p) => `${LABEL[p.doc]} v${p.v}`).join(', ')}`, edits: [{ op: 'set', path: ['source'], value: src }, { op: 'set', path: ['note'], value: note }] };
writeFileSync(`req-host-${host}.json`, JSON.stringify(body));
if (dry) { console.log(note.slice(0, 1200)); process.exit(0); }
const out = execFileSync('node', ['mcp.mjs', 'doc_edit', `@req-host-${host}.json`], { encoding: 'utf8' });
console.log(host, out.replace(/\s+/g, ' '));
const d = JSON.parse(readFileSync('docs.json', 'utf8')); (d.hosts ??= {})[host] = JSON.parse(out); writeFileSync('docs.json', JSON.stringify(d, null, 1));
