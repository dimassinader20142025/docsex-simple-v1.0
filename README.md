# Docsexprime AI

Local rebuild of the JS.do prototype at:
https://js.do/naderjsdo/docsexprime-tn-v-beta-07

This version keeps the trilingual education idea and adds:

- cleaner project files instead of one giant JS.do document
- French, Arabic, and English UI
- working topic navigation
- working forum search and filters
- local resource search
- read-progress storage in `localStorage`
- a guarded assistant with local fallback responses
- optional real LLM integration through a Python FastAPI backend

## Run

Open `index.html` directly for the static frontend.

For real LLM chat, set up and start the FastAPI backend with the included scripts:

```powershell
cd .\docsexprime-ai
.\install.ps1
$env:LLM_BASE_URL="https://openrouter.ai/api/v1"
$env:LLM_MODEL="openai/gpt-4o-mini"
$env:LLM_API_KEY="your_key_here"
.\start-server.ps1
```

If you want a background localhost server instead of keeping the terminal attached:

```powershell
.\start-localhost.ps1
```

On Windows, the simplest option is to double-click:

```text
RUN_LOCALHOST_8080.bat
```

Keep the opened terminal window running, then open `http://127.0.0.1:8080`.

If you want to run manually instead of using the helpers:

```powershell
cd .\docsexprime-ai
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:LLM_BASE_URL="https://openrouter.ai/api/v1"
$env:LLM_MODEL="openai/gpt-4o-mini"
$env:LLM_API_KEY="your_key_here"
.\.venv\Scripts\python.exe -m uvicorn server:app --host 0.0.0.0 --port 8080
```

Then open:

```text
http://localhost:8080
```

Admin dashboard:

```text
http://localhost:8080/admin.html
```

Environment variables for admin login:

```powershell
$env:ADMIN_USER="admin"
$env:ADMIN_PASSWORD="admin"
```

Admin setup & tests

- Seed an admin token (optional): creates a long-lived token in the local `articles.db` and prints it. Use this when you want to bypass username/password for automated testing or initial access:

```powershell
.\.venv\Scripts\python.exe tools/seed_admin.py
# or, if the venv is active:
python tools/seed_admin.py
```

- Run the automated admin API tests (does not require the server to be running — uses FastAPI's TestClient). Activate your venv and run:

```powershell
cd .\docsexprime-ai
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
.venv\Scripts\python.exe tools/test_admin_crud.py
```

The test script writes results to `tools/admin_test_results.json`.

## Test From Another Device

Keep the server running with `--host 0.0.0.0`, then find your computer's local IPv4 address:

```powershell
ipconfig
```

Look for the IPv4 address on your Wi-Fi adapter, for example `192.168.1.25`. On another device connected to the same Wi-Fi, open:

```text
http://192.168.1.25:8080
```

You can also test the backend health check:

```text
http://192.168.1.25:8080/api/health
```

If the page does not load, allow Python/Uvicorn through Windows Firewall for private networks.

## Test With Cloudflare Tunnel

Start the FastAPI server first:

```powershell
.
# Use the venv python or helper script to start the server:
.venv\Scripts\python.exe -m uvicorn server:app --host 127.0.0.1 --port 8080
```

In a second terminal, start a temporary public HTTPS tunnel:

```powershell
.\start-tunnel.ps1
```

Cloudflare prints a URL like:

```text
https://example-name.trycloudflare.com
```

Open that URL on your phone. Keep both terminal windows open while testing.

## Switching LLM providers

Use any provider with an OpenAI-compatible `/chat/completions` endpoint:

- OpenRouter: `LLM_BASE_URL=https://openrouter.ai/api/v1`
- Groq: `LLM_BASE_URL=https://api.groq.com/openai/v1`
- DeepSeek: `LLM_BASE_URL=https://api.deepseek.com`
- OpenAI-compatible self-hosted servers: set their base URL

Keep API keys on the server. Do not put keys in `app.js`.

## Import Onsexprime Source Database

You can create a local SQLite database of public Onsexprime source records:

```powershell
python .\scripts\import_onsexprime.py --db .\content.db --max-pages 120
```

The importer stores source metadata only:

- URL
- title
- description
- section
- short excerpt
- fetched date

It intentionally does not copy full article bodies. Keep full articles on the original site unless you have permission to republish them.

After importing, the FastAPI backend exposes:

```text
http://localhost:8080/api/source-articles
http://localhost:8080/api/source-articles?section=articles
```

## Production notes

This is still an educational prototype. Before public launch:

- verify all phone numbers and resources
- replace draft articles with medically reviewed content
- add dated citations and reviewer names
- add a stronger safety and moderation workflow
- add analytics only after privacy review
- add backend persistence for forum posts and profiles
