# Metal Price Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增一个“金属行情”工具，支持金/银/铜实时价格、`USD/oz`/`USD/g`/`CNY/g` 换算、三张独立趋势图，以及自动刷新/手动刷新/周期切换。

**Architecture:** 保持纯前端实现：用一个数据模块统一拉取实时价格、历史价格和汇率，并在模块内完成换算、聚合、图表缓存。页面组件只负责交互编排和展示；趋势图组件用原生 SVG 渲染，避免为了三张折线图再引入一坨图表库把包体积搞胖。

**Tech Stack:** Vue 3, Vite, Fetch API, SVG, Vitest, Playwright

---

### Task 1: 定义行情数据模块与单元测试

**Files:**
- Create: `src/utils/metalPrice.js`
- Create: `src/utils/metalPrice.test.js`
- Test: `src/utils/metalPrice.test.js`

- [ ] **Step 1: 写失败的单元测试，锁定换算、聚合、缓存规则**

```js
import { describe, expect, it } from 'vitest'
import {
  OUNCE_TO_GRAMS,
  convertUsdOunceToGram,
  convertUsdGramToCnyGram,
  normalizeRealtimeItem,
  buildHistoryCacheKey,
} from './metalPrice'

describe('metalPrice conversions', () => {
  it('converts ounce to gram correctly', () => {
    expect(convertUsdOunceToGram(31.1034768)).toBe(1)
  })

  it('converts usd gram to cny gram correctly', () => {
    expect(convertUsdGramToCnyGram(2, 7.2)).toBe(14.4)
  })

  it('normalizes realtime item into display shape', () => {
    const item = normalizeRealtimeItem(
      { symbol: 'XAU', name: 'Gold', price: 3100, updatedAt: '2026-03-27T03:00:00Z' },
      7.2,
      '黄金',
    )

    expect(item).toMatchObject({
      symbol: 'XAU',
      name: '黄金',
      priceUsdPerOunce: 3100,
      priceUsdPerGram: expect.any(Number),
      priceCnyPerGram: expect.any(Number),
      error: null,
    })
  })

  it('builds stable cache key by symbol and range', () => {
    expect(buildHistoryCacheKey('XAU', 'month')).toBe('XAU:month')
  })
})
```

- [ ] **Step 2: 运行测试，确认先红**

Run: `npm.cmd run test:run -- src/utils/metalPrice.test.js`  
Expected: FAIL，报 `Cannot find module './metalPrice'` 或导出不存在。

- [ ] **Step 3: 写最小实现，先把纯函数和常量补出来**

```js
export const OUNCE_TO_GRAMS = 31.1034768

export const roundPrice = (value) => Math.round(value * 100) / 100

export const convertUsdOunceToGram = (priceUsdPerOunce) =>
  roundPrice(priceUsdPerOunce / OUNCE_TO_GRAMS)

export const convertUsdGramToCnyGram = (priceUsdPerGram, usdToCnyRate) =>
  roundPrice(priceUsdPerGram * usdToCnyRate)

export const buildHistoryCacheKey = (symbol, range) => `${symbol}:${range}`

export const normalizeRealtimeItem = (payload, usdToCnyRate, displayName) => {
  const priceUsdPerGram = convertUsdOunceToGram(payload.price)

  return {
    symbol: payload.symbol,
    name: displayName,
    priceUsdPerOunce: roundPrice(payload.price),
    priceUsdPerGram,
    priceCnyPerGram: usdToCnyRate ? convertUsdGramToCnyGram(priceUsdPerGram, usdToCnyRate) : null,
    sourceUpdatedAt: payload.updatedAt,
    error: null,
  }
}
```

- [ ] **Step 4: 再跑单元测试，确认转绿**

Run: `npm.cmd run test:run -- src/utils/metalPrice.test.js`  
Expected: PASS，4 个测试全部通过。

- [ ] **Step 5: 提交基础数据层**

```bash
git add src/utils/metalPrice.js src/utils/metalPrice.test.js
git commit -m "test: define metal price utility contracts"
```

### Task 2: 扩展数据模块，补实时/历史/汇率编排与缓存

**Files:**
- Modify: `src/utils/metalPrice.js`
- Modify: `src/utils/metalPrice.test.js`
- Test: `src/utils/metalPrice.test.js`

