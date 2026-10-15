import argparse
import datetime as dt
import html
import re
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser


BASE_URL = "https://www.onsexprime.fr/"
DEFAULT_DB = "content.db"
USER_AGENT = "DocsexprimePrototype/1.0 (+local development)"


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ""
        self.description = ""
        self.links = []
        self.text_parts = []
        self._tag_stack = []
        self._current_link = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self._tag_stack.append(tag)
        if tag == "meta" and attrs.get("name", "").lower() == "description":
            self.description = clean_text(attrs.get("content", ""))
        if tag == "a":
            self._current_link = {"href": attrs.get("href", ""), "text": ""}

    def handle_endtag(self, tag):
        if self._tag_stack:
            self._tag_stack.pop()
        if tag == "a" and self._current_link:
            self.links.append(self._current_link)
            self._current_link = None

    def handle_data(self, data):
        text = clean_text(data)
        if not text:
            return
        if self._tag_stack and self._tag_stack[-1] == "title":
            self.title += text
        if self._current_link is not None:
            self._current_link["text"] += f" {text}"
        if any(tag in self._tag_stack for tag in ["h1", "h2", "h3", "p"]):
            self.text_parts.append(text)


def clean_text(value):
    value = html.unescape(value or "")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def normalize_url(href, current_url):
    if not href or href.startswith(("mailto:", "tel:", "javascript:")):
        return None
    url = urllib.parse.urljoin(current_url, href)
    parsed = urllib.parse.urlparse(url)
    if parsed.netloc.lower() != "www.onsexprime.fr":
        return None
    if re.search(r"\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|css|js)$", parsed.path, re.I):
        return None
    return urllib.parse.urlunparse((parsed.scheme, parsed.netloc, parsed.path.rstrip("/") or "/", "", "", ""))


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        content_type = response.headers.get("Content-Type", "")
        if "text/html" not in content_type:
            return ""
        return response.read().decode("utf-8", errors="replace")


def init_db(path):
    connection = sqlite3.connect(path)
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS source_pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            section TEXT NOT NULL,
            excerpt TEXT NOT NULL,
            source TEXT NOT NULL,
            fetched_at TEXT NOT NULL,
            status INTEGER NOT NULL,
            error TEXT NOT NULL DEFAULT ''
        )
        """
    )
    connection.execute("CREATE INDEX IF NOT EXISTS idx_source_pages_section ON source_pages(section)")
    return connection


def section_from_url(url):
    path = urllib.parse.urlparse(url).path.strip("/")
    if not path:
        return "home"
    return path.split("/", 1)[0]


def save_page(connection, url, parser, status=200, error=""):
    body_text = clean_text(" ".join(parser.text_parts))
    excerpt = body_text[:320]
    title = clean_text(parser.title).replace(" | Onsexprime", "")
    if not title:
        title = parser.links[0]["text"].strip() if parser.links else url
    connection.execute(
        """
        INSERT INTO source_pages
            (url, title, description, section, excerpt, source, fetched_at, status, error)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(url) DO UPDATE SET
            title=excluded.title,
            description=excluded.description,
            section=excluded.section,
            excerpt=excluded.excerpt,
            fetched_at=excluded.fetched_at,
            status=excluded.status,
            error=excluded.error
        """,
        (
            url,
            title,
            parser.description,
            section_from_url(url),
            excerpt,
            "onsexprime.fr",
            dt.datetime.now(dt.timezone.utc).isoformat(),
            status,
            error,
        ),
    )


def crawl(db_path, max_pages, delay):
    connection = init_db(db_path)
    seen = set()
    queue = [BASE_URL]

    while queue and len(seen) < max_pages:
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        print(f"[{len(seen)}/{max_pages}] {url}")

        parser = PageParser()
        try:
            markup = fetch(url)
            parser.feed(markup)
            save_page(connection, url, parser)
            connection.commit()
            for link in parser.links:
                next_url = normalize_url(link["href"], url)
                if next_url and next_url not in seen and next_url not in queue:
                    queue.append(next_url)
        except urllib.error.HTTPError as exc:
            save_page(connection, url, parser, status=exc.code, error=str(exc))
            connection.commit()
        except Exception as exc:
            save_page(connection, url, parser, status=0, error=str(exc))
            connection.commit()

        time.sleep(delay)

    connection.close()
    print(f"Saved {len(seen)} scanned pages to {db_path}")


def main():
    parser = argparse.ArgumentParser(description="Import safe Onsexprime source metadata into SQLite.")
    parser.add_argument("--db", default=DEFAULT_DB, help="SQLite database path.")
    parser.add_argument("--max-pages", type=int, default=120, help="Maximum pages to scan.")
    parser.add_argument("--delay", type=float, default=0.4, help="Delay between requests in seconds.")
    args = parser.parse_args()
    crawl(args.db, args.max_pages, args.delay)


if __name__ == "__main__":
    main()
