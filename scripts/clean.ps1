<#
=============================================================================
OpsDesk cleanup (PowerShell).  Bash twin: clean.sh

  ./scripts/clean.ps1               Stop and remove OpsDesk containers/networks (dev, demo and CI projects)
  ./scripts/clean.ps1 -Volumes      ...and remove OpsDesk volumes (resets the development database)
  ./scripts/clean.ps1 -Artifacts    ...and delete generated test artifacts in ./artifacts
  ./scripts/clean.ps1 -All          All of the above

Only resources belonging to the opsdesk, opsdesk-demo and opsdesk-ci Compose projects are touched.
Images are kept so the next run is fast. Never runs `docker system prune`.
=============================================================================
#>
param(
    [switch]$Volumes,
    [switch]$Artifacts,
    [switch]$All
)

$ErrorActionPreference = 'Continue'
Set-Location (Split-Path -Parent $PSScriptRoot)

if ($All) { $Volumes = $true; $Artifacts = $true }

$downArgs = @('--profile', 'test', '--profile', 'report', 'down', '--remove-orphans')
if ($Volumes) { $downArgs += '--volumes' }

$fileSets = @(
    @('compose.yml'),
    @('compose.yml', 'compose.demo.yml'),
    @('compose.yml', 'compose.demo.yml', 'compose.ci.yml')
)
$failed = $false
foreach ($files in $fileSets) {
    $compose = @('compose')
    foreach ($f in $files) { $compose += @('-f', $f) }
    Write-Host "[..] docker $($compose -join ' ') $($downArgs -join ' ')"
    & docker @compose @downArgs
    if ($LASTEXITCODE -ne 0) { $failed = $true }
}
if ($failed) { Write-Host '[FAIL] Some Compose projects could not be removed (see output above).'; exit 1 }

Write-Host '[OK] OpsDesk containers and networks removed'
if ($Volumes) { Write-Host '[OK] OpsDesk volumes removed' }

if ($Artifacts) {
    Get-ChildItem -Path 'artifacts' -Force | Where-Object { $_.Name -ne '.gitkeep' } | Remove-Item -Recurse -Force
    Write-Host '[OK] ./artifacts cleared'
}
else {
    Write-Host '[..] Artifacts kept in ./artifacts (use -Artifacts to delete them)'
}
