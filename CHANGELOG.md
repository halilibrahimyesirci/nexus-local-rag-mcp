# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-30

Initial release.

### Added

- MCP server exposing three tools: `search_docs`, `semantic_search_docs`, and `list_indexed`.
- Local indexing of PDF, Markdown, and text files with ~512-token chunks and a 51-token overlap.
- CPU embeddings via Transformers.js (`Xenova/all-MiniLM-L6-v2`, 384 dimensions).
- SQLite storage in a single `.nexus.db` file with exact cosine-similarity vector search.
- Keyword and semantic search with `limit`/`offset` pagination and a similarity `threshold`.
- PDF page-number estimation for search results.
- Automatic re-indexing through a file watcher, including removing a file's chunks when it is deleted.
- Graceful shutdown that closes the watcher and database on `SIGINT`/`SIGTERM`.
- Configurable database location via the `NEXUS_DB_PATH` environment variable.
- Configurable database location via the `NEXUS_DB_PATH` environment variable.

[0.1.0]: https://github.com/halilibrahimyesirci/nexus-local-rag-mcp/releases/tag/v0.1.0
