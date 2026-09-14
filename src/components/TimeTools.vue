<script setup>
import { computed, ref } from 'vue'
import { useClipboard } from '../composables/useClipboard'
import { useInterval } from '../composables/useInterval'
import { formatDateTime, formatDuration } from '../utils/format'

const { copyText } = useClipboard()

const DATE_FORMATS = [
  { value: 'yyyy-MM-dd HH:mm:ss', label: '2024-01-15 14:30:45' },
  { value: 'yyyy-MM-dd HH:mm:ss.SSS', label: '2024-01-15 14:30:45.123' },
  { value: 'yyyy-MM-dd', label: '2024-01-15' },
  { value: 'HH:mm:ss', label: '14:30:45' },
  { value: 'yyyy/MM/dd HH:mm', label: '2024/01/15 14:30' },
  { value: 'iso', label: 'ISO 8601 (UTC)' },
  { value: 'locale', label: '本地化（zh-CN）' },
]

const TIME_UNITS = [
  { name: '毫秒', value: 1 },
  { name: '秒', value: 1000 },
  { name: '分钟', value: 60_000 },
  { name: '小时', value: 3_600_000 },
  { name: '天', value: 86_400_000 },
  { name: '周', value: 604_800_000 },
]

// ---------- 当前时间（KeepAlive 缓存或页面隐藏时自动暂停） ----------
const now = ref(new Date())
useInterval(
  () => {
    now.value = new Date()
  },
  1000,
  { immediate: true },
)

