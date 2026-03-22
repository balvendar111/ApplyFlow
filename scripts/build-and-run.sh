#!/bin/bash
# Build frontend + run backend (production mode)
set -e
cd "$(dirname "$0")/.."

echo "Building frontend..."
cd frontend && npm run build && cd ..

echo "Starting backend with frontend..."
export SERVE_FRONTEND=true
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000
