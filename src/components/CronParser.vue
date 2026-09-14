<script setup>
import { computed, ref } from 'vue'
import { useClipboard } from '../composables/useClipboard'
import { useHistory } from '../composables/useStorage'
import { useToast } from '../composables/useToast'
import { formatDateTime, formatRelativeTime } from '../utils/format'
import { CRON_FIELDS, CRON_PRESETS, getNextCronRuns, parseCron, WEEKDAY_LABELS } from '../utils/cron'

const { copyText } = useClipboard()
const { addHistory } = useHistory()
const { showToast } = useToast()

const cronExpression = ref('* * * * *')
const runCount = ref(5)
const runCountOptions = [5, 10, 20]

const parsed = computed(() => parseCron(cronExpression.value))
const error = computed(() => parsed.value.error)
const description = computed(() => parsed.value.description)

const cronFields = computed(() => {
  const parts = cronExpression.value.trim().split(/\s+/)
  if (parts.length !== 5) return []
  return parts.map((value, index) => ({
    value,
    label: CRON_FIELDS[index].label,
    range:
      CRON_FIELDS[index].key === 'dayOfWeek'
        ? '0-6（7=周日）'
        : `${CRON_FIELDS[index].min}-${CRON_FIELDS[index].max}`,
  }))
})

const nextExecutions = computed(() =>
  parsed.value.ok ? getNextCronRuns(parsed.value, { count: runCount.value }) : [],
)

const formatWeekday = (date) => `周${WEEKDAY_LABELS[date.getDay()]}`

const applyPattern = (pattern) => {
  cronExpression.value = pattern.value
  showToast(`已应用: ${pattern.label}`)
  addHistory('Cron解析', `${pattern.label}: ${pattern.value}`)
}

const copyExpression = () =>
  copyText(cronExpression.value.trim(), {
    successMessage: '已复制 Cron 表达式',
    history: 'Cron解析',
  })

const copyDescription = () => copyText(description.value, { successMessage: '已复制描述' })

const copySchedule = () => {
  if (!nextExecutions.value.length) return
  const lines = nextExecutions.value.map(
    (date, index) => `${index + 1}. ${formatDateTime(date)} ${formatWeekday(date)}`,
  )
  copyText(`${cronExpression.value.trim()}\n${description.value}\n\n${lines.join('\n')}`, {
    successMessage: '已复制执行计划',
  })
}

const clearInput = () => {
  cronExpression.value = '* * * * *'
}
</script>

