<script setup>
import { ref } from 'vue'

const inputJson = ref('')
const outputJson = ref('')
const error = ref('')
const formatType = ref('pretty')

const formatJson = () => {
  if (!inputJson.value.trim()) {
    outputJson.value = ''
    error.value = ''
    return
  }

  try {
    error.value = ''
    const parsed = JSON.parse(inputJson.value)

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
  }
}

const copyToClipboard = async () => {
  if (!outputJson.value) return

  try {
    await navigator.clipboard.writeText(outputJson.value)
    alert('已复制到剪贴板！')
  } catch (err) {
    alert('复制失败：' + err.message)
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

      <div class="editor">
        <div class="editor-label">输出</div>
        <textarea
          v-model="outputJson"
          readonly
          placeholder="格式化后的 JSON 将显示在这里"
          class="editor-textarea"
        ></textarea>
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
</style>
