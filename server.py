import json
import logging
import mimetypes
import os
import re
import sqlite3
import urllib.error
import urllib.request
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Literal, Optional, List
from contextlib import contextmanager

from fastapi import FastAPI, HTTPException, UploadFile, File, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)


ROOT = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(ROOT, ".env"))

PORT = int(os.environ.get("PORT", "8080"))
HOST = os.environ.get("HOST", "0.0.0.0")
CONTENT_DB = os.environ.get("CONTENT_DB", os.path.join(ROOT, "content.db"))
if not os.path.isabs(CONTENT_DB):
    CONTENT_DB = os.path.join(ROOT, CONTENT_DB)

# Validate critical environment variables at startup
def _validate_startup():
    """Validate required configuration at startup"""
    required_keys = ["ARTICLES_DB"] if os.environ.get("ARTICLES_DB") else []
    missing_keys = [key for key in required_keys if not os.environ.get(key)]
    if missing_keys:
        logger.warning(f"⚠️ Missing env vars: {', '.join(missing_keys)}")
    
    llm_config = {
        "api_key": bool(os.environ.get("LLM_API_KEY")),
        "base_url": bool(os.environ.get("LLM_BASE_URL")),
        "model": bool(os.environ.get("LLM_MODEL")),
    }
    if not all(llm_config.values()):
        logger.warning("⚠️ LLM not configured. Chat will use local fallback mode.")
    else:
        logger.info("✅ LLM configured. Real chat available.")
    
    logger.info(f"🚀 Starting Docsexprime AI on {HOST}:{PORT}")

@contextmanager
def _get_db(db_path: str):
    """Context manager for database connections"""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


class ChatRequest(BaseModel):
    message: str = Field(default="", max_length=2000)
    lang: Literal["fr", "ar", "en"] = "fr"
    context: dict[str, Any] | None = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "How do I talk about consent?",
                "lang": "en",
                "context": {"topics": ["consent"], "resources": []}
            }
        }


class ArticleCreate(BaseModel):
    id: str = Field(..., min_length=1, max_length=100)
    topic: str = Field(..., min_length=1, max_length=50)
    minutes: int = Field(..., ge=0, le=999)
    titles: dict[str, str] = Field(..., min_items=1)
    excerpts: dict[str, str] = Field(..., min_items=1)
    bodies: dict[str, List[str]] = Field(..., min_items=1)
    media: Any = Field(default_factory=dict)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "consent-101",
                "topic": "consent",
                "minutes": 5,
                "titles": {"fr": "Le consentement", "ar": "الموافقة", "en": "Consent"},
                "excerpts": {"fr": "Un oui doit être libre", "ar": "نعم يجب أن تكون حرة", "en": "Yes must be free"},
                "bodies": {"fr": ["Paragraph 1", "Paragraph 2"], "ar": [], "en": []},
                "media": {}
            }
        }


class ArticleUpdate(BaseModel):
    minutes: Optional[int] = Field(None, ge=0, le=999)
    titles: Optional[dict[str, str]] = None
    excerpts: Optional[dict[str, str]] = None
    bodies: Optional[dict[str, List[str]]] = None
    media: Optional[Any] = None


app = FastAPI(title="Docsexprime AI")

# CORS / TrustedHost are wildcard by default for localhost dev; lock them down
# in production by setting CORS_ALLOW_ORIGINS / ALLOWED_HOSTS env vars
# (comma-separated). "*" remains the default so the README instructions still work.
_cors_origins = [
    o.strip() for o in os.environ.get("CORS_ALLOW_ORIGINS", "*").split(",") if o.strip()
] or ["*"]
_allowed_hosts = [
    h.strip() for h in os.environ.get("ALLOWED_HOSTS", "*").split(",") if h.strip()
] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=_allowed_hosts)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        # 'unsafe-inline' for style-src only — admin/app set inline style= for topic color.
        # script-src 'self' blocks injected <script>; inline event handlers (.onclick=...) are not blocked.
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' https://fonts.googleapis.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "img-src 'self' data: https:; "
            "connect-src 'self'; "
            "media-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'; "
            "object-src 'none'"
        )
        return response

app.add_middleware(SecurityHeadersMiddleware)


