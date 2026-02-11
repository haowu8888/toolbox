<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()

const cronExpression = ref('* * * * *')
const error = ref('')

const fieldLabels = ['分', '时', '日', '月', '周']

const quickPatterns = [
  { label: '每分钟', value: '* * * * *' },
  { label: '每小时', value: '0 * * * *' },
  { label: '每天零点', value: '0 0 * * *' },
  { label: '每周一', value: '0 0 * * 1' },
  { label: '每月1号', value: '0 0 1 * *' },
  { label: '工作日9点', value: '0 9 * * 1-5' },
]

const weekDayNames = ['日', '一', '二', '三', '四', '五', '六']
const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

const cronFields = computed(() => {
  const parts = cronExpression.value.trim().split(/\s+/)
  if (parts.length !== 5) return []
  return parts.map((val, idx) => ({
    value: val,
    label: fieldLabels[idx],
  }))
})

/**
 * Validate a single cron field against its allowed range
 */
const validateField = (field, min, max) => {
  if (field === '*') return true

  const parts = field.split(',')
  for (const part of parts) {
    // Handle */n
    if (part.startsWith('*/')) {
      const step = parseInt(part.substring(2), 10)
      if (isNaN(step) || step < 1) return false
      continue
    }

    // Handle range with optional step: a-b or a-b/n
    if (part.includes('-')) {
      const [rangePart, stepPart] = part.split('/')
      const [startStr, endStr] = rangePart.split('-')
      const start = parseInt(startStr, 10)
      const end = parseInt(endStr, 10)
      if (isNaN(start) || isNaN(end)) return false
      if (start < min || end > max || start > end) return false
      if (stepPart !== undefined) {
        const step = parseInt(stepPart, 10)
        if (isNaN(step) || step < 1) return false
      }
      continue
    }

    // Handle single number
    const num = parseInt(part, 10)
    if (isNaN(num) || num < min || num > max) return false
  }
  return true
}

/**
 * Describe a single cron field in Chinese
 */
const describeField = (field, type) => {
  if (field === '*') {
    return '每' + type
  }

  if (field.startsWith('*/')) {
    const step = field.substring(2)
    return `每隔 ${step} ${type}`
  }

  if (field.includes(',')) {
    const parts = field.split(',')
    if (type === '周') {
      return '在周' + parts.map(p => weekDayNames[parseInt(p, 10)] || p).join('、')
    }
    return `在第 ${parts.join('、')} ${type}`
  }

  if (field.includes('-')) {
    const [rangePart, stepPart] = field.split('/')
    const [start, end] = rangePart.split('-')
    let desc = ''
    if (type === '周') {
      desc = `从周${weekDayNames[parseInt(start, 10)] || start}到周${weekDayNames[parseInt(end, 10)] || end}`
    } else {
      desc = `从第 ${start} 到第 ${end} ${type}`
    }
    if (stepPart) {
      desc += `，每隔 ${stepPart} ${type}`
    }
    return desc
  }

  // Single number
  if (type === '周') {
    const idx = parseInt(field, 10)
    return '在周' + (weekDayNames[idx] || field)
  }
  return `在第 ${field} ${type}`
}

const description = computed(() => {
  error.value = ''
  const parts = cronExpression.value.trim().split(/\s+/)
  if (parts.length !== 5) {
    error.value = 'Cron 表达式必须包含 5 个字段（分 时 日 月 周）'
    return ''
  }

  const [minute, hour, day, month, weekday] = parts

  // Field ranges: minute(0-59), hour(0-23), day(1-31), month(1-12), weekday(0-6)
  const ranges = [
    { field: minute, min: 0, max: 59, name: '分钟' },
    { field: hour, min: 0, max: 23, name: '小时' },
    { field: day, min: 1, max: 31, name: '日' },
    { field: month, min: 1, max: 12, name: '月' },
    { field: weekday, min: 0, max: 6, name: '周' },
  ]

  for (const r of ranges) {
    if (!validateField(r.field, r.min, r.max)) {
      error.value = `字段 "${r.name}" 的值 "${r.field}" 无效（范围: ${r.min}-${r.max}）`
      return ''
    }
  }

  const descParts = []
  const typeNames = ['分钟', '小时', '日', '月', '周']
  parts.forEach((p, i) => {
    if (p !== '*' || i >= 3) {
      descParts.push(describeField(p, typeNames[i]))
    }
  })

  if (descParts.length === 0) {
    return '每分钟执行一次'
  }

  return descParts.join('，') + ' 执行'
})

/**
 * Expand a cron field into a set of matching values
 */
