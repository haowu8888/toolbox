<script setup>
import { ref, watch, onUnmounted, provide } from 'vue'
import { useClipboard } from '../composables/useClipboard'
import { downloadJson as downloadJsonFile } from '../utils/download'
import { childPath, formatJsonText, stripBom } from '../utils/jsonFormat'
import JsonTreeNode from './JsonTreeNode.vue'

const { copyText } = useClipboard()

const INDENTS = { pretty: 2, pretty4: 4, compact: 0 }

const inputJson = ref('')
const outputJson = ref('')
const error = ref('')
const formatType = ref('pretty')
const viewMode = ref('text') // 'text' | 'tree'
const parsedData = ref(null)
const hasParsedData = ref(false)
const hasUnsafeNumbers = ref(false)
const collapsedPaths = ref(new Set())
let formatTimer = null

const resetResult = () => {
  outputJson.value = ''
  parsedData.value = null
  hasParsedData.value = false
  hasUnsafeNumbers.value = false
}

const formatJson = () => {
  if (!inputJson.value.trim()) {
    resetResult()
    error.value = ''
    return
  }

  try {
    // 文本视图走无损格式化：大整数、1.0、转义序列都原样保留
    const formatted = formatJsonText(inputJson.value, INDENTS[formatType.value] ?? 2)
    outputJson.value = formatted.text
    hasUnsafeNumbers.value = formatted.hasUnsafeNumbers
    parsedData.value = JSON.parse(stripBom(inputJson.value))
    hasParsedData.value = true
    error.value = ''
  } catch (err) {
    error.value = 'JSON 格式错误：' + err.message
    resetResult()
  }
}

// 树形视图状态，通过 provide 给递归的 JsonTreeNode 使用
const toggleCollapse = (path) => {
  const next = new Set(collapsedPaths.value)
  if (next.has(path)) next.delete(path)
  else next.add(path)
  collapsedPaths.value = next
}

const isCollapsed = (path) => collapsedPaths.value.has(path)

// 折叠除根节点以外的所有容器，保留第一层可见
const collapseAll = () => {
  const paths = new Set()
  const walk = (value, path) => {
    if (!value || typeof value !== 'object') return
    if (path !== '$') paths.add(path)
    if (Array.isArray(value)) value.forEach((item, index) => walk(item, childPath(path, index)))
    else Object.entries(value).forEach(([key, item]) => walk(item, childPath(path, key)))
  }
  walk(parsedData.value, '$')
  collapsedPaths.value = paths
}

const expandAll = () => {
  collapsedPaths.value = new Set()
}

const copyPath = (path) => copyText(path, { successMessage: `路径已复制：${path}` })

provide('jsonTree', { isCollapsed, toggle: toggleCollapse, copyPath })

const copyToClipboard = () =>
  copyText(outputJson.value, { successMessage: '已复制到剪贴板', history: 'JSON 格式化' })

const downloadJson = () => {
  if (!outputJson.value) return
  downloadJsonFile(outputJson.value, 'formatted.json')
}

const clearAll = () => {
  inputJson.value = ''
  error.value = ''
  resetResult()
  collapsedPaths.value = new Set()
}

const loadFile = (event) => {
  const input = event.target
  const file = input.files?.[0]
  // 清空 value，否则再次选择同一个文件不会触发 change
  input.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    inputJson.value = e.target?.result || ''
    formatJson()
  }
  reader.onerror = () => {
    error.value = '读取文件失败'
  }
  reader.readAsText(file)
}

const scheduleFormat = () => {
  if (formatTimer) clearTimeout(formatTimer)
  formatTimer = setTimeout(() => {
    formatTimer = null
    formatJson()
  }, 150)
}

watch(inputJson, scheduleFormat)
watch(formatType, formatJson)
// 新数据的路径与旧数据无关，重置折叠状态
watch(parsedData, () => {
  collapsedPaths.value = new Set()
})

onUnmounted(() => {
  if (formatTimer) {
    clearTimeout(formatTimer)
    formatTimer = null
  }
})
</script>

<template>
  <div class="json-formatter">
    <h2>JSON 格式化</h2>

    <div class="controls">
      <div class="format-options">
        <label>
          <input v-model="formatType" type="radio" value="pretty" />
          标准格式（2空格）
        </label>
        <label>
          <input v-model="formatType" type="radio" value="pretty4" />
          标准格式（4空格）
        </label>
        <label>
          <input v-model="formatType" type="radio" value="compact" />
          压缩格式
        </label>
      </div>

      <div class="button-group">
        <div class="view-toggle">
          <button :class="['toggle-btn', { active: viewMode === 'text' }]" @click="viewMode = 'text'">文本</button>
          <button :class="['toggle-btn', { active: viewMode === 'tree' }]" @click="viewMode = 'tree'">树形</button>
        </div>
        <label class="btn btn-file">
          <input type="file" accept=".json,application/json,text/plain" @change="loadFile" style="display: none" />
          📁 上传 JSON 文件
        </label>
        <button @click="clearAll" class="btn btn-secondary">清空</button>
      </div>
    </div>

    <div v-if="error" class="error-message" role="alert">{{ error }}</div>

    <div class="editor-container">
      <div class="editor">
        <div class="editor-label">输入</div>
        <textarea
          v-model="inputJson"
          placeholder="粘贴你的 JSON 内容或上传文件"
          class="editor-textarea"
        ></textarea>
      </div>

      <!-- 文本视图 -->
      <div v-if="viewMode === 'text'" class="editor">
        <div class="editor-label">输出</div>
        <textarea
          v-model="outputJson"
          readonly
          placeholder="格式化后的 JSON 将显示在这里"
          class="editor-textarea"
        ></textarea>
      </div>

      <!-- 树形视图 -->
      <div v-else class="editor">
        <div class="editor-label">
          树形视图
          <span v-if="hasParsedData" class="tree-controls">
            <button @click="expandAll" class="tree-ctrl-btn">全部展开</button>
            <button @click="collapseAll" class="tree-ctrl-btn">全部折叠</button>
          </span>
        </div>
        <div v-if="hasParsedData" class="tree-container">
          <p v-if="hasUnsafeNumbers" class="tree-note">
            ⚠️ 含超出 JavaScript 精度的大整数，树形视图中显示为近似值；文本视图保持原样。
          </p>
          <JsonTreeNode :value="parsedData" path="$" />
        </div>
        <div v-else class="tree-placeholder">解析 JSON 后显示树形结构</div>
      </div>
    </div>

    <div v-if="outputJson" class="output-actions">
      <button @click="copyToClipboard" class="btn btn-primary">📋 复制</button>
      <button @click="downloadJson" class="btn btn-primary">⬇️ 下载</button>
    </div>
  </div>