const currentTimeText = computed(() => formatDateTime(now.value, 'yyyy-MM-dd HH:mm:ss'))
const currentTimestampSeconds = computed(() => Math.floor(now.value.getTime() / 1000))
const currentTimestampMillis = computed(() => now.value.getTime())
const currentIso = computed(() => now.value.toISOString())
const timezoneLabel = computed(() => {
  const offset = -now.value.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const abs = Math.abs(offset)
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  return `${zone} UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
})

// ---------- 时间戳 → 日期 ----------
const timestamp = ref('')
const dateFormat = ref('yyyy-MM-dd HH:mm:ss')

const parsedTimestamp = computed(() => {
  const raw = timestamp.value.trim()
  if (!raw) return { date: null, unit: '', error: '' }
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return { date: null, unit: '', error: '请输入纯数字时间戳' }
  const num = Number(raw)
  const digits = Math.abs(Math.trunc(num)).toString().length
  let millis
  let unit
  if (digits <= 10) {
    millis = num * 1000
    unit = '秒'
  } else if (digits <= 13) {
    millis = num
    unit = '毫秒'
  } else if (digits <= 16) {
    millis = num / 1000
    unit = '微秒'
  } else {
    millis = num / 1_000_000
    unit = '纳秒'
  }
  const date = new Date(millis)
  if (Number.isNaN(date.getTime())) return { date: null, unit, error: '时间戳超出可表示范围' }
  return { date, unit, error: '' }
})

const formatByPattern = (date, pattern) => {
  if (!date) return ''
  if (pattern === 'iso') return date.toISOString()
  if (pattern === 'locale') return date.toLocaleString('zh-CN', { hour12: false })
  return formatDateTime(date, pattern)
}

const timestampToDate = computed(() => formatByPattern(parsedTimestamp.value.date, dateFormat.value))
const timestampRelative = computed(() => {
  const date = parsedTimestamp.value.date
  if (!date) return ''
  const diffSeconds = Math.round((date.getTime() - now.value.getTime()) / 1000)
  if (Math.abs(diffSeconds) < 5) return '就是现在'
  return diffSeconds < 0 ? `${formatDuration(-diffSeconds)}前` : `${formatDuration(diffSeconds)}后`
})

const useCurrentTimestamp = () => {
  timestamp.value = String(currentTimestampSeconds.value)
}

// ---------- 日期 → 时间戳 ----------
const selectedDate = ref(formatDateTime(new Date(), 'yyyy-MM-dd'))
const selectedTime = ref(formatDateTime(new Date(), 'HH:mm'))
const selectedSeconds = ref('00')

const selectedDateObject = computed(() => {
  if (!selectedDate.value || !selectedTime.value) return null
  const seconds = String(selectedSeconds.value || '0').padStart(2, '0')
  const date = new Date(`${selectedDate.value}T${selectedTime.value}:${seconds}`)
  return Number.isNaN(date.getTime()) ? null : date
})

const dateToTimestamp = computed(() =>
  selectedDateObject.value ? Math.floor(selectedDateObject.value.getTime() / 1000) : '',
)
const dateToMillis = computed(() => (selectedDateObject.value ? selectedDateObject.value.getTime() : ''))
const dateToIso = computed(() => (selectedDateObject.value ? selectedDateObject.value.toISOString() : ''))

const useNowForDate = () => {
  const current = new Date()
  selectedDate.value = formatDateTime(current, 'yyyy-MM-dd')
  selectedTime.value = formatDateTime(current, 'HH:mm')
  selectedSeconds.value = formatDateTime(current, 'ss')
}

// ---------- 时间单位转换 ----------
const duration = ref('60')
const fromUnit = ref('秒')
const toUnit = ref('分钟')

const convertedDuration = computed(() => {
  const value = parseFloat(duration.value)
  if (!Number.isFinite(value)) return ''
  const fromValue = TIME_UNITS.find((u) => u.name === fromUnit.value)?.value || 1
  const toValue = TIME_UNITS.find((u) => u.name === toUnit.value)?.value || 1
  const result = (value * fromValue) / toValue
  return Number.isInteger(result) ? String(result) : parseFloat(result.toFixed(6)).toString()
})

const durationReadable = computed(() => {
  const value = parseFloat(duration.value)
  if (!Number.isFinite(value)) return ''
  const fromValue = TIME_UNITS.find((u) => u.name === fromUnit.value)?.value || 1
  return formatDuration((value * fromValue) / 1000)
})

const swapUnits = () => {
  const temp = fromUnit.value
  fromUnit.value = toUnit.value
  toUnit.value = temp
}

// ---------- 日期差 ----------
const diffStart = ref(formatDateTime(new Date(), 'yyyy-MM-dd'))
const diffEnd = ref(formatDateTime(new Date(Date.now() + 7 * 86_400_000), 'yyyy-MM-dd'))

const dateDiff = computed(() => {
  const start = new Date(`${diffStart.value}T00:00:00`)
  const end = new Date(`${diffEnd.value}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000)
  return {
    days,
    weeks: parseFloat((days / 7).toFixed(2)),
    hours: days * 24,
  }
})

const copy = (text, label) => copyText(text, { history: ['时间工具', `${label}: ${text}`] })
</script>