const expandField = (field, min, max) => {
  const result = new Set()

  if (field === '*') {
    for (let i = min; i <= max; i++) result.add(i)
    return result
  }

  const parts = field.split(',')
  for (const part of parts) {
    if (part.startsWith('*/')) {
      const step = parseInt(part.substring(2), 10)
      for (let i = min; i <= max; i += step) result.add(i)
    } else if (part.includes('-')) {
      const [rangePart, stepPart] = part.split('/')
      const [startStr, endStr] = rangePart.split('-')
      const start = parseInt(startStr, 10)
      const end = parseInt(endStr, 10)
      const step = stepPart ? parseInt(stepPart, 10) : 1
      for (let i = start; i <= end; i += step) result.add(i)
    } else {
      result.add(parseInt(part, 10))
    }
  }

  return result
}

/**
 * Check whether a given Date matches the cron expression
 */
const matchesCron = (date, fields) => {
  const [minuteField, hourField, dayField, monthField, weekdayField] = fields

  const minuteSet = expandField(minuteField, 0, 59)
  const hourSet = expandField(hourField, 0, 23)
  const daySet = expandField(dayField, 1, 31)
  const monthSet = expandField(monthField, 1, 12)
  const weekdaySet = expandField(weekdayField, 0, 6)

  const m = date.getMinutes()
  const h = date.getHours()
  const d = date.getDate()
  const mon = date.getMonth() + 1
  const w = date.getDay()

  return minuteSet.has(m) && hourSet.has(h) && daySet.has(d) && monthSet.has(mon) && weekdaySet.has(w)
}

const nextExecutions = computed(() => {
  if (error.value) return []
  const parts = cronExpression.value.trim().split(/\s+/)
  if (parts.length !== 5) return []

  const results = []
  const now = new Date()
  // Start from the next minute, seconds and ms set to 0
  const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1, 0, 0)

  // Pre-expand all fields for efficiency
  const minuteSet = expandField(parts[0], 0, 59)
  const hourSet = expandField(parts[1], 0, 23)
  const daySet = expandField(parts[2], 1, 31)
  const monthSet = expandField(parts[3], 1, 12)
  const weekdaySet = expandField(parts[4], 0, 6)

  const maxMinutes = 366 * 24 * 60 // 366 days limit
  let checked = 0

  while (results.length < 5 && checked < maxMinutes) {
    const m = candidate.getMinutes()
    const h = candidate.getHours()
    const d = candidate.getDate()
    const mon = candidate.getMonth() + 1
    const w = candidate.getDay()

    if (minuteSet.has(m) && hourSet.has(h) && daySet.has(d) && monthSet.has(mon) && weekdaySet.has(w)) {
      results.push(new Date(candidate))
    }

    candidate.setMinutes(candidate.getMinutes() + 1)
    checked++
  }

  return results
})

const formatDate = (date) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const formatWeekday = (date) => {
  return '周' + weekDayNames[date.getDay()]
}

const applyPattern = (pattern) => {
  cronExpression.value = pattern.value
  showToast(`已应用: ${pattern.label}`)
  addHistory('Cron解析', `${pattern.label}: ${pattern.value}`)
}

const copyExpression = async () => {
  try {
    await navigator.clipboard.writeText(cronExpression.value)
    showToast('已复制 Cron 表达式')
    addHistory('Cron解析', cronExpression.value)
  } catch {
    showToast('复制失败', 'error')
  }
}

const copyDescription = async () => {
  if (!description.value) return
  try {
    await navigator.clipboard.writeText(description.value)
    showToast('已复制描述')
  } catch {
    showToast('复制失败', 'error')
  }
}

const clearInput = () => {
  cronExpression.value = '* * * * *'
  error.value = ''
}
</script>

