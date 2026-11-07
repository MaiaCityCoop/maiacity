import { readFileSync } from 'node:fs'; import { h } from './extract.mjs';
const j = JSON.parse(readFileSync(process.argv[2], 'utf8')); console.log(j.json?.label, h(j.json?.source ?? ''));
