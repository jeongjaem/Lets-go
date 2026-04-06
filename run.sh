#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")"

port="${1:-8080}"

echo "Serving /workspaces/Lets-go on port ${port}"
echo "Open:"
echo "  http://localhost:${port}"
echo
echo "If you are using Codespaces, open the 'Ports' tab and click the forwarded URL for port ${port}."
echo "Press Ctrl+C to stop the server."
echo

exec python3 -m http.server "${port}" --bind 0.0.0.0
