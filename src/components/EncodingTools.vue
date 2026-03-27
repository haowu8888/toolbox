<script setup>
import { ref } from 'vue'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()

const inputText = ref('')
const encodingType = ref('base64-encode')
const output = ref('')
const error = ref('')

const base64Encode = (text) => {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

const base64Decode = (text) => {
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

const urlEncode = (text) => {
  return encodeURIComponent(text)
}

const urlDecode = (text) => {
  return decodeURIComponent(text)
}

const handleEncode = () => {
  if (!inputText.value.trim()) {
    output.value = ''
    error.value = ''
    return
  }

  try {
    error.value = ''
    if (encodingType.value === 'base64-encode') {
      output.value = base64Encode(inputText.value)
    } else if (encodingType.value === 'base64-decode') {
      output.value = base64Decode(inputText.value)
    } else if (encodingType.value === 'url-encode') {
      output.value = urlEncode(inputText.value)
    } else if (encodingType.value === 'url-decode') {
      output.value = urlDecode(inputText.value)
    }
  } catch (err) {
    error.value = '转换失败：' + err.message
    output.value = ''
  }
}

const copyToClipboard = async () => {
  if (!output.value) return
  try {
    await navigator.clipboard.writeText(output.value)
    showToast('已复制')
    const typeNames = {
      'base64-encode': 'Base64 编码',
      'base64-decode': 'Base64 解码',
      'url-encode': 'URL 编码',
      'url-decode': 'URL 解码',
    }
    addHistory(typeNames[encodingType.value] || '编码转换', output.value)
  } catch (err) {
    showToast('复制失败', 'error')
  }
}

const swapInput = () => {
  const temp = inputText.value
  inputText.value = output.value
  output.value = temp
  handleEncode()
}

const clearAll = () => {
  inputText.value = ''
  output.value = ''
  error.value = ''
}
</script>

<template>
  <div class="encoding-tools">
    <h2>编码/解码</h2>
    <p class="description">支持 Base64 和 URL 编码解码</p>

    <div class="controls">
      <div class="encoding-options">
        <label>
          <input v-model="encodingType" type="radio" value="base64-encode" />
          Base64 编码
        </label>
        <label>
          <input v-model="encodingType" type="radio" value="base64-decode" />
          Base64 解码
        </label>
        <label>
          <input v-model="encodingType" type="radio" value="url-encode" />
          URL 编码
        </label>
        <label>
          <input v-model="encodingType" type="radio" value="url-decode" />
          URL 解码
        </label>
      </div>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div class="editor-container">
      <div class="editor">
        <div class="editor-label">输入</div>
        <textarea
          v-model="inputText"
          @input="handleEncode"
          placeholder="输入需要转换的文本"
          class="editor-textarea"
        ></textarea>
      </div>

      <div class="swap-btn-container">
        <button @click="swapInput" class="btn-swap" title="交换输入输出">
          ⇄
        </button>
      </div>

      <div class="editor">
        <div class="editor-label">输出</div>
        <textarea
          v-model="output"
          readonly
          placeholder="转换结果将显示在这里"
          class="editor-textarea"
        ></textarea>
      </div>
    </div>

    <div class="action-buttons">
      <button @click="copyToClipboard" class="btn btn-primary" v-if="output">
        📋 复制结果
      </button>
      <button @click="clearAll" class="btn btn-secondary">清空</button>
    </div>
  </div>
</template>

<style scoped>
.encoding-tools {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  margin: 0;
  color: #4ecdc4;
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
  gap: 1rem;
}

.encoding-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.encoding-options label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.95rem;
  color: #333;
}

.encoding-options input[type="radio"] {
  cursor: pointer;
  accent-color: #4ecdc4;
  width: 16px;
  height: 16px;
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
  font-weight: 600;
  font-size: 0.9rem;
  color: #555;
}

.editor-textarea {
  flex: 1;
  min-height: 250px;
  padding: 0.75rem;
  border: 2px solid #b3e5fc;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  background-color: #f0f9ff;
  color: #333;
  resize: vertical;
  transition: border-color 0.3s;
}

.editor-textarea:focus {
  outline: none;
  border-color: #4ecdc4;
  background-color: white;
  box-shadow: 0 0 0 3px rgba(78, 205, 196, 0.1);
}

.editor-textarea[readonly] {
  background-color: #f9fbfc;
}

.swap-btn-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin-top: 1.8rem;
}

.btn-swap {
  width: 45px;
  height: 45px;
  padding: 0;
  border: 2px solid #4ecdc4;
  background-color: white;
  color: #4ecdc4;
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.btn-swap:hover {
  background-color: #4ecdc4;
  color: white;
  transform: rotate(180deg);
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
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
  background-color: #4ecdc4;
  color: white;
}

.btn-primary:hover {
  background-color: #3ab9b0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
}

.btn-secondary {
  background-color: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

@media (max-width: 768px) {
  .editor-container {
    grid-template-columns: 1fr;
  }

  .swap-btn-container {
    margin-top: 0;
    transform: rotate(90deg);
  }

  .btn-swap {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }

  .encoding-options {
    grid-template-columns: 1fr;
  }
}

:global([data-theme='dark'] h2) {
  color: #6edddd;
}

:global([data-theme='dark'] .description) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .encoding-options label) {
  color: #e0e0e0;
}

:global([data-theme='dark'] .error-message) {
  background-color: #4a2a2a;
  color: #ff6b6b;
  border-left-color: #ff6b6b;
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
  background-color: #333;
  border-color: #6edddd;
  box-shadow: 0 0 0 3px rgba(110, 221, 221, 0.1);
}

:global([data-theme='dark'] .editor-textarea[readonly]) {
  background-color: #333;
  color: #e0e0e0;
}

:global([data-theme='dark'] .btn-swap) {
  border-color: #6edddd;
  background-color: #2a2a3e;
  color: #6edddd;
}

:global([data-theme='dark'] .btn-swap:hover) {
  background-color: #6edddd;
  color: #1a1a2e;
}

:global([data-theme='dark'] .btn-secondary) {
  background-color: #404050;
  color: #e0e0e0;
}

:global([data-theme='dark'] .btn-secondary:hover) {
  background-color: #505060;
}
</style>
