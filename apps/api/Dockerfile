# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace manifests and lockfile
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all package manifests
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/types ./packages/types
COPY packages/typescript-config ./packages/typescript-config
COPY packages/eslint-config ./packages/eslint-config
COPY apps/api ./apps/api

# Build the API
RUN pnpm --filter @repo/api build

# Create a standalone deployment folder with production dependencies
RUN pnpm --filter @repo/api --prod deploy /deploy

# Copy compiled output and config files into the deploy folder
# We copy them into the root of the deploy folder
RUN cp -r apps/api/dist/* /deploy/ && \
    cp -r apps/api/config /deploy/config

# Debug: List the contents of the deploy folder to verify structure
RUN ls -R /deploy

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:22-slim AS runner

WORKDIR /app

# Copy the deployed folder from builder
COPY --from=builder /deploy .

# Cloud Run listens on PORT env var
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Based on the structure observed in builder (cp apps/api/dist/* /deploy/), 
# the entry point should be at src/index.js
CMD ["node", "src/index.js"]
