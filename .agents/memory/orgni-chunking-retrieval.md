---
name: Orgni chunking & retrieval
description: How the Orgni doc engine avoids silent data loss — chunked storage + keyword retrieval with page/section provenance, and where the truncation budgets live.
---

# Orgni document chunking & retrieval

The engine must never silently drop document content. The AI paths used to slice fixed offsets (8000/doc intake, 4000/doc + 16000 total chat); these were the silent-data-loss bugs.

## Design
- Parsers emit provenance markers that everything downstream relies on: PDF → `[PAGE n]` lines, DOCX → markdown `#` headings. **If you change parser output format, the chunker's PAGE_RE/HEADING_RE must change in lockstep** or provenance silently degrades.
- `chunker.service.js` splits on paragraph/heading boundaries (~`ORGNI_CHUNK_CHARS`, default 1500), flushing at page transitions so a chunk maps to exactly one page.
- Chunks live in their own `chunks` collection; `chunk.model.replaceForDocument` is delete-then-insert (re-parse safe). Document delete must cascade `removeByDocument` (done in document.controller).
- `retrieval.service.js` does deterministic keyword-overlap scoring (NO embeddings — keeps AI and no-AI paths identical). Has an **in-memory fallback**: docs uploaded before chunking get chunked on the fly, so no migration is needed.

## Budgets are explicit + logged, never silent
- Intake corpus: `ORGNI_INTAKE_CORPUS_CHARS` (default 120000); over-budget chunks are skipped **with a logger.warn**, not dropped silently.
- Chat: `ORGNI_CHAT_CORPUS_CHARS` (16000) / `ORGNI_CHAT_MAX_CHUNKS` (10).

**Why:** the user audits for silent data loss. Any new truncation must log when it drops content and be env-tunable.

## Known consistency gap (intentional, not a bug)
The no-AI deterministic chat fallback (`deterministicExtractor.answerFromContext`) uses full doc content (no data loss) but does NOT surface page provenance in its sources — only the AI path returns `pages`. Acceptable because the deterministic path loses no data; revisit only if provenance parity is requested.