<template>
  <div class="cron-parser">
    <h2>⏱️ Cron 表达式解析</h2>
    <p class="description">解析 5 字段 Cron 表达式，生成中文说明并预测接下来的执行时间（本地时区）</p>

    <div class="input-section">
      <div class="form-group">
        <label for="cron-input">Cron 表达式（分 时 日 月 周）</label>
        <div class="input-row">
          <input
            id="cron-input"
            v-model="cronExpression"
            placeholder="* * * * *（分 时 日 月 周）"
            class="cron-input"
            spellcheck="false"
            autocomplete="off"
            :aria-invalid="Boolean(error)"
          />
          <button type="button" class="btn btn-primary" title="复制表达式" @click="copyExpression">复制</button>
          <button type="button" class="btn btn-secondary" title="重置" @click="clearInput">重置</button>
        </div>
      </div>
    </div>

    <div class="quick-patterns">
      <label>常用表达式</label>
      <div class="pattern-buttons">
        <button
          v-for="pattern in CRON_PRESETS"
          :key="pattern.value"
          type="button"
          class="btn btn-pattern"
          :class="{ active: cronExpression.trim() === pattern.value }"
          @click="applyPattern(pattern)"
        >
          {{ pattern.label }}
          <span class="pattern-value">{{ pattern.value }}</span>
        </button>
      </div>
    </div>

    <div v-if="error" class="error-message" role="alert">{{ error }}</div>

    <div v-if="cronFields.length === 5" class="fields-breakdown">
      <label>字段分解</label>
      <div class="fields-grid">
        <div v-for="(field, idx) in cronFields" :key="idx" class="field-card">
          <div class="field-value">{{ field.value }}</div>
          <div class="field-label">{{ field.label }}</div>
          <div class="field-range">{{ field.range }}</div>
        </div>
      </div>
    </div>

    <div v-if="description" class="description-section">
      <div class="section-header">
        <label>执行说明</label>
        <button type="button" class="btn btn-small" @click="copyDescription">复制</button>
      </div>
      <div class="description-box">{{ description }}</div>
    </div>

    <div v-if="nextExecutions.length > 0" class="executions-section">
      <div class="section-header">
        <label>接下来 {{ nextExecutions.length }} 次执行时间</label>
        <div class="section-actions">
          <select v-model.number="runCount" class="count-select" aria-label="显示次数">
            <option v-for="count in runCountOptions" :key="count" :value="count">{{ count }} 次</option>
          </select>
          <button type="button" class="btn btn-small" @click="copySchedule">复制计划</button>
        </div>
      </div>
      <div class="execution-list">
        <div v-for="(exec, idx) in nextExecutions" :key="idx" class="execution-item">
          <span class="exec-index">{{ idx + 1 }}</span>
          <span class="exec-time">{{ formatDateTime(exec) }}</span>
          <span class="exec-relative">{{ formatRelativeTime(exec) }}</span>
          <span class="exec-weekday">{{ formatWeekday(exec) }}</span>
        </div>
      </div>
    </div>

    <div v-if="!error && parsed.ok && nextExecutions.length === 0" class="no-results">
      在未来 5 年内未找到匹配的执行时间（例如 2 月 31 日这类永不存在的日期）
    </div>

    <div class="syntax-help">
      <label>语法速查</label>
      <ul>
        <li><code>*</code> 任意值，<code>?</code> 与 <code>*</code> 等价</li>
        <li><code>1,3,5</code> 列表；<code>1-5</code> 范围；<code>*/15</code> 或 <code>5/15</code> 步进</li>
        <li>月份可用 <code>JAN-DEC</code>，星期可用 <code>SUN-SAT</code>，<code>7</code> 等同于周日</li>
        <li>日与周同时指定时，任一匹配即执行（与 Linux crontab 一致）</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.cron-parser {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  --tool-accent: #e91e63;
  --tool-accent-strong: #c2185b;
  --tool-soft: rgba(233, 30, 99, 0.1);
  --tool-border: rgba(233, 30, 99, 0.3);
}

h2 {
  margin: 0;
  color: var(--tool-accent);
  font-size: 1.8em;
}

.description {
  margin: 0;
  color: var(--text-3);
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
.executions-section label,
.syntax-help > label {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text);
}