</template>

<style scoped>
.json-formatter {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  margin: 0;
  color: #42b883;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.format-options {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.format-options label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.95rem;
}

.format-options input[type="radio"] {
  cursor: pointer;
  accent-color: #42b883;
}

.button-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background-color: #42b883;
  color: white;
}

.btn-primary:hover {
  background-color: #359970;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 184, 131, 0.3);
}

.btn-secondary {
  background-color: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

.btn-file {
  background-color: #646cff;
  color: white;
}

.btn-file:hover {
  background-color: #535bf2;
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
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.editor-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #666;
}

.editor-textarea {
  flex: 1;
  min-height: 300px;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  resize: vertical;
}

.editor-textarea:focus {
  outline: none;
  border-color: #42b883;
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.1);
}

.editor-textarea[readonly] {
  background-color: #f9f9f9;
  color: #333;
}

.output-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

@media (max-width: 768px) {
  .editor-container {
    grid-template-columns: 1fr;
  }

  .format-options {
    gap: 1rem;
  }

  .button-group {
    flex-direction: column;
  }

  .btn {
    flex: 1;
  }
}

.view-toggle {
  display: flex;
  border: 2px solid #42b883;
  border-radius: 6px;
  overflow: hidden;
}

.toggle-btn {
  padding: 0.4rem 1rem;
  border: none;
  background: white;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  color: #42b883;
  transition: all 0.2s;
}

.toggle-btn.active {
  background: #42b883;
  color: white;
}

.tree-controls {
  margin-left: 1rem;
}

.tree-ctrl-btn {
  padding: 0.2rem 0.5rem;
  border: 1px solid #ccc;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  margin-left: 0.3rem;
  color: #666;
}

.tree-ctrl-btn:hover {
  background: #f0f0f0;
}

.tree-container {
  min-height: 300px;
  max-height: 500px;
  overflow: auto;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fafafa;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
}

.tree-note {
  margin: 0 0 0.75rem;
  font-family: system-ui, sans-serif;
  font-size: 0.8rem;
  color: #b26a00;
}

.tree-placeholder {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ccc;
  border-radius: 6px;
  color: #999;
  font-style: italic;
}











@media (prefers-color-scheme: light) {
  .format-options label {
    color: #213547;
  }

  .btn-secondary {
    background-color: #e8e8e8;
    color: #213547;
  }

  .btn-secondary:hover {
    background-color: #d8d8d8;
  }

  .editor-label {
    color: #555;
  }

  .editor-textarea {
    background-color: white;
    color: #213547;
    border-color: #d0d0d0;
  }

  .editor-textarea[readonly] {
    background-color: #f5f5f5;
    color: #213547;
  }

  .error-message {
    background-color: #ffe6e6;
  }
}

:root[data-theme='dark'] h2 {
  color: #5ec89f;
}

:root[data-theme='dark'] .format-options label {
  color: #e0e0e0;
}

:root[data-theme='dark'] .btn-secondary {
  background-color: #404050;
  color: #e0e0e0;
}

:root[data-theme='dark'] .btn-secondary:hover {
  background-color: #505060;
}

:root[data-theme='dark'] .editor-label {
  color: #a0a0a0;
}

:root[data-theme='dark'] .editor-textarea {
  background-color: #2a2a3e;
  color: #e0e0e0;
  border-color: #444;
}

:root[data-theme='dark'] .editor-textarea:focus {
  border-color: #5ec89f;
  box-shadow: 0 0 0 3px rgba(94, 200, 159, 0.1);
}

:root[data-theme='dark'] .editor-textarea[readonly] {
  background-color: #333;
  color: #e0e0e0;
}

:root[data-theme='dark'] .error-message {
  background-color: #4a2a2a;
  color: #ff6b6b;
  border-left-color: #ff6b6b;
}

:root[data-theme='dark'] .toggle-btn {
  background: #2a2a3e;
  color: #5ec89f;
}

:root[data-theme='dark'] .toggle-btn.active {
  background: #42b883;
  color: white;
}

:root[data-theme='dark'] .tree-container {
  background: #2a2a3e;
  border-color: #444;
}

:root[data-theme='dark'] .tree-placeholder {
  border-color: #444;
  color: #666;
}




:root[data-theme='dark'] .tree-ctrl-btn {
  border-color: #555;
  color: #a0a0a0;
}

:root[data-theme='dark'] .tree-ctrl-btn:hover {
  background: #3a3a4e;
}

</style>
