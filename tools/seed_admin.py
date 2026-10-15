import os
import sqlite3
import secrets
from datetime import datetime, timedelta

ROOT = os.path.dirname(os.path.abspath(os.path.dirname(__file__)))
DB = os.environ.get('ARTICLES_DB', os.path.join(ROOT, 'articles.db'))

if not os.path.isabs(DB):
    DB = os.path.join(ROOT, DB)

token = secrets.token_urlsafe(32)
expires = (datetime.utcnow() + timedelta(days=30)).isoformat()

conn = sqlite3.connect(DB)
conn.execute("CREATE TABLE IF NOT EXISTS admin_tokens (token TEXT PRIMARY KEY, created_at TIMESTAMP NOT NULL, expires_at TIMESTAMP NOT NULL)")
conn.execute("INSERT OR REPLACE INTO admin_tokens (token, created_at, expires_at) VALUES (?, ?, ?)", (token, datetime.utcnow().isoformat(), expires))
conn.commit()
conn.close()
print('Created admin token:')
print(token)
print('Expires at:', expires)