<template>
  <div class="time-tools">
    <h2>⏰ 时间工具</h2>
    <p class="description">时间戳与日期互转、时间单位换算、日期间隔计算</p>

    <div class="current-time">
      <div class="time-display">
        <div class="time-label">现在时间 · {{ timezoneLabel }}</div>
        <div class="time-value" aria-live="off">{{ currentTimeText }}</div>
        <div class="now-actions">
          <button type="button" class="btn btn-copy" @click="copy(currentTimestampSeconds, '当前时间戳(秒)')">
            秒级 {{ currentTimestampSeconds }}
          </button>
          <button type="button" class="btn btn-copy" @click="copy(currentTimestampMillis, '当前时间戳(毫秒)')">
            毫秒级 {{ currentTimestampMillis }}
          </button>
          <button type="button" class="btn btn-copy" @click="copy(currentIso, '当前 ISO 时间')">
            ISO {{ currentIso }}
          </button>
        </div>
      </div>
    </div>

    <!-- 时间戳转日期 -->
    <div class="section">
      <h3>时间戳 → 日期</h3>
      <div class="input-group">
        <input
          v-model="timestamp"
          type="text"
          inputmode="numeric"
          placeholder="输入时间戳 (秒 或 毫秒)"
          class="input-field"
          aria-label="时间戳输入"
        />
        <select v-model="dateFormat" class="input-field" aria-label="输出格式">
          <option v-for="fmt in DATE_FORMATS" :key="fmt.value" :value="fmt.value">{{ fmt.label }}</option>
        </select>
        <button type="button" class="btn-copy-small" @click="useCurrentTimestamp">用当前时间</button>
      </div>
      <div v-if="parsedTimestamp.error" class="error-text" role="alert">{{ parsedTimestamp.error }}</div>
      <div v-else-if="timestamp" class="result-box">
        <div class="result-item">
          <span class="label">转换结果：</span>
          <code>{{ timestampToDate }}</code>
          <button type="button" class="btn-copy-small" @click="copy(timestampToDate, '时间戳转日期')">📋</button>
        </div>
        <div class="result-meta">
          识别为 <strong>{{ parsedTimestamp.unit }}</strong> 级时间戳 · {{ timestampRelative }}
        </div>
      </div>
    </div>

    <!-- 日期转时间戳 -->
    <div class="section">
      <h3>日期 → 时间戳</h3>
      <div class="input-group">
        <input v-model="selectedDate" type="date" class="input-field" aria-label="日期" />
        <input v-model="selectedTime" type="time" class="input-field" aria-label="时间" />
        <input
          v-model="selectedSeconds"
          type="number"
          min="0"
          max="59"
          class="input-field seconds-field"
          aria-label="秒"
          placeholder="秒"
        />
        <button type="button" class="btn-copy-small" @click="useNowForDate">用当前时间</button>
      </div>
      <div class="result-box">
        <div class="result-item">
          <span class="label">秒级：</span>
          <code>{{ dateToTimestamp }}</code>
          <button type="button" class="btn-copy-small" @click="copy(dateToTimestamp, '日期转时间戳')">📋</button>
        </div>
        <div class="result-item">
          <span class="label">毫秒级：</span>
          <code>{{ dateToMillis }}</code>
          <button type="button" class="btn-copy-small" @click="copy(dateToMillis, '日期转毫秒时间戳')">📋</button>
        </div>
        <div class="result-item">
          <span class="label">ISO：</span>
          <code>{{ dateToIso }}</code>
          <button type="button" class="btn-copy-small" @click="copy(dateToIso, '日期转 ISO')">📋</button>
        </div>
      </div>
    </div>

    <!-- 时间单位转换 -->
    <div class="section">
      <h3>时间单位转换</h3>
      <div class="input-group">
        <input v-model="duration" type="number" placeholder="输入数值" class="input-field" aria-label="数值" />
        <select v-model="fromUnit" class="input-field" aria-label="源单位">
          <option v-for="unit in TIME_UNITS" :key="unit.name" :value="unit.name">{{ unit.name }}</option>
        </select>
        <button type="button" class="arrow-btn" title="交换单位" aria-label="交换单位" @click="swapUnits">⇄</button>
        <select v-model="toUnit" class="input-field" aria-label="目标单位">
          <option v-for="unit in TIME_UNITS" :key="unit.name" :value="unit.name">{{ unit.name }}</option>
        </select>
      </div>
      <div class="result-box">
        <div class="result-item">
          <span class="label">{{ duration || 0 }} {{ fromUnit }} =</span>
          <code>{{ convertedDuration }} {{ toUnit }}</code>
          <button type="button" class="btn-copy-small" @click="copy(convertedDuration, '时间单位转换')">📋</button>
        </div>
        <div v-if="durationReadable" class="result-meta">约 {{ durationReadable }}</div>
      </div>
    </div>

    <!-- 日期差 -->
    <div class="section">
      <h3>日期间隔</h3>
      <div class="input-group">
        <input v-model="diffStart" type="date" class="input-field" aria-label="开始日期" />
        <span class="arrow">→</span>
        <input v-model="diffEnd" type="date" class="input-field" aria-label="结束日期" />
      </div>
      <div v-if="dateDiff" class="result-box">
        <div class="result-item">
          <span class="label">相差：</span>
          <code>{{ dateDiff.days }} 天 · {{ dateDiff.weeks }} 周 · {{ dateDiff.hours }} 小时</code>
          <button type="button" class="btn-copy-small" @click="copy(`${dateDiff.days} 天`, '日期间隔')">📋</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.time-tools {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  --tool-accent: #2196f3;
  --tool-accent-strong: #1976d2;
  --tool-soft: rgba(33, 150, 243, 0.12);
  --tool-border: rgba(33, 150, 243, 0.35);
}

