const API_BASE = "/api";
let token = localStorage.getItem("admin_token") || null;
let selectedUpload = null;

function el(id) {
  return document.getElementById(id);
}

async function request(path, opts = {}) {
  opts.headers = opts.headers || {};
  if (token) opts.headers.Authorization = "Bearer " + token;
  const res = await fetch(API_BASE + path, opts);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (res.status === 401) {
    logout();
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    throw new Error(data.detail || "Request failed");
  }
  return data;
}

function normalizeMedia(media) {
  if (Array.isArray(media)) {
    return { hero: "", gallery: media, videos: [], documents: [] };
  }
  return {
    hero: media?.hero || "",
    gallery: Array.isArray(media?.gallery) ? media.gallery : [],
    videos: Array.isArray(media?.videos) ? media.videos : [],
    documents: Array.isArray(media?.documents) ? media.documents : []
  };
}

function urlsFromTextarea(id) {
  return el(id).value.split("\n").map((value) => value.trim()).filter(Boolean);
}

function setTextareaUrls(id, urls) {
  el(id).value = (urls || []).join("\n");
}

function readEditorMedia() {
  return {
    hero: el("mediaHero").value.trim(),
    gallery: urlsFromTextarea("mediaGallery"),
    videos: urlsFromTextarea("mediaVideos"),
    documents: urlsFromTextarea("mediaDocuments")
  };
}

function writeEditorMedia(media) {
  const normalized = normalizeMedia(media);
  el("mediaHero").value = normalized.hero;
  setTextareaUrls("mediaGallery", normalized.gallery);
  setTextareaUrls("mediaVideos", normalized.videos);
  setTextareaUrls("mediaDocuments", normalized.documents);
  renderMediaPreview();
}

async function login() {
  const username = el("username").value;
  const password = el("password").value;
  try {
    const data = await request("/admin/login", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({username, password})
    });
    token = data.token;
    localStorage.setItem("admin_token", token);
    showDashboard();
  } catch (error) {
    el("loginMsg").innerText = "Login failed";
  }
}function logout() {
  token = null;
  selectedUpload = null;
  localStorage.removeItem("admin_token");
  showLogin();
}

function showLogin() {
  el("login").style.display = "grid";
  el("dashboard").style.display = "none";
  el("btnLogout").style.display = "none";
}

function showDashboard() {
  el("login").style.display = "none";
  el("dashboard").style.display = "grid";
  el("btnLogout").style.display = "inline-flex";
  loadArticles();
  loadUploads();
}

