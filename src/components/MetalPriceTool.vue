<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import MetalTrendChart from './MetalTrendChart.vue'
import './metal-price-tool.css'
import { useHistory } from '../composables/useStorage'
import { useToast } from '../composables/useToast'
import { METAL_DEFS, fetchRealtimeSnapshot } from '../utils/metalPrice'
import { createHistoryCache, fetchMetalTrend } from '../utils/metalTrend'

const AUTO_REFRESH_MS = 60_000
const RANGE_OPTIONS = [
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
]
const historyCache = createHistoryCache()

const { addHistory } = useHistory()
const { showToast } = useToast()

const activeRange = ref('day')
const snapshot = ref({ updatedAt: '', usdToCnyRate: null, items: [], exchangeRateError: '' })
const snapshotLoading = ref(true)
const realtimeRefreshing = ref(false)
const trendRefreshing = ref(false)
const trendCards = ref(METAL_DEFS.map((item) => createTrendCard(item)))
let refreshTimer = null

const displayItems = computed(() => {
  const itemMap = new Map(snapshot.value.items.map((item) => [item.symbol, item]))
  return METAL_DEFS.map((metalDef) => itemMap.get(metalDef.symbol) || createRealtimeCard(metalDef))
})

const exchangeRateLabel = computed(() => {
  if (snapshot.value.usdToCnyRate) return `USD/CNY ${snapshot.value.usdToCnyRate.toFixed(4)}`
  if (snapshot.value.exchangeRateError) return 'USD/CNY 暂不可用'
  return 'USD/CNY 加载中'
})

const anyRealtimeData = computed(() =>
  displayItems.value.some((item) => typeof item.priceUsdPerSourceUnit === 'number'),
)

function createRealtimeCard(metalDef) {
  return {
    symbol: metalDef.symbol,
    name: metalDef.name,
    sourceUnitLabel: metalDef.quoteUnit === 'pound' ? 'USD/lb' : 'USD/oz',
    priceUsdPerSourceUnit: null,
    priceUsdPerOunce: null,
    priceUsdPerGram: null,
    priceCnyPerGram: null,
    sourceUpdatedAt: '',
    error: '',
  }
}

function createTrendCard(metalDef) {
  return {
    symbol: metalDef.symbol,
    name: metalDef.name,
    accent: metalDef.accent,
    unitLabel: metalDef.quoteUnit === 'pound' ? 'USD/lb' : 'USD/oz',
    points: [],
    fromCache: false,
    loading: true,
    error: '',
  }
}

function patchTrendCard(symbol, patch) {
  trendCards.value = trendCards.value.map((item) => (item.symbol === symbol ? { ...item, ...patch } : item))
}

function formatNumber(value, digits = 2) {
  return typeof value === 'number' ? value.toFixed(digits) : '--'
}

