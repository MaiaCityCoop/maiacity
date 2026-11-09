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
  LIMITS: Record<string, number>;
};
export const { checkGraph, GRAPH_FORMAT } = validator;

export class GraphsError extends Error {}

/** how many graphs a recipe may declare, and how long a graph's name may be */
export const GRAPHS_MOST = 32;
const NAME = /^[A-Za-z][A-Za-z0-9_-]{0,39}$/;

/** a shader of its own, written in a source: code patched into three's, a shader material, a node material or TSL */
const OWN = [
  [/\bonBeforeCompile\b/, "code patched into three's shaders (onBeforeCompile)"],
  [/\b(?:Raw)?ShaderMaterial\b/, "a ShaderMaterial"],
  [/\b\w*NodeMaterial\b/, "a node material of its own"],
  [/three\/(?:tsl|webgpu)\b/, "TSL"],
] as const;

/** a source's text without its comments, roughly (a shader named only in a comment is no shader) */
const uncommented = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");

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
