#!/usr/bin/env bash
# BrainHistory dev starter — macOS / Linux
#
# Symlinks .next cache outside iCloud Drive / OneDrive to avoid
# Turbopack SST write failures and memory-mapped file conflicts
# caused by cloud-sync processes locking files.
#
# Usage:
#   chmod +x dev-start.sh   (first time only)
#   ./dev-start.sh

set -euo pipefail

PROJ="$(cd "$(dirname "$0")" && pwd)"
CACHE="${TMPDIR:-/tmp}/BrainHistory-next"

echo "[1/4] Clearing previous cache..."
# Remove existing symlink or real directory
if [ -L "$PROJ/.next" ]; then
  rm "$PROJ/.next"
elif [ -d "$PROJ/.next" ]; then
  rm -rf "$PROJ/.next"
fi
rm -rf "$CACHE"
mkdir -p "$CACHE"

echo "[2/4] Symlinking node_modules into cache dir..."
ln -s "$PROJ/node_modules" "$CACHE/node_modules"

echo "[3/4] Symlinking .next -> cache dir..."
ln -s "$CACHE" "$PROJ/.next"

echo "[4/4] Starting dev server..."
cd "$PROJ"
npm run dev
