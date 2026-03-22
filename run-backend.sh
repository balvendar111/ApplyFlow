#!/bin/bash
# Run backend directly (bypasses Cursor's base path)
cd "$(dirname "$0")/backend"
uvicorn app.main:app --reload --port 8000 --host 127.0.0.1
