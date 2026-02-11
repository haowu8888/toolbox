<script setup>
import { ref, computed } from 'vue'
import CryptoJS from 'crypto-js'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()

const activeMode = ref('hash')
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

// AES 加解密
const aesInput = ref('')
const aesKey = ref('')
const aesOutput = ref('')
const aesMode = ref('encrypt')

const aesEncrypt = () => {
  if (!aesInput.value.trim() || !aesKey.value.trim()) {
    showToast('请输入文本和密钥', 'info')
    return
  }
  try {
    const encrypted = CryptoJS.AES.encrypt(aesInput.value, aesKey.value).toString()
    aesOutput.value = encrypted
    addHistory('AES 加密', encrypted)
    showToast('加密成功')
  } catch (err) {
    showToast('加密失败：' + err.message, 'error')
  }
}

const aesDecrypt = () => {
  if (!aesInput.value.trim() || !aesKey.value.trim()) {
    showToast('请输入密文和密钥', 'info')
    return
  }
  try {
    const bytes = CryptoJS.AES.decrypt(aesInput.value, aesKey.value)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    if (!decrypted) {
      showToast('解密失败：密钥错误或密文无效', 'error')
      return
    }
    aesOutput.value = decrypted
    addHistory('AES 解密', decrypted)
    showToast('解密成功')
  } catch (err) {
    showToast('解密失败：密钥错误或密文无效', 'error')
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

const clearAes = () => {
  aesInput.value = ''
  aesKey.value = ''
  aesOutput.value = ''
}

const handleInput = () => {
  encrypt()
}
</script>

<template>
  <div class="text-encryption">
    <h2>文本加密</h2>
    <p class="description">支持哈希算法和 AES 对称加解密</p>

    <div class="mode-tabs">
      <button :class="['tab-btn', { active: activeMode === 'hash' }]" @click="activeMode = 'hash'">🔒 哈希摘要</button>
      <button :class="['tab-btn', { active: activeMode === 'aes' }]" @click="activeMode = 'aes'">🔐 AES 加解密</button>
    </div>

    <!-- 哈希模式 -->
    <div v-show="activeMode === 'hash'">
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

    <!-- AES 模式 -->
    <div v-show="activeMode === 'aes'">
      <div class="input-section">
        <textarea
          v-model="aesInput"
          :placeholder="aesMode === 'encrypt' ? '输入需要加密的明文' : '输入需要解密的密文'"
          class="input-textarea"
        ></textarea>
        <div class="key-input-group">
          <label>密钥：</label>
          <input v-model="aesKey" type="password" placeholder="输入密钥" class="key-input" />
        </div>
        <div class="aes-buttons">
          <button @click="aesEncrypt" class="btn btn-primary">🔒 加密</button>
          <button @click="aesDecrypt" class="btn btn-primary">🔓 解密</button>
          <button @click="clearAes" class="btn btn-secondary">清空</button>
        </div>
      </div>

      <div v-if="aesOutput" class="results-section">
        <div class="result-item">
          <div class="result-header">
            <span class="algo-name">结果</span>
          </div>
          <div class="result-content">
            <code class="result-hash">{{ aesOutput }}</code>
            <button @click="copyToClipboard(aesOutput)" class="btn btn-copy" title="复制">📋</button>
          </div>
        </div>
      </div>
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

.mode-tabs {
  display: flex;
  gap: 0.5rem;
}

.tab-btn {
  padding: 0.6rem 1.2rem;
  border: 2px solid #ffd3e1;
  background: white;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  color: #666;
}

.tab-btn.active {
  background: #ff6b6b;
  color: white;
  border-color: #ff6b6b;
}

.tab-btn:hover:not(.active) {
  border-color: #ff6b6b;
  color: #ff6b6b;
}

.key-input-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.key-input-group label {
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}

.key-input {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #ffd3e1;
  border-radius: 8px;
  font-size: 1rem;
  background: #fff9fb;
  color: #333;
  transition: border-color 0.3s;
}

.key-input:focus {
  outline: none;
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

.aes-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-primary {
  background: #ff6b6b;
  color: white;
}

.btn-primary:hover {
  background: #ff5252;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
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

:global([data-theme='dark'] .tab-btn) {
  background: #2a2a3e;
  border-color: #664444;
  color: #a0a0a0;
}

:global([data-theme='dark'] .tab-btn.active) {
  background: #ff6b6b;
  color: white;
  border-color: #ff6b6b;
}

:global([data-theme='dark'] .key-input-group label) {
  color: #e0e0e0;
}

:global([data-theme='dark'] .key-input) {
  background: #2a2a3e;
  color: #e0e0e0;
  border-color: #664444;
}

:global([data-theme='dark'] .key-input:focus) {
  border-color: #ff8a8a;
  box-shadow: 0 0 0 3px rgba(255, 138, 138, 0.1);
}
</style>
