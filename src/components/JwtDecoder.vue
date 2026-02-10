<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()

const jwtInput = ref('')
const error = ref('')

const base64UrlDecode = (str) => {
  // Replace URL-safe characters
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  // Pad with '=' if needed
  const pad = base64.length % 4
  if (pad) {
    base64 += '='.repeat(4 - pad)
  }
  return decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  )
}

const decoded = computed(() => {
  if (!jwtInput.value.trim()) {
    error.value = ''
    return null
  }

  const parts = jwtInput.value.trim().split('.')
  if (parts.length !== 3) {
    error.value = '无效的 JWT 格式（应包含 3 个部分，用 . 分隔）'
    return null
  }

  try {
    error.value = ''
    const header = JSON.parse(base64UrlDecode(parts[0]))
    const payload = JSON.parse(base64UrlDecode(parts[1]))
    const signature = parts[2]

    return { header, payload, signature }
  } catch (err) {
    error.value = '解码失败：' + err.message
    return null
  }
})

const parts = computed(() => {
  if (!jwtInput.value.trim()) return []
  return jwtInput.value.trim().split('.')
})

const formatTimestamp = (ts) => {
  if (!ts || typeof ts !== 'number') return null
  const date = new Date(ts * 1000)
  return date.toLocaleString('zh-CN')
}

const isExpired = computed(() => {
  if (!decoded.value?.payload?.exp) return null
  return Date.now() / 1000 > decoded.value.payload.exp
})

const timeFields = ['iat', 'exp', 'nbf', 'auth_time']

const isTimeField = (key) => timeFields.includes(key)

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(typeof text === 'string' ? text : JSON.stringify(text, null, 2))
    showToast('已复制')
  } catch (err) {
    showToast('复制失败', 'error')
  }
}

const clearAll = () => {
  jwtInput.value = ''
  error.value = ''
}

// 当 JWT 解码成功时记录历史
watch(decoded, (val) => {
  if (val) {
    addHistory('JWT 解码', JSON.stringify(val.payload, null, 2))
  }
})
</script>

<template>
  <div class="jwt-decoder">
    <h2>🔑 JWT 解码器</h2>
    <p class="description">解码和分析 JSON Web Token</p>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div class="input-section">
      <label>粘贴 JWT Token</label>
      <textarea
        v-model="jwtInput"
        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
        class="input-textarea"
      ></textarea>
      <div class="action-buttons">
        <button @click="clearAll" class="btn btn-secondary">清空</button>
      </div>
    </div>

    <!-- Token 分段展示 -->
    <div v-if="parts.length === 3" class="token-visual">
      <span class="token-part header-part">{{ parts[0] }}</span>
      <span class="token-dot">.</span>
      <span class="token-part payload-part">{{ parts[1] }}</span>
      <span class="token-dot">.</span>
      <span class="token-part signature-part">{{ parts[2] }}</span>
    </div>

    <div v-if="decoded" class="results-section">
      <!-- Header -->
      <div class="decode-block header-block">
        <div class="block-header">
          <h3>Header <span class="block-tag header-tag">HEADER</span></h3>
          <button @click="copyToClipboard(decoded.header)" class="btn-copy-small">📋</button>
        </div>
        <pre class="code-block">{{ JSON.stringify(decoded.header, null, 2) }}</pre>
      </div>

      <!-- Payload -->
      <div class="decode-block payload-block">
        <div class="block-header">
          <h3>
            Payload <span class="block-tag payload-tag">PAYLOAD</span>
            <span v-if="isExpired !== null" :class="['expire-badge', isExpired ? 'expired' : 'valid']">
              {{ isExpired ? '已过期' : '有效' }}
            </span>
          </h3>
          <button @click="copyToClipboard(decoded.payload)" class="btn-copy-small">📋</button>
        </div>
        <div class="payload-fields">
          <div v-for="(value, key) in decoded.payload" :key="key" class="payload-field">
            <span class="field-key">{{ key }}</span>
            <span class="field-value">
              <template v-if="isTimeField(key) && typeof value === 'number'">
                <span class="time-value">{{ value }}</span>
                <span class="time-readable">{{ formatTimestamp(value) }}</span>
                <span v-if="key === 'exp'" :class="['expire-inline', isExpired ? 'expired' : 'valid']">
                  {{ isExpired ? '(已过期)' : '(未过期)' }}
                </span>
              </template>
              <template v-else-if="typeof value === 'object'">
                {{ JSON.stringify(value) }}
              </template>
              <template v-else>
                {{ value }}
              </template>
            </span>
          </div>
        </div>
      </div>

      <!-- Signature -->
      <div class="decode-block signature-block">
        <div class="block-header">
          <h3>Signature <span class="block-tag signature-tag">SIGNATURE</span></h3>
          <button @click="copyToClipboard(decoded.signature)" class="btn-copy-small">📋</button>
        </div>
        <pre class="code-block signature-code">{{ decoded.signature }}</pre>
        <p class="signature-note">签名验证需要密钥，此工具仅做解码展示。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.jwt-decoder {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  margin: 0;
  color: #ff6b6b;
  font-size: 1.8em;
}

h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

:global([data-theme='dark'] h3) {
  color: #e0e0e0;
}

.description {
  margin: 0;
  color: #888;
  font-size: 0.95rem;
}

.error-message {
  padding: 0.75rem;
  background-color: #fee;
  color: #c33;
  border-radius: 6px;
  border-left: 4px solid #c33;
}