class RateLimiter:
    """Simple in-memory rate limiter."""
    def __init__(self, max_requests: int = 20, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, list[float]] = {}
        self._last_sweep: float = 0.0

    def _maybe_sweep(self, now: float) -> None:
        # Drop entries that have aged out so the dict can't grow unbounded
        # across unique client IPs over a long-lived process.
        if now - self._last_sweep <= self.window_seconds:
            return
        cutoff = now - self.window_seconds
        self._requests = {
            key: [ts for ts in timestamps if ts > cutoff]
            for key, timestamps in self._requests.items()
            if any(ts > cutoff for ts in timestamps)
        }
        self._last_sweep = now

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        self._maybe_sweep(now)
        window_start = now - self.window_seconds
        timestamps = self._requests.get(key, [])
        timestamps = [ts for ts in timestamps if ts > window_start]
        if len(timestamps) >= self.max_requests:
            return False
        timestamps.append(now)
        self._requests[key] = timestamps
        return True

chat_rate_limiter = RateLimiter(max_requests=20, window_seconds=60)


def init_articles_db():
    """Initialize the articles database table"""
    db_path = os.environ.get("ARTICLES_DB", os.path.join(ROOT, "articles.db"))
    if not os.path.isabs(db_path):
        db_path = os.path.join(ROOT, db_path)
    
    try:
        conn = sqlite3.connect(db_path)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS articles (
                id TEXT PRIMARY KEY,
                topic TEXT NOT NULL,
                minutes INTEGER NOT NULL,
                titles_fr TEXT NOT NULL,
                titles_ar TEXT NOT NULL,
                titles_en TEXT NOT NULL,
                excerpts_fr TEXT NOT NULL,
                excerpts_ar TEXT NOT NULL,
                excerpts_en TEXT NOT NULL,
                bodies_fr TEXT NOT NULL,
                bodies_ar TEXT NOT NULL,
                bodies_en TEXT NOT NULL,
                media_json TEXT NOT NULL DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Backfill media_json for older databases that lack the column
        cursor = conn.execute("PRAGMA table_info(articles)")
        columns = [row[1] for row in cursor.fetchall()]
        if "media_json" not in columns:
            conn.execute("ALTER TABLE articles ADD COLUMN media_json TEXT NOT NULL DEFAULT '[]'")
            logger.info("📝 Added media_json column to articles table")

        # Simple admin token storage for dashboard auth
        conn.execute("""
            CREATE TABLE IF NOT EXISTS admin_tokens (
                token TEXT PRIMARY KEY,
                created_at TIMESTAMP NOT NULL,
                expires_at TIMESTAMP NOT NULL
            )
        """)

        # Indexes for common query patterns
        conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_topic ON articles(topic)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_admin_tokens_expires_at ON admin_tokens(expires_at)")

        conn.commit()
        conn.close()
        logger.info(f"✅ Database initialized at {db_path}")
        return db_path
    except sqlite3.Error as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise RuntimeError(f"Failed to initialize database: {e}")


# Initialize the articles database
ARTICLES_DB = init_articles_db()

# Validate startup configuration
_validate_startup()


def _empty_media() -> dict[str, Any]:
    return {"hero": "", "gallery": [], "videos": [], "documents": []}


def _normalize_media(value: Any) -> dict[str, Any]:
    media = _empty_media()
    if isinstance(value, list):
        for url in value:
            if not isinstance(url, str) or not url.strip():
                continue
            clean_url = url.strip()
            if _media_kind(clean_url) == "video":
                media["videos"].append(clean_url)
            elif _media_kind(clean_url) == "document":
                media["documents"].append(clean_url)
            elif not media["hero"] and _media_kind(clean_url) == "image":
                media["hero"] = clean_url
            else:
                media["gallery"].append(clean_url)
        return media
    if not isinstance(value, dict):
        return media

    hero = value.get("hero")
    if isinstance(hero, str):
        media["hero"] = hero.strip()
    for key in ["gallery", "videos", "documents"]:
        values = value.get(key)
        if isinstance(values, list):
            media[key] = [str(item).strip() for item in values if str(item).strip()]
    return media


def _media_kind(name_or_url: str) -> str:
    lower = name_or_url.lower().split("?", 1)[0]
    if lower.endswith((".png", ".jpg", ".jpeg", ".webp", ".gif")):
        return "image"
    if lower.endswith((".mp4", ".webm", ".mov")):
        return "video"
    if lower.endswith((".pdf", ".txt", ".doc", ".docx")):
        return "document"
    return "other"


def _read_media_json(raw: str | None) -> dict[str, Any]:
    try:
        return _normalize_media(json.loads(raw or "{}"))
    except json.JSONDecodeError:
        return _empty_media()


def _upload_item(path: str) -> dict[str, Any]:
    stat = os.stat(path)
    name = os.path.basename(path)
    content_type = mimetypes.guess_type(name)[0] or "application/octet-stream"
    return {
        "name": name,
        "url": f"/uploads/{name}",
        "size": stat.st_size,
        "modified_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
        "kind": _media_kind(name),
        "content_type": content_type,
    }


@app.get("/api/health")
def health():
    """Health check endpoint"""
    try:
        with _get_db(ARTICLES_DB) as conn:
            conn.execute("SELECT 1")
            article_count = conn.execute("SELECT COUNT(*) FROM articles").fetchone()[0]
        api_key = os.environ.get("LLM_API_KEY")
        return {
            "status": "ok",
            "database": "connected",
            "articles": article_count,
            "llm_configured": bool(api_key),
            "llm_model": os.environ.get("LLM_MODEL", "openai/gpt-4o-mini"),
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Database connection failed")


@app.get("/api/source-articles")
def source_articles(limit: int = 100, section: str | None = None):
    if not os.path.exists(CONTENT_DB):
        return {"items": [], "database": os.path.basename(CONTENT_DB)}

    limit = max(1, min(limit, 300))
    connection = sqlite3.connect(CONTENT_DB)
    connection.row_factory = sqlite3.Row
    try:
        if section:
            rows = connection.execute(
                """
                SELECT url, title, description, section, excerpt, source, fetched_at
                FROM source_pages
                WHERE status = 200 AND section = ?
                ORDER BY title
                LIMIT ?
                """,
                (section, limit),
            ).fetchall()
        else:
            rows = connection.execute(
                """
                SELECT url, title, description, section, excerpt, source, fetched_at
                FROM source_pages
                WHERE status = 200
                ORDER BY section, title
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
    finally:
        connection.close()

    return {"items": [dict(row) for row in rows], "database": os.path.basename(CONTENT_DB)}


@app.get("/api/articles")
def get_all_articles(topic: Optional[str] = None):
    """
    Get all articles, optionally filtered by topic.
    
    Query Parameters:
    - topic: optional topic ID to filter articles
    
    Returns:
    - items: list of articles
    - count: number of articles returned
    """
    try:
        with _get_db(ARTICLES_DB) as conn:
            if topic:
                if not isinstance(topic, str) or len(topic) > 50:
                    raise HTTPException(status_code=400, detail="Invalid topic parameter")
                rows = conn.execute(
                    "SELECT * FROM articles WHERE topic = ? ORDER BY created_at DESC",
                    (topic,)
                ).fetchall()
            else:
                rows = conn.execute("SELECT * FROM articles ORDER BY topic, created_at DESC").fetchall()
        
        articles = []
        for row in rows:
            try:
                articles.append({
                    "id": row["id"],
                    "topic": row["topic"],
                    "minutes": row["minutes"],
                    "title": {
                        "fr": row["titles_fr"],
                        "ar": row["titles_ar"],
                        "en": row["titles_en"]
                    },
                    "excerpt": {
                        "fr": row["excerpts_fr"],
                        "ar": row["excerpts_ar"],
                        "en": row["excerpts_en"]
                    },
                    "body": {
                        "fr": json.loads(row["bodies_fr"]),
                        "ar": json.loads(row["bodies_ar"]),
                        "en": json.loads(row["bodies_en"])
                    },
                    "media": _read_media_json(row["media_json"])
                })
            except (json.JSONDecodeError, KeyError) as e:
                logger.warning(f"⚠️ Skipping malformed article {row.get('id')}: {e}")
                continue
        
        logger.info(f"📚 Fetched {len(articles)} articles{f' for topic={topic}' if topic else ''}")
        return {"items": articles, "count": len(articles)}
    except sqlite3.Error as e:
        logger.error(f"❌ Database error fetching articles: {e}")
        raise HTTPException(status_code=500, detail="Database error")


@app.get("/api/articles/{article_id}")
def get_article(article_id: str):
    """Get a single article by ID"""
    try:
        if not article_id or len(article_id) > 100:
            raise HTTPException(status_code=400, detail="Invalid article ID")
        
        with _get_db(ARTICLES_DB) as conn:
            row = conn.execute(
                "SELECT * FROM articles WHERE id = ?",
                (article_id,)
            ).fetchone()
        
        if not row:
            logger.warning(f"⚠️ Article not found: {article_id}")
            raise HTTPException(status_code=404, detail="Article not found")
        
        return {
            "id": row["id"],
            "topic": row["topic"],
            "minutes": row["minutes"],
            "title": {
                "fr": row["titles_fr"],
                "ar": row["titles_ar"],
                "en": row["titles_en"]
            },
            "excerpt": {
                "fr": row["excerpts_fr"],
                "ar": row["excerpts_ar"],
                "en": row["excerpts_en"]
            },
            "body": {
                "fr": json.loads(row["bodies_fr"]),
                "ar": json.loads(row["bodies_ar"]),
                "en": json.loads(row["bodies_en"])
            },
            "media": _read_media_json(row["media_json"])
        }
    except sqlite3.Error as e:
        logger.error(f"❌ Database error fetching article {article_id}: {e}")
        raise HTTPException(status_code=500, detail="Database error")


def _check_admin_token(authorization: Optional[str]) -> bool:
    """Validate admin token from authorization header"""
    if not authorization:
        return False
    
    token = authorization
    if authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
    
    if not token or len(token) < 10:
        return False

    try:
        with _get_db(ARTICLES_DB) as conn:
            row = conn.execute(
                "SELECT token, expires_at FROM admin_tokens WHERE token = ?",
                (token,)
            ).fetchone()
            if not row:
                return False
            try:
                exp_dt = datetime.fromisoformat(row["expires_at"])
                is_valid = exp_dt > datetime.now(timezone.utc)
                if not is_valid:
                    logger.info(f"⏰ Token expired at {row['expires_at']}")
                return is_valid
            except ValueError:
                logger.warning(f"⚠️ Invalid token expiration format")
                return False
    except sqlite3.Error as e:
        logger.error(f"❌ Token check error: {e}")
        return False


def _validate_article_create(article: ArticleCreate) -> None:
    """Validate article creation data"""
    # basic validation rules
    if not article.id or not isinstance(article.id, str) or len(article.id) > 100:
        raise HTTPException(status_code=400, detail="Invalid or missing article id (max 100 chars)")
    if not article.topic or not isinstance(article.topic, str) or len(article.topic) > 50:
        raise HTTPException(status_code=400, detail="Invalid or missing topic (max 50 chars)")
    if not isinstance(article.minutes, int) or article.minutes < 0 or article.minutes > 999:
        raise HTTPException(status_code=400, detail="minutes must be 0-999")
    # titles and excerpts should at least include French
    if not article.titles or not article.titles.get("fr"):
        raise HTTPException(status_code=400, detail="titles.fr is required")
    if not article.excerpts or not article.excerpts.get("fr"):
        raise HTTPException(status_code=400, detail="excerpts.fr is required")
    if not article.bodies or not isinstance(article.bodies, dict):
        raise HTTPException(status_code=400, detail="bodies must be a dict with language keys")
    _validate_bodies_lengths(article.bodies)


def _validate_article_update(article: ArticleUpdate) -> None:
    """Validate article update data"""
    if article.minutes is not None and (not isinstance(article.minutes, int) or article.minutes < 0 or article.minutes > 999):
        raise HTTPException(status_code=400, detail="minutes must be 0-999")
    if article.bodies is not None:
        _validate_bodies_lengths(article.bodies)


# Hard caps to prevent admin tokens from pushing unbounded payloads into the DB.
_MAX_PARAGRAPHS_PER_LANG = 200
_MAX_CHARS_PER_PARAGRAPH = 5000


def _validate_bodies_lengths(bodies: dict[str, list[str]]) -> None:
    for lang, paragraphs in bodies.items():
        if not isinstance(paragraphs, list):
            raise HTTPException(
                status_code=400,
                detail=f"bodies.{lang} must be a list of paragraphs",
            )
        if len(paragraphs) > _MAX_PARAGRAPHS_PER_LANG:
            raise HTTPException(
                status_code=400,
                detail=f"bodies.{lang} exceeds {_MAX_PARAGRAPHS_PER_LANG} paragraphs",
            )
        for index, paragraph in enumerate(paragraphs):
            if not isinstance(paragraph, str):
                raise HTTPException(
                    status_code=400,
                    detail=f"bodies.{lang}[{index}] must be a string",
                )
            if len(paragraph) > _MAX_CHARS_PER_PARAGRAPH:
                raise HTTPException(
                    status_code=400,
                    detail=f"bodies.{lang}[{index}] exceeds {_MAX_CHARS_PER_PARAGRAPH} chars",
                )


@app.post("/api/articles")
def create_article(article: ArticleCreate, authorization: Optional[str] = Header(None)):
    """Create a new article (admin-only)"""
    if not _check_admin_token(authorization):
        logger.warning(f"🚨 Unauthorized article creation attempt")
        raise HTTPException(status_code=401, detail="Unauthorized")

    _validate_article_create(article)

    try:
        with _get_db(ARTICLES_DB) as conn:
            conn.execute("""
                INSERT INTO articles (
                        id, topic, minutes,
                        titles_fr, titles_ar, titles_en,
                        excerpts_fr, excerpts_ar, excerpts_en,
                        bodies_fr, bodies_ar, bodies_en,
                        media_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                article.id, article.topic, article.minutes,
                article.titles.get("fr", ""), article.titles.get("ar", ""), article.titles.get("en", ""),
                article.excerpts.get("fr", ""), article.excerpts.get("ar", ""), article.excerpts.get("en", ""),
                json.dumps(article.bodies.get("fr", [])),
                json.dumps(article.bodies.get("ar", [])),
                json.dumps(article.bodies.get("en", [])),
                json.dumps(_normalize_media(article.media))
            ))
            conn.commit()
        logger.info(f"✅ Article created: {article.id} ({article.topic})")
        return {"success": True, "id": article.id}
    except sqlite3.IntegrityError as e:
        logger.warning(f"⚠️ Duplicate article ID: {article.id}")
        raise HTTPException(status_code=409, detail="Article ID already exists")
    except sqlite3.Error as e:
        logger.error(f"❌ Database error creating article: {e}")
        raise HTTPException(status_code=500, detail="Database error")


@app.put("/api/articles/{article_id}")
def update_article(article_id: str, article: ArticleUpdate, authorization: Optional[str] = Header(None)):
    """Update an existing article (admin-only)"""
    if not _check_admin_token(authorization):
        logger.warning(f"🚨 Unauthorized article update attempt for {article_id}")
        raise HTTPException(status_code=401, detail="Unauthorized")

    _validate_article_update(article)

    try:
        with _get_db(ARTICLES_DB) as conn:
            exists = conn.execute("SELECT 1 FROM articles WHERE id = ?", (article_id,)).fetchone()
            if not exists:
                logger.warning(f"⚠️ Article not found for update: {article_id}")
                raise HTTPException(status_code=404, detail="Article not found")

            updates = []
            params = []

            if article.minutes is not None:
                updates.append("minutes = ?")
                params.append(article.minutes)
            if article.titles is not None:
                updates.append("titles_fr = ?")
                params.append(article.titles.get("fr", ""))
                updates.append("titles_ar = ?")
                params.append(article.titles.get("ar", ""))
                updates.append("titles_en = ?")
                params.append(article.titles.get("en", ""))
            if article.excerpts is not None:
                updates.append("excerpts_fr = ?")
                params.append(article.excerpts.get("fr", ""))
                updates.append("excerpts_ar = ?")
                params.append(article.excerpts.get("ar", ""))
                updates.append("excerpts_en = ?")
                params.append(article.excerpts.get("en", ""))
            if article.bodies is not None:
                updates.append("bodies_fr = ?")
                params.append(json.dumps(article.bodies.get("fr", [])))
                updates.append("bodies_ar = ?")
                params.append(json.dumps(article.bodies.get("ar", [])))
                updates.append("bodies_en = ?")
                params.append(json.dumps(article.bodies.get("en", [])))
            if article.media is not None:
                updates.append("media_json = ?")
                params.append(json.dumps(_normalize_media(article.media)))

            if updates:
                updates.append("updated_at = CURRENT_TIMESTAMP")
                params.append(article_id)
                conn.execute(
                    f"UPDATE articles SET {', '.join(updates)} WHERE id = ?",
                    params
                )
                conn.commit()
                logger.info(f"✅ Article updated: {article_id}")
    except sqlite3.Error as e:
        logger.error(f"❌ Database error updating article: {e}")
        raise HTTPException(status_code=500, detail="Database error")
    
    return {"success": True}


@app.delete("/api/articles/{article_id}")
def delete_article(article_id: str, authorization: Optional[str] = Header(None)):
    """Delete an article (admin-only)"""
    if not _check_admin_token(authorization):
        logger.warning(f"🚨 Unauthorized article delete attempt for {article_id}")
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        with _get_db(ARTICLES_DB) as conn:
            cursor = conn.execute("DELETE FROM articles WHERE id = ?", (article_id,))
            conn.commit()
            if cursor.rowcount == 0:
                logger.warning(f"⚠️ Article not found for deletion: {article_id}")
                raise HTTPException(status_code=404, detail="Article not found")
            logger.info(f"✅ Article deleted: {article_id}")
    except sqlite3.Error as e:
        logger.error(f"❌ Database error deleting article: {e}")
        raise HTTPException(status_code=500, detail="Database error")
    
    return {"success": True}


@app.post("/api/chat")
def chat(request: Request, body: ChatRequest):
    """Chat with the AI assistant (with optional real LLM or local fallback)"""
    message = body.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Missing message")

    client_ip = request.client.host if request.client else "unknown"
    if not chat_rate_limiter.is_allowed(client_ip):
        logger.warning(f"🚨 Rate limit exceeded for {client_ip}")
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")

    api_key = os.environ.get("LLM_API_KEY")
    base_url = os.environ.get("LLM_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
    model = os.environ.get("LLM_MODEL", "openai/gpt-4o-mini")

    if not api_key:
        logger.warning(f"⚠️ Chat request but LLM_API_KEY not configured. Using local fallback.")
        return {"reply": _local_chat_reply(message, body.lang), "mode": "local"}

    system = (
        "You are Docsexprime, a guarded sexual-health education assistant for Tunisia. "
        "Reply in the user's selected language. Be warm, brief, and practical. "
        "Do not diagnose, do not prescribe, and do not replace a clinician. "
        "For danger, coercion, assault, severe pain, bleeding, fever, or self-harm, "
        "tell the user to seek immediate local help. Encourage confidential medical "
        "consultation and trusted local services. Avoid explicit erotic content; keep "
        "education clinical and age-appropriate."
    )

    context_text = _format_context(body.context)

    payload = {
        "model": model,
        "temperature": 0.35,
        "max_tokens": 500,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": f"Language: {body.lang}\n{context_text}\nQuestion: {message}"},
        ],
    }

    request = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": os.environ.get("APP_URL", f"http://localhost:{PORT}"),
            "X-Title": "Docsexprime AI",
        },
        method="POST",
    )

    try:
        logger.info(f"💬 Chat request in {body.lang}: {message[:60]}...")
        with urllib.request.urlopen(request, timeout=45) as response:
            data = json.loads(response.read().decode("utf-8"))
        reply = data.get("choices", [{}])[0].get("message", {}).get("content")
        logger.info(f"✅ Chat response generated ({len(reply or '')} chars)")
        return {"reply": reply or "I could not generate a response."}
    except urllib.error.HTTPError as exc:
        detail = _read_error_detail(exc)
        logger.error(f"❌ LLM HTTP error {exc.code}: {detail[:100]}")
        raise HTTPException(status_code=exc.code, detail=detail) from exc
    except urllib.error.URLError as exc:
        logger.error(f"❌ LLM connection failed: {exc.reason}")
        raise HTTPException(status_code=502, detail=f"LLM request failed: {exc.reason}") from exc
    except json.JSONDecodeError as exc:
        logger.error(f"❌ LLM returned invalid JSON")
        raise HTTPException(status_code=502, detail="LLM returned invalid JSON") from exc
    except Exception as exc:
        logger.error(f"❌ Unexpected chat error: {exc}")
        raise HTTPException(status_code=500, detail="Chat request failed")


