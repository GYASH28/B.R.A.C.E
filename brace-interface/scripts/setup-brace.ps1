# B.R.A.C.E Master Setup Script (Windows)
# Run from: brace-interface/

Write-Host "`n  B.R.A.C.E Setup" -ForegroundColor Cyan
Write-Host "  ===============`n" -ForegroundColor Cyan

# Check dependencies
$deps = @(
    @{ Name="Node.js"; Cmd="node"; Args="--version" },
    @{ Name="npm"; Cmd="npm"; Args="--version" },
    @{ Name="Python"; Cmd="python"; Args="--version" },
    @{ Name="Git"; Cmd="git"; Args="--version" }
)

foreach ($dep in $deps) {
    try {
        $ver = & $dep.Cmd $dep.Args 2>$null
        Write-Host "  ✅ $($dep.Name): $ver" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ $($dep.Name): NOT FOUND" -ForegroundColor Red
    }
}

# Install GitNexus
Write-Host "`n  Installing GitNexus..." -ForegroundColor Yellow
npm install -g gitnexus 2>$null
if ($LASTEXITCODE -eq 0) { Write-Host "  ✅ GitNexus installed" -ForegroundColor Green }
else { Write-Host "  ⚠️  GitNexus install had warnings (may still work via npx)" -ForegroundColor Yellow }

# Run GitNexus analysis
Write-Host "`n  Running GitNexus analysis..." -ForegroundColor Yellow
$env:GITNEXUS_SKIP_OPTIONAL_GRAMMARS = "1"
npx gitnexus analyze 2>$null
if ($LASTEXITCODE -eq 0) { Write-Host "  ✅ GitNexus analysis complete" -ForegroundColor Green }
else { Write-Host "  ⚠️  GitNexus analysis had issues" -ForegroundColor Yellow }

# Create .env if missing
$envPath = Join-Path $PSScriptRoot "..\.env"
$examplePath = Join-Path $PSScriptRoot "..\.env.example"
if (-not (Test-Path $envPath) -and (Test-Path $examplePath)) {
    Copy-Item $examplePath $envPath
    Write-Host "`n  📋 Created .env from .env.example" -ForegroundColor Green
}

# npm install
Write-Host "`n  Running npm install..." -ForegroundColor Yellow
npm install 2>$null
Write-Host "  ✅ Dependencies installed" -ForegroundColor Green

# Check Voicebox
Write-Host "`n  Checking Voicebox..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:17493/profiles" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "  ✅ Voicebox is running" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Voicebox is not running. Download from https://voicebox.sh" -ForegroundColor Yellow
}

Write-Host "`n  Setup complete! Run 'npm run brace:dev' to start.`n" -ForegroundColor Cyan
