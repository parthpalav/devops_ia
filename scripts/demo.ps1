<#
=============================================================================
OpsDesk - DevOps quality-gate demonstration (PowerShell).  Bash twin: demo.sh

  ./scripts/demo.ps1 pass     Healthy stack -> Playwright suite must PASS
  ./scripts/demo.ps1 fail     Fault injected -> Playwright suite must FAIL on E2E-04 (expected)
  ./scripts/demo.ps1 full     PASS -> controlled FAIL -> recovery PASS -> report viewer
  ./scripts/demo.ps1 ci       Run the exact GitHub Actions quality-gate command locally
  ./scripts/demo.ps1 report   (Re)start the HTML report viewer on http://localhost:9323

Only Docker (with Compose v2) is required on the host.
Works with Windows PowerShell 5.1 and PowerShell 7+ (Windows, macOS, Linux).
Optional environment: OPEN_REPORT=1 opens the report in a browser at the end of `full`.
=============================================================================
#>
param(
    [Parameter(Position = 0)]
    [ValidateSet('pass', 'fail', 'full', 'ci', 'report')]
    [string]$Mode
)

# Native command failures are inspected through $LASTEXITCODE, never hidden.
$ErrorActionPreference = 'Continue'
Set-Location (Split-Path -Parent $PSScriptRoot)

$DemoCompose = @('compose', '-f', 'compose.yml', '-f', 'compose.demo.yml')
$CiCompose = @('compose', '-f', 'compose.yml', '-f', 'compose.demo.yml', '-f', 'compose.ci.yml')
$ExpectedFailingTest = 'E2E-04'
$FaultMode = 'drop_ticket_write'
$ReportPort = if ($env:REPORT_PORT) { $env:REPORT_PORT } else { '9323' }
$ReportUrl = "http://localhost:$ReportPort"
$Line = '=================================================='

# On Linux/macOS write artifacts as the current user (Docker Desktop on Windows handles ownership itself).
if ((Get-Variable IsWindows -ErrorAction SilentlyContinue) -and -not $IsWindows -and (Get-Command id -ErrorAction SilentlyContinue)) {
    if (-not $env:HOST_UID) { $env:HOST_UID = (& id -u) }
    if (-not $env:HOST_GID) { $env:HOST_GID = (& id -g) }
}

# Every intentional exit goes through here, so the finally block below can tell it apart from Ctrl+C.
$script:Done = $false
function Exit-Demo([int]$Code) { $script:Done = $true; exit $Code }

# ---------- output helpers (text markers always present; colour is only a bonus) ----------
function Write-Banner([string]$Text) { Write-Host ''; Write-Host $Line; Write-Host $Text; Write-Host $Line; Write-Host '' }
function Write-Ok([string]$Text) { Write-Host '[OK] ' -ForegroundColor Green -NoNewline; Write-Host $Text }
function Write-Info([string]$Text) { Write-Host "[..] $Text" }
function Write-Warn([string]$Text) { Write-Host '[WARN] ' -ForegroundColor Yellow -NoNewline; Write-Host $Text }
function Write-Fail([string]$Text) { Write-Host '[FAIL] ' -ForegroundColor Red -NoNewline; Write-Host $Text }
function Write-Expected([string]$Text) { Write-Host '[EXPECTED FAILURE] ' -ForegroundColor Yellow -NoNewline; Write-Host $Text }

function Show-Usage {
    $lines = Get-Content -Path $PSCommandPath
    $lines[2..12] | ForEach-Object { Write-Host $_ }
    Exit-Demo 2
}

# ---------- preflight ----------
function Test-Preflight {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Write-Fail 'Docker is not installed or not on PATH.'; Exit-Demo 1 }
    & docker info *> $null
    if ($LASTEXITCODE -ne 0) { Write-Fail 'Docker daemon is not reachable. Start Docker Desktop / the Docker service and retry.'; Exit-Demo 1 }
    & docker compose version *> $null
    if ($LASTEXITCODE -ne 0) { Write-Fail "Docker Compose v2 ('docker compose') is required."; Exit-Demo 1 }
    Write-Info (& docker --version)
    Write-Info (& docker compose version)
}

# ---------- stack lifecycle (all scoped to the opsdesk-demo Compose project) ----------
function Stop-Stack {
    & docker @DemoCompose --profile test down --volumes --remove-orphans *> $null
}

function Build-Images {
    Write-Info 'Building images (backend, frontend, Playwright tests)...'
    & docker @DemoCompose --profile test build | Out-Host
    if ($LASTEXITCODE -ne 0) { Write-Fail 'Image build failed.'; Exit-Demo 1 }
    Write-Ok 'Images built'
}

function Show-Health {
    $labels = [ordered]@{ db = 'Database'; backend = 'Backend'; frontend = 'Frontend' }
    foreach ($service in $labels.Keys) {
        $id = (& docker @DemoCompose ps -q $service | Select-Object -First 1)
        $status = if ($id) { (& docker inspect --format '{{.State.Health.Status}}' $id) } else { 'missing' }
        if ($status -eq 'healthy') { Write-Ok "$($labels[$service]) healthy" } else { Write-Fail "$($labels[$service]) is '$status'" }
    }
}

