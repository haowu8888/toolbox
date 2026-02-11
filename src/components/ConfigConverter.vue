<script setup>
import { ref } from 'vue'
import yaml from 'js-yaml'
import { parse as tomlParse, stringify as tomlStringify } from 'smol-toml'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()

const inputText = ref('')
const outputText = ref('')
const sourceFormat = ref('json')
const targetFormat = ref('yaml')
const indentSize = ref(2)
const errorMsg = ref('')

const formats = [
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'toml', label: 'TOML' },
]

// Parse input text to JS object based on source format
const parseInput = (text, format) => {
  switch (format) {
    case 'json':
      return JSON.parse(text)
    case 'yaml':
      return yaml.load(text)
    case 'toml':
      return tomlParse(text)
    default:
      throw new Error('不支持的源格式')
  }
}

// Serialize JS object to target format string
const serializeOutput = (obj, format, indent) => {
  switch (format) {
    case 'json':
      return JSON.stringify(obj, null, indent)
    case 'yaml':
      return yaml.dump(obj, { indent, lineWidth: -1, noRefs: true })
    case 'toml':
      return tomlStringify(obj, { newline: '\n' })
    default:
      throw new Error('不支持的目标格式')
  }
}

const convert = () => {
  errorMsg.value = ''
  outputText.value = ''

  if (!inputText.value.trim()) {
    errorMsg.value = '请输入内容'
    return
  }

  if (sourceFormat.value === targetFormat.value) {
    errorMsg.value = '源格式和目标格式相同，请选择不同的格式'
    return
  }

  try {
    const parsed = parseInput(inputText.value, sourceFormat.value)
    outputText.value = serializeOutput(parsed, targetFormat.value, indentSize.value)
    addHistory('配置转换', `${sourceFormat.value.toUpperCase()} → ${targetFormat.value.toUpperCase()}`)
  } catch (err) {
    errorMsg.value = `转换失败：${err.message}`
  }
}

const swapFormats = () => {
  const tmp = sourceFormat.value
  sourceFormat.value = targetFormat.value
  targetFormat.value = tmp
  // If output exists, move it to input
  if (outputText.value) {
    inputText.value = outputText.value
    outputText.value = ''
    errorMsg.value = ''
  }
}

const copyOutput = async () => {
  if (!outputText.value) return
  try {
    await navigator.clipboard.writeText(outputText.value)
    showToast('已复制到剪贴板')
  } catch {
    showToast('复制失败', 'error')
  }
}

const clearAll = () => {
  inputText.value = ''
  outputText.value = ''
  errorMsg.value = ''
}

const loadExample = () => {
  const example = {
    server: {
      host: "0.0.0.0",
      port: 8080,
      debug: false
    },
    database: {
      url: "postgresql://localhost:5432/mydb",
      pool_size: 10,
      timeout: 30
    },
    features: ["auth", "logging", "cache"],
    logging: {
      level: "info",
      format: "json"
    }
  }

  try {
    inputText.value = serializeOutput(example, sourceFormat.value, indentSize.value)
    outputText.value = ''
    errorMsg.value = ''
  } catch {
    inputText.value = JSON.stringify(example, null, indentSize.value)
    sourceFormat.value = 'json'
  }
}
</script>

<template>
  <div class="config-converter">
    <h2>&#9881;&#65039; 配置转换</h2>
    <p class="description">JSON / YAML / TOML 配置文件格式互转</p>

    <div class="toolbar">
      <div class="format-selector">
        <label class="format-label">源格式</label>
        <select v-model="sourceFormat" class="select-field">
          <option v-for="f in formats" :key="f.value" :value="f.value">{{ f.label }}</option>
        </select>
      </div>

      <button @click="swapFormats" class="btn btn-swap" title="交换格式">&#8644;</button>

      <div class="format-selector">
        <label class="format-label">目标格式</label>
        <select v-model="targetFormat" class="select-field">
          <option v-for="f in formats" :key="f.value" :value="f.value">{{ f.label }}</option>
        </select>
      </div>

      <div class="indent-control">
        <label class="format-label">缩进</label>
        <select v-model.number="indentSize" class="select-field select-sm">
          <option :value="2">2 空格</option>
          <option :value="4">4 空格</option>
        </select>
      </div>
    </div>

    <div class="action-bar">
      <button @click="convert" class="btn btn-primary">&#128260; 转换</button>
      <button @click="loadExample" class="btn btn-secondary">&#128221; 示例</button>
      <button @click="clearAll" class="btn btn-secondary">&#128465;&#65039; 清空</button>
    </div>

    <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

    <div class="editor-pair">
      <div class="editor">
        <div class="editor-header">
          <span class="editor-label">{{ formats.find(f => f.value === sourceFormat)?.label }} 输入</span>
        </div>
        <textarea
          v-model="inputText"
          :placeholder="`粘贴 ${formats.find(f => f.value === sourceFormat)?.label} 内容...`"
          class="code-textarea"
          spellcheck="false"
        ></textarea>
      </div>

      <div class="editor">
        <div class="editor-header">
          <span class="editor-label">{{ formats.find(f => f.value === targetFormat)?.label }} 输出</span>
          <button v-if="outputText" @click="copyOutput" class="btn btn-copy">&#128203; 复制</button>
        </div>
        <textarea
          v-model="outputText"
          readonly
          placeholder="转换结果将显示在这里..."
          class="code-textarea output"
          spellcheck="false"
        ></textarea>
      </div>
    </div>
  </div>
