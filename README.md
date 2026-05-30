# nexus-local-rag-mcp

[![CI](https://github.com/halilibrahimyesirci/nexus-local-rag-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/halilibrahimyesirci/nexus-local-rag-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

Offline document search for your AI assistant. Point it at a folder of PDFs, Markdown or
text files and it exposes keyword and semantic search over them through the
[Model Context Protocol](https://modelcontextprotocol.io) — no API keys, no cloud, no Docker.

Everything runs locally: documents are chunked, embedded on the CPU with `all-MiniLM-L6-v2`,
and stored in a single SQLite file. After the one-time model download, nothing leaves your machine.

## Why

Most "chat with your documents" setups send your files to a hosted embedding API or ask you
to stand up a vector database. For local notes, company PDFs, or a private knowledge base that
is often more friction — and more exposure — than you want. This keeps the whole pipeline on
your machine and behind a single command.

## Features

- Indexes PDF, Markdown, and text files from a folder you choose
- Keyword search and semantic (vector-similarity) search
- Local CPU embeddings via Transformers.js (`all-MiniLM-L6-v2`, 384-dim)
- Single-file SQLite store (`.nexus.db`) — no server, no Docker
- Re-indexes automatically when files change
- Works with any MCP client (Claude Code, Cursor, Windsurf, …)

## Requirements

- Node.js 18 or newer
- ~200 MB free disk for the embedding model and database (first run only)
- No API keys or accounts; no network access after the initial model download

## Quick start

```bash
git clone https://github.com/halilibrahimyesirci/nexus-local-rag-mcp
cd nexus-local-rag-mcp
npm install
npm run build
```

Try it against the bundled sample documents:

```bash
npm start -- --dir ./sample-docs
```

The first run downloads the embedding model (~80 MB); later runs start in a few seconds.

## Connect it to your assistant

Add the server to your MCP client's configuration, pointing `--dir` at the folder you want to
search. Use absolute paths so they resolve regardless of the client's working directory:

```json
{
  "mcpServers": {
    "nexus-local-rag": {
      "command": "node",
      "args": [
        "/absolute/path/to/nexus-local-rag-mcp/dist/index.js",
        "--dir",
        "/absolute/path/to/your/docs"
      ]
    }
  }
}
```

The exact config file depends on your client — for example `.mcp.json` in your project root for
Claude Code, `.cursor/mcp.json` for Cursor, or the MCP settings panel in Windsurf. Then ask your
assistant things like *"search the docs for authentication"* or *"what do the docs say about error
handling?"*.

## MCP tools

| Tool | Description |
|------|-------------|
| `search_docs` | Keyword search; returns matching chunks with file and page references |
| `semantic_search_docs` | Vector-similarity search for conceptual queries |
| `list_indexed` | Lists indexed files and their chunk counts |

`search_docs` and `semantic_search_docs` accept `limit` and `offset` for pagination;
`semantic_search_docs` also takes a `threshold` (0–1, default `0.3`).

## How it works

1. Each file in `--dir` is parsed and split into ~512-token chunks with a 51-token overlap.
2. Every chunk is embedded locally into a 384-dimensional vector.
3. Chunks and vectors are written to `.nexus.db` (SQLite).
4. Searches embed the query and rank chunks by cosine similarity. `sqlite-vss` is used to
   accelerate this when the extension is available; otherwise an exact in-memory scan is used,
   which is fast for typical local collections.
5. A file watcher re-indexes documents as they change.

The database defaults to `.nexus.db` in the project root. Set the `NEXUS_DB_PATH` environment
variable to store it somewhere else.

## Development

```bash
npm run dev -- --dir ./sample-docs   # run from source, no build step
npm test                             # run the test suite
npm run typecheck                    # type-check without emitting
```

See [docs/architecture.md](docs/architecture.md) for the reasoning behind the main design
choices, and [CONTRIBUTING.md](CONTRIBUTING.md) to get set up.

## Roadmap

- [x] PDF, Markdown, and text indexing
- [x] Local CPU embeddings
- [x] Keyword and semantic search with pagination
- [x] Automatic re-indexing on file changes
- [ ] First-class `sqlite-vss` indexing across platforms
- [ ] Remove a file's chunks when it is deleted
- [ ] DOCX support
- [ ] GPU acceleration

## License

[MIT](LICENSE) © Halil İbrahim Yesirci
