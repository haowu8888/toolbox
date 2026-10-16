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
- `src/tools/registry.js` maps id → loader in `toolLoaders` and wraps each with `defineAsyncComponent` (non-suspensible, `ToolLoading` after 150 ms) so every tool is its own chunk. `loadedToolIds` (reactive Set) drives `data-tool-ready` on `.tool-panel`, which E2E waits on. Do **not** reintroduce `<Suspense>` around the `<KeepAlive>`: it only fires pending/resolve for the first tool.
- `App.vue` resolves the initial tool before mount (hash > last tool > first), handles `#tool-<id>` hash routing, `⭐ 收藏` / `🕘 最近` virtual groups, `KeepAlive :max="10"`, an `onErrorCaptured` error boundary (per-tool retry key; stale-chunk errors after a deploy offer a page reload instead) and `document.title` updates.
- `CommandPalette.vue` (Ctrl/⌘+K) scores matches by name > id > keyword > description, highlights hits without `v-html`, and is a proper `role="dialog"` + `listbox`.

### Composables (`src/composables/`)

- `useClipboard` — `copyText(value, { successMessage, history })`; handles toast, history entry and the non-secure-context fallback. **Always use this instead of `navigator.clipboard` directly.**
- `useInterval(fn, ms, { immediate, pauseWhenHidden })` — timer that pauses while the component is KeepAlive-deactivated or the tab is hidden. Use it for any polling / ticking.
- `useStorage` — `useHistory()` / `useFavorites()` reactive singletons (dedupes consecutive identical entries, caps value length), `useLocalStorage(key, default)`.
- `useConfig` — export/import/clear/stats; `validateImportedConfig` is the pure validator (tested).
- `useTheme` — light/dark, follows system until the user toggles; `resetTheme()` returns to system.
- `usePwa` — `registerType: 'prompt'`; exposes `needRefresh` / `applyUpdate` for the update banner in `App.vue`.
- `useToast` — global toasts (dedupes identical consecutive messages, max 5).
- `useRegexWorker` — runs user regexes in `utils/regex.worker.js` with a 1.5 s timeout (terminates + respawns the worker on catastrophic backtracking); newer calls cancel older ones with `AbortError`.

### Conventions learned the hard way

- Never put secrets/plaintext into history: AES plaintext and generated passwords are deliberately not recorded (copying them uses `history: null`).
- Check `writeStorage*` return values for user-authored data (notes, lottery templates, config import) and tell the user when saving failed; config import snapshots all keys and rolls back on failure.
- `<input type="number" v-model>` yields numbers, so test emptiness with `=== ''`, never `!value` (0 is valid). Clamp user-entered counts (`max` is only a hint).
- Static template attributes are not JS strings: `value="\t"` is a backslash + `t`; bind with `:value="'\t'"`.
- Enter handlers on text inputs must ignore IME composition: `@keydown.enter="!$event.isComposing && submit()"`.
- Global keyboard / paste listeners in tools must be removed in `onDeactivated` (KeepAlive keeps hidden tools mounted).

### Utils (`src/utils/`)

`cron.js` (parse/describe/next runs), `diff.js` (patience + bounded LCS line diff, inline diff, hunks, unified format), `jwt.js`, `htmlEntities.js`, `format.js` (`formatBytes`, `formatDateTime`, `formatRelativeTime`, `formatDuration`, `truncate`), `random.js` (Web Crypto, unbiased `randomInt`, `shuffle`, `weightedIndex`, `uuidV4`, `createId`), `download.js` (`downloadText/Json/Blob/DataUrl`), `storageKeys.js` (`STORAGE_KEYS` + safe `readStorageJson/writeStorageJson/...`), `http.js` (`fetchJson` with a 10 s `AbortSignal.timeout`, `describeRequestError` → Chinese user-facing message; **use it for every network call**), `validators.js` (`VALIDATOR_DEFS` for the 数据验证 tool: email / CN mobile / E.164 / IPv4 / http URL via `new URL` / 18-digit ID card with GB 11643 check digit), `numberBase.js` (`convertBase`, BigInt, per-character validation), `textCase.js` (camel / Pascal / snake / kebab / CONSTANT, acronym-aware, line by line), `curl.js` (`tokenizeCommand` shell-style tokenizer incl. `$'...'` and line continuations, `parseCurl`, `buildFetch`), `jsonFormat.js` (lossless validating JSON formatter — keeps big integers / `1.0` / escapes verbatim, Chinese errors with line & column, `childPath` JSONPath builder; used by JSON, 代码工具 and 配置转换), `sqlFormat.js` / `markupFormat.js` (token-based SQL and HTML/XML format + minify; strings, comments, params, `<pre>`/`<script>` preserved), `regexRunner.js` (pure match/segment/replace used by `regex.worker.js`), `csv.js` (RFC 4180 parse/generate, BOM, header dedupe), `base64.js` (UTF-8 + URL-safe, strict UTF-8 decode), `color.js` (HEX/RGB/HSL + WCAG contrast), `unitConvert.js` (exact SI/imperial factors, temperature), `imageDataUrl.js` (raw Base64 → data URL via magic bytes), plus `metalPrice.js`, `metalTrend.js`, `urlUtils.js` (`safeParseUrl` treats `host:port` without scheme as https), `chmodUtils.js`.

