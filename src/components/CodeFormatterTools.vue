<script setup>
import { ref } from 'vue'
import { useClipboard } from '../composables/useClipboard'
import { useHistory } from '../composables/useStorage'
import { diffLines, formatSimpleDiff } from '../utils/diff'
import { formatJsonText } from '../utils/jsonFormat'
import { formatMarkup, minifyMarkup } from '../utils/markupFormat'
import { formatSql, minifySql } from '../utils/sqlFormat'

const { copyText } = useClipboard()
const { addHistory } = useHistory()

const inputCode = ref('')
const activeMode = ref('format')
const formatType = ref('json')
const indentSize = ref(2)
const output = ref('')
const sqlUppercase = ref(true)

const formatters = {
  // 无损：大整数 / 1.0 / 转义序列原样保留
  json: (code) => formatJsonText(code, indentSize.value).text,
  sql: (code) => formatSql(code, { indent: indentSize.value, uppercase: sqlUppercase.value }),
  html: (code) => formatMarkup(code, { indent: indentSize.value, html: true }),
  xml: (code) => formatMarkup(code, { indent: indentSize.value, html: false }),
}

const minifiers = {
  json: (code) => formatJsonText(code, 0).text,
  sql: (code) => minifySql(code),
  html: (code) => minifyMarkup(code, { html: true }),
  xml: (code) => minifyMarkup(code, { html: false }),
}

// 比较两个代码块
const code1 = ref('')
const code2 = ref('')
const diffResult = ref('')

const compareCode = () => {
  // 使用与「文本对比」工具相同的 patience diff 算法，而不是逐行位置比较
  const { entries } = diffLines(code1.value, code2.value)
  diffResult.value = entries.length ? formatSimpleDiff(entries) : ''
}

const format = () => {
  if (!inputCode.value.trim()) {
    output.value = ''
    return
  }

  try {
    output.value = formatters[formatType.value](inputCode.value)
    addHistory('代码格式化', output.value)
  } catch (err) {
    output.value = (formatType.value === 'json' ? 'JSON 解析错误：' : '格式化错误：') + err.message
  }
}

const copyToClipboard = (text) => copyText(text)

const minify = () => {
  if (!inputCode.value.trim()) {
    output.value = ''
    return
  }
  try {
    // 按语言分词后再压缩：字符串、<pre> 内容不会被改写，SQL 行注释会被移除以免吞掉后续代码
    output.value = minifiers[formatType.value](inputCode.value)
    addHistory('代码压缩', output.value)
  } catch (err) {
    output.value = '压缩失败：' + err.message
  }
}

const clearAll = () => {
  inputCode.value = ''
  output.value = ''
  code1.value = ''
  code2.value = ''
  diffResult.value = ''
}
</script>

<template>
  <div class="code-tools">
    <h2>💻 代码工具</h2>
    <p class="description">格式化、对比、优化代码</p>

    <div class="tabs" role="tablist" aria-label="代码工具模式">
      <button
        v-for="tab in ['format', 'compare']"
        :key="tab"
        type="button"
        role="tab"
        :id="`code-tab-${tab}`"
        :aria-controls="`code-panel-${tab}`"
        :aria-selected="activeMode === tab"
        :aria-label="tab === 'format' ? '切换到格式化模式' : '切换到对比模式'"
        :class="['tab-btn', { active: activeMode === tab }]"
        @click="activeMode = tab"
      >
        {{ tab === 'format' ? '✨ 格式化' : '🔍 对比' }}
      </button>
    </div>

    <!-- 格式化模式 -->
    <div
      v-if="activeMode === 'format'"
      id="code-panel-format"
      class="tool-section"
      role="tabpanel"
      aria-labelledby="code-tab-format"
    >
      <div class="controls">
        <select v-model="formatType" class="select-field" aria-label="代码类型">
          <option value="json">JSON</option>
          <option value="sql">SQL</option>
          <option value="html">HTML</option>
          <option value="xml">XML</option>
        </select>
        <label>
          缩进:
          <input v-model.number="indentSize" type="number" min="1" max="8" class="input-field" />
        </label>
        <button @click="format" class="btn btn-primary">✨ 格式化</button>
        <button @click="minify" class="btn btn-secondary">📦 压缩</button>
        <label v-if="formatType === 'sql'" class="checkbox-label">
          <input type="checkbox" v-model="sqlUppercase" />
          关键字大写
        </label>
      </div>

      <div class="editor-pair">
        <div class="editor">
          <div class="editor-label">输入</div>
          <textarea
            v-model="inputCode"
            placeholder="粘贴你的代码..."
            class="code-textarea"
          ></textarea>
        </div>
        <div class="editor">
          <div class="editor-label">输出</div>
          <textarea
            v-model="output"
            readonly
            placeholder="格式化后的结果"
            class="code-textarea"
          ></textarea>
          <button v-if="output" @click="copyToClipboard(output)" class="btn btn-copy">📋 复制</button>
        </div>
      </div>
    </div>

    <!-- 对比模式 -->
    <div
      v-else
      id="code-panel-compare"
      class="tool-section"
      role="tabpanel"
      aria-labelledby="code-tab-compare"
    >
      <div class="editor-pair-compare">
        <div class="editor">
          <div class="editor-label">代码 1</div>
          <textarea
            v-model="code1"
            placeholder="输入第一个代码..."
            class="code-textarea"
          ></textarea>
        </div>
        <div class="editor">
          <div class="editor-label">代码 2</div>
          <textarea
            v-model="code2"
            placeholder="输入第二个代码..."
            class="code-textarea"
          ></textarea>
        </div>
      </div>
      <button @click="compareCode" class="btn btn-primary">🔍 对比</button>

      <div v-if="diffResult" class="diff-result">
        <div class="diff-header">对比结果</div>
        <pre class="diff-content">{{ diffResult }}</pre>
        <button @click="copyToClipboard(diffResult)" class="btn btn-copy">📋 复制</button>
      </div>
    </div>

    <button @click="clearAll" class="btn btn-secondary">清空</button>
  </div>