h2 {
  margin: 0;
  color: var(--tool-accent);
  font-size: 1.8em;
}

h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: var(--text);
}

.description {
  margin: 0;
  color: var(--text-3);
  font-size: 0.95rem;
}

.time-display {
  background: linear-gradient(135deg, var(--tool-soft), rgba(156, 39, 176, 0.08));
  border: 2px solid var(--tool-border);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
}

.time-label {
  font-size: 0.9rem;
  color: var(--text-2);
  margin-bottom: 0.5rem;
}

.time-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--tool-accent);
  font-family: var(--font-mono);
  margin-bottom: 1rem;
  font-variant-numeric: tabular-nums;
}

.now-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.section {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1.2rem;
}

.input-group {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 1rem;
}

.input-field {
  flex: 1;
  min-width: 120px;
  padding: 0.7rem;
  border: 2px solid var(--tool-border);
  border-radius: 6px;
  font-size: 0.95rem;
  background-color: var(--surface);
  color: var(--text);
  transition: border-color 0.3s;
}

.seconds-field {
  flex: 0 0 90px;
  min-width: 0;
}

.input-field:focus {
  outline: none;
  border-color: var(--tool-accent);
  box-shadow: 0 0 0 3px var(--tool-soft);
}

.arrow {
  color: var(--tool-accent);
  font-weight: bold;
  font-size: 1.2em;
}

.arrow-btn {
  padding: 0.45rem 0.7rem;
  border-radius: 6px;
  border: 1px solid var(--tool-border);
  background: var(--surface);
  color: var(--tool-accent);
  font-size: 1rem;
  box-shadow: none;
}

.result-box {
  background: var(--surface);
  border-left: 4px solid var(--tool-accent);
  border-radius: 6px;
  padding: 1rem;
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.result-meta {
  font-size: 0.85rem;
  color: var(--text-3);
}

.error-text {
  color: #c62828;
  font-size: 0.9rem;
  font-weight: 600;
}

.label {
  font-weight: 600;
  color: var(--text);
  min-width: fit-content;
}

code {
  flex: 1;
  min-width: 150px;
  padding: 0.5rem;
  background-color: var(--surface-3);
  border-radius: 4px;
  font-family: var(--font-mono);
  color: var(--tool-accent);
  word-break: break-all;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

:global([data-theme='dark']) code {
  color: #64b5f6;
}

.btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  background-color: var(--tool-accent);
  color: white;
}

.btn:hover {
  background-color: var(--tool-accent-strong);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
}

.btn-copy {
  padding: 0.6rem 1rem;
  background: linear-gradient(135deg, #2196f3, #1976d2);
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

.btn-copy-small {
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--tool-accent);
  background-color: var(--surface);
  color: var(--tool-accent);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
  box-shadow: none;
  white-space: nowrap;
}

.btn-copy-small:hover {
  background-color: var(--tool-soft);
}

@media (max-width: 768px) {
  .time-value {
    font-size: 1.4rem;
  }

  .input-group {
    flex-direction: column;
    align-items: stretch;
  }

  .input-field,
  .seconds-field {
    width: 100%;
    flex: 1;
  }

  .arrow {
    transform: rotate(90deg);
    text-align: center;
  }

  .result-item {
    flex-direction: column;
    align-items: flex-start;
  }

  code {
    width: 100%;
    min-width: auto;
  }

  .btn-copy {
    width: 100%;
    white-space: normal;
    word-break: break-all;
  }
}

:global([data-theme='dark']) h2,
:global([data-theme='dark']) .time-value {
  color: #64b5f6;
}
</style>
