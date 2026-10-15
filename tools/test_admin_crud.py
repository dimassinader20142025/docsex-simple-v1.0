import io
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from fastapi.testclient import TestClient
from server import app

client = TestClient(app)
results = {}

# Admin login
login_response = client.post(
    "/api/admin/login",
    json={"username": "admin", "password": "admin"},
)
results["login"] = {"status": login_response.status_code, "body": login_response.json()}
assert login_response.status_code == 200, "Admin login failed"

token = login_response.json()["token"]
headers = {"Authorization": f"Bearer {token}"}

# Create article
# ensure old test article is removed
client.delete("/api/articles/test-article-admin", headers=headers)

article_payload = {
    "id": "test-article-admin",
    "topic": "test",
    "minutes": 5,
    "titles": {"fr": "Titre test"},
    "excerpts": {"fr": "Extrait test"},
    "bodies": {"fr": ["Ligne 1", "Ligne 2"]},
    "media": {
        "hero": "/uploads/test.png",
        "gallery": ["/uploads/test-gallery.png"],
        "videos": ["/uploads/test.mp4"],
        "documents": ["/uploads/test.pdf"],
    },
}
create_response = client.post("/api/articles", headers=headers, json=article_payload)
results["create_article"] = {"status": create_response.status_code, "body": create_response.json()}
assert create_response.status_code == 200, "Create article failed"

# Get article
get_response = client.get("/api/articles/test-article-admin")
results["get_article"] = {"status": get_response.status_code, "body": get_response.json()}
assert get_response.status_code == 200, "Get article failed"
assert get_response.json()["media"]["hero"] == "/uploads/test.png", "Structured media was not saved"

# Update article
update_response = client.put(
    "/api/articles/test-article-admin",
    headers=headers,
    json={"minutes": 10, "media": ["/uploads/test2.png"]},
)
results["update_article"] = {"status": update_response.status_code, "body": update_response.json()}
assert update_response.status_code == 200, "Update article failed"

# Delete article
delete_response = client.delete("/api/articles/test-article-admin", headers=headers)
results["delete_article"] = {"status": delete_response.status_code, "body": delete_response.json()}
assert delete_response.status_code == 200, "Delete article failed"

# Upload media
upload_response = client.post(
    "/api/admin/upload",
    headers=headers,
    files={"file": ("test.txt", io.BytesIO(b"hello"), "text/plain")},
)
results["upload"] = {"status": upload_response.status_code, "body": upload_response.json()}
assert upload_response.status_code == 200, "Upload media failed"
uploaded_name = upload_response.json()["name"]

uploads_response = client.get("/api/admin/uploads", headers=headers)
results["uploads"] = {"status": uploads_response.status_code, "body": uploads_response.json()}
assert uploads_response.status_code == 200, "List uploads failed"
assert any(item["name"] == uploaded_name for item in uploads_response.json()["items"]), "Uploaded file missing from media library"

delete_upload_response = client.delete(f"/api/admin/uploads/{uploaded_name}", headers=headers)
results["delete_upload"] = {"status": delete_upload_response.status_code, "body": delete_upload_response.json()}
assert delete_upload_response.status_code == 200, "Delete upload failed"

with open("tools/admin_test_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print("Admin API tests passed and wrote tools/admin_test_results.json")