function Get-BackendLog {
    return ((& docker @DemoCompose logs --no-color backend 2>$null) -join "`n")
}

# Recreates a clean stack, waits for health checks, runs Playwright, preserves artifacts.
# Returns the Playwright container's exit code (the quality-gate result).
function Invoke-Phase([string]$Phase, [string]$Fault) {
    $env:ARTIFACT_PHASE = $Phase
    $env:FAULT_INJECTION_MODE = $Fault
    try {
        Write-Info 'Removing any previous demo containers (fresh tmpfs database = deterministic seed data)'
        Stop-Stack

        Write-Info 'Starting db -> backend -> frontend and waiting for their health checks...'
        & docker @DemoCompose up -d --build --wait db backend frontend | Out-Host
        if ($LASTEXITCODE -ne 0) {
            Write-Fail 'Application stack did not become healthy.'
            & docker @DemoCompose ps -a | Out-Host
            & docker @DemoCompose logs --no-color --tail 50 db backend frontend | Out-Host
            Stop-Stack
            Exit-Demo 1
        }
        Show-Health

        $backendLog = Get-BackendLog
        if ($Fault -eq 'none') {
            if ($backendLog -match 'fault injection mode: none') { Write-Ok "Fault injection disabled (backend log: 'fault injection mode: none')" }
        }
        elseif ($backendLog -match 'DEMO FAULT INJECTION ACTIVE') {
            Write-Ok "Fault injection enabled: $Fault (backend log: 'WARNING: DEMO FAULT INJECTION ACTIVE')"
        }
        else {
            Write-Fail 'Backend did not report the fault-injection warning.'
        }

        Write-Info "Running the Playwright quality gate (artifacts -> artifacts/$Phase)"
        Write-Host ''
        # The quality gate: Compose returns the exit code of the `tests` container.
        & docker @DemoCompose up --abort-on-container-exit --exit-code-from tests tests | Out-Host
        $gateExit = $LASTEXITCODE
        Write-Host ''
        Write-Info "Playwright container exit code: $gateExit"

        New-Item -ItemType Directory -Force -Path "artifacts/$Phase" | Out-Null
        (& docker @DemoCompose logs --no-color --no-log-prefix backend 2>$null) | Set-Content -Path "artifacts/$Phase/backend.log"
        Stop-Stack
        return $gateExit
    }
    finally {
        Remove-Item Env:ARTIFACT_PHASE, Env:FAULT_INJECTION_MODE -ErrorAction SilentlyContinue
    }
}