def _format_context(context: dict[str, Any] | None) -> str:
    if not context:
        return "Available app context: none."

    lines = ["Available app context:"]
    for key in ["topics", "resources", "sourceArticles"]:
        values = context.get(key)
        if not isinstance(values, list):
            continue
        clean_values = [str(value).strip()[:240] for value in values if str(value).strip()]
        if clean_values:
            lines.append(f"- {key}: " + " | ".join(clean_values[:30]))
    return "\n".join(lines)


def _read_error_detail(exc: urllib.error.HTTPError) -> str:
    raw = exc.read().decode("utf-8", errors="replace")
    try:
        payload = json.loads(raw)
        error = payload.get("error", {})
        if isinstance(error, dict):
            return error.get("message") or raw or "LLM request failed"
    except json.JSONDecodeError:
        pass
    return raw or "LLM request failed"


def _local_chat_reply(message: str, lang: str) -> str:
    """Generate a cautious local fallback response when LLM is unavailable."""
    lower = message.lower()
    emergency = {
        "fr": "Si tu es en danger immediat ou si une personne t'a force, cherche un lieu sur et contacte les urgences locales. Tu peux aussi preparer une phrase simple pour un soignant: \"J'ai besoin d'aide et de confidentialite.\"",
        "ar": "اذا كنت في خطر مباشر او تعرضت لاكراه، اذهب الى مكان آمن واتصل بالطوارئ المحلية. يمكنك قول جملة بسيطة لمقدم الرعاية: احتاج مساعدة وسرية.",
        "en": "If you are in immediate danger or someone forced you, get to a safe place and contact local emergency services. You can tell a clinician: \"I need help and privacy.\""
    }
    if re.search(r"urgent|danger|force|viol|اغتصاب|خطر|emergency", lower):
        return emergency.get(lang, emergency["fr"])

    topic_replies = {
        "contrace|pill|preserv|condom|منع|واقي": {
            "fr": "Aucune methode ne convient a tout le monde. Le bon choix depend de ta sante, ton confort et tes besoins. Prepare tes questions: comment l'utiliser, que faire en cas d'oubli, quels effets surveiller, ou consulter. Le preservatif aide aussi a reduire le risque d'IST quand il est bien utilise.",
            "ar": "لا توجد طريقة تناسب الجميع. الاختيار يعتمد على الصحة والراحة والحاجة. حضّر اسئلتك: كيف تستعمل، ماذا تفعل عند النسيان، ما الاثار التي يجب مراقبتها، واين تستشير. الواقي يساعد كذلك على تقليل خطر الامراض المنقولة جنسيا عند استعماله جيدا.",
            "en": "No method fits everyone. The right choice depends on health, comfort, and needs. Prepare questions: how to use it, what to do if forgotten, what side effects to watch, and where to consult. Condoms can also reduce STI risk when used correctly."
        },
        "ist|vih|sida|hiv|depist|test|فحص|مرض": {
            "fr": "Beaucoup d'IST peuvent rester silencieuses. Demander un depistage est un geste de prevention, pas une honte. Consulte rapidement en cas de douleur, brulure, plaie, ecoulement, fievre ou rapport force. Demande au service de sante quelles analyses sont adaptees et quand refaire un test.",
            "ar": "كثير من الامراض المنقولة جنسيا قد لا تظهر اعراضا. طلب الفحص وقاية وليس عيبا. استشر بسرعة عند وجود الم، حرقان، جرح، افرازات، حمى او علاقة قسرية. اسأل خدمة الصحة عن التحاليل المناسبة ومتى يجب اعادة الفحص.",
            "en": "Many STIs can be silent. Asking for testing is prevention, not shame. Seek care quickly for pain, burning, sores, discharge, fever, or forced sex. Ask the health service which tests fit your situation and when to repeat them."
        },
        "consent|accord|موافقة|حدود": {
            "fr": "Le consentement n'est pas un silence, une pression ou une peur de decevoir. Une personne peut changer d'avis a tout moment. Respecter ce changement fait partie d'une relation saine. Si tu te sens oblige, isole ou menace, cherche l'aide d'un adulte de confiance ou d'un service de sante.",
            "ar": "الموافقة ليست صمتا ولا ضغطا ولا خوفا من ازعاج الاخر. يمكن للشخص تغيير رأيه في اي وقت. احترام ذلك جزء من علاقة سليمة. اذا شعرت بضغط او تهديد، اطلب مساعدة شخص موثوق او خدمة صحية.",
            "en": "Consent is not silence, pressure, or fear of disappointing someone. A person can change their mind at any time. Respecting that is part of a healthy relationship. If you feel pressured, isolated, or threatened, seek help from a trusted adult or health service."
        }
    }

    for pattern, replies in topic_replies.items():
        if re.search(pattern, lower):
            return replies.get(lang, replies["fr"])

    intros = {
        "fr": "Bonjour. Je peux t'aider a comprendre un sujet, preparer une question pour un medecin, ou trouver une ressource. Je ne pose pas de diagnostic. Pour des sujets precis, n'hesite pas a consulter un professionnel de sante.",
        "ar": "مرحبا. يمكنني مساعدتك على فهم موضوع او تحضير سؤال للطبيب او ايجاد مورد. لا اقدم تشخيصا. للمواضيع الدقيقة، لا تتردد في استشارة مهني صحي.",
        "en": "Hello. I can help you understand a topic, prepare a question for a clinician, or find a resource. I do not diagnose. For specific concerns, please consult a health professional."
    }
    return intros.get(lang, intros["fr"])


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1, max_length=100)