</template>

<style scoped>
.config-converter {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

h2 {
  margin: 0;
  color: #ff9800;
  font-size: 1.8em;
}

.description {
  margin: 0;
  color: #888;
  font-size: 0.95rem;
}

.toolbar {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1rem;
  background: #fff8f0;
  border-radius: 8px;
  border: 1px solid #ffe0b2;
}

:global([data-theme='dark']) .toolbar {
  background: #2a2a3a;
  border-color: #4a3a2a;
}

.format-selector {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.indent-control {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-left: auto;
}

.format-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #666;
}

:global([data-theme='dark']) .format-label {
  color: #a0c0e0;
}

.select-field {
  padding: 0.5rem 0.75rem;
  border: 2px solid #ffe0b2;
  border-radius: 6px;
  font-size: 0.95rem;
  background: white;
  color: #333;
  cursor: pointer;
  min-width: 100px;
}

:global([data-theme='dark']) .select-field {
  background: #1a1a2e;
  border-color: #4a3a2a;
  color: #e0e0e0;
}

.select-field:focus {
  outline: none;
  border-color: #ff9800;
}

.select-sm {
  min-width: 80px;
}

.btn-swap {
  padding: 0.5rem 1rem;
  border: 2px solid #ffe0b2;
  background: white;
  border-radius: 6px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s;
  color: #ff9800;
}

:global([data-theme='dark']) .btn-swap {
  background: #1a1a2e;
  border-color: #4a3a2a;
  color: #ffb74d;
}

.btn-swap:hover {
  background: #ff9800;
  color: white;
  border-color: #ff9800;
}

.action-bar {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
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
  background: #ff9800;
  color: white;
}

.btn-primary:hover {
  background: #f57c00;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

:global([data-theme='dark']) .btn-secondary {
  background: #2a2a3a;
  color: #e0e0e0;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

:global([data-theme='dark']) .btn-secondary:hover {
  background: #3a3a4a;
}

.btn-copy {
  padding: 0.3rem 0.7rem;
  border: 1px solid #ff9800;
  background: transparent;
  color: #ff9800;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

:global([data-theme='dark']) .btn-copy {
  color: #ffb74d;
  border-color: #ffb74d;
}

.btn-copy:hover {
  background: #ff9800;
  color: white;
}

.error-msg {
  padding: 0.75rem 1rem;
  background: #fff3e0;
  border: 1px solid #ffcc80;
  border-left: 4px solid #ff9800;
  border-radius: 4px;
  color: #e65100;
  font-size: 0.9rem;
}

:global([data-theme='dark']) .error-msg {
  background: #3a2a1a;
  border-color: #5a3a1a;
  color: #ffb74d;
}

.editor-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.editor {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.editor-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #555;
}

:global([data-theme='dark']) .editor-label {
  color: #a0c0e0;
}

.code-textarea {
  flex: 1;
  min-height: 350px;
  padding: 0.75rem;
  border: 2px solid #ffe0b2;
  border-radius: 8px;
  font-family: 'Courier New', Consolas, monospace;
  font-size: 0.85rem;
  background: white;
  color: #333;
  resize: vertical;
  transition: border-color 0.3s;
  line-height: 1.5;
  tab-size: 2;
}

:global([data-theme='dark']) .code-textarea {
  background: #1a1a2e;
  border-color: #4a3a2a;
  color: #e0e0e0;
}

.code-textarea:focus {
  outline: none;
  border-color: #ff9800;
  box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.1);
}

.code-textarea.output {
  background: #fffaf5;
}

:global([data-theme='dark']) .code-textarea.output {
  background: #22222e;
}

:global([data-theme='dark']) h2 {
  color: #ffb74d;
}

:global([data-theme='dark']) .description {
  color: #a0c0e0;
}

@media (max-width: 768px) {
  .editor-pair {
    grid-template-columns: 1fr;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .indent-control {
    margin-left: 0;
  }

  .btn-swap {
    align-self: center;
    transform: rotate(90deg);
  }
}
</style>
