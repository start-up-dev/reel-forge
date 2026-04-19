# Stage 1: Build TypeScript in a Node environment
FROM node:20-slim AS builder

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /workspace

# Copy only the files needed to resolve workspace dependencies
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/types ./packages/types
COPY packages/typescript-config ./packages/typescript-config
COPY packages/eslint-config ./packages/eslint-config
COPY apps/worker ./apps/worker

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @repo/types build
RUN pnpm --filter @repo/worker build

# Create a standalone deployment folder with all dependencies resolved
RUN pnpm --filter @repo/worker deploy /deploy

# Stage 2: Runtime — jrottenberg/ffmpeg base with Node.js installed
FROM jrottenberg/ffmpeg:latest

RUN apt-get update && apt-get install -y curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /deploy .

ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

ENTRYPOINT []
CMD ["node", "dist/index.js"]
