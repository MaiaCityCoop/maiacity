// A recipe's own looks as checked data (intent a5faafad, GPU 14/14; play/SPEC.md §4.5 *Shaders as data*).
//
// A recipe never brings shader code: a material's own look is a node graph, plain JSON of one allowlist, which the box
// carries out with it and the page builds into TSL (play/site's lib/content/assets/box/graph.js, the one module that
// checks a graph, here, in the box and on the page alike; lib/content/render/nodes/graph.js builds it). play runs no
// code, so at propose time it reads the graphs a recipe declares as a plain literal (`module.exports.graphs = { name:
// { format, nodes, out }, … }`, as ./lod.ts reads its levels) and checks each with that same module, refusing a version
// with the validator's reason; and it refuses a source that writes a shader of its own (code patched into three's, a
// ShaderMaterial, a node material of its own), which would never leave the box. The box checks every graph a build
// gives again, and the page once more against the pictures its material carries.
import { resolve } from "node:path";
import { literal, LodError } from "./lod";

/** the one validator: the site's module, at the repository's place (the image keeps play/site/src under PLAY_REPO) */
const at = resolve(process.env.PLAY_REPO ?? resolve(import.meta.dir, "../../.."), "play/site/src/lib/content/assets/box/graph.js");
const validator = (await import(at)) as {
  checkGraph(raw: unknown, o?: { slots?: string[] }): { format: number; nodes: unknown[]; out: Record<string, number>; textures?: string[] };
  GraphError: new (why: string) => Error;
  GRAPH_FORMAT: number;
  GRAPHS_MOST: number;
  LIMITS: Record<string, number>;
};
export const { checkGraph, GRAPH_FORMAT, GRAPHS_MOST } = validator;

export class GraphsError extends Error {}

/** how long a graph's name may be (how many a recipe may declare is the one module's GRAPHS_MOST) */
const NAME = /^[A-Za-z][A-Za-z0-9_-]{0,39}$/;

/** a shader of its own, written in a source: code patched into three's, a shader material, a node material or TSL */
const OWN = [
  [/\bonBeforeCompile\b/, "code patched into three's shaders (onBeforeCompile)"],
  [/\b(?:Raw)?ShaderMaterial\b/, "a ShaderMaterial"],
  [/\b\w*NodeMaterial\b/, "a node material of its own"],
  [/three\/(?:tsl|webgpu)\b/, "TSL"],
] as const;

/**
 * A source's text without its comments, roughly (a shader named only in a comment is no shader), in one pass over it:
 * a block comment never closed ends the text.
 */
export function uncommented(s: string): string {
  let out = "";
  // the next /* and // at or after i, each searched for again only once i has passed it: one pass over the text
  let block = -2, line = -2;
  for (let i = 0; i < s.length; ) {
    if (block !== -1 && block < i) block = s.indexOf("/*", i);
    if (line !== -1 && line < i) line = s.indexOf("//", i);
    const next = block < 0 ? line : line < 0 ? block : Math.min(block, line);
    if (next < 0) return out + s.slice(i);
    // a // after a : is a URL's, kept
    if (next === line && next > 0 && s[next - 1] === ":") {
      out += s.slice(i, next + 2);
      i = next + 2;
      continue;
    }
    out += s.slice(i, next);
    const end = next === block ? s.indexOf("*/", next + 2) : s.indexOf("\n", next + 2);
    if (end < 0) return out;
    i = next === block ? end + 2 : end;
  }
  return out;
}

/**
 * The graphs a source declares, `module.exports.graphs = { … }` (or `exports.graphs = …`), read as a plain literal:
 * null where it declares none. Throws where it declares them as anything a literal is not (play runs no code).
 */
export function graphsIn(source: string): Record<string, unknown> | null {
  const m = /(?:module\.)?exports\.graphs\s*=\s*/.exec(source);
  if (!m) return null;
  let read: unknown;
  try {
    // a graph nests at most: graphs, a graph, its nodes, a node, its loop's body, a node, its body, a node, its inputs
    read = literal(source, m.index + m[0].length, { what: "module.exports.graphs", deep: 12 });
  } catch (e) {
    throw e instanceof LodError ? new GraphsError(e.message) : e;
  }
  if (!read || typeof read !== "object" || Array.isArray(read)) throw new GraphsError("module.exports.graphs is an object: { <a name>: { format, nodes, out }, … }.");
  return read as Record<string, unknown>;
}

/**
 * A new version's source held to the rule: no shader of its own, and every graph it declares one the allowlist lets
 * through. Its graphs' names, checked; throws a GraphsError saying why.
 */
export function heldGraphs(source: string): string[] {
  const code = uncommented(source);
  for (const [re, what] of OWN)
    if (re.test(code))
      throw new GraphsError(
        `The source writes a shader of its own (${what}), which never leaves the asset box: give the material's look as a node graph, declared in module.exports.graphs and set on it as material.userData.graph (play/site's assets/box/graph.js lists what a graph may do).`,
      );
  const graphs = graphsIn(source);
  if (!graphs) return [];
  const names = Object.keys(graphs);
  if (!names.length) throw new GraphsError("module.exports.graphs declares no graph.");
  if (names.length > GRAPHS_MOST) throw new GraphsError(`module.exports.graphs declares ${names.length} graphs, more than ${GRAPHS_MOST}.`);
  for (const name of names) {
    if (!NAME.test(name)) throw new GraphsError(`${name.slice(0, 40)} is no graph's name (a letter, then letters, digits, - or _; at most 40).`);
    try {
      checkGraph(graphs[name]);
    } catch (e) {
      if (e instanceof validator.GraphError) throw new GraphsError(`Its graph ${name} is refused: ${e.message}.`);
      throw e;
    }
  }
  return names;
}
