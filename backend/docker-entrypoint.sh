#!/bin/sh
set -e

echo "==> Starting PayMyBills backend..."
echo "==> Environment: ${NODE_ENV:-development}"
echo "==> Database URL set: $(if [ -n \"$DATABASE_URL\" ]; then echo 'yes'; else echo 'no'; fi)"

# Wait for PostgreSQL to accept connections
echo "==> Waiting for PostgreSQL to be ready..."
RETRIES=30
until node -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  p.\$connect().then(() => { p.\$disconnect(); process.exit(0); }).catch(() => { p.\$disconnect(); process.exit(1); });
" 2>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -le 0 ]; then
    echo "ERROR: PostgreSQL not ready after 30 attempts"
    exit 1
  fi
  echo "    Waiting for PostgreSQL... ($RETRIES attempts left)"
  sleep 2
done
echo "==> PostgreSQL is ready."

# List available migrations
echo "==> Available migrations:"
ls -1 /app/prisma/migrations/ | grep -v migration_lock.toml || echo "    (none)"

# Run all pending migrations in order
echo "==> Running Prisma migrations..."
npx prisma migrate deploy --schema=/app/prisma/schema.prisma
MIGRATE_EXIT=$?

if [ $MIGRATE_EXIT -ne 0 ]; then
  echo "ERROR: Prisma migrate deploy failed with exit code $MIGRATE_EXIT"
  echo "==> Attempting to diagnose..."
  npx prisma migrate status --schema=/app/prisma/schema.prisma || true
  exit 1
fi

echo "==> Migrations completed successfully."

# Verify migration status
echo "==> Final migration status:"
npx prisma migrate status --schema=/app/prisma/schema.prisma || true

# Generate Prisma Client (ensures it matches the schema)
echo "==> Generating Prisma Client..."
npx prisma generate --schema=/app/prisma/schema.prisma

# Start the application
echo "==> Starting application server..."
exec node dist/app.js
