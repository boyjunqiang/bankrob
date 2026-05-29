#!/bin/bash
cd "$(dirname "$0")"
lsof -ti:3000 | xargs kill -9 2>/dev/null
npm run dev
