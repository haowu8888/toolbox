<script setup>
import { ref } from 'vue'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()

const activeTab = ref('url-analyze')

// 网址分析
const analyzeInput = ref('')
const analyzeResult = ref(null)

const analyzeUrl = () => {
  if (!analyzeInput.value.trim()) return

  try {
    const url = new URL(analyzeInput.value.startsWith('http') ? analyzeInput.value : 'https://' + analyzeInput.value)
    const params = []
    url.searchParams.forEach((value, key) => {
      params.push({ key, value })
    })
    analyzeResult.value = {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || '默认',
      pathname: url.pathname,
      search: url.search || '无',
      hash: url.hash || '无',
      origin: url.origin,
      href: url.href,
      params,
    }
    addHistory('网址分析', url.href)
  } catch (err) {
    analyzeResult.value = null
    showToast('无效的URL', 'error')
  }
}

// DNS 查询 (使用 Google DNS-over-HTTPS)
const dnsInput = ref('')
const dnsType = ref('A')
const dnsResult = ref(null)
const dnsLoading = ref(false)
const dnsTypes = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA']

const lookupDns = async () => {
  if (!dnsInput.value.trim()) return

  dnsLoading.value = true
  dnsResult.value = null

  try {
    const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(dnsInput.value)}&type=${dnsType.value}`)
    if (!response.ok) throw new Error('DNS 查询失败')
    const data = await response.json()

    dnsResult.value = {
      name: dnsInput.value,
      type: dnsType.value,
      status: data.Status === 0 ? '成功' : `错误 (状态码: ${data.Status})`,
      answers: data.Answer || [],
      authority: data.Authority || [],
      comment: data.Comment || '',
    }
    addHistory('DNS 查询', `${dnsInput.value} (${dnsType.value})`)
  } catch (err) {
    showToast('DNS 查询失败：' + err.message, 'error')
  } finally {
    dnsLoading.value = false
  }
}

// IP 信息查询
const ipResult = ref(null)
const ipLoading = ref(false)

const lookupMyIp = async () => {
  ipLoading.value = true
  ipResult.value = null
  try {
    const response = await fetch('https://ipapi.co/json/')
    if (!response.ok) throw new Error('查询失败')
    const data = await response.json()
    ipResult.value = data
    addHistory('IP 查询', data.ip)
  } catch (err) {
    showToast('IP 查询失败：' + err.message, 'error')
  } finally {
    ipLoading.value = false
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

// DNS 记录类型名称
const dnsTypeName = (type) => {
  const map = { 1: 'A', 5: 'CNAME', 15: 'MX', 2: 'NS', 16: 'TXT', 6: 'SOA', 28: 'AAAA' }
  return map[type] || type
}
</script>

<template>
  <div class="network-tools">
    <h2>🌐 网络工具</h2>
    <p class="description">网址分析、DNS查询、IP信息查询</p>

    <div class="tabs">
      <button
        v-for="tab in ['url-analyze', 'dns', 'ip']"
        :key="tab"
        :class="['tab-btn', { active: activeTab === tab }]"
        @click="activeTab = tab"
      >
        {{ tab === 'url-analyze' ? '🔗 网址分析' : tab === 'dns' ? '🔍 DNS 查询' : '📡 IP 信息' }}
      </button>
    </div>

    <!-- 网址分析 -->
    <div v-show="activeTab === 'url-analyze'" class="tool-section">
      <div class="input-row">
        <input
          v-model="analyzeInput"
          type="text"
          placeholder="输入URL，例如: https://example.com/path?query=value#hash"
          class="input-field"
          @keyup.enter="analyzeUrl"
        />
        <button @click="analyzeUrl" class="btn btn-primary">🔍 分析</button>
      </div>
      <div v-if="analyzeResult" class="result-card">
        <div class="result-grid">
          <div class="result-row" v-for="(value, label) in {
            '协议': analyzeResult.protocol,
            '域名': analyzeResult.hostname,
            '端口': analyzeResult.port,
            '路径': analyzeResult.pathname,
            '查询参数': analyzeResult.search,
            '哈希值': analyzeResult.hash,
            '完整URL': analyzeResult.href,
          }" :key="label">
            <span class="result-label">{{ label }}</span>
            <code class="result-value">{{ value }}</code>
            <button @click="copyToClipboard(String(value))" class="btn-icon" title="复制">📋</button>
          </div>
        </div>
        <div v-if="analyzeResult.params.length > 0" class="params-section">
          <h4>查询参数详情</h4>
          <div class="params-table">
            <div v-for="(param, i) in analyzeResult.params" :key="i" class="param-row">
              <code class="param-key">{{ param.key }}</code>
              <span>=</span>
              <code class="param-value">{{ param.value }}</code>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- DNS 查询 -->
    <div v-show="activeTab === 'dns'" class="tool-section">
      <div class="input-row">
        <input
          v-model="dnsInput"
          type="text"
          placeholder="输入域名，例如: example.com"
          class="input-field"
          @keyup.enter="lookupDns"
        />
        <select v-model="dnsType" class="select-field">
          <option v-for="t in dnsTypes" :key="t" :value="t">{{ t }}</option>
        </select>
        <button @click="lookupDns" class="btn btn-primary" :disabled="dnsLoading">
          {{ dnsLoading ? '查询中...' : '🔎 查询' }}
        </button>
      </div>
      <div v-if="dnsResult" class="result-card">
        <div class="dns-header">
          <span class="dns-domain">{{ dnsResult.name }}</span>
          <span :class="['dns-status', { success: dnsResult.status === '成功' }]">{{ dnsResult.status }}</span>
        </div>
        <div v-if="dnsResult.answers.length > 0" class="dns-answers">
          <h4>查询结果</h4>
          <div v-for="(answer, i) in dnsResult.answers" :key="i" class="dns-record">
            <span class="record-type">{{ dnsTypeName(answer.type) }}</span>
            <code class="record-data">{{ answer.data }}</code>
            <span class="record-ttl">TTL: {{ answer.TTL }}s</span>
            <button @click="copyToClipboard(answer.data)" class="btn-icon" title="复制">📋</button>
          </div>
        </div>
        <div v-else class="dns-empty">未找到 {{ dnsResult.type }} 记录</div>
      </div>
    </div>

    <!-- IP 信息 -->
    <div v-show="activeTab === 'ip'" class="tool-section">
      <div class="input-row">
        <button @click="lookupMyIp" class="btn btn-primary" :disabled="ipLoading">
          {{ ipLoading ? '查询中...' : '📡 查询我的 IP 信息' }}
        </button>
      </div>
      <div v-if="ipResult" class="result-card">
        <div class="result-grid">
          <div class="result-row" v-for="(value, label) in {
            'IP 地址': ipResult.ip,
            '城市': ipResult.city,
            '地区': ipResult.region,
            '国家': ipResult.country_name,
            'ISP': ipResult.org,
            '时区': ipResult.timezone,
            '经度': ipResult.longitude,
            '纬度': ipResult.latitude,
          }" :key="label">
            <span class="result-label">{{ label }}</span>
            <code class="result-value">{{ value || '未知' }}</code>
            <button @click="copyToClipboard(String(value))" class="btn-icon" title="复制">📋</button>
          </div>
        </div>
      </div>
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

h4 {
  margin: 0 0 0.75rem 0;
  color: #333;
  font-size: 0.95rem;
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
  background: white;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  color: #555;
}

.tab-btn:hover {
  border-color: #2196f3;
  color: #2196f3;
}

.tab-btn.active {
  background: #2196f3;
  color: white;
  border-color: #2196f3;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
}

.tool-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.input-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.input-field {
  flex: 1;
  min-width: 200px;
  padding: 0.75rem;
  border: 2px solid #bbdefb;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  color: #333;
  transition: border-color 0.3s;
}

.input-field:focus {
  outline: none;
  border-color: #2196f3;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
}

.select-field {
  padding: 0.75rem;
  border: 2px solid #bbdefb;
  border-radius: 8px;
  font-size: 0.95rem;
  background: white;
  color: #333;
  cursor: pointer;
  min-width: 80px;
}

.btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #2196f3;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1976d2;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
}

.btn-icon {
  padding: 0.3rem 0.5rem;
  border: 1px solid #bbdefb;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #e3f2fd;
}

.result-card {
  background: #f0f9ff;
  border: 2px solid #bbdefb;
  border-radius: 12px;
  padding: 1.5rem;
}

.result-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.result-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e3f2fd;
}

.result-row:last-child {
  border-bottom: none;
}

.result-label {
  font-weight: 600;
  color: #555;
  min-width: 80px;
  font-size: 0.9rem;
}

.result-value {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: #333;
  word-break: break-all;
  background: rgba(33, 150, 243, 0.05);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.params-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 2px solid #e3f2fd;
}

.param-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0;
  font-size: 0.9rem;
}

.param-key {
  font-weight: 600;
  color: #2196f3;
  font-family: 'Courier New', monospace;
}

.param-value {
  color: #e65100;
  font-family: 'Courier New', monospace;
}

.dns-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.dns-domain {
  font-weight: 700;
  font-size: 1.1rem;
  color: #2196f3;
}

.dns-status {
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  background: #ffebee;
  color: #c62828;
}

.dns-status.success {
  background: #e8f5e9;
  color: #2e7d32;
}

.dns-answers {
  margin-top: 0.5rem;
}

.dns-record {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem;
  background: white;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.record-type {
  font-weight: 700;
  color: #2196f3;
  min-width: 60px;
  font-size: 0.85rem;
  background: #e3f2fd;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  text-align: center;
}

.record-data {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: #333;
  word-break: break-all;
}

.record-ttl {
  font-size: 0.8rem;
  color: #999;
  white-space: nowrap;
}

.dns-empty {
  text-align: center;
  color: #999;
  padding: 1rem;
  font-style: italic;
}

@media (max-width: 768px) {
  .input-row {
    flex-direction: column;
  }

  .input-field {
    min-width: auto;
  }

  .result-row {
    flex-wrap: wrap;
  }

  .result-label {
    min-width: 100%;
  }

  .dns-record {
    flex-wrap: wrap;
  }
}

/* Dark mode */
:global([data-theme='dark']) h2 {
  color: #64b5f6;
}

:global([data-theme='dark']) h4 {
  color: #e0e0e0;
}

:global([data-theme='dark']) .description {
  color: #a0c0e0;
}

:global([data-theme='dark']) .tab-btn {
  background: #2a3a4a;
  border-color: #3a5a7a;
  color: #a0c0e0;
}

:global([data-theme='dark']) .tab-btn.active {
  background: #2196f3;
  color: white;
  border-color: #2196f3;
}

:global([data-theme='dark']) .input-field {
  background: #1a2a3a;
  border-color: #3a5a7a;
  color: #e0e0e0;
}

:global([data-theme='dark']) .select-field {
  background: #1a2a3a;
  border-color: #3a5a7a;
  color: #e0e0e0;
}

:global([data-theme='dark']) .result-card {
  background: #1a2a3a;
  border-color: #3a5a7a;
}

:global([data-theme='dark']) .result-row {
  border-bottom-color: #2a3a4a;
}

:global([data-theme='dark']) .result-label {
  color: #a0c0e0;
}

:global([data-theme='dark']) .result-value {
  color: #e0e0e0;
  background: rgba(33, 150, 243, 0.1);
}

:global([data-theme='dark']) .btn-icon {
  border-color: #3a5a7a;
}

:global([data-theme='dark']) .btn-icon:hover {
  background: #2a3a4a;
}

:global([data-theme='dark']) .dns-record {
  background: #2a3a4a;
}

:global([data-theme='dark']) .record-type {
  background: #1a3a5a;
  color: #64b5f6;
}

:global([data-theme='dark']) .record-data {
  color: #e0e0e0;
}

:global([data-theme='dark']) .dns-status.success {
  background: #1a3a2a;
  color: #5ec89f;
}

:global([data-theme='dark']) .params-section {
  border-top-color: #2a3a4a;
}

:global([data-theme='dark']) .param-value {
  color: #ffab91;
}
</style>
