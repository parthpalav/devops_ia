#!/usr/bin/env bash
# =============================================================================
# OpsDesk cleanup (Bash).  PowerShell twin: clean.ps1
#
#   ./scripts/clean.sh               Stop and remove OpsDesk containers/networks (dev, demo and CI projects)
#   ./scripts/clean.sh --volumes     ...and remove OpsDesk volumes (resets the development database)
#   ./scripts/clean.sh --artifacts   ...and delete generated test artifacts in ./artifacts
#   ./scripts/clean.sh --all         All of the above
#
# Only resources belonging to the opsdesk, opsdesk-demo and opsdesk-ci Compose projects are touched.
# Images are kept so the next run is fast. Never runs `docker system prune`.
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

remove_volumes=false
remove_artifacts=false
for arg in "$@"; do
  case "$arg" in
    --volumes) remove_volumes=true ;;
    --artifacts) remove_artifacts=true ;;
    --all) remove_volumes=true; remove_artifacts=true ;;
    -h|--help) sed -n '3,11p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

down_args=(--profile test --profile report down --remove-orphans)
$remove_volumes && down_args+=(--volumes)

for files in "compose.yml" "compose.yml compose.demo.yml" "compose.yml compose.demo.yml compose.ci.yml"; do
  compose=(docker compose)
  for f in $files; do compose+=(-f "$f"); done
  echo "[..] ${compose[*]} ${down_args[*]}"
  "${compose[@]}" "${down_args[@]}"
done
echo "[OK] OpsDesk containers and networks removed"
$remove_volumes && echo "[OK] OpsDesk volumes removed"

if $remove_artifacts; then
  find artifacts -mindepth 1 -maxdepth 1 ! -name '.gitkeep' -exec rm -rf {} +
  echo "[OK] ./artifacts cleared"
else
  echo "[..] Artifacts kept in ./artifacts (use --artifacts to delete them)"
fi
