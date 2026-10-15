<#
Start Docsexprime AI on localhost:8080 in the background.
Logs are written to uvicorn.out.log and uvicorn.err.log.
#>
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonExe = Join-Path $scriptDir ".venv\Scripts\python.exe"
$outLog = Join-Path $scriptDir "uvicorn.out.log"
$errLog = Join-Path $scriptDir "uvicorn.err.log"
$port = "8080"

if (-Not (Test-Path $pythonExe)) {
    throw "Python virtual environment not found. Run .\install.ps1 first."
}

& $pythonExe --version *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Python virtual environment is not usable. Run .\install.ps1 to rebuild it."
}

$existing = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    Where-Object { $_.State -eq "Listen" } |
    Select-Object -First 1

if ($existing) {
    Write-Output "A server is already listening on port $port, process id $($existing.OwningProcess)."
    Write-Output "Open http://127.0.0.1:$port"
    exit 0
}

$argsList = @("-m", "uvicorn", "server:app", "--host", "127.0.0.1", "--port", $port)
$process = Start-Process `
    -PassThru `
    -WindowStyle Hidden `
    -FilePath $pythonExe `
    -ArgumentList $argsList `
    -WorkingDirectory $scriptDir `
    -RedirectStandardOutput $outLog `
    -RedirectStandardError $errLog

for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep -Milliseconds 700
    try {
        $response = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$port/api/health" -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            Write-Output "Docsexprime AI is running. Process id: $($process.Id)"
            Write-Output "Open http://127.0.0.1:$port"
            exit 0
        }
    } catch {
        if ($process.HasExited) {
            break
        }
    }
}

Write-Error "Server did not start. Last error log lines:"
Get-Content $errLog -Tail 40 -ErrorAction SilentlyContinue
exit 1
