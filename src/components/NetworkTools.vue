<script setup>
import { ref } from 'vue'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()

const activeTab = ref('url-encode')
const urlInput = ref('')
const urlOutput = ref('')

// URL 编码/解码
const encodeUrl = () => {
  urlOutput.value = encodeURIComponent(urlInput.value)
  addHistory('URL 编码', urlOutput.value)
}

const decodeUrl = () => {
  try {
    urlOutput.value = decodeURIComponent(urlInput.value)
    addHistory('URL 解码', urlOutput.value)
  } catch (err) {
    urlOutput.value = '解码失败：' + err.message
  }
}

// DNS/IP 工具
const dnsInput = ref('')
const dnsResult = ref('')

const lookupDns = () => {
  if (!dnsInput.value.trim()) return

  // 注：这只是一个模拟演示，实际需要后端支持
  // 对于学习目的，显示如何使用
  dnsResult.value = `
查询对象: ${dnsInput.value}

说明：
- 完整的DNS查询需要后端API支持
- 建议使用在线工具或命令行工具
  例如: nslookup ${dnsInput.value}
       dig ${dnsInput.value}

常见 A 记录示例:
- Google: 142.250.185.46
- GitHub: 140.82.113.3
- Cloudflare: 104.16.132.229
  `.trim()
}

// 网址分析
const analyzeInput = ref('')
const analyzeResult = ref('')

const analyzeUrl = () => {
  if (!analyzeInput.value.trim()) return

  try {
    const url = new URL(analyzeInput.value.startsWith('http') ? analyzeInput.value : 'https://' + analyzeInput.value)
    analyzeResult.value = `
协议: ${url.protocol}
域名: ${url.hostname}
端口: ${url.port || '默认'}
路径: ${url.pathname}
查询参数: ${url.search || '无'}
哈希值: ${url.hash || '无'}
完整URL: ${url.href}
    `.trim()
    addHistory('网址分析', analyzeResult.value)
  } catch (err) {
    analyzeResult.value = '错误：无效的URL'
  }
}

// Base64 编码（补充）
const base64Input = ref('')
const base64Output = ref('')

const encodeBase64 = () => {
  try {
    base64Output.value = btoa(unescape(encodeURIComponent(base64Input.value)))
  } catch (err) {
    base64Output.value = '编码失败：' + err.message
  }
}

const decodeBase64 = () => {
  try {
    base64Output.value = decodeURIComponent(escape(atob(base64Input.value)))
  } catch (err) {
    base64Output.value = '解码失败：' + err.message
  }
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    showToast('已复制')
  } catch (err) {
    showToast('复制失败', 'error')
  }
}

const clearAll = () => {
  urlInput.value = ''
  urlOutput.value = ''
  dnsInput.value = ''
  dnsResult.value = ''
  analyzeInput.value = ''
  analyzeResult.value = ''
  base64Input.value = ''
  base64Output.value = ''
}
</script>

<template>
  <div class="network-tools">
    <h2>🌐 网络工具</h2>
    <p class="description">URL编码、DNS查询、网址分析等网络相关工具</p>

    <div class="tabs">
      <button
        v-for="tab in ['url-encode', 'url-analyze', 'base64', 'dns']"
        :key="tab"
        :class="['tab-btn', { active: activeTab === tab }]"
        @click="activeTab = tab"
      >
        {{ tab === 'url-encode' ? 'URL编码' : tab === 'url-analyze' ? '网址分析' : tab === 'base64' ? 'Base64' : 'DNS查询' }}
      </button>
    </div>

    <!-- URL 编码 -->
    <div v-show="activeTab === 'url-encode'" class="tool-section">
      <div class="editor-pair">
        <div class="editor">
          <div class="editor-label">输入</div>
          <textarea
            v-model="urlInput"
            placeholder="输入要编码的URL或文本"
            class="editor-textarea"
          ></textarea>
        </div>
        <div class="button-column">
          <button @click="encodeUrl" class="btn btn-primary">⬇️ 编码</button>
          <button @click="decodeUrl" class="btn btn-primary">⬆️ 解码</button>
          <button @click="() => [urlInput, urlOutput] = [urlOutput, urlInput]" class="btn btn-swap">⇄ 交换</button>
        </div>
        <div class="editor">
          <div class="editor-label">输出</div>
          <textarea
            v-model="urlOutput"
            readonly
            placeholder="编码或解码结果"
            class="editor-textarea"
          ></textarea>
          <button v-if="urlOutput" @click="copyToClipboard(urlOutput)" class="btn-copy">📋 复制</button>
        </div>
      </div>
    </div>

    <!-- 网址分析 -->
    <div v-show="activeTab === 'url-analyze'" class="tool-section">
      <div class="analyze-input">
        <input
          v-model="analyzeInput"
          type="text"
          placeholder="输入URL，例如: https://example.com/path?query=value"
          class="input-field"
        />
        <button @click="analyzeUrl" class="btn btn-primary">🔍 分析</button>
      </div>
      <div v-if="analyzeResult" class="result-box">
        <pre class="result-text">{{ analyzeResult }}</pre>
        <button @click="copyToClipboard(analyzeResult)" class="btn btn-copy">📋 复制</button>
      </div>
    </div>

    <!-- Base64 编码 -->
    <div v-show="activeTab === 'base64'" class="tool-section">
      <div class="editor-pair">
        <div class="editor">
          <div class="editor-label">输入</div>
          <textarea
            v-model="base64Input"
            placeholder="输入要编码的文本"
            class="editor-textarea"
          ></textarea>
        </div>
        <div class="button-column">
          <button @click="encodeBase64" class="btn btn-primary">⬇️ 编码</button>
          <button @click="decodeBase64" class="btn btn-primary">⬆️ 解码</button>
          <button @click="() => [base64Input, base64Output] = [base64Output, base64Input]" class="btn btn-swap">⇄ 交换</button>
        </div>
        <div class="editor">
          <div class="editor-label">输出</div>
          <textarea
            v-model="base64Output"
            readonly
            placeholder="编码或解码结果"
            class="editor-textarea"
          ></textarea>
          <button v-if="base64Output" @click="copyToClipboard(base64Output)" class="btn-copy">📋 复制</button>
        </div>
      </div>
    </div>

    <!-- DNS 查询 -->
    <div v-show="activeTab === 'dns'" class="tool-section">
      <div class="dns-input">
        <input
          v-model="dnsInput"
          type="text"
          placeholder="输入域名，例如: example.com"
          class="input-field"
        />
        <button @click="lookupDns" class="btn btn-primary">🔎 查询</button>
      </div>
      <div v-if="dnsResult" class="result-box">
        <pre class="result-text">{{ dnsResult }}</pre>
        <button @click="copyToClipboard(dnsResult)" class="btn btn-copy">📋 复制</button>
      </div>
    </div>

    <div class="footer-action">
      <button @click="clearAll" class="btn btn-secondary">清空所有</button>
    </div>
  </div>