# Runs the results summary inside the Playwright image (no host Node.js needed). Returns its exit code.
function Invoke-Summary([string]$Phase, [string[]]$Extra = @()) {
    & docker @DemoCompose --progress quiet run --rm --no-deps --entrypoint node tests `
        scripts/summarize-results.mjs "/artifacts/$Phase/results.json" @Extra | ForEach-Object { Write-Host $_ }
    return $LASTEXITCODE
}

function Test-FailureArtifacts {
    $dir = 'artifacts/failure/test-results'
    if (-not (Test-Path $dir)) { return $false }
    $trace = Get-ChildItem -Path $dir -Recurse -Filter 'trace.zip' -ErrorAction SilentlyContinue | Select-Object -First 1
    $shot = Get-ChildItem -Path $dir -Recurse -Filter '*.png' -ErrorAction SilentlyContinue | Select-Object -First 1
    $video = Get-ChildItem -Path $dir -Recurse -Filter '*.webm' -ErrorAction SilentlyContinue | Select-Object -First 1
    return [bool]($trace -and $shot -and $video -and (Test-Path 'artifacts/failure/playwright-report/index.html'))
}

# ---------- phases ----------
function Invoke-PassPhase([string]$Phase, [string]$Heading) {
    Write-Banner $Heading
    $gateExit = Invoke-Phase $Phase 'none'
    $summaryExit = Invoke-Summary $Phase
    if ($gateExit -eq 0 -and $summaryExit -eq 0) {
        Write-Ok 'Playwright suite passed - quality gate is GREEN'
        return $true
    }
    Write-Fail "Playwright suite failed - quality gate is RED (exit code $gateExit)"
    return $false
}

$script:FailureArtifacts = 'MISSING'
function Invoke-FailPhase([string]$Heading) {
    Write-Banner $Heading
    $gateExit = Invoke-Phase 'failure' $FaultMode
    $summaryExit = Invoke-Summary 'failure' @('--expect-failure', $ExpectedFailingTest)
    if ($gateExit -eq 0) {
        Write-Fail 'Playwright reported ALL tests passing - the injected regression was NOT detected.'
        return $false
    }
    Write-Expected "$ExpectedFailingTest Create Ticket (Playwright exit code $gateExit)"
    if ($summaryExit -ne 0) {
        Write-Fail 'The suite failed, but not exactly as expected (see summary above).'
        return $false
    }
    Write-Ok 'Regression detected by quality gate'
    if (Test-FailureArtifacts) {
        $script:FailureArtifacts = 'GENERATED'
        Write-Ok 'Failure trace, screenshot, video and HTML report preserved in artifacts/failure/'
        return $true
    }
    Write-Fail 'Expected failure artifacts (trace/screenshot/video/report) are missing.'
    return $false
}

function Start-ReportViewer {
    Write-Info 'Starting the report viewer...'
    & docker @DemoCompose --profile report up -d --build --wait report-viewer *> $null
    if ($LASTEXITCODE -eq 0) {
        Write-Ok 'Report viewer running'
        Write-Host "Playwright report: $ReportUrl"
        if ($env:OPEN_REPORT -eq '1') { Start-Process $ReportUrl }
    }
    else {
        Write-Warn "Could not start the report viewer (is port $ReportPort in use?). Reports are still in ./artifacts/."
    }
}

# ---------- modes ----------
function Invoke-PassMode {
    Test-Preflight; Build-Images
    if (Invoke-PassPhase 'pass' 'BASELINE QUALITY GATE') {
        Write-Host ''; Write-Host 'Reports: artifacts/pass/   (view: ./scripts/demo.ps1 report)'
        Exit-Demo 0
    }
    Exit-Demo 1
}

function Invoke-FailMode {
    Test-Preflight; Build-Images
    if (Invoke-FailPhase 'CONTROLLED REGRESSION (EXPECTED FAILURE)') {
        Write-Host ''; Write-Ok 'Demonstration outcome: regression detected as expected'
        Write-Host 'Reports: artifacts/failure/   (view: ./scripts/demo.ps1 report)'
        Exit-Demo 0
    }
    Exit-Demo 1
}

function Invoke-FullMode {
    $started = Get-Date
    Test-Preflight
    & docker @DemoCompose --profile test --profile report down --volumes --remove-orphans *> $null
    Build-Images

    $baseline = if (Invoke-PassPhase 'pass' 'PHASE 1/3 - BASELINE QUALITY GATE') { 'PASS' } else { 'FAIL' }
    $regression = if (Invoke-FailPhase 'PHASE 2/3 - CONTROLLED REGRESSION') { 'DETECTED' } else { 'NOT DETECTED' }
    $recovery = if (Invoke-PassPhase 'recovery' 'PHASE 3/3 - RECOVERY') { 'PASS' } else { 'FAIL' }

    Write-Banner 'PHASE 4 - REPORT'
    Start-ReportViewer

    $success = ($baseline -eq 'PASS') -and ($regression -eq 'DETECTED') -and ($recovery -eq 'PASS')
    $result = if ($success) { 'DEMONSTRATION SUCCESSFUL' } else { 'DEMONSTRATION FAILED' }

    Write-Banner 'DEVOPS QUALITY GATE DEMONSTRATION SUMMARY'
    $rows = [ordered]@{
        'Baseline validation:'  = $baseline
        'Controlled regression:' = $regression
        'Failure artifacts:'    = $script:FailureArtifacts
        'Recovery validation:'  = $recovery
    }
    foreach ($key in $rows.Keys) { Write-Host ('{0,-29}{1}' -f $key, $rows[$key]) }
    Write-Host ''
    foreach ($key in @('Dockerized environment:', 'Health-aware orchestration:', 'Playwright quality gate:', 'Automated recovery demo:')) {
        Write-Host ('{0,-29}{1}' -f $key, 'YES')
    }
    Write-Host ''
    Write-Host "FINAL RESULT: $result"
    Write-Host ''
    Write-Host 'Report:'
    Write-Host $ReportUrl
    Write-Host 'Artifacts: artifacts/pass  artifacts/failure  artifacts/recovery'
    Write-Host ("Duration: {0}s" -f [int]((Get-Date) - $started).TotalSeconds)
    Write-Host $Line
    if ($success) { Exit-Demo 0 } else { Exit-Demo 1 }
}

function Invoke-CiMode {
    Test-Preflight
    Write-Banner 'CI QUALITY GATE (same command as .github/workflows/e2e-quality-gate.yml)'
    & docker @CiCompose --profile test down --volumes --remove-orphans *> $null
    & docker @CiCompose up --build --abort-on-container-exit --exit-code-from tests tests | Out-Host
    $code = $LASTEXITCODE
    & docker @CiCompose --profile test down --volumes --remove-orphans *> $null
    if ($code -eq 0) { Write-Ok 'Quality gate PASSED (exit code 0)' } else { Write-Fail "Quality gate FAILED (exit code $code)" }
    Write-Host 'Reports: artifacts/latest/'
    Exit-Demo $code
}

# Ctrl+C: the finally block removes the demo containers so nothing is left half-running.
try {
    switch ($Mode) {
        'pass' { Invoke-PassMode }
        'fail' { Invoke-FailMode }
        'full' { Invoke-FullMode }
        'ci' { Invoke-CiMode }
        'report' { Test-Preflight; Start-ReportViewer; Exit-Demo 0 }
        default { Show-Usage }
    }
}
finally {
    if (-not $script:Done) {
        Write-Warn 'Interrupted - removing demo containers.'
        Stop-Stack
    }
}
