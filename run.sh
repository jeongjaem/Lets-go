#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -d node_modules || ! -d frontend/node_modules || ! -d backend/node_modules ]]; then
  echo "Dependencies are not installed yet."
  echo
  echo "Run:"
  echo "  npm install"
  echo
  echo "Then start the apps in two terminals:"
  echo "  npm run dev:backend"
  echo "  npm run dev:frontend"
  exit 1
fi

cleanup() {
  if [[ -n "${backend_pid:-}" ]]; then
    kill "${backend_pid}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

npm run dev:backend &
backend_pid=$!

npm run dev:frontend
