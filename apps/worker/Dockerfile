# Stage 1: Build TypeScript in a Node environment
FROM node:20-slim AS builder

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy only the files needed to resolve workspace dependencies
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY apps/worker/package.json ./apps/worker/

RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/types ./packages/types
COPY packages/typescript-config ./packages/typescript-config
COPY packages/eslint-config ./packages/eslint-config
COPY apps/worker ./apps/worker

# Build the worker
RUN pnpm --filter @repo/worker build

# Create a standalone deployment folder with all dependencies resolved
RUN pnpm --filter @repo/worker --prod deploy /deploy

# Copy compiled output into the deploy folder manually to be safe
RUN cp -r apps/worker/dist/* /deploy/

# Debug: List the contents of the deploy folder
RUN ls -R /deploy

# Stage 2: Runtime — jrottenberg/ffmpeg base with Node.js installed
FROM jrottenberg/ffmpeg:latest

RUN apt-get update && apt-get install -y curl ca-certificates fonts-liberation fonts-noto fonts-beng fontconfig && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    fc-cache -f && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /deploy .

ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

ENTRYPOINT []
# Since apps/worker/tsconfig.json has rootDir: src, index.ts becomes index.js
CMD ["node", "index.js"]
