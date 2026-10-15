<#
Start the FastAPI server using the project's virtual environment.
Usage:
  .\start-server.ps1
This script prefers the local `.venv` interpreter if present.
#>
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvPython = Join-Path $scriptDir ".venv\Scripts\python.exe"
$hostName = $env:HOST
$port = $env:PORT

if ([string]::IsNullOrWhiteSpace($hostName)) {
    $hostName = "127.0.0.1"
}

if ([string]::IsNullOrWhiteSpace($port)) {
    $port = "8080"
}

function Start-DocsexprimeServer($pythonCommand) {
    Write-Output "Starting Docsexprime AI..."
    Write-Output "Open http://127.0.0.1:$port in your browser."
    Write-Output "Keep this PowerShell window open while using localhost."
    & $pythonCommand -m uvicorn server:app --host $hostName --port $port
}

if (Test-Path $venvPython) {
    & $venvPython --version *> $null
    if ($LASTEXITCODE -eq 0) {
        Write-Output "Using venv python: $venvPython"
        Start-DocsexprimeServer $venvPython
    } else {
        Write-Warning "Local venv is not usable. Run .\install.ps1 to rebuild it. Falling back to system python."
        Start-DocsexprimeServer "python"
    }
} else {
    Write-Output "Local venv not found. Falling back to system python."
    Start-DocsexprimeServer "python"
}
