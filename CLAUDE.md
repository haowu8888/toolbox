# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start Commands

- **Development server**: `npm run dev` (http://127.0.0.1:3455)
- **Build for production**: `npm run build`
- **Preview built files locally**: `npm run preview`
- **Install dependencies**: `npm install`
- **Lint**: `npm run lint` (`--max-warnings 0`, warnings fail the build)
- **Run tests (CI mode)**: `npm run test:run`
- **E2E smoke tests**: `npm run e2e` (first time: `npx playwright install chromium`)
- **Format (Prettier)**: `npm run format`
- **Everything CI runs**: `npm run check` (lint + unit tests + build)

## Project Overview

Vue 3 + Vite web application called "工具箱" (Toolbox): 32 developer utilities grouped into 8 categories that run entirely in the browser. Privacy first (data only in `localStorage`), installable PWA, offline capable. Only two tools talk to the network (网络工具 → dns.google / ipapi.co; 金属行情 → gold-api / frankfurter / Yahoo Finance via the same-origin `/api/finance/chart` proxy).

## Architecture

```
src/
├── App.vue              # App shell: nav, hash routing, favorites/recent, PWA update banner, error boundary
├── main.js              # Vue bootstrap
├── style.css            # Design tokens (CSS variables) + global base styles
├── tools/
│   ├── meta.js          # Tool metadata (id, name, icon, color, description, keywords) + categoryGroups
│   └── registry.js      # id → defineAsyncComponent map (lazy chunks per tool)
├── components/          # One SFC per tool + CommandPalette / ToastNotification / ToolLoading
├── composables/         # Shared Vue logic
└── utils/               # Pure functions, all unit-tested with Vitest
```

### Tool metadata & navigation

- `src/tools/meta.js` is the single source of truth: `tools` (with `description` and `keywords` used by the command palette and document title) and `categoryGroups`. `toolCategoryMap` maps id → category.
- `src/tools/registry.js` wraps each component with `defineAsyncComponent` so every tool is its own chunk.
- `App.vue` handles `#tool-<id>` hash routing, `⭐ 收藏` / `🕘 最近` virtual groups, `KeepAlive :max="10"`, Suspense loading state, `onErrorCaptured` error boundary with a retry that re-mounts the tool, and `document.title` updates.
- `CommandPalette.vue` (Ctrl/⌘+K) scores matches by name > id > keyword > description, highlights hits without `v-html`, and is a proper `role="dialog"` + `listbox`.

### Composables (`src/composables/`)

- `useClipboard` — `copyText(value, { successMessage, history })`; handles toast, history entry and the non-secure-context fallback. **Always use this instead of `navigator.clipboard` directly.**
- `useInterval(fn, ms, { immediate, pauseWhenHidden })` — timer that pauses while the component is KeepAlive-deactivated or the tab is hidden. Use it for any polling / ticking.
- `useStorage` — `useHistory()` / `useFavorites()` reactive singletons (dedupes consecutive identical entries, caps value length), `useLocalStorage(key, default)`.
- `useConfig` — export/import/clear/stats; `validateImportedConfig` is the pure validator (tested).
- `useTheme` — light/dark, follows system until the user toggles; `resetTheme()` returns to system.
- `usePwa` — `registerType: 'prompt'`; exposes `needRefresh` / `applyUpdate` for the update banner in `App.vue`.
- `useToast` — global toasts (dedupes identical consecutive messages, max 5).

### Utils (`src/utils/`)

`cron.js` (parse/describe/next runs), `diff.js` (patience + bounded LCS line diff, inline diff, hunks, unified format), `jwt.js`, `htmlEntities.js`, `format.js` (`formatBytes`, `formatDateTime`, `formatRelativeTime`, `formatDuration`, `truncate`), `random.js` (Web Crypto, unbiased `randomInt`, `shuffle`, `weightedIndex`, `uuidV4`, `createId`), `download.js` (`downloadText/Json/Blob/DataUrl`), `storageKeys.js` (`STORAGE_KEYS` + safe `readStorageJson/writeStorageJson/...`), plus `metalPrice.js`, `metalTrend.js`, `urlUtils.js`, `chmodUtils.js`.

Put new non-UI logic here with a `*.test.js` next to it; keep components thin.

### Styling & theme

- Design tokens live in `style.css` (`--surface`, `--surface-2/3`, `--text`, `--text-2/3`, `--border`, `--primary`, `--danger-soft`, `--font-mono`, `--shadow-*`, …). Dark mode only swaps the values under `:root[data-theme='dark']`.
- Prefer tokens over hard-coded colors. Where a component still needs a dark-only override, use `:global([data-theme='dark']) .selector` inside `<style scoped>`.
- Per-tool accent colors are exposed via a local `--tool-accent` custom property in the newer components (Diff, JWT, Cron, Time, HTML entity); follow that pattern.
- Theme is pre-applied by `public/theme-init.js` before Vue mounts to avoid a flash; keep that file plain ES5 and external (CSP `script-src 'self'`).

### Data persistence

All keys are in `STORAGE_KEYS` (`src/utils/storageKeys.js`): `toolbox_theme`, `toolbox_config`, `toolbox_history`, `toolbox_favorites`, `toolbox_last_tool`, `toolbox_favorite_tools`, `toolbox_recent_tools`, `toolbox_notes`, `toolbox_lottery_templates`, `toolbox_lottery_records`. Never write `localStorage` directly from a component; go through the helpers so quota/privacy-mode errors are swallowed and the settings export/import stays complete.

## Common Tasks

### Add a new tool

1. Create `src/components/MyTool.vue` (`<script setup>`, `<style scoped>`).
2. Add `{ id, name, icon, color, description, keywords }` to `tools` in `src/tools/meta.js` and put the id into a `categoryGroups` entry.
3. Add `mytool: asyncTool(() => import('../components/MyTool.vue'))` to `toolComponentMap` in `src/tools/registry.js`.
4. Use `useClipboard` for copying, `utils/download.js` for downloads, `useInterval` for timers, tokens for colors.
5. `e2e/smoke.spec.js` iterates over `meta.js`, so add a `smokeActions[id]` entry there for a meaningful assertion.

### Deployment notes

- `server.ts` (Deno Deploy) and `nginx.conf` (Docker) both serve the SPA, set security headers/CSP and proxy `/api/finance/chart/<ticker>` to Yahoo Finance. If a tool needs a new external host, add it to `connect-src` in **both** files.
- `vite.config.js` defines `__APP_VERSION__` from `package.json`, sets the same proxy for `server` and `preview`, and configures the PWA (`navigateFallbackDenylist: [/^\/api\//]`).

## Testing

- Unit: Vitest, node environment, `src/**/*.test.js`.
- E2E: Playwright against `vite preview` on port 4173. `metal-price.spec.js` mocks the three metal APIs and uses `page.clock` to fast-forward the 60 s auto refresh; `smoke.spec.js` opens every tool and fails on any console error.
