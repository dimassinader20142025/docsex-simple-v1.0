<#
Create or refresh the local Python virtual environment and install dependencies.
Usage:
  .\install.ps1

This script creates `.venv`, upgrades pip, and installs requirements from `requirements.txt`.
#>
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvPath = Join-Path $scriptDir ".venv"
$pythonExe = Join-Path $venvPath "Scripts\python.exe"

if (Test-Path $pythonExe) {
    & $pythonExe --version *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Existing virtual environment is not usable. Recreating $venvPath..."
        Remove-Item -LiteralPath $venvPath -Recurse -Force
    }
}

if (-Not (Test-Path $pythonExe)) {
    Write-Output "Creating virtual environment in $venvPath..."
    python -m venv $venvPath
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create virtual environment."
    }
} else {
    Write-Output "Virtual environment already exists at $venvPath."
}

Write-Output "Installing dependencies from requirements.txt..."
& $pythonExe -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) {
    throw "Failed to upgrade pip."
}
& $pythonExe -m pip install -r (Join-Path $scriptDir "requirements.txt")
if ($LASTEXITCODE -ne 0) {
    throw "Failed to install dependencies."
}

Write-Output "Install complete. Run .\start-server.ps1 to start the backend."
