FROM mirror.gcr.io/library/node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY node_modules ./node_modules/
COPY prisma ./prisma/
COPY tsconfig.json ./
COPY src ./src/

RUN npm run build

FROM mirror.gcr.io/library/node:20-slim AS runner

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/app.js"]
