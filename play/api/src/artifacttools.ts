// Artifacts' tools over MCP (play/SPEC.md §4.13; served by ./mcp.ts): Maia City's links kept by avenMAIA, each read,
// added or corrected as an intent's work (./artifacts.ts), and their authors.
import { admin } from "./access";
import { addArtifact, AUTHOR_KINDS, authorOf, DESCRIPTION_MOST, listAuthors, listArtifacts, ORIGINS, ARTIFACT_KINDS, artifactOf, SUMMARY_WORDS, TITLE_MOST as ARTIFACT_TITLE_MOST, updateArtifact } from "./artifacts";
import type { Tool, ToolCtx } from "./mcptool";

export const artifactTools = ({ auto, db, store }: ToolCtx): Tool[] => [
    {
      name: "list_artifacts",
      description:
        "Maia City's artifacts, newest first: every link kept, each its id (a UUID), link, title, description, kind, tags, published date, authors (ids and names), origin and who brought it (\"Added by <operator>\" or \"Sourced by avenMAIA\"), without its summary (get_artifact). " +
        "q finds words in a title, description, summary, link or an author's name; author (an author's id), tag, kind and origin narrow it. Look here before you add a link: one link is one artifact.",
      inputSchema: {
        type: "object",
        properties: {
          q: { type: "string", description: "words to find in a title, description, summary, link or an author's name" },
          author: { type: "string", description: "only the artifacts of this author (their id, a UUID: list_authors gives it)" },
          tag: { type: "string" },
          kind: { type: "string", enum: [...ARTIFACT_KINDS] },
          origin: { type: "string", enum: [...ORIGINS], description: "human: pasted by an operator; agent: found by avenMAIA in its own research" },
          offset: { type: "integer", minimum: 0 },
          limit: { type: "integer", minimum: 1, maximum: 200 },
        },
        additionalProperties: false,
      },
      run: async (args, me) => listArtifacts(db, me, args),
    },
    {
      name: "get_artifact",
      description: "One artifact, whole: its link, title, description and summary, kind, tags, published date, authors in order, origin and who brought it, when it was kept and last corrected, and the hash of its page's text if it was kept (get_file reads it).",
      inputSchema: {
        type: "object",
        properties: { artifact: { type: "string", description: "the artifact's id (a UUID: list_artifacts gives it)" } },
        required: ["artifact"],
        additionalProperties: false,
      },
      run: async ({ artifact }, me) => artifactOf(db, me, artifact),
    },
    {
      name: "add_artifact",
      proposes: "own",
      description:
        "Keep an artifact in Maia City's Artifacts: a link from the net (a web page, an article, a paper, a video, a social post, a book, a podcast, code) with its three texts and its authors. Every artifact is kept as avenMAIA's (who you are: initialize's instructions), for the admin whose token connected you (its operator). " +
        "Every link your operator pastes to you, add with origin 'human' (shown \"Added by\" them); every artifact you find and use in your own research (a plant's numbers, a claim in a story, a technique), add with origin 'agent' (shown \"Sourced by avenMAIA\"). " +
        `Read the artifact itself first, then write: title, very compact (what it is about in plain words: one line, at most ${ARTIFACT_TITLE_MOST} characters, without the site's or channel's name, which is an author, no clickbait); ` +
        `description, the mini summary (1–2 sentences, one line, at most ${DESCRIPTION_MOST} characters, no Markdown: what it is and its main point); ` +
        `summary, a small report on the overall topic (Markdown, ${SUMMARY_WORDS.least}–${SUMMARY_WORDS.most} words, in the sections ## What it is (who made it, what kind of thing, when, from which angle), ## Key points (its claims, findings and numbers as bullets, as the artifact puts them), ## The topic (the wider subject: what it is, where this artifact stands in it, what else is known or disputed), and if you like ## For Maia City last (where it bears on our work); what the artifact says in the first two, what you know beyond it only in ## The topic). ` +
        "Authors: call list_authors first and name an author already kept by their id; add a new one { name, kind: person | organization, url? } only when none is them (two of one name stay two: never guess by a name). Where no person is named, its publisher (a site, a channel, a lab) is its author, as an organization. " +
        "One link is one artifact: links are compared without their #fragment, utm_*, fbclid and gclid and a trailing slash, and a YouTube video is one link however it is written; a link already kept answers with that artifact and kept: true (correct it with update_artifact), one an intent's work waits with answers with that intent. " +
        "An artifact is a document like any other: adding one proposes its first version as an intent's work. Named (\`intent\`, held to its gate), it is that intent's, kept once an admin accepts it; left out, play makes the artifact's own intent, declaring the artifact, which the auto-accept rules decide in the same call (the first rule, artifacts need no tap: kept at once, the answer at stage accepted). " +
        "Give text, the page's readable text as you fetched it, to keep a copy: links rot and pages change.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "the link, http(s)" },
          title: { type: "string", maxLength: ARTIFACT_TITLE_MOST, description: `very compact: one line, at most ${ARTIFACT_TITLE_MOST} characters` },
          description: { type: "string", maxLength: DESCRIPTION_MOST, description: `the mini summary: 1–2 sentences, one line, at most ${DESCRIPTION_MOST} characters, no Markdown` },
          summary: { type: "string", description: `a small report on the overall topic: Markdown, ${SUMMARY_WORDS.least}–${SUMMARY_WORDS.most} words, ## What it is, ## Key points (bullets), ## The topic, and if you like ## For Maia City` },
          authors: {
            type: "array",
            minItems: 1,
            description: "its authors, in order: an author already kept by their id ({ id }, list_authors), or a new one ({ name, kind, url?, note? })",
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "an author already kept (a UUID: list_authors gives it)" },
                name: { type: "string", description: "a new author's name" },
                kind: { type: "string", enum: [...AUTHOR_KINDS] },
                url: { type: "string", description: "their page or profile, http(s)" },
                note: { type: "string", description: "who they are, in a line" },
              },
              additionalProperties: false,
            },
          },
          kind: { type: "string", enum: [...ARTIFACT_KINDS] },
          tags: { type: "array", items: { type: "string" }, description: "a few words it is about, lower case" },
          published: { type: "string", description: "when it was published, YYYY-MM-DD, if known" },
          origin: { type: "string", enum: [...ORIGINS], description: "human: your operator pasted it; agent: you found it in your own research" },
          text: { type: "string", description: "the page's readable text as you fetched it, kept among play's files by its hash" },
        },
        required: ["url", "title", "description", "summary", "authors", "kind", "origin"],
        additionalProperties: false,
      },
      run: async ({ intent, ...args }, me) => addArtifact(db, store, me, args, intent),
    },
    {
      name: "update_artifact",
      proposes: "own",
      description:
        "Correct a kept artifact: any of its link, title, description, summary, kind, tags, published date, authors (the whole list, in order, as in add_artifact) and text, each held to the same form as in add_artifact. Its origin and who brought it never change. The correction is its next version proposed as an intent's work: named (\`intent\`, held to its gate), the artifact stays as it is until an admin accepts that intent; left out, play makes its own intent, which the auto-accept rules decide in the same call (the first rule: corrected at once). doc_history shows every accepted change.",
      inputSchema: {
        type: "object",
        properties: {
          artifact: { type: "string", description: "the artifact's id (a UUID)" },
          url: { type: "string" },
          title: { type: "string", maxLength: ARTIFACT_TITLE_MOST },
          description: { type: "string", maxLength: DESCRIPTION_MOST },
          summary: { type: "string" },
          authors: { type: "array", minItems: 1, items: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, kind: { type: "string", enum: [...AUTHOR_KINDS] }, url: { type: "string" }, note: { type: "string" } }, additionalProperties: false } },
          kind: { type: "string", enum: [...ARTIFACT_KINDS] },
          tags: { type: "array", items: { type: "string" } },
          published: { type: "string" },
          text: { type: "string" },
        },
        required: ["artifact"],
        additionalProperties: false,
      },
      run: async ({ artifact, intent, ...fields }, me) => updateArtifact(db, store, me, artifact, fields, intent),
    },
    {
      name: "list_authors",
      description: "The authors of Maia City's artifacts, by name: each their id (a UUID), name, kind (person or organization), page and how many artifacts name them. q finds words in a name. Look here before you name an author in add_artifact, and reuse one by their id.",
      inputSchema: {
        type: "object",
        properties: { q: { type: "string", description: "words in the author's name" } },
        additionalProperties: false,
      },
      run: async ({ q }, me) => listAuthors(db, me, { q }),
    },
    {
      name: "get_author",
      description: "One author, with every artifact that names them, newest first.",
      inputSchema: {
        type: "object",
        properties: { author: { type: "string", description: "the author's id (a UUID: list_authors gives it)" } },
        required: ["author"],
        additionalProperties: false,
      },
      run: async ({ author }, me) => authorOf(db, me, author),
    },
];