@app.post("/api/admin/login")
def admin_login(creds: LoginRequest):
    """Authenticate admin with username and password, return session token"""
    admin_user = os.environ.get("ADMIN_USER", "admin")
    admin_pass = os.environ.get("ADMIN_PASSWORD", "admin")
    
    if creds.username != admin_user or creds.password != admin_pass:
        logger.warning(f"🚨 Failed admin login attempt for user: {creds.username}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    
    try:
        with _get_db(ARTICLES_DB) as conn:
            conn.execute(
                "INSERT OR REPLACE INTO admin_tokens (token, created_at, expires_at) VALUES (?, ?, ?)",
                (token, datetime.now(timezone.utc).isoformat(), expires_at),
            )
            conn.commit()
        logger.info(f"✅ Admin login successful for user: {creds.username}")
        return {"token": token, "expires_at": expires_at}
    except sqlite3.Error as e:
        logger.error(f"❌ Database error during admin login: {e}")
        raise HTTPException(status_code=500, detail="Login failed")


@app.post("/api/admin/upload")
def admin_upload(file: UploadFile = File(...), authorization: Optional[str] = Header(None)):
    """Upload media file (admin-only)"""
    if not _check_admin_token(authorization):
        logger.warning(f"🚨 Unauthorized file upload attempt")
        raise HTTPException(status_code=401, detail="Unauthorized")

    upload_dir = os.path.join(ROOT, "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    # Limit file size to 50 MB
    MAX_BYTES = 50 * 1024 * 1024
    data = file.file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        logger.warning(f"⚠️ File too large: {len(data)} bytes for {file.filename}")
        raise HTTPException(status_code=413, detail="File too large (max 50MB)")

    # Allow common image/video/document mimetypes
    allowed = [
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif",
        "video/mp4",
        "video/webm",
        "application/pdf",
        "text/plain",
    ]
    if file.content_type and file.content_type not in allowed:
        logger.warning(f"⚠️ Unsupported file type: {file.content_type}")
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")

    safe_name = os.path.basename(file.filename or "upload").replace(" ", "_")
    safe_name = "".join(char for char in safe_name if char.isalnum() or char in "._-")
    if not safe_name:
        safe_name = "upload"
    fname = f"{int(time.time())}_{safe_name}"
    path = os.path.join(upload_dir, fname)
    
    try:
        with open(path, "wb") as out:
            out.write(data)
        logger.info(f"✅ File uploaded: {fname} ({len(data)} bytes)")
        return _upload_item(path)
    except IOError as e:
        logger.error(f"❌ File write error: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")


@app.get("/api/admin/uploads")
def admin_uploads(authorization: Optional[str] = Header(None)):
    """List all uploaded media files (admin-only)"""
    if not _check_admin_token(authorization):
        logger.warning(f"🚨 Unauthorized uploads list attempt")
        raise HTTPException(status_code=401, detail="Unauthorized")

    upload_dir = os.path.join(ROOT, "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    try:
        items = []
        for name in os.listdir(upload_dir):
            path = os.path.join(upload_dir, name)
            if os.path.isfile(path):
                items.append(_upload_item(path))
        items.sort(key=lambda item: item["modified_at"], reverse=True)
        logger.info(f"📁 Listed {len(items)} uploaded files")
        return {"items": items}
    except OSError as e:
        logger.error(f"❌ Error listing uploads: {e}")
        raise HTTPException(status_code=500, detail="Failed to list uploads")


@app.delete("/api/admin/uploads/{filename}")
def admin_delete_upload(filename: str, authorization: Optional[str] = Header(None)):
    """Delete an uploaded file (admin-only)"""
    if not _check_admin_token(authorization):
        logger.warning(f"🚨 Unauthorized file delete attempt for {filename}")
        raise HTTPException(status_code=401, detail="Unauthorized")

    safe_name = os.path.basename(filename)
    upload_dir = os.path.join(ROOT, "uploads")
    path = os.path.abspath(os.path.join(upload_dir, safe_name))
    
    # Security: prevent directory traversal
    if not path.startswith(os.path.abspath(upload_dir) + os.sep):
        logger.warning(f"🚨 Directory traversal attempt: {path}")
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    if not os.path.exists(path) or not os.path.isfile(path):
        logger.warning(f"⚠️ File not found for deletion: {filename}")
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        os.remove(path)
        logger.info(f"✅ File deleted: {filename}")
        return {"success": True}
    except OSError as e:
        logger.error(f"❌ Error deleting file: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete file")


# Serve uploaded media before the root static mount so /uploads resolves correctly.
uploads_dir = os.path.join(ROOT, "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

app.mount("/", StaticFiles(directory=ROOT, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host=HOST, port=PORT, reload=False)