<template>
  <div class="cron-parser">
    <h2>Cron 表达式解析</h2>
    <p class="description">解析 Cron 表达式，查看执行计划和下次执行时间</p>

    <div class="input-section">
      <div class="form-group">
        <label>Cron 表达式（5字段）</label>
        <div class="input-row">
          <input
            v-model="cronExpression"
            placeholder="* * * * *（分 时 日 月 周）"
            class="cron-input"
            spellcheck="false"
          />
          <button @click="copyExpression" class="btn btn-primary" title="复制表达式">复制</button>
          <button @click="clearInput" class="btn btn-secondary" title="重置">重置</button>
        </div>
      </div>
    </div>

    <div class="quick-patterns">
      <label>常用表达式</label>
      <div class="pattern-buttons">
        <button
          v-for="pattern in quickPatterns"
          :key="pattern.value"
          @click="applyPattern(pattern)"
          class="btn btn-pattern"
          :class="{ active: cronExpression.trim() === pattern.value }"
        >
          {{ pattern.label }}
          <span class="pattern-value">{{ pattern.value }}</span>
        </button>
      </div>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div v-if="cronFields.length === 5" class="fields-breakdown">
      <label>字段分解</label>
      <div class="fields-grid">
        <div v-for="(field, idx) in cronFields" :key="idx" class="field-card">
          <div class="field-value">{{ field.value }}</div>
          <div class="field-label">{{ field.label }}</div>
        </div>
      </div>
    </div>

    <div v-if="description" class="description-section">
      <div class="section-header">
        <label>执行说明</label>
        <button @click="copyDescription" class="btn btn-small">复制</button>
      </div>
      <div class="description-box">
        {{ description }}
      </div>
    </div>

    <div v-if="nextExecutions.length > 0" class="executions-section">
      <label>接下来 5 次执行时间</label>
      <div class="execution-list">
        <div v-for="(exec, idx) in nextExecutions" :key="idx" class="execution-item">
          <span class="exec-index">{{ idx + 1 }}</span>
          <span class="exec-time">{{ formatDate(exec) }}</span>
          <span class="exec-weekday">{{ formatWeekday(exec) }}</span>
        </div>
      </div>
    </div>

    <div v-if="!error && nextExecutions.length === 0 && cronFields.length === 5" class="no-results">
      在未来 366 天内未找到匹配的执行时间
    </div>
  </div>
</template>

<style scoped>
.cron-parser {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  margin: 0;
  color: #e91e63;
  font-size: 1.8em;
}

