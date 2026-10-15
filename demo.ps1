# Shortcut for ./scripts/demo.ps1  (e.g. ./demo.ps1 full)
& (Join-Path $PSScriptRoot 'scripts/demo.ps1') @args
exit $LASTEXITCODE
