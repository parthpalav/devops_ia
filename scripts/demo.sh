#!/usr/bin/env bash
# =============================================================================
# OpsDesk - DevOps quality-gate demonstration (Bash).  PowerShell twin: demo.ps1
#
#   ./scripts/demo.sh pass     Healthy stack -> Playwright suite must PASS
#   ./scripts/demo.sh fail     Fault injected -> Playwright suite must FAIL on E2E-04 (expected)
#   ./scripts/demo.sh full     PASS -> controlled FAIL -> recovery PASS -> report viewer
#   ./scripts/demo.sh ci       Run the exact GitHub Actions quality-gate command locally
#   ./scripts/demo.sh report   (Re)start the HTML report viewer on http://localhost:9323
#
# Only Docker (with Compose v2) is required on the host.
# Optional environment: OPEN_REPORT=1 opens the report in a browser at the end of `full`.
# =============================================================================
set -uo pipefail # no `set -e`: Playwright exit codes are captured and inspected explicitly.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DEMO_COMPOSE=(docker compose -f compose.yml -f compose.demo.yml)
CI_COMPOSE=(docker compose -f compose.yml -f compose.demo.yml -f compose.ci.yml)
EXPECTED_FAILING_TEST="E2E-04"
FAULT_MODE="drop_ticket_write"
REPORT_URL="http://localhost:${REPORT_PORT:-9323}"

# Write artifacts as the current user so they can be inspected/deleted without sudo.
if command -v id >/dev/null 2>&1; then
  export HOST_UID="${HOST_UID:-$(id -u)}" HOST_GID="${HOST_GID:-$(id -g)}"
fi

# ---------- output helpers (text markers always present; colour is only a bonus) ----------
if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  C_GREEN=$'\033[32m' C_RED=$'\033[31m' C_YELLOW=$'\033[33m' C_BOLD=$'\033[1m' C_RESET=$'\033[0m'
else
  C_GREEN="" C_RED="" C_YELLOW="" C_BOLD="" C_RESET=""
fi
LINE="=================================================="
banner()   { printf '\n%s%s\n%s\n%s%s\n\n' "$C_BOLD" "$LINE" "$1" "$LINE" "$C_RESET"; }
ok()       { printf '%s[OK]%s %s\n' "$C_GREEN" "$C_RESET" "$*"; }
info()     { printf '[..] %s\n' "$*"; }
warn()     { printf '%s[WARN]%s %s\n' "$C_YELLOW" "$C_RESET" "$*"; }
fail_msg() { printf '%s[FAIL]%s %s\n' "$C_RED" "$C_RESET" "$*"; }
expected() { printf '%s[EXPECTED FAILURE]%s %s\n' "$C_YELLOW" "$C_RESET" "$*"; }

usage() {
  sed -n '3,12p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
}

# ---------- preflight ----------
preflight() {
  if ! command -v docker >/dev/null 2>&1; then
    fail_msg "Docker is not installed or not on PATH."; exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    fail_msg "Docker daemon is not reachable. Start Docker Desktop / the Docker service and retry."; exit 1
  fi
  if ! docker compose version >/dev/null 2>&1; then
    fail_msg "Docker Compose v2 ('docker compose') is required."; exit 1
  fi
  info "$(docker --version)"
  info "$(docker compose version)"
}

# ---------- stack lifecycle (all scoped to the opsdesk-demo Compose project) ----------
stack_down() {
  "${DEMO_COMPOSE[@]}" --profile test down --volumes --remove-orphans >/dev/null 2>&1 || true
}

build_images() {
  info "Building images (backend, frontend, Playwright tests)..."
  if ! "${DEMO_COMPOSE[@]}" --profile test build; then
    fail_msg "Image build failed."; exit 1
  fi
  ok "Images built"
}

on_interrupt() {
  echo
  warn "Interrupted - removing demo containers."
  stack_down
  exit 130
}
trap on_interrupt INT TERM

# Prints "[OK] <Service> healthy" for each application service, based on Docker's health status.
report_health() {
  local service label status
  for service in db backend frontend; do
    case "$service" in db) label="Database" ;; backend) label="Backend" ;; frontend) label="Frontend" ;; esac
    status="$(docker inspect --format '{{.State.Health.Status}}' "$("${DEMO_COMPOSE[@]}" ps -q "$service")" 2>/dev/null)"
    if [[ "$status" == "healthy" ]]; then ok "$label healthy"; else fail_msg "$label is '$status'"; fi
  done
}

