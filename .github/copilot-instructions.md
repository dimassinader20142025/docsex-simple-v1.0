# Copilot instructions for Docsexprime AI

Quick orientation (what I'll do):
- Read the static frontend in `index.html` + `app.js` and the FastAPI backend in `server.py`.
- Keep data fetching, persistence, and business logic in the backend when possible; change the frontend only for presentation or to consume an existing API contract.
- If a feature requires both a backend contract and a frontend change, implement the backend contract first, expose it via `/api/*`, and then update `app.js` to consume it.

Required local setup
- Create a virtual environment and install dependencies from `requirements.txt`.
- Set env vars: `LLM_BASE_URL`, `LLM_MODEL`, and `LLM_API_KEY` (do not hardcode keys in `app.js`).
- Start the server with `uvicorn server:app --host 0.0.0.0 --port 8787`.

Reference details
- Frontend: `index.html` loads `app.js` which contains the single-file UI state, i18n, and fallback content (`getFallbackArticles()`).
- Backend: `server.py` serves static files, provides `/api/*` endpoints, and proxies LLM chat requests.
- Databases: `articles.db` stores local articles and `content.db` stores imported source metadata. Paths are configured by `ARTICLES_DB` and `CONTENT_DB`.

Project-specific conventions & patterns
- i18n: `app.js` uses an `i18n` object keyed by `fr|ar|en`; UI strings and direction (`dir`) come from `i18n[state.lang]`.
- Local storage keys: `dx_read_articles` and `dx_saved_questions` (used by `saveProgress()` in `app.js`).
- Article schema: `server.py` creates `articles` with `id`, `topic`, `minutes`, `titles_fr/ar/en`, `excerpts_fr/ar/en`, and `bodies_fr/ar/en`. The body fields are JSON-encoded arrays.
- Supported API contract:
  - GET `/api/articles` or `/api/articles?topic=contraception`
  - GET `/api/articles/{article_id}`
  - POST `/api/articles` (see `ArticleCreate` model in `server.py` for exact JSON shape)
  - GET `/api/source-articles?section=articles`
  - POST `/api/chat` with JSON `{"message":..., "lang":"fr|ar|en", "context":{...}}`
- If a requested operation is not supported by the current `/api/*` contract, do not invent a new route or payload shape; either implement it in `server.py` or report that the current contract does not support it.

LLM & safety behavior to respect
- `server.py` is the only place that should hold LLM API keys. The chat endpoint uses a guarded system prompt and must not be overridden.
- If `/api/chat` cannot run because `LLM_API_KEY`, `LLM_BASE_URL`, or `LLM_MODEL` is missing, do not invent a fake response; surface the missing configuration clearly and let the frontend fallback behavior handle it.
- Frontend falls back to local guidance when `/api/articles` or chat fails; see `state.articlesStatus` in `app.js` (values: `loading`, `ready`, `fallback`).

Editing content & small examples
- To add a quick fallback article, edit `getFallbackArticles()` inside `app.js`.
- To insert an article programmatically, POST JSON matching `ArticleCreate` to `/api/articles`. Titles/excerpts expect `fr/ar/en` keys and bodies are arrays.

Debugging tips
- Frontend: open the browser console. `app.js` logs loads and fallback messages, e.g. "✅ Loaded X articles" or "⚠️ Using fallback articles".
- Backend: run uvicorn in a terminal and inspect stdout for traces. Chat errors use parsed HTTP error bodies when available.
- After changing code, verify with the smallest relevant check: run the backend, hit the affected endpoint, and confirm the UI or fallback behavior works. If verification is not possible, note that limitation explicitly.
- If testing from another device, run uvicorn with `--host 0.0.0.0` and allow Windows Firewall for the private network.

Files to inspect first when making changes
- `app.js` — UI, i18n, local fallback content, localStorage keys, client fetch logic.
- `server.py` — REST contract, DB schema, chat proxy, system prompt, env var usage.
- `scripts/import_onsexprime.py` — how `content.db` is populated and what is stored.
- `start-tunnel.ps1` — Cloudflare tunnel helper for remote testing.

If anything here looks incomplete or you want more examples (sample POST bodies, common dev commands, or tests), tell me which area to expand and I'll iterate.
