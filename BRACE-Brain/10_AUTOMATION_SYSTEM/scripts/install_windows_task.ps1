$Vault = Resolve-Path "$PSScriptRoot\..\.."
$Script = Join-Path $Vault "10_AUTOMATION_SYSTEM\scripts\brace_updater.py"
$Python = Join-Path $Vault ".venv\Scripts\python.exe"
if (!(Test-Path $Python)) {
  $Python = "python"
}

$Action = New-ScheduledTaskAction -Execute $Python -Argument "`"$Script`" --once" -WorkingDirectory $Vault
$Trigger = New-ScheduledTaskTrigger -Daily -At 7:00AM
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "BRACE Daily Knowledge Update" -Action $Action -Trigger $Trigger -Settings $Settings -Description "Daily B.R.A.C.E Obsidian knowledge update" -Force
Write-Host "Installed scheduled task: BRACE Daily Knowledge Update"