# run_phase <artifact-dir> <fault-mode>
# Recreates a clean stack, waits for health checks, runs Playwright, preserves artifacts.
# Sets GATE_EXIT to the Playwright container's exit code (the quality-gate result).
GATE_EXIT=0
run_phase() {
  local phase="$1" fault="$2"
  export ARTIFACT_PHASE="$phase" FAULT_INJECTION_MODE="$fault"

  info "Removing any previous demo containers (fresh tmpfs database = deterministic seed data)"
  stack_down

  info "Starting db -> backend -> frontend and waiting for their health checks..."
  if ! "${DEMO_COMPOSE[@]}" up -d --build --wait db backend frontend; then
    fail_msg "Application stack did not become healthy."
    "${DEMO_COMPOSE[@]}" ps -a
    "${DEMO_COMPOSE[@]}" logs --no-color --tail 50 db backend frontend
    stack_down
    exit 1
  fi
  report_health

  if [[ "$fault" == "none" ]]; then
    "${DEMO_COMPOSE[@]}" logs --no-color backend | grep -q "fault injection mode: none" \
      && ok "Fault injection disabled (backend log: 'fault injection mode: none')"
  else
    if "${DEMO_COMPOSE[@]}" logs --no-color backend | grep -q "DEMO FAULT INJECTION ACTIVE"; then
      ok "Fault injection enabled: $fault (backend log: 'WARNING: DEMO FAULT INJECTION ACTIVE')"
    else
      fail_msg "Backend did not report the fault-injection warning."
    fi
  fi

  info "Running the Playwright quality gate (artifacts -> artifacts/$phase)"
  echo
  # The quality gate: Compose returns the exit code of the `tests` container.
  "${DEMO_COMPOSE[@]}" up --abort-on-container-exit --exit-code-from tests tests
  GATE_EXIT=$?
  echo
  info "Playwright container exit code: $GATE_EXIT"

  mkdir -p "artifacts/$phase"
  "${DEMO_COMPOSE[@]}" logs --no-color --no-log-prefix backend >"artifacts/$phase/backend.log" 2>&1 || true
  stack_down
  unset ARTIFACT_PHASE FAULT_INJECTION_MODE
}

# summarize <artifact-dir> [--expect-failure <test-id>]  (runs inside the Playwright image - no host Node.js)
summarize() {
  local phase="$1"; shift
  "${DEMO_COMPOSE[@]}" --progress quiet run --rm --no-deps --entrypoint node tests \
    scripts/summarize-results.mjs "/artifacts/$phase/results.json" "$@"
}

failure_artifacts_present() {
  local dir="artifacts/failure/test-results"
  [[ -n "$(find "$dir" -name 'trace.zip' 2>/dev/null | head -n 1)" ]] &&
    [[ -n "$(find "$dir" -name '*.png' 2>/dev/null | head -n 1)" ]] &&
    [[ -n "$(find "$dir" -name '*.webm' 2>/dev/null | head -n 1)" ]] &&
    [[ -f "artifacts/failure/playwright-report/index.html" ]]
}

# ---------- phases ----------
phase_pass() { # phase_pass <artifact-dir> <heading>
  banner "$2"
  run_phase "$1" none
  summarize "$1"
  local summary_exit=$?
  if [[ $GATE_EXIT -eq 0 && $summary_exit -eq 0 ]]; then
    ok "Playwright suite passed - quality gate is GREEN"
    return 0
  fi
  fail_msg "Playwright suite failed - quality gate is RED (exit code $GATE_EXIT)"
  return 1
}

FAILURE_ARTIFACTS="MISSING"
phase_fail() { # phase_fail <heading>
  banner "$1"
  run_phase failure "$FAULT_MODE"
  summarize failure --expect-failure "$EXPECTED_FAILING_TEST"
  local summary_exit=$?
  if [[ $GATE_EXIT -eq 0 ]]; then
    fail_msg "Playwright reported ALL tests passing - the injected regression was NOT detected."
    return 1
  fi
  expected "$EXPECTED_FAILING_TEST Create Ticket (Playwright exit code $GATE_EXIT)"
  if [[ $summary_exit -ne 0 ]]; then
    fail_msg "The suite failed, but not exactly as expected (see summary above)."
    return 1
  fi
  ok "Regression detected by quality gate"
  if failure_artifacts_present; then
    FAILURE_ARTIFACTS="GENERATED"
    ok "Failure trace, screenshot, video and HTML report preserved in artifacts/failure/"
  else
    fail_msg "Expected failure artifacts (trace/screenshot/video/report) are missing."
    return 1
  fi
  return 0
}

