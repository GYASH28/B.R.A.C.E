# Index B.R.A.C.E with GitNexus (Windows)
Write-Host "`n  B.R.A.C.E — GitNexus Indexer`n" -ForegroundColor Cyan
$env:GITNEXUS_SKIP_OPTIONAL_GRAMMARS = "1"
Set-Location (Join-Path $PSScriptRoot "..")
Write-Host "  Running: npx gitnexus analyze`n" -ForegroundColor Yellow
npx gitnexus analyze
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n  ✅ Codebase indexed successfully.`n" -ForegroundColor Green
} else {
    Write-Host "`n  ⚠️  Indexing completed with warnings.`n" -ForegroundColor Yellow
}