</template>

<style scoped>
.code-tools {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  margin: 0;
  color: #9c27b0;
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
  justify-content: center;
}

.tab-btn {
  padding: 0.6rem 1.2rem;
  border: 2px solid #e0bee7;
  background-color: white;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  color: #666;
}

:root[data-theme='dark'] .tab-btn {
  background-color: #2a2a3a;
  border-color: #4a3a5a;
  color: #a0c0e0;
}

.tab-btn.active {
  background-color: #9c27b0;
  color: white;
  border-color: #9c27b0;
  box-shadow: 0 4px 12px rgba(156, 39, 176, 0.3);
}

.tool-section {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f9f5fb;
  border-radius: 8px;
}

:root[data-theme='dark'] .controls {
  background: #2a2a3a;
  color: #e0e0e0;
}

.select-field,
.input-field {
  padding: 0.5rem;
  border: 2px solid #e0bee7;
  border-radius: 6px;
  font-size: 0.95rem;
  background-color: white;
  color: #333;
  cursor: pointer;
}

:root[data-theme='dark'] .select-field,
:root[data-theme='dark'] .input-field {
  background-color: #1a1a2e;
  border-color: #4a3a5a;
  color: #e0e0e0;
}

.editor-pair,
.editor-pair-compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.editor-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #555;
}

:root[data-theme='dark'] .editor-label {
  color: #a0c0e0;
}

.code-textarea {
  flex: 1;
  min-height: 300px;
  padding: 0.75rem;
  border: 2px solid #e0bee7;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  background-color: white;
  color: #333;
  resize: vertical;
  transition: border-color 0.3s;
}

:root[data-theme='dark'] .code-textarea {
  background-color: #1a1a2e;
  border-color: #4a3a5a;
  color: #e0e0e0;
}

.code-textarea:focus {
  outline: none;
  border-color: #9c27b0;
  box-shadow: 0 0 0 3px rgba(156, 39, 176, 0.1);
}

.code-textarea[readonly] {
  background-color: #f5f5f5;
}

:root[data-theme='dark'] .code-textarea[readonly] {
  background-color: #2a2a3a;
}

.btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background-color: #9c27b0;
  color: white;
}

.btn-primary:hover {
  background-color: #8b1fa0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(156, 39, 176, 0.3);
}

.btn-secondary {
  background-color: #f0f0f0;
  color: #333;
}

:root[data-theme='dark'] .btn-secondary {
  background-color: #2a2a3a;
  color: #e0e0e0;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

:root[data-theme='dark'] .btn-secondary:hover {
  background-color: #3a3a4a;
}

.btn-copy {
  padding: 0.4rem 0.8rem;
  border: 1px solid #9c27b0;
  background-color: white;
  color: #9c27b0;
  border-radius: 4px;
  font-size: 0.85rem;
  transition: all 0.2s;
}

:root[data-theme='dark'] .btn-copy {
  background-color: #1a1a2e;
}

.btn-copy:hover {
  background-color: #9c27b0;
  color: white;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: #555;
  cursor: pointer;
  white-space: nowrap;
}

.checkbox-label input[type="checkbox"] {
  accent-color: #9c27b0;
  width: 16px;
  height: 16px;
  cursor: pointer;
}

:root[data-theme='dark'] .checkbox-label {
  color: #a0c0e0;
}

.diff-result {
  background: #f5f5f5;
  border: 2px solid #e0bee7;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
}

:root[data-theme='dark'] .diff-result {
  background: #2a2a3a;
  border-color: #4a3a5a;
}

.diff-header {
  font-weight: 600;
  color: #555;
  margin-bottom: 0.75rem;
}

:root[data-theme='dark'] .diff-header {
  color: #a0c0e0;
}

.diff-content {
  margin: 0;
  padding: 0.75rem;
  background: white;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  max-height: 300px;
  overflow-y: auto;
  color: #333;
  line-height: 1.4;
}

:root[data-theme='dark'] .diff-content {
  background: #1a1a2e;
  color: #e0e0e0;
}

@media (max-width: 768px) {
  .editor-pair,
  .editor-pair-compare {
    grid-template-columns: 1fr;
  }

  .controls {
    flex-direction: column;
    align-items: stretch;
  }

  .select-field,
  .input-field {
    width: 100%;
  }

  .btn {
    flex: 1;
  }
}

/* Dark mode overrides */
:root[data-theme='dark'] h2 {
  color: #ce93d8;
}

:root[data-theme='dark'] .description {
  color: #a0c0e0;
}
</style>