start_report_viewer() {
  info "Starting the report viewer..."
  if "${DEMO_COMPOSE[@]}" --profile report up -d --build --wait report-viewer >/dev/null 2>&1; then
    ok "Report viewer running"
    echo "Playwright report: $REPORT_URL"
    if [[ "${OPEN_REPORT:-0}" == "1" ]]; then
      if command -v open >/dev/null 2>&1; then open "$REPORT_URL"
      elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$REPORT_URL" >/dev/null 2>&1 &
      fi
    fi
  else
    warn "Could not start the report viewer (is port ${REPORT_PORT:-9323} in use?). Reports are still in ./artifacts/."
  fi
}

# ---------- modes ----------
mode_pass() {
  preflight; build_images
  if phase_pass pass "BASELINE QUALITY GATE"; then
    echo; echo "Reports: artifacts/pass/   (view: ./scripts/demo.sh report)"
    exit 0
  fi
  exit 1
}

mode_fail() {
  preflight; build_images
  if phase_fail "CONTROLLED REGRESSION (EXPECTED FAILURE)"; then
    echo; ok "Demonstration outcome: regression detected as expected"
    echo "Reports: artifacts/failure/   (view: ./scripts/demo.sh report)"
    exit 0
  fi
  exit 1
}

mode_full() {
  local started=$SECONDS baseline="FAIL" regression="NOT DETECTED" recovery="FAIL"
  preflight
  "${DEMO_COMPOSE[@]}" --profile test --profile report down --volumes --remove-orphans >/dev/null 2>&1 || true
  build_images

  phase_pass pass "PHASE 1/3 - BASELINE QUALITY GATE" && baseline="PASS"
  phase_fail "PHASE 2/3 - CONTROLLED REGRESSION" && regression="DETECTED"
  phase_pass recovery "PHASE 3/3 - RECOVERY" && recovery="PASS"

  banner "PHASE 4 - REPORT"
  start_report_viewer

  local result="DEMONSTRATION FAILED" code=1
  if [[ $baseline == "PASS" && $regression == "DETECTED" && $recovery == "PASS" ]]; then
    result="DEMONSTRATION SUCCESSFUL"; code=0
  fi

  banner "DEVOPS QUALITY GATE DEMONSTRATION SUMMARY"
  printf '%-29s%s\n' "Baseline validation:" "$baseline"
  printf '%-29s%s\n' "Controlled regression:" "$regression"
  printf '%-29s%s\n' "Failure artifacts:" "$FAILURE_ARTIFACTS"
  printf '%-29s%s\n' "Recovery validation:" "$recovery"
  echo
  printf '%-29s%s\n' "Dockerized environment:" "YES"
  printf '%-29s%s\n' "Health-aware orchestration:" "YES"
  printf '%-29s%s\n' "Playwright quality gate:" "YES"
  printf '%-29s%s\n' "Automated recovery demo:" "YES"
  echo
  echo "FINAL RESULT: $result"
  echo
  echo "Report:"
  echo "$REPORT_URL"
  echo "Artifacts: artifacts/pass  artifacts/failure  artifacts/recovery"
  echo "Duration: $((SECONDS - started))s"
  echo "$LINE"
  exit $code
}

mode_ci() {
  preflight
  banner "CI QUALITY GATE (same command as .github/workflows/e2e-quality-gate.yml)"
  "${CI_COMPOSE[@]}" --profile test down --volumes --remove-orphans >/dev/null 2>&1 || true
  "${CI_COMPOSE[@]}" up --build --abort-on-container-exit --exit-code-from tests tests
  local code=$?
  "${CI_COMPOSE[@]}" --profile test down --volumes --remove-orphans >/dev/null 2>&1 || true
  if [[ $code -eq 0 ]]; then ok "Quality gate PASSED (exit code 0)"; else fail_msg "Quality gate FAILED (exit code $code)"; fi
  echo "Reports: artifacts/latest/"
  exit $code
}

mode_report() {
  preflight
  start_report_viewer
}

case "${1:-}" in
  pass) mode_pass ;;
  fail) mode_fail ;;
  full) mode_full ;;
  ci) mode_ci ;;
  report) mode_report ;;
  *) usage ;;
esac