async function loadArticles() {
  const data = await request("/articles");
  const list = el("articlesList");
  list.innerHTML = "";
  data.items.forEach((article) => {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <div>
        <strong>${article.id}</strong>
        <span>${article.topic} · ${article.minutes} min</span>
      </div>
      <div class="row-actions">
        <button data-id="${article.id}" class="admin-button edit">Edit</button>
        <button data-id="${article.id}" class="admin-button danger del">Delete</button>
      </div>
    `;
    list.appendChild(row);
  });
  document.querySelectorAll(".edit").forEach((button) => {
    button.onclick = (event) => editArticle(event.target.dataset.id);
  });
  document.querySelectorAll(".del").forEach((button) => {
    button.onclick = (event) => deleteArticle(event.target.dataset.id);
  });
}

async function editArticle(id) {
  const article = await request("/articles/" + encodeURIComponent(id));
  el("editorTitle").innerText = "Edit " + article.id;
  el("articleId").value = article.id;
  el("articleId").disabled = true;
  el("articleTopic").value = article.topic;
  el("articleMinutes").value = article.minutes;
  el("titleFr").value = article.title.fr || "";
  el("titleAr").value = article.title.ar || "";
  el("titleEn").value = article.title.en || "";
  el("excerptFr").value = article.excerpt.fr || "";
  el("excerptAr").value = article.excerpt.ar || "";
  el("excerptEn").value = article.excerpt.en || "";
  el("bodyFr").value = (article.body.fr || []).join("||");
  el("bodyAr").value = (article.body.ar || []).join("||");
  el("bodyEn").value = (article.body.en || []).join("||");
  writeEditorMedia(article.media);
  el("editor").style.display = "block";
}

function newArticle() {
  el("editorTitle").innerText = "New Article";
  el("articleId").disabled = false;
  [
    "articleId", "articleTopic", "articleMinutes",
    "titleFr", "titleAr", "titleEn",
    "excerptFr", "excerptAr", "excerptEn",
    "bodyFr", "bodyAr", "bodyEn",
    "mediaHero", "mediaGallery", "mediaVideos", "mediaDocuments"
  ].forEach((id) => {
    el(id).value = "";
  });
  renderMediaPreview();
  el("editor").style.display = "block";
}

async function saveArticle() {
  const id = el("articleId").value.trim();
  const topic = el("articleTopic").value.trim();
  const minutes = parseInt(el("articleMinutes").value || "0", 10);
  const payload = {
    id,
    topic,
    minutes,
    titles: {fr: el("titleFr").value, ar: el("titleAr").value, en: el("titleEn").value},
    excerpts: {fr: el("excerptFr").value, ar: el("excerptAr").value, en: el("excerptEn").value},
    bodies: {
      fr: el("bodyFr").value.split("||").map((value) => value.trim()).filter(Boolean),
      ar: el("bodyAr").value.split("||").map((value) => value.trim()).filter(Boolean),
      en: el("bodyEn").value.split("||").map((value) => value.trim()).filter(Boolean)
    },
    media: readEditorMedia()
  };

  try {
    if (el("articleId").disabled) {
      await request("/articles/" + encodeURIComponent(id), {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          minutes: payload.minutes,
          titles: payload.titles,
          excerpts: payload.excerpts,
          bodies: payload.bodies,
          media: payload.media
        })
      });
    } else {
      await request("/articles", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
      });
    }
    el("editor").style.display = "none";
    loadArticles();
  } catch (error) {
    alert("Save failed: " + error.message);
  }
}

async function deleteArticle(id) {
  if (!confirm("Delete " + id + "?")) return;
  await request("/articles/" + encodeURIComponent(id), {method: "DELETE"});
  loadArticles();
}

async function uploadMedia() {
  const file = el("mediaFile").files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append("file", file);
  try {
    const data = await request("/admin/upload", {
      method: "POST",
      body: formData
    });
    selectedUpload = data;
    el("uploadResult").innerText = "Uploaded: " + data.url;
    el("mediaFile").value = "";
    await loadUploads();
    addSelectedToBestField();
  } catch (error) {
    el("uploadResult").innerText = "Upload failed: " + error.message;
  }
}

async function loadUploads() {
  if (!token) return;
  const data = await request("/admin/uploads");
  const list = el("uploadsList");
  list.innerHTML = "";
  if (!data.items.length) {
    list.innerHTML = '<div class="empty">No uploads yet.</div>';
    return;
  }
  data.items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "upload-item";
    row.dataset.url = item.url;
    row.dataset.name = item.name;
    row.dataset.kind = item.kind;
    row.innerHTML = `
      <div class="upload-thumb">${renderUploadThumb(item)}</div>
      <div class="upload-meta">
        <strong>${item.name}</strong>
        <span>${item.kind} · ${formatBytes(item.size)}</span>
      </div>
      <div class="row-actions">
        <button class="admin-button select-upload">Select</button>
        <button class="admin-button danger delete-upload">Delete</button>
      </div>
    `;
    list.appendChild(row);
  });
  document.querySelectorAll(".select-upload").forEach((button) => {
    button.onclick = (event) => {
      const row = event.target.closest(".upload-item");
      selectedUpload = {url: row.dataset.url, name: row.dataset.name, kind: row.dataset.kind};
      document.querySelectorAll(".upload-item").forEach((item) => item.classList.remove("selected"));
      row.classList.add("selected");
      el("selectedMedia").innerText = "Selected: " + selectedUpload.url;
    };
  });
  document.querySelectorAll(".delete-upload").forEach((button) => {
    button.onclick = async (event) => {
      const row = event.target.closest(".upload-item");
      if (!confirm("Delete file " + row.dataset.name + "?")) return;
      await request("/admin/uploads/" + encodeURIComponent(row.dataset.name), {method: "DELETE"});
      if (selectedUpload?.name === row.dataset.name) selectedUpload = null;
      el("selectedMedia").innerText = "No media selected.";
      loadUploads();
    };
  });
}

function renderUploadThumb(item) {
  if (item.kind === "image") return `<img src="${item.url}" alt="">`;
  if (item.kind === "video") return `<video src="${item.url}" muted></video>`;
  if (item.kind === "document") return '<span class="file-icon">PDF</span>';
  return '<span class="file-icon">FILE</span>';
}

function addUrlToTextarea(id, url) {
  const urls = urlsFromTextarea(id);
  if (!urls.includes(url)) urls.push(url);
  setTextareaUrls(id, urls);
}

function replaceTextareaWithSelected(id) {
  if (!selectedUpload) return;
  setTextareaUrls(id, [selectedUpload.url]);
  renderMediaPreview();
}

function addSelectedToBestField() {
  if (!selectedUpload) return;
  if (selectedUpload.kind === "image" && !el("mediaHero").value.trim()) {
    el("mediaHero").value = selectedUpload.url;
  } else if (selectedUpload.kind === "image") {
    addUrlToTextarea("mediaGallery", selectedUpload.url);
  } else if (selectedUpload.kind === "video") {
    addUrlToTextarea("mediaVideos", selectedUpload.url);
  } else {
    addUrlToTextarea("mediaDocuments", selectedUpload.url);
  }
  renderMediaPreview();
}

function addSelectedToTarget(target) {
  if (!selectedUpload) {
    el("selectedMedia").innerText = "Select a media file first.";
    return;
  }
  if (target === "hero") el("mediaHero").value = selectedUpload.url;
  if (target === "gallery") addUrlToTextarea("mediaGallery", selectedUpload.url);
  if (target === "videos") addUrlToTextarea("mediaVideos", selectedUpload.url);
  if (target === "documents") addUrlToTextarea("mediaDocuments", selectedUpload.url);
  renderMediaPreview();
}

function clearTarget(target) {
  if (target === "hero") el("mediaHero").value = "";
  if (target === "gallery") el("mediaGallery").value = "";
  if (target === "videos") el("mediaVideos").value = "";
  if (target === "documents") el("mediaDocuments").value = "";
  renderMediaPreview();
}

function renderMediaPreview() {
  const container = el("mediaPreview");
  if (!container) return;
  const media = readEditorMedia();
  const blocks = [];
  if (media.hero) {
    blocks.push(`<div class="preview-block"><h4>Main image</h4>${renderPreviewItem(media.hero, "image")}</div>`);
  }
  if (media.gallery.length) {
    blocks.push(`<div class="preview-block"><h4>Gallery</h4><div class="preview-grid">${media.gallery.map((url) => renderPreviewItem(url, "image")).join("")}</div></div>`);
  }
  if (media.videos.length) {
    blocks.push(`<div class="preview-block"><h4>Videos</h4>${media.videos.map((url) => renderPreviewItem(url, "video")).join("")}</div>`);
  }
  if (media.documents.length) {
    blocks.push(`<div class="preview-block"><h4>Documents</h4>${media.documents.map((url) => renderPreviewItem(url, "document")).join("")}</div>`);
  }
  container.innerHTML = blocks.join("") || '<div class="empty">No media attached.</div>';
}

function renderPreviewItem(url, expectedKind) {
  const lower = url.toLowerCase();
  if (expectedKind === "image" || lower.match(/\.(png|jpe?g|webp|gif)$/)) {
    return `<a href="${url}" target="_blank" class="preview-item"><img src="${url}" alt=""></a>`;
  }
  if (expectedKind === "video" || lower.match(/\.(mp4|webm|mov)$/)) {
    return `<video class="preview-video" src="${url}" controls></video>`;
  }
  return `<a class="document-link" href="${url}" target="_blank">${url}</a>`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

el("btnLogin").onclick = login;
el("btnLogout").onclick = logout;
el("btnNew").onclick = newArticle;
el("btnSave").onclick = saveArticle;
el("btnCancel").onclick = () => el("editor").style.display = "none";
el("btnUpload").onclick = uploadMedia;
el("btnRefreshUploads").onclick = loadUploads;

document.querySelectorAll("[data-add-target]").forEach((button) => {
  button.onclick = () => addSelectedToTarget(button.dataset.addTarget);
});
document.querySelectorAll("[data-clear-target]").forEach((button) => {
  button.onclick = () => clearTarget(button.dataset.clearTarget);
});
["mediaHero", "mediaGallery", "mediaVideos", "mediaDocuments"].forEach((id) => {
  el(id).addEventListener("input", renderMediaPreview);
});

document.addEventListener("click", (event) => {
  const action = event.target.dataset.addTargetInline;
  if (action) addSelectedToTarget(action);
  const replace = event.target.dataset.replaceTargetInline;
  if (replace) replaceTextareaWithSelected(replace);
});

if (token) showDashboard(); else showLogin();
