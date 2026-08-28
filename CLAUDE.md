# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — a platform for playing games online and competing for the highest score (per README.md, in Spanish). The codebase is currently an unmodified `create-next-app` scaffold (single commit: "Initial commit from Create Next App"); no game, scoring, or vault features exist yet.

The README references a Spec Driven Design workflow (`/spec`, `/spec-impl`) from `Klerith/fernando-skills` (`npx skills@latest add Klerith/fernando-skills`), but those skills are not currently installed in this repo — check whether they've been added before assuming spec-driven commands are available.

## Commands

- `npm run dev` — start the dev server (Next.js, Turbopack by default)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint via `eslint.config.mjs` (flat config, `eslint-config-next` core-web-vitals + typescript)

There is no test runner configured yet.

## Stack notes

- Next.js 16 App Router, React 19, TypeScript (`strict: true`), Tailwind CSS v4 (via `@tailwindcss/postcss`, configured through `@theme inline` in `app/globals.css` rather than a `tailwind.config`).
- Path alias `@/*` maps to the repo root (`tsconfig.json`).
- `app/layout.tsx` types its props as `LayoutProps<"/">` — Next.js 16's generated, route-scoped prop types (from `.next/types`), not a hand-written interface. Follow this pattern for new layouts/pages rather than writing custom prop types.
- Next.js 16 has breaking API/convention changes versus older training data — per `AGENTS.md`, read the matching guide under `node_modules/next/dist/docs/` before writing framework code (routing, layouts, data fetching, config, etc.).
