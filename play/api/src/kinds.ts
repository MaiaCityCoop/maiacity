// Every kind play versions, registered once (./versioned.ts): importing this registers them all, so the MCP server, the
// API and the import know every kind before they serve one.
import "./assetversions";
import "./stories";
import "./factories";
import "./gameconfigs";
import "./skills";
import "./sandboxes";
