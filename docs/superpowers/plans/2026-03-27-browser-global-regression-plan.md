# Browser Global Regression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐浏览器端全局功能回归覆盖，修复已确认的本地存储导入导出/清理缺陷，并在不破坏 31 个工具冒烟通过的前提下完成回归验证。

**Architecture:** 先用 Playwright 给全局状态写回归测试，把“损坏存储不崩、清空数据真清空、导入导出真覆盖”这些用户可见行为钉成失败用例；再把本地存储 key 管理收口到统一清单，由 `useConfig` 负责导出、导入和清理；最后跑目标回归和全量浏览器测试确认没有新回归。

**Tech Stack:** Vue 3, Vite, Playwright, Vitest, localStorage

---

### Task 1: 补齐全局浏览器回归用例

**Files:**
- Create: `e2e/global-state.spec.js`
- Modify: `e2e/smoke.spec.js`
- Test: `e2e/global-state.spec.js`

- [ ] **Step 1: 写失败的全局状态回归测试**

```js
test('settings page survives corrupted storage', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('toolbox_history', '{broken')
    localStorage.setItem('toolbox_favorites', '{broken')
  })

  await page.goto('/#tool-settings')
  await expect(page.locator('.error-boundary')).toHaveCount(0)
  await expect(page.locator('.settings-panel')).toBeVisible()
})

test('clear all data removes notes and app-level tool state', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('toolbox_notes', JSON.stringify([{ id: 1, title: 'n1' }]))
    localStorage.setItem('toolbox_favorite_tools', JSON.stringify(['json']))
    localStorage.setItem('toolbox_recent_tools', JSON.stringify(['json']))
    localStorage.setItem('toolbox_last_tool', 'json')
  })

  await page.goto('/#tool-settings')
  await page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: /清空所有数据|娓呯┖鎵€鏈夋暟鎹/ }).click()
  await page.waitForTimeout(1200)
  await page.reload()

  const state = await page.evaluate(() => ({
    notes: localStorage.getItem('toolbox_notes'),
    favoriteTools: localStorage.getItem('toolbox_favorite_tools'),
    recentTools: localStorage.getItem('toolbox_recent_tools'),
    lastTool: localStorage.getItem('toolbox_last_tool'),
  }))

  expect(state).toEqual({
    notes: null,
    favoriteTools: null,
    recentTools: null,
    lastTool: null,
  })
})
```

- [ ] **Step 2: 运行新测试并确认先红**

Run: `npm.cmd run e2e -- e2e/global-state.spec.js`  
Expected: 至少 1 个失败，失败点落在 `settings` 加载或 `clearAllData` 未清理全部 key。

- [ ] **Step 3: 扩展正向覆盖**

```js
test('theme toggle persists after reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /主题|鍒囨崲/ }).click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('command palette can jump to a tool', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+K')
  await page.getByPlaceholder(/搜索|鎼滅储/).fill('jwt')
  await page.keyboard.press('Enter')
  await expect(page.locator('.tool-panel')).toHaveAttribute('data-active-tool', 'jwt')
})
```

- [ ] **Step 4: 再跑一次目标测试**

Run: `npm.cmd run e2e -- e2e/global-state.spec.js`  
Expected: 仍有失败，但只剩真实实现缺陷，不是选择器或测试脚本错误。

- [ ] **Step 5: 提交测试基线**

```bash
git add e2e/global-state.spec.js e2e/smoke.spec.js
git commit -m "test: cover global storage regressions"
```

### Task 2: 收口本地存储 key 并修复导入导出/清理逻辑

**Files:**
- Create: `src/utils/storageKeys.js`
- Modify: `src/composables/useConfig.js`
- Modify: `src/components/SettingsPanel.vue`
- Test: `e2e/global-state.spec.js`

- [ ] **Step 1: 先补导入导出回归测试**

```js
test('settings export/import preserves browser data', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('toolbox_notes', JSON.stringify([{ id: 1, title: 'keep me' }]))
    localStorage.setItem('toolbox_favorite_tools', JSON.stringify(['json']))
    localStorage.setItem('toolbox_recent_tools', JSON.stringify(['json', 'jwt']))
    localStorage.setItem('toolbox_last_tool', 'jwt')
  })

  await page.goto('/#tool-settings')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /导出配置|瀵煎嚭/ }).click()
  const download = await downloadPromise
  expect(await download.path()).toBeTruthy()
})
```

- [ ] **Step 2: 运行测试确认导出覆盖缺口**

Run: `npm.cmd run e2e -- e2e/global-state.spec.js`  
Expected: 导出/导入相关断言失败，证明当前备份不包含 app 级工具状态和笔记等数据。

- [ ] **Step 3: 实现统一 key 清单与容错读取**

```js
export const APP_STORAGE_KEYS = [
  'toolbox_config',
  'toolbox_history',
  'toolbox_favorites',
  'toolbox_theme',
  'toolbox_last_tool',
  'toolbox_favorite_tools',
  'toolbox_recent_tools',
  'toolbox_notes',
  'toolbox_lottery_templates',
  'toolbox_lottery_records',
]

export const safeParseJson = (raw, fallback) => {
  try {
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
```

- [ ] **Step 4: 用统一清单改造 `useConfig`**

```js
const exportConfig = () => ({
  config: getConfig(),
  history: readJsonKey('toolbox_history', []),
  favorites: readJsonKey('toolbox_favorites', []),
  theme: readTheme(),
  appState: collectAppState(),
  exportDate: new Date().toISOString(),
  version: '1.0',
})

const clearAllData = () => {
  for (const key of APP_STORAGE_KEYS) localStorage.removeItem(key)
}
```

- [ ] **Step 5: 更新设置页文案与状态提示**

```vue
<p>导出配置会包含主题、历史、收藏、最近工具、笔记和抽奖记录。</p>
```

- [ ] **Step 6: 运行目标回归确认变绿**

Run: `npm.cmd run e2e -- e2e/global-state.spec.js`  
Expected: `global-state` 全绿，无 `error-boundary`，无控制台未处理错误。

- [ ] **Step 7: 提交修复**

```bash
git add src/utils/storageKeys.js src/composables/useConfig.js src/components/SettingsPanel.vue e2e/global-state.spec.js
git commit -m "fix: back up and clear all browser app state"
```

### Task 3: 回归 31 个工具与全局主流程

**Files:**
- Modify: `e2e/smoke.spec.js`
- Test: `e2e/smoke.spec.js`
- Test: `e2e/global-state.spec.js`

- [ ] **Step 1: 复跑原 31 项冒烟**

Run: `npm.cmd run e2e -- e2e/smoke.spec.js`  
Expected: 31 个工具全部通过。

- [ ] **Step 2: 全量浏览器测试**

Run: `npm.cmd run e2e`  
Expected: `smoke` + `global-state` 全部通过。

- [ ] **Step 3: 构建校验**

Run: `npm.cmd run build`  
Expected: exit code 0，无构建错误。

- [ ] **Step 4: 记录补充优化项**

```md
- 设置页“清空所有数据”二次确认文案可更明确地列出会删除的 key 类别
- 全局搜索可补充最近访问工具排序，减少键盘操作次数
- storage/settings 可共享一套本地数据统计摘要，避免统计口径漂移
```

- [ ] **Step 5: 提交最终回归结果**

```bash
git add e2e/smoke.spec.js e2e/global-state.spec.js src/components/SettingsPanel.vue src/composables/useConfig.js src/utils/storageKeys.js
git commit -m "test: harden browser regressions for global state"
```
