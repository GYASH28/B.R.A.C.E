# Start Voicebox (Windows)
Write-Host "`n  B.R.A.C.E — Voicebox Launcher`n" -ForegroundColor Cyan
try {
    Invoke-WebRequest -Uri "http://127.0.0.1:17493/profiles" -TimeoutSec 3 -ErrorAction Stop | Out-Null
    Write-Host "  ✅ Voicebox is already running.`n" -ForegroundColor Green
    exit 0
} catch {}

$searchPaths = @(
    "$env:LOCALAPPDATA\Voicebox\Voicebox.exe",
    "$env:PROGRAMFILES\Voicebox\Voicebox.exe",
    "$env:USERPROFILE\AppData\Local\Programs\voicebox\Voicebox.exe"
)
foreach ($p in $searchPaths) {
    if (Test-Path $p) {
        Write-Host "  Found: $p" -ForegroundColor Green
        Write-Host "  Launching Voicebox...`n" -ForegroundColor Yellow
        Start-Process $p
        Start-Sleep 5
        try {
            Invoke-WebRequest -Uri "http://127.0.0.1:17493/profiles" -TimeoutSec 3 -ErrorAction Stop | Out-Null
            Write-Host "  ✅ Voicebox started.`n" -ForegroundColor Green
        } catch {
            Write-Host "  ⏳ Voicebox starting (loading models)...`n" -ForegroundColor Yellow
        }
        exit 0
    }
}
Write-Host "  ❌ Voicebox not found. Download from https://voicebox.sh`n" -ForegroundColor Red
