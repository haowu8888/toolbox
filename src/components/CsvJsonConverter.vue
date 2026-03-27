<script setup>
import { ref } from 'vue'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()

const mode = ref('csv2json') // csv2json | json2csv
const delimiter = ref(',')
const hasHeader = ref(true)

const csvInput = ref('')
const jsonInput = ref('')
const output = ref('')
const error = ref('')

const delimiterLabel = (d) => (d === '\t' ? 'Tab' : '逗号')

const parseDelimited = (text, delim) => {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === '\r') continue

    if (char === delim) {
      row.push(field)
      field = ''
      continue
    }

    if (char === '\n') {
      row.push(field)
      field = ''
      rows.push(row)
      row = []
      continue
    }

    field += char
  }

  row.push(field)
  rows.push(row)

  return rows.filter((r) => r.some((c) => c !== ''))
}

const escapeCsvField = (value, delim) => {
  const raw = value === null || value === undefined ? '' : String(value)
  const escaped = raw.replaceAll('"', '""')
  const needsQuote = escaped.includes('"') || escaped.includes('\n') || escaped.includes('\r') || escaped.includes(delim)
  return needsQuote ? `"${escaped}"` : escaped
}

const toCsv = (objects, delim) => {
  const headers = []
  const headerSet = new Set()

  const addHeader = (key) => {
    if (headerSet.has(key)) return
    headerSet.add(key)
    headers.push(key)
  }

  for (const obj of objects) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) continue
    Object.keys(obj).forEach(addHeader)
  }

  const lines = []
  lines.push(headers.map((h) => escapeCsvField(h, delim)).join(delim))

  for (const obj of objects) {
    const line = headers
      .map((h) => {
        const value = obj && typeof obj === 'object' ? obj[h] : ''
        return escapeCsvField(value, delim)
      })
      .join(delim)
    lines.push(line)
  }

  return lines.join('\n')
}

const convert = () => {
  error.value = ''
  output.value = ''

  try {
    if (mode.value === 'csv2json') {
      if (!csvInput.value.trim()) return
      const rows = parseDelimited(csvInput.value.trim(), delimiter.value)
      if (rows.length === 0) return

      const headers = hasHeader.value
        ? rows[0].map((h) => h.trim())
        : rows[0].map((_, idx) => `col${idx + 1}`)

      const dataRows = hasHeader.value ? rows.slice(1) : rows
      const list = dataRows.map((r) => {
        const obj = {}
        headers.forEach((h, idx) => {
          obj[h] = r[idx] ?? ''
        })
        return obj
      })

      output.value = JSON.stringify(list, null, 2)
      addHistory('CSV 转 JSON', `行数: ${list.length}，分隔符: ${delimiterLabel(delimiter.value)}`)
      showToast('转换完成')
    } else {
      if (!jsonInput.value.trim()) return
      const parsed = JSON.parse(jsonInput.value)
      const list = Array.isArray(parsed) ? parsed : [parsed]

      if (list.some((v) => !v || typeof v !== 'object' || Array.isArray(v))) {
        throw new Error('JSON 需为对象数组（或单个对象）')
      }

      output.value = toCsv(list, delimiter.value)
      addHistory('JSON 转 CSV', `行数: ${list.length}，分隔符: ${delimiterLabel(delimiter.value)}`)
      showToast('转换完成')
    }
  } catch (err) {
    error.value = err.message || '转换失败'
  }
}

const copyToClipboard = async () => {
  if (!output.value) return
  try {
    await navigator.clipboard.writeText(output.value)
    showToast('已复制')
  } catch (err) {
    showToast('复制失败', 'error')
  }
}

const swap = () => {
  if (mode.value === 'csv2json') {
    jsonInput.value = output.value
  } else {
    csvInput.value = output.value
  }
}

const clearAll = () => {
  csvInput.value = ''
  jsonInput.value = ''
  output.value = ''
  error.value = ''
}
</script>

