#!/usr/bin/env bash
# Vercel build command (vercel.json). Production builds apply pending Prisma
# migrations before building, as the Netlify production context did; preview
# builds never touch the schema, because previews share the production
# database. Same pattern as SWapp's scripts/vercel-build.sh.
set -euo pipefail

if [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "Applying database migrations (VERCEL_ENV=production)"
  npx prisma migrate deploy
else
  echo "Skipping database migrations (VERCEL_ENV=${VERCEL_ENV:-unset})"
fi

npm run build