Metal price data sources: gold-api (`api.gold-api.com/price/<XAU|XAG|HG>`) and Frankfurter **`api.frankfurter.dev/v1`** (the old `api.frankfurter.app` host 301-redirects without CORS headers, so browsers fail; keep the `.dev` host in the CSP `connect-src` of both `server.ts` and `nginx.conf`).

Put new non-UI logic here with a `*.test.js` next to it; keep components thin.

### Styling & theme

- Design tokens live in `style.css` (`--surface`, `--surface-2/3`, `--text`, `--text-2/3`, `--border`, `--primary`, `--danger-soft`, `--font-mono`, `--shadow-*`, …). Dark mode only swaps the values under `:root[data-theme='dark']`.
- Prefer tokens over hard-coded colors. Where a component still needs a dark-only override, write `:root[data-theme='dark'] .selector` inside `<style scoped>` (Vue scopes the last compound, so the rule stays inside the component). **Never** use `:global(...)` for this: `:global([data-theme='dark']) .x` compiles to a bare `[data-theme=dark]` rule on `<html>` (the `.x` is dropped), and `:global([data-theme='dark'] .x)` leaks to every tool. For `v-html` content wrap the inner part in `:deep()`, e.g. `:root[data-theme='dark'] .markdown-preview :deep(h1)`.
- Never import a plain `.css` file from a tool component (it becomes global); use `<style scoped src="./file.css">`.
- Per-tool accent colors are exposed via a local `--tool-accent` custom property in the newer components (Diff, JWT, Cron, Time, HTML entity); follow that pattern.
- Theme is pre-applied by `public/theme-init.js` before Vue mounts to avoid a flash; keep that file plain ES5 and external (CSP `script-src 'self'`).

### Data persistence

All keys are in `STORAGE_KEYS` (`src/utils/storageKeys.js`): `toolbox_theme`, `toolbox_config`, `toolbox_history`, `toolbox_favorites`, `toolbox_last_tool`, `toolbox_favorite_tools`, `toolbox_recent_tools`, `toolbox_notes`, `toolbox_lottery_templates`, `toolbox_lottery_records`. Never write `localStorage` directly from a component; go through the helpers so quota/privacy-mode errors are swallowed and the settings export/import stays complete.

## Common Tasks

### Add a new tool

1. Create `src/components/MyTool.vue` (`<script setup>`, `<style scoped>`).
2. Add `{ id, name, icon, color, description, keywords }` to `tools` in `src/tools/meta.js` and put the id into a `categoryGroups` entry.
3. Add `mytool: () => import('../components/MyTool.vue')` to `toolLoaders` in `src/tools/registry.js` (`registry.test.js` checks meta ↔ registry stay in sync).
4. Use `useClipboard` for copying, `utils/download.js` for downloads, `useInterval` for timers, tokens for colors.
5. `e2e/smoke.spec.js` iterates over `meta.js`, so add a `smokeActions[id]` entry there for a meaningful assertion.

### Deployment notes

- `server.ts` (Deno Deploy) and `nginx.conf` (Docker) both serve the SPA, set security headers/CSP and proxy `/api/finance/chart/<ticker>` to Yahoo Finance. If a tool needs a new external host, add it to `connect-src` in **both** files.
- `vite.config.js` defines `__APP_VERSION__` from `package.json`, sets the same proxy for `server` and `preview`, and configures the PWA (`navigateFallbackDenylist: [/^\/api\//]`).

## Testing

- Unit: Vitest, node environment, `src/**/*.test.js`.
- E2E: Playwright against `vite preview` on port 4173. `metal-price.spec.js` mocks the three metal APIs and uses `page.clock` to fast-forward the 60 s auto refresh; `smoke.spec.js` opens every tool and fails on any console error.
