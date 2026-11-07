// node propose.mjs <step...> : propose each step naming the intent, in the order given; stops at the first refusal
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { P, LABEL } from './build.mjs';
const INTENT = '873c6ef2-2bbe-49a3-9470-705cf1702b58';
const docs = JSON.parse(readFileSync('docs.json', 'utf8'));
const plan = JSON.parse(readFileSync('out/plan.json', 'utf8'));
const call = (body, tag) => {
  writeFileSync(`prop-${tag}.json`, JSON.stringify(body));
  try { const out = execFileSync('node', ['mcp.mjs', 'propose_doc_version', `@prop-${tag}.json`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const short = out.replace(/\s+/g, ' ').slice(0, 300); appendFileSync('propose-log.txt', `${new Date().toISOString()} ${tag} OK ${short}\n`); console.log(tag, 'OK', short.slice(0, 160)); }
  catch (e) { appendFileSync('propose-log.txt', `${new Date().toISOString()} ${tag} REFUSED ${e.stderr}\n`); console.log(tag, 'REFUSED', e.stderr); process.exit(1); }
};
for (const step of process.argv.slice(2)) {
  if (P[step]) {
    const p = P[step]; const m = plan.pieces.find((x) => x.key === step); const ed = docs.edits[step];
    const note = `${LABEL[p.doc]}, version ${p.v}: the copy in ${p.from}, as it was, kept once as a piece (intent 873c6ef2). Source hash ${m.hash}.`;
    if (ed) call({ intent: INTENT, doc: ed.doc, variant: ed.variant, note }, step);
    else { const src = readFileSync(`out/pieces/${step}.js`, 'utf8'); const body = JSON.parse(readFileSync(`req-${Object.keys(P).find((k) => P[k].doc === p.doc && P[k].v === 1)}.json`, 'utf8')).whole;
      call({ intent: INTENT, doc: docs[p.doc], note, whole: { ...body, source: src, note: body.note.replace(/Version 1: the copy in .*? as it was,/, `Version ${p.v}: the copy in ${p.from}, as it was,`).replace(/Source hash [0-9a-f]{64}/, `Source hash ${m.hash}`) } }, step); }
  } else {
    const h = docs.hosts?.[step];
    if (h) call({ intent: INTENT, doc: h.doc, variant: h.variant, note: JSON.parse(readFileSync(`req-host-${step}.json`, 'utf8')).message + '. It builds what its head built (intent 873c6ef2).' }, step);
    else { execFileSync('node', ['edit-host.mjs', step, '--dry'], { encoding: 'utf8' }); const b = JSON.parse(readFileSync(`req-host-${step}.json`, 'utf8'));
      call({ intent: INTENT, doc: b.doc, edits: b.edits, note: b.message + '. It builds what its head built (intent 873c6ef2).' }, step); }
  }
}
