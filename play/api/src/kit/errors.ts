// play's one error with a status (decision 1 of intent 5884ade4): what is refused, missing or in conflict is an
// HttpError, answered with its message and status alike over HTTP (../app.ts) and MCP (../mcp.ts); anything else is
// play's own fault, answered 500 and logged. A subclass stays only where a caller tells it apart.
export class HttpError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}
