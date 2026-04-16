# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace manifests and lockfile first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/types ./packages/types
COPY packages/utils ./packages/utils
COPY apps/api ./apps/api

# Build shared packages first, then the API
RUN pnpm --filter @repo/types build
RUN pnpm --filter @repo/utils build
RUN pnpm --filter @repo/api build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:22-slim AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace manifests for production install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/

# Production-only install (no devDependencies)
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist

# Copy static config files needed at runtime
COPY apps/api/config ./apps/api/config

# Cloud Run listens on PORT env var (default 8080)
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "apps/api/dist/index.js"]
