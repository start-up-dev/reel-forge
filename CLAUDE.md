# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**reel-forge** is a Turborepo monorepo managed with **pnpm**. It contains two Next.js applications (`web` and `docs`) and shared packages for UI components, ESLint configs, and TypeScript configs.

## Commands

All commands should be run from the repo root unless noted.

### Development
```bash
pnpm dev          # Start all apps in dev mode (web: 3000, docs: 3001)
pnpm build        # Build all apps and packages
pnpm lint         # Lint all workspaces (zero warnings allowed)
pnpm check-types  # Type-check all workspaces
pnpm format       # Format all .ts, .tsx, .md files with Prettier
```

### Filtering to a specific workspace
```bash
pnpm --filter web dev         # Run dev for web app only
pnpm --filter docs build      # Build docs app only
pnpm --filter @repo/ui lint   # Lint the UI package only
```

### UI Package
```bash
pnpm --filter @repo/ui generate:component   # Scaffold a new React component via Turbo generator
```

## Architecture

```
apps/
  web/      # Main Next.js app (port 3000)
  docs/     # Docs Next.js app (port 3001)
packages/
  ui/                 # Shared React component library (@repo/ui)
  eslint-config/      # Shared ESLint configs (@repo/eslint-config)
  typescript-config/  # Shared TypeScript configs (@repo/typescript-config)
```

### Shared Packages

- **`@repo/ui`** — component library consumed by both apps. New components go in `packages/ui/src/` and must be exported from `packages/ui/package.json` `exports`.
- **`@repo/eslint-config`** — exports three configs: `./base`, `./next-js`, `./react-internal`. Apps use `next-js`; the UI package uses `react-internal`.
- **`@repo/typescript-config`** — exports `base.json`, `nextjs.json`, `react-library.json`. Apps extend `nextjs.json`; the UI package extends `react-library.json`.

### Turborepo Task Graph

Tasks are defined in `turbo.json`. Key behaviors:
- `build` depends on upstream builds (`^build`); caches `.next/**` outputs.
- `lint` and `check-types` depend on upstream equivalents.
- `dev` is persistent and never cached.
- `.env*` files are included as build inputs.

### Tech Stack

- **Next.js 16** / **React 19** / **TypeScript 5.9**
- **Turbo 2.9**, **pnpm 9** (required package manager)
- **ESLint 9** + **Prettier 3**
- Node ≥ 18 required
