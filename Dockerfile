# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS builder
WORKDIR /app

COPY shared/ ./shared/
WORKDIR /app/shared
RUN npm ci \
  && npx tsc src/index.ts \
    --outDir dist \
    --module commonjs \
    --target ES2020 \
    --esModuleInterop \
    --declaration \
    --skipLibCheck \
    --resolveJsonModule \
  && node -e "const fs=require('fs');const p=require('./package.json');p.main='./dist/index.js';p.types='./dist/index.d.ts';fs.writeFileSync('package.json',JSON.stringify(p,null,2))"

COPY server/ /app/server/
WORKDIR /app/server
RUN npm ci && npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app/server
ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY --from=builder /app/shared /app/shared
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/package.json ./package.json
COPY --from=builder /app/server/prisma ./prisma

EXPOSE 3000
CMD ["npm", "start"]