.description {
  margin: 0;
  color: #888;
  font-size: 0.95rem;
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label,
.quick-patterns > label,
.fields-breakdown > label,
.description-section label,
.executions-section > label {
  font-weight: 600;
  font-size: 0.95rem;
  color: #333;
}

.input-row {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.cron-input {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #f8bbd0;
  border-radius: 8px;
  font-size: 1.1rem;
  font-family: 'Courier New', monospace;
  background-color: #fff0f5;
  color: #333;
  letter-spacing: 0.05em;
  transition: border-color 0.3s;
}

.cron-input:focus {
  outline: none;
  border-color: #e91e63;
  background-color: white;
  box-shadow: 0 0 0 3px rgba(233, 30, 99, 0.1);
}

.btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.btn-primary {
  background-color: #e91e63;
  color: white;
}

.btn-primary:hover {
  background-color: #c2185b;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(233, 30, 99, 0.3);
}

.btn-secondary {
  background-color: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

.btn-small {
  padding: 0.3rem 0.8rem;
  font-size: 0.8rem;
  background-color: #fce4ec;
  color: #e91e63;
  border: 1px solid #f8bbd0;
}

.btn-small:hover {
  background-color: #f8bbd0;
}

.quick-patterns {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pattern-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.btn-pattern {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.6rem 1rem;
  background-color: #fce4ec;
  color: #c2185b;
  border: 1px solid #f8bbd0;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-pattern:hover {
  background-color: #f8bbd0;
  transform: translateY(-2px);
  box-shadow: 0 3px 8px rgba(233, 30, 99, 0.15);
}

.btn-pattern.active {
  background-color: #e91e63;
  color: white;
  border-color: #e91e63;
}

.btn-pattern.active .pattern-value {
  color: rgba(255, 255, 255, 0.85);
}

.pattern-value {
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  color: #999;
}

.error-message {
  padding: 0.75rem;
  background-color: #fee;
  color: #c33;
  border-radius: 6px;
  border-left: 4px solid #c33;
}

.fields-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.fields-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
}

.field-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 1rem 0.5rem;
  background: linear-gradient(135deg, #fce4ec, #fff0f5);
  border: 1px solid #f8bbd0;
  border-radius: 10px;
  transition: transform 0.2s;
}

.field-card:hover {
  transform: translateY(-2px);
}

.field-value {
  font-family: 'Courier New', monospace;
  font-size: 1.3rem;
  font-weight: 700;
  color: #e91e63;
  word-break: break-all;
  text-align: center;
}

.field-label {
  font-size: 0.85rem;
  color: #888;
  font-weight: 500;
}

.description-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.description-box {
  padding: 1rem;
  background: linear-gradient(135deg, #fce4ec, #fff0f5);
  border: 2px solid #f8bbd0;
  border-radius: 8px;
  font-size: 1rem;
  color: #333;
  line-height: 1.6;
}

.executions-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.execution-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.execution-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #fce4ec, #fff0f5);
  border: 1px solid #f8bbd0;
  border-radius: 8px;
  transition: transform 0.2s;
}

.execution-item:hover {
  transform: translateX(4px);
}

.exec-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background-color: #e91e63;
  color: white;
  border-radius: 50%;
  font-size: 0.85rem;
  font-weight: 600;
  flex-shrink: 0;
}

.exec-time {
  font-family: 'Courier New', monospace;
  font-size: 1rem;
  color: #333;
  flex: 1;
}

.exec-weekday {
  font-size: 0.85rem;
  color: #e91e63;
  font-weight: 500;
  padding: 0.2rem 0.6rem;
  background-color: rgba(233, 30, 99, 0.08);
  border-radius: 4px;
}

.no-results {
  padding: 1rem;
  text-align: center;
  color: #999;
  font-size: 0.95rem;
  background-color: #f9f9f9;
  border-radius: 8px;
}

/* Responsive */
@media (max-width: 768px) {
  .fields-grid {
    grid-template-columns: repeat(5, 1fr);
    gap: 0.4rem;
  }

  .field-card {
    padding: 0.6rem 0.3rem;
  }

  .field-value {
    font-size: 1rem;
  }

  .input-row {
    flex-direction: column;
  }

  .pattern-buttons {
    flex-direction: column;
  }

  .btn-pattern {
    flex-direction: row;
    justify-content: space-between;
  }

  .execution-item {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}

@media (max-width: 480px) {
  .fields-grid {
    grid-template-columns: repeat(5, 1fr);
    gap: 0.3rem;
  }

  .field-value {
    font-size: 0.85rem;
  }

  .field-label {
    font-size: 0.75rem;
  }
}

/* Dark mode */
:global([data-theme='dark'] .cron-parser h2) {
  color: #f48fb1;
}

:global([data-theme='dark'] .cron-parser .description) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .cron-parser .form-group label),
:global([data-theme='dark'] .cron-parser .quick-patterns > label),
:global([data-theme='dark'] .cron-parser .fields-breakdown > label),
:global([data-theme='dark'] .cron-parser .description-section label),
:global([data-theme='dark'] .cron-parser .executions-section > label) {
  color: #e0e0e0;
}

:global([data-theme='dark'] .cron-parser .cron-input) {
  background-color: #2a2a3e;
  color: #e0e0e0;
  border-color: #5a2a3e;
}

:global([data-theme='dark'] .cron-parser .cron-input:focus) {
  background-color: #333;
  border-color: #f48fb1;
  box-shadow: 0 0 0 3px rgba(233, 30, 99, 0.15);
}

:global([data-theme='dark'] .cron-parser .btn-secondary) {
  background-color: #404050;
  color: #e0e0e0;
}

:global([data-theme='dark'] .cron-parser .btn-secondary:hover) {
  background-color: #505060;
}

:global([data-theme='dark'] .cron-parser .btn-small) {
  background-color: #3e2a35;
  color: #f48fb1;
  border-color: #5a2a3e;
}

:global([data-theme='dark'] .cron-parser .btn-small:hover) {
  background-color: #5a2a3e;
}

:global([data-theme='dark'] .cron-parser .btn-pattern) {
  background-color: #3e2a35;
  color: #f48fb1;
  border-color: #5a2a3e;
}

:global([data-theme='dark'] .cron-parser .btn-pattern:hover) {
  background-color: #5a2a3e;
}

:global([data-theme='dark'] .cron-parser .btn-pattern.active) {
  background-color: #c2185b;
  color: white;
  border-color: #c2185b;
}

:global([data-theme='dark'] .cron-parser .btn-pattern.active .pattern-value) {
  color: rgba(255, 255, 255, 0.85);
}

:global([data-theme='dark'] .cron-parser .pattern-value) {
  color: #777;
}

:global([data-theme='dark'] .cron-parser .error-message) {
  background-color: #4a2a2a;
  color: #ff6b6b;
  border-left-color: #ff6b6b;
}

:global([data-theme='dark'] .cron-parser .field-card) {
  background: linear-gradient(135deg, #3e2a35, #352a3e);
  border-color: #5a2a3e;
}

:global([data-theme='dark'] .cron-parser .field-value) {
  color: #f48fb1;
}

:global([data-theme='dark'] .cron-parser .field-label) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .cron-parser .description-box) {
  background: linear-gradient(135deg, #3e2a35, #352a3e);
  border-color: #5a2a3e;
  color: #e0e0e0;
}

:global([data-theme='dark'] .cron-parser .execution-item) {
  background: linear-gradient(135deg, #3e2a35, #352a3e);
  border-color: #5a2a3e;
}

:global([data-theme='dark'] .cron-parser .exec-index) {
  background-color: #c2185b;
}

:global([data-theme='dark'] .cron-parser .exec-time) {
  color: #e0e0e0;
}

:global([data-theme='dark'] .cron-parser .exec-weekday) {
  color: #f48fb1;
  background-color: rgba(233, 30, 99, 0.15);
}

:global([data-theme='dark'] .cron-parser .no-results) {
  background-color: #2a2a3e;
  color: #888;
}
</style>
