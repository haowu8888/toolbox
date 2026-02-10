# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start Commands

- **Development server**: `npm run dev`
- **Build for production**: `npm run build`
- **Preview built files locally**: `npm run preview`
- **Install dependencies**: `npm install`

## Project Overview

This is a Vue 3 + Vite web application called "工具箱" (Toolbox) - a collection of 18+ developer utilities that runs entirely in the browser without requiring registration or external APIs. The application prioritizes privacy (data stored locally) and offline capability.

## Architecture

### Core Structure

```
src/
├── App.vue              # Main app component with navigation and layout
├── main.js              # Vue app initialization
├── style.css            # Global styles with theme support
├── components/          # Individual tool components
└── composables/         # Reusable Vue composition functions
```

### Navigation System

**App.vue** manages the entire navigation and tool switching:
- `categoryGroups`: Array of 7 categories grouping 18 tools (e.g., "基础工具", "编码转换", "高级工具")
- `expandedCategories`: Ref tracking which category menus are open/closed (collapsible menu UX)
- `activeTab`: Ref for currently displayed tool
- Navigation uses a hierarchical structure: Category (level 1) → Tools (level 2)

Tools include QR Code, JSON, encryption, encoding, regex, markdown, time/unit conversion, validators, and more.

### Styling & Theme System

**Theme Management** (`composables/useTheme.js`):
- Light/dark theme toggle stored in `localStorage.toolbox_theme`
- Uses `data-theme='dark'` attribute on `document.documentElement`
- Respects system `prefers-color-scheme` preference
- All components use scoped styles with `:global([data-theme='dark'])` for dark mode overrides

**Global Styles** (`style.css`):
- Gradient backgrounds that change based on theme
- Consistent button and card styles with CSS variables
- Scrollbar styling with theme awareness
- Responsive design breakpoints: 768px (tablet), 480px (mobile)

### Data Persistence

**localStorage Keys** (all data is client-side only):
- `toolbox_theme`: Current theme preference
- `toolbox_config`: App configuration
- `toolbox_history`: Recent 50 tool operations (managed by `useHistory()`)
- `toolbox_favorites`: Saved favorites/bookmarks

**Composables** (`composables/`):
- `useTheme`: Theme switching and persistence
- `useStorage`: Generic localStorage wrapper, history, and favorites management
- `useConfig`: Configuration export/import, data stats, backup functionality

## Component Organization

Individual tool components live in `src/components/` (18 .vue files). Each is a self-contained tool with internal state management. Add new tools by:
1. Creating a new `.vue` component file
2. Importing it in `App.vue`
3. Adding to the `tools` and `categoryGroups` arrays with proper metadata (id, name, icon, color)

## Key Design Patterns

- **Vue 3 Composition API**: All components use `<script setup>` with composables
- **Scoped Styling**: Components have `<style scoped>` for encapsulation
- **Color System**: Each tool has a `color` property used for button highlights (CSS variable `--btn-color`)
- **Dark Mode**: Prefix dark-mode overrides with `:global([data-theme='dark'])`
- **No external APIs**: All tools process data client-side using libraries like crypto-js, markdown-it, qrcode

## Theme Implementation Notes

When modifying colors or adding new styled elements:
- Light mode colors are set in the base selector
- Dark mode colors use `:global([data-theme='dark'])` prefix (not `:root[data-theme='dark']`)
- Test both themes during development
- Ensure sufficient contrast for accessibility (text should be `#f0f5ff` or similar bright color on dark backgrounds)

## Dependencies

- **vue**: UI framework (v3.5.24)
- **vite**: Build tool and dev server
- **crypto-js**: Encryption/hashing utilities
- **markdown-it**: Markdown parsing and rendering
- **qrcode**: QR code generation

## Common Tasks

### Add a new tool
1. Create `src/components/MyTool.vue`
2. Import in App.vue
3. Add entry to `tools` array with: `{ id: 'mytool', name: 'My Tool', icon: '🎯', color: '#hexcolor' }`
4. Add `id` to appropriate category in `categoryGroups`

### Modify theme colors
Edit `style.css` for global changes or component `<style scoped>` for component-specific styling. Remember to add dark mode equivalents.

### Update menu layout
Categories and their tools are defined in `App.vue` under `categoryGroups`. Menu state (expanded/collapsed) is managed by `expandedCategories` ref.
