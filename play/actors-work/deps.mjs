// the top-level declarations a set of roots needs, in source order: node deps.mjs <src> root1,root2 [out]
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/home/user/maiacity/play/site/x.js');
const acorn = require('acorn');
const [file, roots, out] = process.argv.slice(2);
const src = readFileSync(file, 'utf8');
const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
const decls = []; // { names, node }
for (const n of ast.body) {
	let names = [];
	if (n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') names = [n.id.name];
	else if (n.type === 'VariableDeclaration') names = n.declarations.flatMap((d) => (d.id.type === 'Identifier' ? [d.id.name] : []));
	decls.push({ names, node: n });
}
const byName = new Map(); decls.forEach((d, i) => d.names.forEach((nm) => byName.set(nm, i)));
const idsOf = (node) => { const s = new Set(), local = new Set(); const pat = (p) => { if (!p) return; if (p.type === 'Identifier') local.add(p.name); else if (p.type === 'ObjectPattern') p.properties.forEach((q) => pat(q.value ?? q.argument)); else if (p.type === 'ArrayPattern') p.elements.forEach(pat); else if (p.type === 'AssignmentPattern') pat(p.left); else if (p.type === 'RestElement') pat(p.argument); }; (function walk(x) { if (!x || typeof x !== 'object') return; if (Array.isArray(x)) return x.forEach(walk); if (x !== node && (x.type === 'VariableDeclarator')) pat(x.id); if (x.params) x.params.forEach(pat); if (x !== node && x.type === 'FunctionDeclaration' && x.id) local.add(x.id.name); if (x.type === 'Identifier') s.add(x.name); for (const k in x) { if (k === 'loc' || k === 'start' || k === 'end') continue; if ((x.type === 'MemberExpression' && k === 'property' && !x.computed) || (x.type === 'Property' && k === 'key' && !x.computed)) continue; walk(x[k]); } })(node); if (node.type === 'VariableDeclaration') node.declarations.forEach((d) => local.delete(d.id.name)); for (const l of local) s.delete(l); return s; };
const need = new Set(); const stack = roots.split(',').map((r) => byName.get(r));
while (stack.length) { const i = stack.pop(); if (i === undefined || need.has(i)) continue; need.add(i); for (const id of idsOf(decls[i].node)) if (byName.has(id)) stack.push(byName.get(id)); }
const list = [...need].sort((a, b) => a - b);
console.error(list.map((i) => decls[i].names.join('/')).join(' '));
console.error('bytes', list.reduce((a, i) => a + decls[i].node.end - decls[i].node.start, 0));
if (out) writeFileSync(out, list.map((i) => src.slice(decls[i].node.start, decls[i].node.end)).join('\n\n') + '\n');
