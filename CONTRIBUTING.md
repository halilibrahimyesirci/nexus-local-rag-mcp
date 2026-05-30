# Contributing

Thanks for your interest in nexus-local-rag-mcp. It's a small, focused project — bug reports,
fixes, and well-scoped features are all welcome.

## Getting set up

You need Node.js 18 or newer.

```bash
git clone https://github.com/halilibrahimyesirci/nexus-local-rag-mcp
cd nexus-local-rag-mcp
npm install
npm test
```

Run the server from source while developing (no build step needed):

```bash
npm run dev -- --dir ./sample-docs
```

## Project layout

```
src/
  index.ts     CLI entry point: parse --dir, index the folder, start the server
  server.ts    MCP server and tool registration
  indexer/     Reading and parsing files, chunking, embeddings, the file watcher
  db/          SQLite access: schema, queries, vector search
  tools/       The MCP tools (search_docs, semantic_search_docs, list_indexed)
tests/         Vitest suite and fixtures
docs/          Architecture notes
sample-docs/   Example documents to index while trying things out
```

The dependency direction is `tools/` → `db/` and `indexer/`; the `db/` layer never imports from
`tools/`. Keeping that one-way makes the search path easy to follow.

## Conventions

- TypeScript runs in `strict` mode and `any` is avoided — prefer `unknown` plus a type guard.
- Add or update a test under `tests/` for behaviour changes. Tests run against an in-memory
  database (`NEXUS_DB_PATH=:memory:`), so they never touch your real `.nexus.db`.
- Before opening a pull request, run `npm run typecheck && npm test`.

## Commit messages

Keep subject lines short and imperative. The `type(scope): summary` style is encouraged:

```
feat(tools): add offset/limit pagination to search_docs
fix(indexer): re-index Markdown files when they change
```

## Reporting issues

Open an issue describing what you expected, what happened, and how to reproduce it. Please
include your OS and Node version, and a sample document if the problem is parser-related.
