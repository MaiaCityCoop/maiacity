// What an error answers, the same over HTTP (./app.ts) and MCP (./mcp.ts): an HttpError (./kit/errors.ts) its message
// and status. The held ./assetdocs.ts' AssetDocError answers alike until its intent makes it an HttpError
// (intent-work/5884ade4/log/api.md, Next untangles). Anything else is play's own fault: null, answered 500 and logged.
import { AssetDocError } from "./assetdocs";
import { HttpError } from "./kit/errors";

export function statusOf(e: unknown): number | null {
  return e instanceof HttpError || e instanceof AssetDocError ? e.status : null;
}