<template>
  <div class="csv-json">
    <h2>🧾 CSV ↔ JSON</h2>
    <p class="description">CSV / TSV 与 JSON 数组互转</p>

    <div class="controls">
      <div class="tabs">
        <button :class="['tab-btn', { active: mode === 'csv2json' }]" @click="mode = 'csv2json'; output = ''">
          CSV → JSON
        </button>
        <button :class="['tab-btn', { active: mode === 'json2csv' }]" @click="mode = 'json2csv'; output = ''">
          JSON → CSV
        </button>
      </div>

      <div class="options">
        <label>
          <span>分隔符：</span>
          <select v-model="delimiter" class="select">
            <option value=",">逗号 (,)</option>
            <option value="\t">Tab (TSV)</option>
          </select>
        </label>
        <label v-if="mode === 'csv2json'">
          <input v-model="hasHeader" type="checkbox" />
          首行是表头
        </label>
      </div>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div class="editor-container">
      <div class="editor">
        <div class="editor-label">{{ mode === 'csv2json' ? 'CSV/TSV 输入' : 'JSON 输入' }}</div>
        <textarea
          v-if="mode === 'csv2json'"
          v-model="csvInput"
          class="editor-textarea"
          placeholder="name,age\nAlice,18\nBob,20"
        ></textarea>
        <textarea
          v-else
          v-model="jsonInput"
          class="editor-textarea"
          placeholder='[{"name":"Alice","age":18},{"name":"Bob","age":20}]'
        ></textarea>
      </div>

      <div class="mid-actions">
        <button class="btn btn-primary" @click="convert">转换</button>
        <button class="btn btn-secondary" :disabled="!output" @click="swap">输出 → 输入</button>
      </div>

      <div class="editor">
        <div class="editor-label">输出</div>
        <textarea v-model="output" readonly class="editor-textarea" placeholder="转换结果将显示在这里"></textarea>
      </div>
    </div>

    <div class="action-buttons">
      <button class="btn btn-primary" :disabled="!output" @click="copyToClipboard">📋 复制</button>
      <button class="btn btn-secondary" @click="clearAll">清空</button>
    </div>
  </div>
</template>

<style scoped>
.csv-json {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

h2 {
  margin: 0;
  color: #00bcd4;
  font-size: 1.8em;
}

.description {
  margin: 0;
  color: #888;
  font-size: 0.95rem;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 0.6rem 1rem;
  border: 2px solid #b2ebf2;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-weight: 600;
}

.tab-btn.active {
  background: #00bcd4;
  border-color: #00bcd4;
  color: white;
}

.options {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.select {
  margin-left: 0.25rem;
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  border: 1px solid #b2ebf2;
}

.error-message {
  padding: 0.75rem;
  background-color: #fee;
  color: #c33;
  border-radius: 6px;
  border-left: 4px solid #c33;
}

.editor-container {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 1rem;
  align-items: start;
}

.editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.editor-label {
  font-weight: 700;
  color: #333;
}

.editor-textarea {
  width: 100%;
  min-height: 320px;
  padding: 0.75rem;
  border: 2px solid #b2ebf2;
  border-radius: 10px;
  font-family: 'Courier New', monospace;
  resize: vertical;
}

.mid-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 1.9rem;
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.7rem 1.1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #00bcd4;
  color: white;
}

.btn-secondary {
  background: #e0f7fa;
  color: #007c8a;
}

@media (max-width: 900px) {
  .editor-container {
    grid-template-columns: 1fr;
  }
  .mid-actions {
    padding-top: 0;
    flex-direction: row;
    flex-wrap: wrap;
  }
}

:global([data-theme='dark']) .description {
  color: #a0a0a0;
}

:global([data-theme='dark']) .tab-btn {
  background: #2a2a3e;
  border-color: #00bcd4;
  color: #b2ebf2;
}

:global([data-theme='dark']) .tab-btn.active {
  background: #00bcd4;
  color: #102026;
}

:global([data-theme='dark']) .editor-label {
  color: #e0e0e0;
}

:global([data-theme='dark']) .editor-textarea {
  background-color: #2a2a3e;
  color: #e0e0e0;
  border-color: #007c8a;
}

:global([data-theme='dark']) .btn-secondary {
  background-color: #2a2a3e;
  color: #b2ebf2;
  border: 1px solid rgba(0, 188, 212, 0.35);
}
</style>