.input-row {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.cron-input {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid var(--tool-border);
  border-radius: 8px;
  font-size: 1.1rem;
  font-family: var(--font-mono);
  background-color: var(--surface);
  color: var(--text);
  letter-spacing: 0.05em;
  transition: border-color 0.3s;
  min-width: 0;
}

.cron-input:focus {
  outline: none;
  border-color: var(--tool-accent);
  box-shadow: 0 0 0 3px var(--tool-soft);
}

.cron-input[aria-invalid='true'] {
  border-color: #c33;
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
  background-color: var(--tool-accent);
  color: white;
}

.btn-primary:hover {
  background-color: var(--tool-accent-strong);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(233, 30, 99, 0.3);
}

.btn-secondary {
  background-color: var(--surface-3);
  color: var(--text);
}

.btn-secondary:hover {
  background-color: var(--border);
}

.btn-small {
  padding: 0.3rem 0.8rem;
  font-size: 0.8rem;
  background-color: var(--tool-soft);
  color: var(--tool-accent);
  border: 1px solid var(--tool-border);
}

.btn-small:hover {
  background-color: var(--tool-border);
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
  background-color: var(--tool-soft);
  color: var(--tool-accent-strong);
  border: 1px solid var(--tool-border);
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

:global([data-theme='dark']) .btn-pattern {
  color: #f48fb1;
}

.btn-pattern:hover {
  background-color: var(--tool-border);
  transform: translateY(-2px);
  box-shadow: 0 3px 8px rgba(233, 30, 99, 0.15);
}

.btn-pattern.active {
  background-color: var(--tool-accent);
  color: white;
  border-color: var(--tool-accent);
}

.btn-pattern.active .pattern-value {
  color: rgba(255, 255, 255, 0.85);
}

.pattern-value {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-3);
}

.error-message {
  padding: 0.75rem;
  background-color: var(--danger-soft);
  color: #c33;
  border-radius: 6px;
  border-left: 4px solid #c33;
}

:global([data-theme='dark']) .error-message {
  color: #ff8a8a;
  border-left-color: #ff8a8a;
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
  gap: 0.3rem;
  padding: 1rem 0.5rem;
  background: var(--tool-soft);
  border: 1px solid var(--tool-border);
  border-radius: 10px;
  transition: transform 0.2s;
}

.field-card:hover {
  transform: translateY(-2px);
}

.field-value {
  font-family: var(--font-mono);
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--tool-accent);
  word-break: break-all;
  text-align: center;
}

:global([data-theme='dark']) .field-value {
  color: #f48fb1;
}

.field-label {
  font-size: 0.85rem;
  color: var(--text-2);
  font-weight: 600;
}

.field-range {
  font-size: 0.7rem;
  color: var(--text-3);
}

.description-section,
.executions-section,
.syntax-help {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.count-select {
  padding: 0.3rem 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--tool-border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.85rem;
}

.description-box {
  padding: 1rem;
  background: var(--tool-soft);
  border: 2px solid var(--tool-border);
  border-radius: 8px;
  font-size: 1rem;
  color: var(--text);
  line-height: 1.6;
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
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  transition: transform 0.2s;
}

.execution-item:hover {
  transform: translateX(4px);
  border-color: var(--tool-border);
}

.exec-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background-color: var(--tool-accent);
  color: white;
  border-radius: 50%;
  font-size: 0.85rem;
  font-weight: 600;
  flex-shrink: 0;
}

.exec-time {
  font-family: var(--font-mono);
  font-size: 1rem;
  color: var(--text);
  flex: 1;
}

.exec-relative {
  font-size: 0.85rem;
  color: var(--text-3);
}

.exec-weekday {
  font-size: 0.85rem;
  color: var(--tool-accent);
  font-weight: 500;
  padding: 0.2rem 0.6rem;
  background-color: var(--tool-soft);
  border-radius: 4px;
}

:global([data-theme='dark']) .exec-weekday {
  color: #f48fb1;
}

.no-results {
  padding: 1rem;
  text-align: center;
  color: var(--text-3);
  font-size: 0.95rem;
  background-color: var(--surface-2);
  border-radius: 8px;
}

.syntax-help ul {
  margin: 0;
  padding-left: 1.2rem;
  color: var(--text-2);
  font-size: 0.9rem;
  line-height: 1.7;
}

.syntax-help code {
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
  background: var(--surface-3);
  font-size: 0.85em;
}

@media (max-width: 768px) {
  .fields-grid {
    gap: 0.4rem;
  }

  .field-card {
    padding: 0.6rem 0.3rem;
  }

  .field-value {
    font-size: 1rem;
  }

  .field-range {
    display: none;
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
    gap: 0.3rem;
  }

  .field-value {
    font-size: 0.85rem;
  }

  .field-label {
    font-size: 0.75rem;
  }
}

:global([data-theme='dark']) h2 {
  color: #f48fb1;
}
</style>
