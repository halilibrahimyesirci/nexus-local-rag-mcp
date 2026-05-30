# Architecture decisions

Short notes on the main technical choices and the trade-offs behind them.

## Runtime: Node.js

`better-sqlite3` is a native addon that the Bun runtime does not support yet, so the
server runs on Node.js (18 or newer) and dependencies are managed with npm. Bun was
attractive for its fast startup, but the SQLite dependency rules it out for now.

## Storage: SQLite via better-sqlite3

A single `.nexus.db` file lives next to your project — no separate server, no Docker,
nothing to install. Each chunk's text and its embedding (stored as a BLOB) sit in one
table. `sqlite-vss` is loaded to accelerate nearest-neighbour search when the platform
provides the extension; when it is unavailable the query falls back to an exact cosine
scan in JavaScript, which is fast enough for typical local document sets.

## Embeddings: Xenova/all-MiniLM-L6-v2, locally

Embeddings run through Transformers.js on the CPU, so there are no API keys and nothing
leaves the machine. The model is about 80MB and is cached after the first download. It
produces 384-dimensional vectors; switching models changes that dimension, which means
rebuilding the database.

## Chunking: 512 tokens with ~10% overlap

MiniLM accepts up to 512 tokens per input, so chunks target that size with a 51-token
overlap to avoid losing context at boundaries. Larger chunks lower precision; smaller
chunks slow indexing and bloat the database.

## TypeScript strict mode

`strict` is on and `any` is avoided. The MCP tool inputs and outputs are the contract
the assistant relies on, so catching type errors at compile time is worth the friction.