- [ ] **Step 1: 为聚合请求与历史缓存写失败测试**

```js
it('aggregates realtime items with partial failures', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('/price/XAU')) {
      return { ok: true, json: async () => ({ symbol: 'XAU', name: 'Gold', price: 3000, updatedAt: '2026-03-27T00:00:00Z' }) }
    }
    if (url.includes('/price/XAG')) {
      return { ok: false, status: 500 }
    }
    return { ok: true, json: async () => ({ symbol: 'HG', name: 'Copper', price: 4.2, updatedAt: '2026-03-27T00:00:00Z' }) }
  }

  const result = await fetchRealtimeSnapshot({
    fetchImpl,
    usdToCnyRate: 7.2,
    symbols: ['XAU', 'XAG', 'HG'],
  })

  expect(result.items).toHaveLength(3)
  expect(result.items.find((item) => item.symbol === 'XAG')?.error).toBeTruthy()
})

it('reads history from cache when cache is warm', async () => {
  const cache = createHistoryCache()
  cache.set('XAU:day', [{ time: '2026-03-27T00:00:00Z', priceUsdPerOunce: 3000 }])

  const result = await fetchMetalHistory({
    fetchImpl: async () => {
      throw new Error('network should not be called')
    },
    cache,
    symbol: 'XAU',
    range: 'day',
  })

  expect(result.fromCache).toBe(true)
  expect(result.points).toHaveLength(1)
})
```

- [ ] **Step 2: 跑测试确认失败点真实落在新接口**

Run: `npm.cmd run test:run -- src/utils/metalPrice.test.js`  
Expected: FAIL，提示 `fetchRealtimeSnapshot` / `fetchMetalHistory` / `createHistoryCache` 未定义。

- [ ] **Step 3: 在数据模块里补编排层**

```js
export const METAL_DEFS = [
  { symbol: 'XAU', name: '黄金' },
  { symbol: 'XAG', name: '白银' },
  { symbol: 'HG', name: '铜' },
]

export const createHistoryCache = () => new Map()

export const fetchJson = async (url, fetchImpl = fetch) => {
  const response = await fetchImpl(url)
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return response.json()
}

export const fetchUsdToCnyRate = async ({ fetchImpl = fetch }) => {
  const payload = await fetchJson('https://api.exchangerate.host/convert?from=USD&to=CNY', fetchImpl)
  return payload.result
}

export const fetchRealtimeSnapshot = async ({ fetchImpl = fetch, usdToCnyRate, symbols = METAL_DEFS.map((item) => item.symbol) }) => {
  // Promise.allSettled，逐个生成 item，失败项保留 error
}

export const fetchMetalHistory = async ({ fetchImpl = fetch, cache, symbol, range, forceRefresh = false }) => {
  // 按 symbol + range 缓存，forceRefresh 时绕过缓存
}
```

- [ ] **Step 4: 再跑单元测试，确认变绿**

Run: `npm.cmd run test:run -- src/utils/metalPrice.test.js`  
Expected: PASS，历史缓存和部分失败聚合测试通过。

- [ ] **Step 5: 提交数据编排实现**

```bash
git add src/utils/metalPrice.js src/utils/metalPrice.test.js
git commit -m "feat: add metal price data aggregation"
```

### Task 3: 先为图表组件写契约测试

**Files:**
- Create: `src/components/MetalTrendChart.vue`
- Create: `src/components/MetalTrendChart.test.js`
- Test: `src/components/MetalTrendChart.test.js`

- [ ] **Step 1: 写失败测试，定义图表最小行为**

```js
import { describe, expect, it } from 'vitest'
import { buildSvgPath, summarizeTrendBounds } from './MetalTrendChart.vue'

describe('MetalTrendChart helpers', () => {
  it('builds an svg path from points', () => {
    const path = buildSvgPath({
      points: [
        { x: 0, y: 100 },
        { x: 50, y: 50 },
        { x: 100, y: 0 },
      ],
    })

    expect(path).toBe('M 0 100 L 50 50 L 100 0')
  })

  it('summarizes min and max values', () => {
    const bounds = summarizeTrendBounds([
      { priceUsdPerOunce: 10 },
      { priceUsdPerOunce: 20 },
    ])

    expect(bounds).toEqual({ min: 10, max: 20 })
  })
})
```

