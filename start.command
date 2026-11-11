#!/bin/zsh
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Chưa tìm thấy Node.js. Cài Node.js LTS tại https://nodejs.org/en/download rồi mở lại Terminal."
  read "?Nhấn Enter để đóng..."
  exit 1
fi
if [ -f .env ]; then
  set -a
  source ./.env
  set +a
fi
(sleep 2; open "http://localhost:${PORT:-3000}") &
node server.mjs
read "?Nhấn Enter để đóng..."
