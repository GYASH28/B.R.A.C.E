# Check Voicebox Status (Windows)
Write-Host "`n  Checking Voicebox..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:17493/profiles" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  ✅ Voicebox is running (HTTP $($response.StatusCode))" -ForegroundColor Green
    $profiles = $response.Content | ConvertFrom-Json
    if ($profiles.Count -gt 0) {
        Write-Host "  📋 $($profiles.Count) voice profile(s) available:`n" -ForegroundColor White
        foreach ($p in $profiles[0..9]) {
            $name = if ($p.name) { $p.name } else { $p.id }
            Write-Host "     • $name" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "  ❌ Voicebox is not running." -ForegroundColor Red
    Write-Host "     Download from https://voicebox.sh" -ForegroundColor Yellow
}
Write-Host ""
