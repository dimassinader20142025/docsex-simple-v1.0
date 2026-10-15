$ErrorActionPreference = "Stop"

Write-Host "Starting Cloudflare quick tunnel for http://127.0.0.1:8787 ..."
Write-Host "Keep this window open while testing from another device."
Write-Host ""

cloudflared tunnel --url http://127.0.0.1:8787
