#!/bin/bash
# Production start for Linux / macOS / Render / Railway
set -e
cd "$(dirname "$0")/server"
if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
  echo "Edit .env before production!"
fi
if [ ! -d node_modules ]; then
  npm install --production
fi
echo "Starting Global Media on http://localhost:${PORT:-3000}"
NODE_ENV=production node server.js
