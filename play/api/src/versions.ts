// A version's id (play/SPEC.md §4.3): the BLAKE3 hash of its canonical content. The same content made from the same
// parents has the same id; a changed byte, card field or parent gives another.
import { canonical, hashText } from "./hash";

export type VersionContent = {
  asset: string; // '<grp>/<slug>'
  parents: string[];
  recipe: string | null; // the recipe file's hash; null for a kind of variants
  defaultVariant: string | null; // for a kind of variants, the one a ref without a variant names
  variants: Record<string, { recipe: string; card: unknown }>; // variant name -> its recipe file's hash and card
  card: unknown | null;
  engine: number | null;
};

export const versionId = (c: VersionContent): string =>
  hashText(canonical({ kind: "play/asset-version/1", ...c, parents: [...c.parents].sort() }));