</template>

<style scoped>
.network-tools {
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
  border: 2px solid #bbdefb;
  background-color: white;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  color: #555;
}

:global([data-theme='dark'] .tab-btn) {
  background-color: #2a3a4a;
  border-color: #3a5a7a;
  color: #a0c0e0;
}

.tab-btn:hover {
  border-color: #2196f3;
  color: #2196f3;
}

.tab-btn.active {
  background-color: #2196f3;
  color: white;
  border-color: #2196f3;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
}

.tool-section {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.editor-pair {
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

:global([data-theme='dark'] .editor-label) {
  color: #a0c0e0;
}

.editor-textarea {
  flex: 1;
  min-height: 200px;
  padding: 0.75rem;
  border: 2px solid #bbdefb;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  background-color: #f0f9ff;
  color: #333;
  resize: vertical;
  transition: border-color 0.3s;
}

:global([data-theme='dark'] .editor-textarea) {
  background-color: #1a2a3a;
  border-color: #3a5a7a;
  color: #e0e0e0;
}

.editor-textarea:focus {
  outline: none;
  border-color: #2196f3;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
}

.button-column {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background-color: #2196f3;
  color: white;
}

.btn-primary:hover {
  background-color: #1976d2;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
}

.btn-secondary {
  background-color: #f0f0f0;
  color: #333;
}

:global([data-theme='dark'] .btn-secondary) {
  background-color: #2a3a4a;
  color: #e0e0e0;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

:global([data-theme='dark'] .btn-secondary:hover) {
  background-color: #3a4a5a;
}

.btn-swap {
  min-width: 45px;
  padding: 0.6rem;
  text-align: center;
}

.btn-copy {
  padding: 0.4rem 0.8rem;
  border: 1px solid #2196f3;
  background-color: white;
  color: #2196f3;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

:global([data-theme='dark'] .btn-copy) {
  background-color: #1a2a3a;
  color: #45b9b0;
  border-color: #45b9b0;
}

.btn-copy:hover {
  background-color: #e3f2fd;
}

:global([data-theme='dark'] .btn-copy:hover) {
  background-color: #2a3a4a;
}

.analyze-input,
.dns-input {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.input-field {
  flex: 1;
  min-width: 200px;
  padding: 0.75rem;
  border: 2px solid #bbdefb;
  border-radius: 8px;
  font-size: 1rem;
  background-color: white;
  color: #333;
  transition: border-color 0.3s;
}

:global([data-theme='dark'] .input-field) {
  background-color: #1a2a3a;
  border-color: #3a5a7a;
  color: #e0e0e0;
}

.input-field:focus {
  outline: none;
  border-color: #2196f3;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
}

.result-box {
  background: #f0f9ff;
  border: 2px solid #bbdefb;
  border-radius: 8px;
  padding: 1.5rem;
  position: relative;
}

:global([data-theme='dark'] .result-box) {
  background: #1a2a3a;
  border-color: #3a5a7a;
}

.result-text {
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: #333;
  white-space: pre-wrap;
  word-break: break-all;
}

:global([data-theme='dark'] .result-text) {
  color: #e0e0e0;
}

.footer-action {
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .editor-pair {
    grid-template-columns: 1fr;
  }

  .button-column {
    flex-direction: row;
    order: -1;
  }

  .analyze-input,
  .dns-input {
    flex-direction: column;
  }

  .input-field {
    min-width: auto;
  }

  .btn {
    flex: 1;
  }
}

/* Dark mode overrides */
:global([data-theme='dark'] h2) {
  color: #64b5f6;
}

:global([data-theme='dark'] .description) {
  color: #a0c0e0;
}
</style>