- [ ] **Step 2: 跑测试确认先红**

Run: `npm.cmd run test:run -- src/components/MetalTrendChart.test.js`  
Expected: FAIL，组件文件或导出辅助函数不存在。

- [ ] **Step 3: 写最小 SVG 图表骨架**

```vue
<script setup>
export const summarizeTrendBounds = (points) => ({
  min: Math.min(...points.map((point) => point.priceUsdPerOunce)),
  max: Math.max(...points.map((point) => point.priceUsdPerOunce)),
})

export const buildSvgPath = ({ points }) =>
  points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
</script>

<template>
  <div class="metal-trend-chart">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"></svg>
  </div>
</template>
```

- [ ] **Step 4: 再跑测试确认转绿**

Run: `npm.cmd run test:run -- src/components/MetalTrendChart.test.js`  
Expected: PASS。

- [ ] **Step 5: 提交图表契约**

```bash
git add src/components/MetalTrendChart.vue src/components/MetalTrendChart.test.js
git commit -m "test: define metal trend chart helpers"
```

### Task 4: 实现金属行情页面组件

**Files:**
- Create: `src/components/MetalPriceTool.vue`
- Modify: `src/components/MetalTrendChart.vue`
- Modify: `src/utils/metalPrice.js`
- Test: `src/components/MetalTrendChart.test.js`
- Test: `src/utils/metalPrice.test.js`

- [ ] **Step 1: 先补页面交互的失败测试用例说明**

```js
// 这一步不新增 Vitest 文件，直接为后面的 Playwright 场景预埋明确行为：
// - 首次进入自动加载实时卡片和三张图
// - 自动刷新只刷新卡片，不刷新趋势图
// - 手动刷新同时刷新卡片和趋势图
// - 切换周期触发三张图更新
```

- [ ] **Step 2: 写最小页面组件骨架**

```vue
<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import MetalTrendChart from './MetalTrendChart.vue'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'
import {
  METAL_DEFS,
  createHistoryCache,
  fetchRealtimeSnapshot,
  fetchUsdToCnyRate,
  fetchMetalHistory,
} from '../utils/metalPrice'

const AUTO_REFRESH_MS = 60_000
const activeRange = ref('day')
const cards = ref([])
const trends = ref([])
const isRefreshing = ref(false)
```

- [ ] **Step 3: 实现实时卡片刷新流**

```js
const refreshRealtime = async () => {
  const usdToCnyRate = await fetchUsdToCnyRate({})
  const snapshot = await fetchRealtimeSnapshot({ usdToCnyRate })
  cards.value = snapshot.items
}
```

- [ ] **Step 4: 实现趋势图加载流和缓存**

```js
const historyCache = createHistoryCache()

const refreshTrends = async ({ forceRefresh = false } = {}) => {
  const results = await Promise.all(
    METAL_DEFS.map((item) =>
      fetchMetalHistory({
        cache: historyCache,
        symbol: item.symbol,
        range: activeRange.value,
        forceRefresh,
      }),
    ),
  )
  trends.value = results
}
```

- [ ] **Step 5: 实现手动刷新、自动刷新、周期切换**

```js
const handleManualRefresh = async () => {
  isRefreshing.value = true
  await refreshRealtime()
  await refreshTrends({ forceRefresh: true })
  isRefreshing.value = false
}

watch(activeRange, async () => {
  await refreshTrends()
})
```

- [ ] **Step 6: 完善图表渲染**

```vue
<MetalTrendChart
  v-for="trend in trends"
  :key="`${trend.symbol}-${activeRange}`"
  :title="trend.name"
  :range="activeRange"
  :points="trend.points"
  :error="trend.error"
/>
```

- [ ] **Step 7: 运行单元测试回归**

Run: `npm.cmd run test:run -- src/utils/metalPrice.test.js src/components/MetalTrendChart.test.js`  
Expected: PASS。

- [ ] **Step 8: 提交页面组件实现**

```bash
git add src/components/MetalPriceTool.vue src/components/MetalTrendChart.vue src/utils/metalPrice.js src/utils/metalPrice.test.js src/components/MetalTrendChart.test.js
git commit -m "feat: add metal price tool UI"
```

