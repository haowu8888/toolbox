<script setup>
import { ref, computed } from 'vue'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()

const inputJson = ref('')
const outputJson = ref('')
const error = ref('')
const formatType = ref('pretty')
const viewMode = ref('text') // 'text' | 'tree'
const parsedData = ref(null)
const collapsedPaths = ref(new Set())

const formatJson = () => {
  if (!inputJson.value.trim()) {
    outputJson.value = ''
    error.value = ''
    parsedData.value = null
    return
  }

  try {
    error.value = ''
    const parsed = JSON.parse(inputJson.value)
    parsedData.value = parsed

    if (formatType.value === 'pretty') {
      outputJson.value = JSON.stringify(parsed, null, 2)
    } else if (formatType.value === 'compact') {
      outputJson.value = JSON.stringify(parsed)
    } else if (formatType.value === 'pretty4') {
      outputJson.value = JSON.stringify(parsed, null, 4)
    }
  } catch (err) {
    error.value = 'JSON 格式错误：' + err.message
    outputJson.value = ''
    parsedData.value = null
  }
}

// 树形视图辅助函数
const getType = (val) => {
  if (val === null) return 'null'
  if (Array.isArray(val)) return 'array'
  return typeof val
}

const toggleCollapse = (path) => {
  const newSet = new Set(collapsedPaths.value)
  if (newSet.has(path)) {
    newSet.delete(path)
  } else {
    newSet.add(path)
  }
  collapsedPaths.value = newSet
}

const isCollapsed = (path) => collapsedPaths.value.has(path)

const collapseAll = () => {
  const paths = new Set()
  const walk = (obj, path) => {
    if (obj && typeof obj === 'object') {
      paths.add(path)
      Object.keys(obj).forEach(key => {
        walk(obj[key], path ? `${path}.${key}` : key)
      })
    }
  }
  walk(parsedData.value, '$')
  collapsedPaths.value = paths
}

const expandAll = () => {
  collapsedPaths.value = new Set()
}

const copyPath = async (path) => {
  try {
    await navigator.clipboard.writeText(path)
    showToast('路径已复制')
  } catch (err) {
    showToast('复制失败', 'error')
  }
}

const copyToClipboard = async () => {
  if (!outputJson.value) return
  try {
    await navigator.clipboard.writeText(outputJson.value)
    showToast('已复制到剪贴板')
    addHistory('JSON 格式化', outputJson.value)
  } catch (err) {
    showToast('复制失败：' + err.message, 'error')
  }
}

