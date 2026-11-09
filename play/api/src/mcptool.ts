// What every MCP tool is (./mcp.ts serves them; ./intenttools.ts and ./artifacttools.ts hold their own groups): its
// name, its description (or one written with the kinds' formats, read for every tools/list), its input's JSON Schema,
// and what it runs as the token's admin.
import type { Me } from "./access";
import type { BlobStore } from "./blobs";
import type { GitHub } from "./github";
import type { Db } from "./kit/pg";

/** what each kind's documents hold, as their schemas say it (./kinds.ts formatOf) */
export type Formats = { recipe: string; story: string; all: string };

export type Tool = {
  name: string;
  /** its description, or one written with the kinds' formats */
  description: string | ((f: Formats) => string);
  inputSchema: Record<string, unknown>;
  /** a tool that proposes work names its intent (`required`); one that may make its own where none is named (`own`: an artifact added or corrected) */
  proposes?: "required" | "own";
  run: (args: any, me: Me) => Promise<unknown>;
};

/** what a group of tools runs with: play's database and files, GitHub, the commit play runs, and `auto`, an intent at
 *  Specify or Proposal asked of the auto-accept rules with the answer it gives back */
export type ToolCtx = {
  db: Db;
  store: BlobStore;
  github: GitHub | null;
  commit?: string | null;
  auto: <R extends Record<string, any>>(out: R, me: Me | null, id?: unknown) => Promise<R>;
};
