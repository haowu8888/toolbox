<script setup>
import { computed, ref } from 'vue'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'
import { parseQueryString, safeParseUrl, stringifyQuery } from '../utils/urlUtils'

const { showToast } = useToast()
const { addHistory } = useHistory()

const activeTab = ref('parse')

const urlInput = ref('https://example.com/path?a=1&b=2#hash')
const encodeInput = ref('https://example.com/中文?a=1&b=🙂')

const queryInput = ref('a=1&b=2&b=3')
const queryJsonInput = ref('{\n  "a": "1",\n  "b": ["2", "3"]\n}')

const parsedUrl = computed(() => safeParseUrl(urlInput.value).url)
const urlError = computed(() => safeParseUrl(urlInput.value).error)

const paramsObject = computed(() => {
  const u = parsedUrl.value
  if (!u) return {}
  const obj = {}
  for (const [key, value] of u.searchParams.entries()) {
    if (Object.hasOwn(obj, key)) {
      const prev = obj[key]
      obj[key] = Array.isArray(prev) ? [...prev, value] : [prev, value]
    } else {
      obj[key] = value
    }
  }
  return obj
})

const paramsJson = computed(() => JSON.stringify(paramsObject.value, null, 2))

const encodeURIComponentResult = computed(() => encodeURIComponent(encodeInput.value))
const decodeURIComponentResult = computed(() => {
  try {
    return decodeURIComponent(encodeInput.value)
  } catch {
    return '无法解码：请确认输入是否为 encodeURIComponent 结果'
  }
})
const encodeURIResult = computed(() => encodeURI(encodeInput.value))
const decodeURIResult = computed(() => {
  try {
    return decodeURI(encodeInput.value)
  } catch {
    return '无法解码：请确认输入是否为 encodeURI 结果'
  }
})

const convertQueryToJson = () => {
  try {
    const obj = parseQueryString(queryInput.value)
    queryJsonInput.value = JSON.stringify(obj, null, 2)
    addHistory('Query → JSON', queryJsonInput.value)
  } catch (err) {
    showToast(`解析失败：${err?.message || err}`, 'error')
  }
}

const convertJsonToQuery = () => {
  try {
    const obj = JSON.parse(queryJsonInput.value || '{}')
    queryInput.value = stringifyQuery(obj)
    addHistory('JSON → Query', queryInput.value)
  } catch (err) {
    showToast(`JSON 解析失败：${err?.message || err}`, 'error')
  }
}

const copyToClipboard = async (text, historyType = '') => {
  try {
    await navigator.clipboard.writeText(String(text ?? ''))
    showToast('已复制')
    if (historyType) addHistory(historyType, String(text ?? ''))
  } catch {
    showToast('复制失败', 'error')
  }
}
</script>