function formatTime(value) {
  if (!value) return '--'
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function buildHistoryText() {
  return displayItems.value
    .filter((item) => typeof item.priceUsdPerOunce === 'number')
    .map((item) => `${item.name} ${formatNumber(item.priceUsdPerOunce)} USD/oz`)
    .join(' | ')
}

async function copyPrice(item, value, label) {
  if (typeof value !== 'number') return
  try {
    await navigator.clipboard.writeText(`${item.name} ${value.toFixed(2)} ${label}`)
    showToast('报价已复制')
  } catch {
    showToast('复制失败', 'error')
  }
}

async function loadSnapshot({ manual = false } = {}) {
  if (realtimeRefreshing.value) return
  if (snapshotLoading.value && snapshot.value.items.length) return
  if (manual) realtimeRefreshing.value = true
  else snapshotLoading.value = snapshot.value.items.length === 0

  snapshot.value = await fetchRealtimeSnapshot()

  if (manual && anyRealtimeData.value) {
    addHistory('金属行情', buildHistoryText())
  }

  snapshotLoading.value = false
  realtimeRefreshing.value = false
}

async function loadSingleTrend(metalDef, forceRefresh) {
  patchTrendCard(metalDef.symbol, { loading: true, error: '' })
  try {
    const trend = await fetchMetalTrend({
      cache: historyCache,
      metalDef,
      range: activeRange.value,
      forceRefresh,
    })
    patchTrendCard(metalDef.symbol, {
      ...trend,
      accent: metalDef.accent,
      loading: false,
      error: '',
    })
  } catch (error) {
    patchTrendCard(metalDef.symbol, {
      accent: metalDef.accent,
      loading: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

async function loadTrends({ forceRefresh = false } = {}) {
  if (trendRefreshing.value) return
  trendRefreshing.value = true
  await Promise.all(METAL_DEFS.map((metalDef) => loadSingleTrend(metalDef, forceRefresh)))
  trendRefreshing.value = false
}

async function handleManualRefresh() {
  if (realtimeRefreshing.value || trendRefreshing.value) return
  await loadSnapshot({ manual: true })
  await loadTrends({ forceRefresh: true })
}

function startAutoRefresh() {
  refreshTimer = window.setInterval(() => {
    void loadSnapshot()
  }, AUTO_REFRESH_MS)
}

function stopAutoRefresh() {
  if (refreshTimer) {
    window.clearInterval(refreshTimer)
    refreshTimer = null
  }
}

function selectRange(nextRange) {
  if (nextRange === activeRange.value) return
  activeRange.value = nextRange
  void loadTrends()
}

onMounted(async () => {
  await loadSnapshot()
  await loadTrends()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div class="metal-price-tool">
    <section class="hero-card">
      <div>
        <h2>金属行情</h2>
        <p class="description">实时查看黄金、白银、铜价格，并补一眼日 / 周 / 月 / 年趋势。</p>
        <p class="source-note">数据源：gold-api / Frankfurter / Yahoo Finance chart（经站点同源代理）</p>
      </div>

      <div class="hero-actions">
        <div class="range-switch" role="tablist" aria-label="趋势周期">
          <button
            v-for="option in RANGE_OPTIONS"
            :key="option.value"
            class="range-btn"
            :class="{ active: activeRange === option.value }"
            :aria-pressed="activeRange === option.value"
            @click="selectRange(option.value)"
          >
            {{ option.label }}
          </button>
        </div>

        <button
          class="btn btn-primary metal-refresh-btn"
          :disabled="realtimeRefreshing || trendRefreshing"
          @click="handleManualRefresh"
        >
          {{ realtimeRefreshing || trendRefreshing ? '刷新中...' : '手动刷新' }}
        </button>
      </div>
    </section>

    <section class="status-bar">
      <span>{{ snapshotLoading ? '实时行情加载中' : `最近更新 ${formatTime(snapshot.updatedAt)}` }}</span>
      <span>{{ exchangeRateLabel }}</span>
      <span>自动刷新 60s</span>
      <span>图表周期：{{ RANGE_OPTIONS.find((item) => item.value === activeRange)?.label }}</span>
    </section>

    <p v-if="snapshot.exchangeRateError" class="status-error">
      汇率请求失败，当前仅保证美元报价可用。
    </p>

    <section class="price-grid">
      <article
        v-for="item in displayItems"
        :key="item.symbol"
        class="price-card"
        :style="{ '--accent': METAL_DEFS.find((metal) => metal.symbol === item.symbol)?.accent }"
      >
        <header class="card-header">
          <div>
            <h3>{{ item.name }}</h3>
            <p>{{ item.symbol }} · 源报价 {{ item.sourceUnitLabel }}</p>
          </div>
          <span class="card-badge">{{ item.error ? '失败' : '在线' }}</span>
        </header>

        <div v-if="item.error" class="card-error">{{ item.error }}</div>

        <div v-else class="price-list">
          <div class="price-row" data-field="source">
            <span>源报价</span>
            <strong>{{ formatNumber(item.priceUsdPerSourceUnit) }} {{ item.sourceUnitLabel }}</strong>
            <button
              class="copy-btn"
              :aria-label="`复制 ${item.name} 源报价`"
              @click="copyPrice(item, item.priceUsdPerSourceUnit, item.sourceUnitLabel)"
            >
              复制
            </button>
          </div>
          <div class="price-row" data-field="usd-oz">
            <span>USD/oz</span>
            <strong>{{ formatNumber(item.priceUsdPerOunce) }}</strong>
            <button
              class="copy-btn"
              :aria-label="`复制 ${item.name} USD/oz`"
              @click="copyPrice(item, item.priceUsdPerOunce, 'USD/oz')"
            >
              复制
            </button>
          </div>
          <div class="price-row" data-field="usd-g">
            <span>USD/g</span>
            <strong>{{ formatNumber(item.priceUsdPerGram) }}</strong>
            <button
              class="copy-btn"
              :aria-label="`复制 ${item.name} USD/g`"
              @click="copyPrice(item, item.priceUsdPerGram, 'USD/g')"
            >
              复制
            </button>
          </div>
          <div class="price-row" data-field="cny-g">
            <span>CNY/g</span>
            <strong>{{ formatNumber(item.priceCnyPerGram) }}</strong>
            <button
              class="copy-btn"
              :aria-label="`复制 ${item.name} CNY/g`"
              @click="copyPrice(item, item.priceCnyPerGram, 'CNY/g')"
            >
              复制
            </button>
          </div>
        </div>

        <footer class="card-footer">
          <span>源更新时间 {{ formatTime(item.sourceUpdatedAt) }}</span>
          <span v-if="item.sourceUnitLabel !== 'USD/oz'">铜的源报价按 USD/lb 返回，其余价格为换算值。</span>
        </footer>
      </article>
    </section>

    <section class="trend-grid">
      <MetalTrendChart
        v-for="trend in trendCards"
        :key="`${trend.symbol}-${activeRange}`"
        :title="`${trend.name} 趋势`"
        :accent="trend.accent"
        :trend="trend"
      />
    </section>
  </div>
</template>