:global([data-theme='dark'] .error-message) {
  background-color: #4a2a2a;
  color: #ff6b6b;
  border-left-color: #ff6b6b;
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-section label {
  font-weight: 600;
  font-size: 0.95rem;
  color: #333;
}

:global([data-theme='dark'] .input-section label) {
  color: #e0e0e0;
}

.input-textarea {
  padding: 0.75rem;
  border: 2px solid #ffcdd2;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  background-color: #fff8f8;
  color: #333;
  resize: vertical;
  min-height: 100px;
  transition: border-color 0.3s;
  word-break: break-all;
}

:global([data-theme='dark'] .input-textarea) {
  background-color: #2a2a3e;
  color: #e0e0e0;
  border-color: #5a3a3a;
}

.input-textarea:focus {
  outline: none;
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
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

:global([data-theme='dark'] .btn-secondary) {
  background-color: #404050;
  color: #e0e0e0;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

:global([data-theme='dark'] .btn-secondary:hover) {
  background-color: #505060;
}

/* Token visual */
.token-visual {
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  word-break: break-all;
  line-height: 1.6;
}

:global([data-theme='dark'] .token-visual) {
  background: #2a2a3e;
}

.token-part {
  padding: 2px 0;
}

.header-part {
  color: #e74c3c;
}

.payload-part {
  color: #8e44ad;
}

.signature-part {
  color: #2980b9;
}

.token-dot {
  color: #333;
  font-weight: 700;
}

:global([data-theme='dark'] .token-dot) {
  color: #e0e0e0;
}

/* Results */
.results-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.decode-block {
  border-radius: 10px;
  padding: 1.25rem;
  border: 2px solid;
}

.header-block {
  background: linear-gradient(135deg, #fff5f5, #fff);
  border-color: #ffcdd2;
}

:global([data-theme='dark'] .header-block) {
  background: linear-gradient(135deg, #3a2a2a, #2a2a3e);
  border-color: #5a3a3a;
}

.payload-block {
  background: linear-gradient(135deg, #f9f0ff, #fff);
  border-color: #e1bee7;
}

:global([data-theme='dark'] .payload-block) {
  background: linear-gradient(135deg, #3a2a4a, #2a2a3e);
  border-color: #5a3a5a;
}

.signature-block {
  background: linear-gradient(135deg, #f0f7ff, #fff);
  border-color: #bbdefb;
}

:global([data-theme='dark'] .signature-block) {
  background: linear-gradient(135deg, #2a3a4a, #2a2a3e);
  border-color: #3a4a5a;
}

.block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.block-tag {
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: white;
}

.header-tag {
  background: #e74c3c;
}

.payload-tag {
  background: #8e44ad;
}

.signature-tag {
  background: #2980b9;
}

.expire-badge {
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.expire-badge.expired {
  background: #ffebee;
  color: #c62828;
}

:global([data-theme='dark'] .expire-badge.expired) {
  background: #3a1a1a;
}

.expire-badge.valid {
  background: #e8f5e9;
  color: #2e7d32;
}

:global([data-theme='dark'] .expire-badge.valid) {
  background: #1a3a1a;
}

.btn-copy-small {
  padding: 0.3rem 0.6rem;
  border: 1px solid #ddd;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

:global([data-theme='dark'] .btn-copy-small) {
  background-color: #2a2a3e;
  border-color: #444;
}

.btn-copy-small:hover {
  background-color: #f0f0f0;
}

:global([data-theme='dark'] .btn-copy-small:hover) {
  background-color: #3a3a4a;
}

.code-block {
  margin: 0;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  color: #333;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

:global([data-theme='dark'] .code-block) {
  background: #1a1a2e;
  color: #e0e0e0;
}

.signature-code {
  word-break: break-all;
}

.signature-note {
  margin: 0.5rem 0 0 0;
  color: #999;
  font-size: 0.8rem;
  font-style: italic;
}

:global([data-theme='dark'] .signature-note) {
  color: #666;
}

/* Payload fields */
.payload-fields {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.payload-field {
  display: flex;
  gap: 1rem;
  padding: 0.5rem 0.75rem;
  background: white;
  border-radius: 6px;
  align-items: flex-start;
}

:global([data-theme='dark'] .payload-field) {
  background: #1a1a2e;
}

.field-key {
  font-family: 'Courier New', monospace;
  font-weight: 700;
  color: #8e44ad;
  min-width: 80px;
  font-size: 0.85rem;
}

:global([data-theme='dark'] .field-key) {
  color: #ce93d8;
}

.field-value {
  font-family: 'Courier New', monospace;
  color: #333;
  font-size: 0.85rem;
  word-break: break-all;
  flex: 1;
}

:global([data-theme='dark'] .field-value) {
  color: #e0e0e0;
}

.time-value {
  color: #666;
  margin-right: 0.5rem;
}

.time-readable {
  color: #2196f3;
  font-weight: 600;
}

:global([data-theme='dark'] .time-readable) {
  color: #64b5f6;
}

.expire-inline {
  font-size: 0.8rem;
  font-weight: 600;
  margin-left: 0.5rem;
}

.expire-inline.expired {
  color: #c62828;
}

:global([data-theme='dark'] .expire-inline.expired) {
  color: #ff6b6b;
}

.expire-inline.valid {
  color: #2e7d32;
}

:global([data-theme='dark'] .expire-inline.valid) {
  color: #66bb6a;
}

@media (max-width: 768px) {
  .payload-field {
    flex-direction: column;
    gap: 0.25rem;
  }

  .field-key {
    min-width: auto;
  }
}

/* Dark mode overrides */
:global([data-theme='dark'] h2) {
  color: #ff8a8a;
}

:global([data-theme='dark'] .description) {
  color: #a0c0e0;
}
</style>
