<script setup>
import { ref, computed } from 'vue'
import CryptoJS from 'crypto-js'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()

const inputText = ref('')
const encryptType = ref('md5')
const results = ref({})

const algorithms = {
  md5: { name: 'MD5', fn: (text) => CryptoJS.MD5(text).toString() },
  sha1: { name: 'SHA-1', fn: (text) => CryptoJS.SHA1(text).toString() },
  sha256: { name: 'SHA-256', fn: (text) => CryptoJS.SHA256(text).toString() },
  sha512: { name: 'SHA-512', fn: (text) => CryptoJS.SHA512(text).toString() },
}

const encrypt = () => {
  if (!inputText.value.trim()) {
    results.value = {}
    return
  }

  try {
    results.value = {}
    Object.entries(algorithms).forEach(([key, { fn }]) => {
      results.value[key] = fn(inputText.value)
    })
  } catch (err) {
    showToast('加密失败：' + err.message, 'error')
  }
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    showToast('已复制')
    addHistory('文本加密', text)
  } catch (err) {
    showToast('复制失败', 'error')
  }
}

const clearAll = () => {
  inputText.value = ''
  results.value = {}
}

const handleInput = () => {
  encrypt()
}
</script>

<template>
  <div class="text-encryption">
    <h2>文本加密</h2>
    <p class="description">支持 MD5、SHA-1、SHA-256、SHA-512 多种加密算法</p>

    <div class="input-section">
      <textarea
        v-model="inputText"
        @input="handleInput"
        placeholder="输入需要加密的文本"
        class="input-textarea"
      ></textarea>
      <button @click="clearAll" class="btn btn-secondary">清空</button>
    </div>

    <div v-if="Object.keys(results).length > 0" class="results-section">
      <div v-for="(key, algoKey) in algorithms" :key="algoKey" class="result-item">
        <div class="result-header">
          <span class="algo-name">{{ key.name }}</span>
        </div>
        <div class="result-content">
          <code class="result-hash">{{ results[algoKey] }}</code>
          <button
            @click="copyToClipboard(results[algoKey])"
            class="btn btn-copy"
            title="复制"
          >
            📋
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="inputText" class="placeholder">
      输入内容后自动加密...
    </div>
  </div>
</template>

<style scoped>
.text-encryption {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  margin: 0;
  color: #ff6b6b;
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

.input-textarea {
  width: 100%;
  min-height: 100px;
  padding: 0.75rem;
  border: 2px solid #ffd3e1;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  background-color: #fff9fb;
  color: #333;
  resize: vertical;
  transition: border-color 0.3s;
}

.input-textarea:focus {
  outline: none;
  border-color: #ff6b6b;
  background-color: white;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

.results-section {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.result-item {
  background: linear-gradient(135deg, #fff5f7, #fffbfc);
  border: 2px solid #ffd3e1;
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.3s;
}

.result-item:hover {
  border-color: #ff8fa3;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.15);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.algo-name {
  font-weight: 600;
  color: #ff6b6b;
  font-size: 0.95rem;
}

.result-content {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.result-hash {
  flex: 1;
  padding: 0.5rem;
  background-color: #f9f9f9;
  border-radius: 4px;
  font-size: 0.85rem;
  word-break: break-all;
  font-family: 'Courier New', monospace;
  color: #333;
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

.btn-secondary {
  background-color: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

.btn-copy {
  padding: 0.5rem 0.8rem;
  background-color: #ff6b6b;
  color: white;
  min-width: auto;
}

.btn-copy:hover {
  background-color: #ff5252;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

.placeholder {
  text-align: center;
  color: #bbb;
  padding: 2rem;
  font-style: italic;
}

@media (max-width: 768px) {
  .results-section {
    grid-template-columns: 1fr;
  }
}

:global([data-theme='dark'] h2) {
  color: #ff8a8a;
}

:global([data-theme='dark'] .description) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .input-textarea) {
  background-color: #2a2a3e;
  color: #e0e0e0;
  border-color: #664444;
}

:global([data-theme='dark'] .input-textarea:focus) {
  background-color: #333;
  border-color: #ff8a8a;
  box-shadow: 0 0 0 3px rgba(255, 138, 138, 0.1);
}

:global([data-theme='dark'] .result-item) {
  background: linear-gradient(135deg, #3a2a2e, #3a3035);
  border-color: #664444;
}

:global([data-theme='dark'] .result-item:hover) {
  border-color: #885555;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.2);
}

:global([data-theme='dark'] .algo-name) {
  color: #ff8a8a;
}

:global([data-theme='dark'] .result-hash) {
  background-color: #333;
  color: #e0e0e0;
}

:global([data-theme='dark'] .btn-secondary) {
  background-color: #404050;
  color: #e0e0e0;
}

:global([data-theme='dark'] .btn-secondary:hover) {
  background-color: #505060;
}

:global([data-theme='dark'] .placeholder) {
  color: #707070;
}
</style>
