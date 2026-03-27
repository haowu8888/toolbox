<script setup>
import { computed } from 'vue'
import { buildSvgPath, mapTrendPointsToCoords, summarizeTrendBounds } from '../utils/metalTrend'

const props = defineProps({
  title: { type: String, required: true },
  accent: { type: String, required: true },
  trend: { type: Object, required: true },
})

const layoutPoints = computed(() => mapTrendPointsToCoords({ points: props.trend.points }))
const pathData = computed(() => buildSvgPath(layoutPoints.value))
const bounds = computed(() =>
  props.trend.points.length ? summarizeTrendBounds(props.trend.points) : { min: 0, max: 0 },
)
const latestPrice = computed(() => props.trend.points.at(-1)?.price ?? null)
const firstTime = computed(() => props.trend.points[0]?.time ?? '')
const lastTime = computed(() => props.trend.points.at(-1)?.time ?? '')

const formatPrice = (value) => (typeof value === 'number' ? value.toFixed(2) : '--')

const formatTime = (value) => {
  if (!value) return '--'
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <article class="metal-trend-chart" :style="{ '--accent': accent }">
    <header class="chart-header">
      <div>
        <h3>{{ title }}</h3>
        <p>{{ trend.unitLabel }} 实际价格</p>
      </div>
      <span class="chart-state">{{ trend.loading ? '加载中' : trend.fromCache ? '缓存' : '已更新' }}</span>
    </header>

    <div v-if="!trend.points.length" class="chart-empty" :class="{ error: trend.error }">
      {{ trend.error || '暂无图表数据' }}
    </div>

    <div v-else class="chart-stage">
      <svg class="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line x1="8" y1="8" x2="92" y2="8" class="grid-line" />
        <line x1="8" y1="50" x2="92" y2="50" class="grid-line" />
        <line x1="8" y1="92" x2="92" y2="92" class="grid-line" />
        <path class="trend-line" :d="pathData" />
        <circle
          v-if="layoutPoints.length"
          :cx="layoutPoints.at(-1).x"
          :cy="layoutPoints.at(-1).y"
          r="2.8"
          class="trend-dot"
        />
      </svg>

      <div class="axis-labels">
        <span>{{ formatTime(firstTime) }}</span>
        <span>{{ formatTime(lastTime) }}</span>
      </div>
    </div>

    <footer class="chart-footer">
      <div>
        <span>最新</span>
        <strong>{{ formatPrice(latestPrice) }}</strong>
      </div>
      <div>
        <span>最低</span>
        <strong>{{ formatPrice(bounds.min) }}</strong>
      </div>
      <div>
        <span>最高</span>
        <strong>{{ formatPrice(bounds.max) }}</strong>
      </div>
    </footer>

    <p v-if="trend.error && trend.points.length" class="chart-note">
      更新失败，当前保留上一轮成功数据。
    </p>
  </article>
</template>

<style scoped>
.metal-trend-chart {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1rem;
  border: 1px solid color-mix(in srgb, var(--accent) 24%, #ffffff);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(248, 249, 252, 0.92));
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.chart-header,
.chart-footer {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

.chart-header h3,
.chart-header p,
.chart-footer span,
.chart-footer strong,
.chart-note {
  margin: 0;
}

.chart-header h3 {
  font-size: 1rem;
}

.chart-header p,
.chart-state,
.chart-note,
.axis-labels {
  color: #5f6b7a;
  font-size: 0.82rem;
}

.chart-state {
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 14%, #ffffff);
  color: color-mix(in srgb, var(--accent) 72%, #223);
  align-self: flex-start;
}

.chart-stage {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.chart-svg {
  width: 100%;
  height: 180px;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(247, 248, 251, 0.88), rgba(255, 255, 255, 0.96));
}

.grid-line {
  stroke: rgba(148, 163, 184, 0.35);
  stroke-width: 0.8;
  stroke-dasharray: 2 3;
}

.trend-line {
  fill: none;
  stroke: var(--accent);
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.trend-dot {
  fill: var(--accent);
}

.axis-labels {
  display: flex;
  justify-content: space-between;
}

.chart-footer div {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.chart-footer strong {
  font-size: 0.96rem;
}

.chart-empty {
  display: grid;
  place-items: center;
  min-height: 180px;
  border-radius: 14px;
  background: rgba(248, 250, 252, 0.92);
  color: #64748b;
}

.chart-empty.error,
.chart-note {
  color: #b42318;
}

:global(:root[data-theme='dark']) .metal-trend-chart {
  background: linear-gradient(180deg, rgba(20, 27, 38, 0.96), rgba(12, 18, 27, 0.94));
  border-color: color-mix(in srgb, var(--accent) 25%, #223042);
  box-shadow: 0 12px 28px rgba(2, 6, 23, 0.3);
}

:global(:root[data-theme='dark']) .chart-svg,
:global(:root[data-theme='dark']) .chart-empty {
  background: rgba(9, 14, 23, 0.92);
}

:global(:root[data-theme='dark']) .chart-header p,
:global(:root[data-theme='dark']) .chart-state,
:global(:root[data-theme='dark']) .chart-note,
:global(:root[data-theme='dark']) .axis-labels {
  color: #94a3b8;
}
</style>
