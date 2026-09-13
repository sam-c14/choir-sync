# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@11

# Copy workspace/lockfiles first for layer caching, then source
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json ./
COPY choir-api ./choir-api
COPY libs ./libs

RUN pnpm install --frozen-lockfile

RUN pnpm exec prisma generate --schema=choir-api/src/prisma/schema.prisma
RUN pnpm exec nx build choir-api --configuration=production

# Production stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3333

RUN npm install -g pnpm@11
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy just the schema (not the generated client — we regenerate it below,
# in-place, so it lands wherever pnpm's virtual store puts it for THIS
# install rather than guessing a nested .pnpm path from the builder stage).
COPY --from=builder /app/choir-api/src/prisma ./prisma

# Make pnpm's global bin directory reachable so `pnpm add -g` and the
# resulting binary are both on PATH for subsequent RUN steps and CMD.
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
RUN pnpm add -g prisma@5.22.0
RUN prisma generate --schema=./prisma/schema.prisma

COPY --from=builder /app/dist/choir-api ./dist/choir-api

EXPOSE 3333

CMD ["sh", "-c", "prisma migrate deploy --schema=./prisma/schema.prisma && node dist/choir-api/main.js"]