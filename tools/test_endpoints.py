import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from server import app
from fastapi.testclient import TestClient

client = TestClient(app)

endpoints = ["/api/health", "/api/articles", "/api/source-articles?limit=1"]
results = {}
for ep in endpoints:
    r = client.get(ep)
    try:
        body = r.json()
    except Exception:
        body = r.text
    results[ep] = {"status": r.status_code, "body": body}

with open('tools/test_results.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print('WROTE tools/test_results.json')