<template>
  <div class="url-tools">
    <h2>🔗 URL 工具</h2>
    <p class="description">URL 解析、URL 编解码、QueryString ↔ JSON</p>

    <div class="tabs">
      <button
        type="button"
        :class="['tab-btn', { active: activeTab === 'parse' }]"
        @click="activeTab = 'parse'"
      >
        🧩 解析
      </button>
      <button
        type="button"
        :class="['tab-btn', { active: activeTab === 'encode' }]"
        @click="activeTab = 'encode'"
      >
        🔐 编解码
      </button>
      <button
        type="button"
        :class="['tab-btn', { active: activeTab === 'query' }]"
        @click="activeTab = 'query'"
      >
        🧾 Query ↔ JSON
      </button>
    </div>

    <!-- 解析 -->
    <div v-if="activeTab === 'parse'" class="tool-section">
      <textarea
        v-model="urlInput"
        class="input-textarea"
        placeholder="输入 URL，例如：https://example.com/path?a=1&b=2#hash"
        aria-label="URL 输入"
      ></textarea>

      <div v-if="urlError" class="error-text" role="alert">{{ urlError }}</div>

      <div v-else-if="parsedUrl" class="result-grid">
        <div class="result-item">
          <div class="result-label">origin</div>
          <div class="result-value">
            <code>{{ parsedUrl.origin }}</code>
            <button class="btn-copy" @click="copyToClipboard(parsedUrl.origin, 'URL 复制')">📋</button>
          </div>
        </div>
        <div class="result-item">
          <div class="result-label">pathname</div>
          <div class="result-value">
            <code>{{ parsedUrl.pathname }}</code>
            <button class="btn-copy" @click="copyToClipboard(parsedUrl.pathname, 'URL 复制')">📋</button>
          </div>
        </div>
        <div class="result-item">
          <div class="result-label">search</div>
          <div class="result-value">
            <code>{{ parsedUrl.search || '(empty)' }}</code>
            <button class="btn-copy" @click="copyToClipboard(parsedUrl.search, 'URL 复制')">📋</button>
          </div>
        </div>
        <div class="result-item">
          <div class="result-label">hash</div>
          <div class="result-value">
            <code>{{ parsedUrl.hash || '(empty)' }}</code>
            <button class="btn-copy" @click="copyToClipboard(parsedUrl.hash, 'URL 复制')">📋</button>
          </div>
        </div>
        <div class="result-item full">
          <div class="result-label">params (JSON)</div>
          <div class="result-value column">
            <textarea class="output-textarea" readonly :value="paramsJson" aria-label="URL 参数 JSON"></textarea>
            <div class="row">
              <button class="btn btn-primary" @click="copyToClipboard(paramsJson, 'URL 参数复制')">📋 复制 JSON</button>
              <button class="btn btn-secondary" @click="copyToClipboard(parsedUrl.href, 'URL 复制')">📋 复制完整 URL</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 编解码 -->
    <div v-else-if="activeTab === 'encode'" class="tool-section">
      <textarea
        v-model="encodeInput"
        class="input-textarea"
        placeholder="输入需要编解码的内容（URL 或任意字符串）"
        aria-label="编解码输入"
      ></textarea>

      <div class="encode-grid">
        <div class="encode-item">
          <div class="encode-title">encodeURIComponent</div>
          <textarea class="output-textarea" readonly :value="encodeURIComponentResult"></textarea>
          <button class="btn btn-primary" @click="copyToClipboard(encodeURIComponentResult, 'URL 编码复制')">
            📋 复制
          </button>
        </div>

        <div class="encode-item">
          <div class="encode-title">decodeURIComponent</div>
          <textarea class="output-textarea" readonly :value="decodeURIComponentResult"></textarea>
          <button class="btn btn-primary" @click="copyToClipboard(decodeURIComponentResult, 'URL 解码复制')">
            📋 复制
          </button>
        </div>

        <div class="encode-item">
          <div class="encode-title">encodeURI</div>
          <textarea class="output-textarea" readonly :value="encodeURIResult"></textarea>
          <button class="btn btn-primary" @click="copyToClipboard(encodeURIResult, 'URL 编码复制')">
            📋 复制
          </button>
        </div>

        <div class="encode-item">
          <div class="encode-title">decodeURI</div>
          <textarea class="output-textarea" readonly :value="decodeURIResult"></textarea>
          <button class="btn btn-primary" @click="copyToClipboard(decodeURIResult, 'URL 解码复制')">
            📋 复制
          </button>
        </div>
      </div>
    </div>

    <!-- Query ↔ JSON -->
    <div v-else class="tool-section">
      <div class="pair">
        <div class="col">
          <div class="label">QueryString</div>
          <textarea
            v-model="queryInput"
            class="input-textarea"
            placeholder="a=1&b=2&b=3"
            aria-label="QueryString 输入"
          ></textarea>
          <button class="btn btn-primary" @click="convertQueryToJson">➡️ 转 JSON</button>
        </div>
        <div class="col">
          <div class="label">JSON</div>
          <textarea
            v-model="queryJsonInput"
            class="input-textarea"
            placeholder='{"a":"1"}'
            aria-label="Query JSON 输入"
          ></textarea>
          <button class="btn btn-primary" @click="convertJsonToQuery">⬅️ 转 Query</button>
        </div>
      </div>

      <div class="actions">
        <button class="btn btn-secondary" @click="copyToClipboard(queryInput, 'Query 复制')">📋 复制 Query</button>
        <button class="btn btn-secondary" @click="copyToClipboard(queryJsonInput, 'Query JSON 复制')">
          📋 复制 JSON
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.url-tools {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  margin: 0;
  color: #2196f3;
  font-size: 1.8em;
}

.description {
  margin: 0;
  color: #888;
  font-size: 0.95rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.tab-btn {
  padding: 0.6rem 1.2rem;
  border: 2px solid rgba(33, 150, 243, 0.25);
  background-color: white;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s;
  color: #555;
}

:global([data-theme='dark'] .tab-btn) {
  background-color: #2a2a2a;
  border-color: rgba(33, 150, 243, 0.35);
  color: #a0c0e0;
}

.tab-btn.active {
  background-color: #2196f3;
  color: white;
  border-color: #2196f3;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.25);
}

.input-textarea,
.output-textarea {
  width: 100%;
  min-height: 120px;
  padding: 0.8rem;
  border-radius: 10px;
  border: 2px solid rgba(33, 150, 243, 0.15);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.95rem;
  line-height: 1.45;
  resize: vertical;
}

.output-textarea {
  background: rgba(255, 255, 255, 0.6);
}

:global([data-theme='dark'] .input-textarea),
:global([data-theme='dark'] .output-textarea) {
  border-color: rgba(33, 150, 243, 0.25);
}

.error-text {
  color: #ff6b6b;
  font-weight: 700;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.result-item {
  padding: 0.9rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

:global([data-theme='dark'] .result-item) {
  background: rgba(26, 26, 46, 0.55);
  border-color: rgba(255, 255, 255, 0.08);
}

.result-item.full {
  grid-column: 1 / -1;
}

.result-label {
  font-weight: 800;
  color: #444;
  margin-bottom: 0.4rem;
}

:global([data-theme='dark'] .result-label) {
  color: #d6e6f3;
}

.result-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.result-value.column {
  flex-direction: column;
  align-items: stretch;
}

.row {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.btn-copy {
  padding: 0.35rem 0.7rem;
  border-radius: 8px;
  border: 1px solid rgba(33, 150, 243, 0.25);
  box-shadow: none;
}

.encode-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}

.encode-item {
  padding: 0.9rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

:global([data-theme='dark'] .encode-item) {
  background: rgba(26, 26, 46, 0.55);
  border-color: rgba(255, 255, 255, 0.08);
}

.encode-title {
  font-weight: 900;
  color: #444;
}

:global([data-theme='dark'] .encode-title) {
  color: #d6e6f3;
}

.pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.label {
  font-weight: 800;
  margin-bottom: 0.5rem;
  color: #444;
}

:global([data-theme='dark'] .label) {
  color: #d6e6f3;
}

.col {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

@media (max-width: 900px) {
  .result-grid,
  .encode-grid,
  .pair {
    grid-template-columns: 1fr;
  }
}
</style>