const downloadJson = () => {
  if (!outputJson.value) return
  const blob = new Blob([outputJson.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'formatted.json'
  link.click()
  URL.revokeObjectURL(url)
}

const clearAll = () => {
  inputJson.value = ''
  outputJson.value = ''
  error.value = ''
  parsedData.value = null
  collapsedPaths.value = new Set()
}

const loadFile = (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    inputJson.value = e.target?.result || ''
    formatJson()
  }
  reader.readAsText(file)
}

const handleInputChange = () => {
  formatJson()
}

// 树形视图递归渲染数据
const getEntries = (data) => {
  if (Array.isArray(data)) {
    return data.map((v, i) => ({ key: i, value: v }))
  }
  return Object.entries(data).map(([k, v]) => ({ key: k, value: v }))
}

const getPreview = (data) => {
  if (Array.isArray(data)) return `Array(${data.length})`
  return `Object{${Object.keys(data).length}}`
}
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
          <input type="file" accept=".json" @change="loadFile" style="display: none" />
          📁 上传 JSON 文件
        </label>
        <button @click="clearAll" class="btn btn-secondary">清空</button>
      </div>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div class="editor-container">
      <div class="editor">
        <div class="editor-label">输入</div>
        <textarea
          v-model="inputJson"
          @input="handleInputChange"
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
          <span v-if="parsedData !== null" class="tree-controls">
            <button @click="expandAll" class="tree-ctrl-btn">全部展开</button>
            <button @click="collapseAll" class="tree-ctrl-btn">全部折叠</button>
          </span>
        </div>
        <div v-if="parsedData !== null" class="tree-container">
          <div class="tree-root">
            <template v-if="typeof parsedData === 'object' && parsedData !== null">
              <div v-for="entry in getEntries(parsedData)" :key="entry.key" class="tree-node">
                <template v-if="entry.value && typeof entry.value === 'object'">
                  <span class="tree-toggle" @click="toggleCollapse('$.' + entry.key)">
                    {{ isCollapsed('$.' + entry.key) ? '▶' : '▼' }}
                  </span>
                  <span class="tree-key" @click="copyPath('$.' + entry.key)" title="点击复制路径">{{ entry.key }}</span>
                  <span class="tree-colon">:</span>
                  <span class="tree-preview">{{ getPreview(entry.value) }}</span>
                  <div v-if="!isCollapsed('$.' + entry.key)" class="tree-children">
                    <div v-for="child in getEntries(entry.value)" :key="child.key" class="tree-node">
                      <template v-if="child.value && typeof child.value === 'object'">
                        <span class="tree-toggle" @click="toggleCollapse('$.' + entry.key + '.' + child.key)">
                          {{ isCollapsed('$.' + entry.key + '.' + child.key) ? '▶' : '▼' }}
                        </span>
                        <span class="tree-key" @click="copyPath('$.' + entry.key + '.' + child.key)" title="点击复制路径">{{ child.key }}</span>
                        <span class="tree-colon">:</span>
                        <span class="tree-preview">{{ getPreview(child.value) }}</span>
                        <div v-if="!isCollapsed('$.' + entry.key + '.' + child.key)" class="tree-children">
                          <div v-for="grandchild in getEntries(child.value)" :key="grandchild.key" class="tree-node">
                            <span class="tree-leaf-space"></span>
                            <span class="tree-key" @click="copyPath('$.' + entry.key + '.' + child.key + '.' + grandchild.key)" title="点击复制路径">{{ grandchild.key }}</span>
                            <span class="tree-colon">:</span>
                            <span :class="'tree-value type-' + getType(grandchild.value)">{{ grandchild.value === null ? 'null' : typeof grandchild.value === 'object' ? JSON.stringify(grandchild.value) : JSON.stringify(grandchild.value) }}</span>
                          </div>
                        </div>
                      </template>
                      <template v-else>
                        <span class="tree-leaf-space"></span>
                        <span class="tree-key" @click="copyPath('$.' + entry.key + '.' + child.key)" title="点击复制路径">{{ child.key }}</span>
                        <span class="tree-colon">:</span>
                        <span :class="'tree-value type-' + getType(child.value)">{{ child.value === null ? 'null' : JSON.stringify(child.value) }}</span>
                      </template>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <span class="tree-leaf-space"></span>
                  <span class="tree-key" @click="copyPath('$.' + entry.key)" title="点击复制路径">{{ entry.key }}</span>
                  <span class="tree-colon">:</span>
                  <span :class="'tree-value type-' + getType(entry.value)">{{ entry.value === null ? 'null' : JSON.stringify(entry.value) }}</span>
                </template>
              </div>
            </template>
            <template v-else>
              <span :class="'tree-value type-' + getType(parsedData)">{{ JSON.stringify(parsedData) }}</span>
            </template>
          </div>
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

.tree-node {
  line-height: 1.6;
}

.tree-children {
  padding-left: 1.5rem;
  border-left: 1px dashed #ddd;
  margin-left: 0.4rem;
}

.tree-toggle {
  cursor: pointer;
  display: inline-block;
  width: 1rem;
  text-align: center;
  color: #999;
  font-size: 0.7rem;
  user-select: none;
}

.tree-toggle:hover {
  color: #42b883;
}

.tree-leaf-space {
  display: inline-block;
  width: 1rem;
}

.tree-key {
  color: #881391;
  cursor: pointer;
  font-weight: 600;
}

.tree-key:hover {
  text-decoration: underline;
}

.tree-colon {
  color: #333;
  margin: 0 0.3rem;
}

.tree-preview {
  color: #999;
  font-size: 0.8rem;
  font-style: italic;
}

.tree-value.type-string { color: #0B7500; }
.tree-value.type-number { color: #1A01CC; }
.tree-value.type-boolean { color: #FF6B6B; }
.tree-value.type-null { color: #808080; font-style: italic; }

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

:global([data-theme='dark'] h2) {
  color: #5ec89f;
}

:global([data-theme='dark'] .format-options label) {
  color: #e0e0e0;
}

:global([data-theme='dark'] .btn-secondary) {
  background-color: #404050;
  color: #e0e0e0;
}

:global([data-theme='dark'] .btn-secondary:hover) {
  background-color: #505060;
}

:global([data-theme='dark'] .editor-label) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .editor-textarea) {
  background-color: #2a2a3e;
  color: #e0e0e0;
  border-color: #444;
}

:global([data-theme='dark'] .editor-textarea:focus) {
  border-color: #5ec89f;
  box-shadow: 0 0 0 3px rgba(94, 200, 159, 0.1);
}

:global([data-theme='dark'] .editor-textarea[readonly]) {
  background-color: #333;
  color: #e0e0e0;
}

:global([data-theme='dark'] .error-message) {
  background-color: #4a2a2a;
  color: #ff6b6b;
  border-left-color: #ff6b6b;
}

:global([data-theme='dark'] .toggle-btn) {
  background: #2a2a3e;
  color: #5ec89f;
}

:global([data-theme='dark'] .toggle-btn.active) {
  background: #42b883;
  color: white;
}

:global([data-theme='dark'] .tree-container) {
  background: #2a2a3e;
  border-color: #444;
}

:global([data-theme='dark'] .tree-placeholder) {
  border-color: #444;
  color: #666;
}

:global([data-theme='dark'] .tree-children) {
  border-left-color: #555;
}

:global([data-theme='dark'] .tree-key) {
  color: #c792ea;
}

:global([data-theme='dark'] .tree-colon) {
  color: #e0e0e0;
}

:global([data-theme='dark'] .tree-ctrl-btn) {
  border-color: #555;
  color: #a0a0a0;
}

:global([data-theme='dark'] .tree-ctrl-btn:hover) {
  background: #3a3a4e;
}

:global([data-theme='dark'] .tree-value.type-string) { color: #c3e88d; }
:global([data-theme='dark'] .tree-value.type-number) { color: #f78c6c; }
:global([data-theme='dark'] .tree-value.type-boolean) { color: #ff5370; }
:global([data-theme='dark'] .tree-value.type-null) { color: #808080; }
</style>