### Task 5: 注册工具并补浏览器端用例

**Files:**
- Modify: `src/tools/meta.js`
- Modify: `src/tools/registry.js`
- Modify: `e2e/smoke.spec.js`
- Modify: `e2e/complex-tools.spec.js`
- Test: `e2e/smoke.spec.js`
- Test: `e2e/complex-tools.spec.js`

- [ ] **Step 1: 先写失败的浏览器端复杂用例**

```js
test('metal price tool loads cards and trend charts with shared range switch', async ({ page }) => {
  await page.route('**/price/**', async (route) => {
    // 返回金银铜实时数据
  })
  await page.route('**/convert?from=USD&to=CNY**', async (route) => {
    // 返回 USD/CNY
  })
  await page.route('**/history/**', async (route) => {
    // 返回三种金属的历史点
  })

  await page.goto('/#tool-metalprice')
  await expect(page.locator('.metal-price-card')).toHaveCount(3)
  await expect(page.locator('.metal-trend-chart')).toHaveCount(3)
})
```

- [ ] **Step 2: 跑新用例确认先红**

Run: `npm.cmd run e2e -- e2e/complex-tools.spec.js`  
Expected: FAIL，报工具未注册或页面元素不存在。

- [ ] **Step 3: 注册工具元数据与异步组件**

```js
// src/tools/meta.js
{ id: 'metalprice', name: '金属行情', icon: '📈', color: '#c49b2a' }

// src/tools/registry.js
metalprice: asyncTool(() => import('../components/MetalPriceTool.vue'))
```

- [ ] **Step 4: 补最小 smoke 用例**

```js
metalprice: async (page) => {
  await expect(page.locator('.metal-price-card')).toHaveCount(3)
  await expect(page.locator('.metal-trend-chart')).toHaveCount(3)
}
```

- [ ] **Step 5: 完善 complex e2e**

```js
// 覆盖：
// - 首次进入自动加载
// - 手动刷新
// - 自动刷新仅更新卡片
// - 切换日/周/月/年
// - 汇率失败时 CNY/g 错误态
// - 单个图表失败时局部错误态
```

- [ ] **Step 6: 跑目标浏览器测试**

Run: `npm.cmd run e2e -- e2e/complex-tools.spec.js`  
Expected: PASS，新工具复杂路径通过。

- [ ] **Step 7: 提交浏览器端覆盖**

```bash
git add src/tools/meta.js src/tools/registry.js e2e/smoke.spec.js e2e/complex-tools.spec.js
git commit -m "test: cover metal price browser flows"
```

### Task 6: 做最终全量验证

**Files:**
- Modify: `docs/superpowers/specs/2026-03-27-metal-prices-design.md`
- Test: `src/utils/metalPrice.test.js`
- Test: `src/components/MetalTrendChart.test.js`
- Test: `e2e/smoke.spec.js`
- Test: `e2e/complex-tools.spec.js`
- Test: `e2e/global-state.spec.js`

- [ ] **Step 1: 跑新增单元测试**

Run: `npm.cmd run test:run -- src/utils/metalPrice.test.js src/components/MetalTrendChart.test.js`  
Expected: PASS。

- [ ] **Step 2: 跑全量浏览器回归**

Run: `npm.cmd run e2e`  
Expected: PASS，包含 `smoke`、`global-state`、`complex-tools` 全部通过。

- [ ] **Step 3: 跑构建验证**

Run: `npm.cmd run build`  
Expected: exit code 0。

- [ ] **Step 4: 回写设计文档中的实现结论**

```md
- 已实现 `metalprice` 工具并注册到导航
- 实时卡片与趋势图刷新策略按设计落地
- 图表缓存范围限定在页面会话内
```

- [ ] **Step 5: 提交最终结果**

```bash
git add docs/superpowers/specs/2026-03-27-metal-prices-design.md docs/superpowers/plans/2026-03-27-metal-price-tool-plan.md src/tools/meta.js src/tools/registry.js src/components/MetalPriceTool.vue src/components/MetalTrendChart.vue src/utils/metalPrice.js src/utils/metalPrice.test.js src/components/MetalTrendChart.test.js e2e/smoke.spec.js e2e/complex-tools.spec.js
git commit -m "feat: add metal price tool"
```
