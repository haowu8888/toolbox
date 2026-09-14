<script setup>
import { computed, onActivated, onDeactivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { useClipboard } from '../composables/useClipboard'
import { useHistory } from '../composables/useStorage'
import { formatDateTime, formatDuration } from '../utils/format'
import {
  decodeJwt,
  getJwtTimeStatus,
  isJwtTimeClaim,
  JWT_CLAIM_DESCRIPTIONS,
} from '../utils/jwt'

const { copyText } = useClipboard()
const { addHistory } = useHistory()

const jwtInput = ref('')
const now = ref(Date.now())
let ticker = null

const decoded = computed(() => decodeJwt(jwtInput.value))
const error = computed(() => decoded.value.error)
const parts = computed(() => (decoded.value.parts.length === 3 ? decoded.value.parts : []))

const timeStatus = computed(() =>
  decoded.value.ok ? getJwtTimeStatus(decoded.value.payload, now.value) : null,
)

const expiryLabel = computed(() => {
  const status = timeStatus.value
  if (!status || status.exp === null) return ''
  if (status.expired) return `已过期 ${formatDuration(-status.remainingSeconds)}`
  return `剩余 ${formatDuration(status.remainingSeconds)}`
})

const algorithm = computed(() => decoded.value.header?.alg ?? '')
const algorithmWarning = computed(() => {
  const alg = String(algorithm.value).toLowerCase()
  if (alg === 'none') return '此 Token 声明 alg=none，表示未签名，切勿信任其内容。'
  return ''
})

const claimDescription = (key) => JWT_CLAIM_DESCRIPTIONS[key] || ''

const formatTimestamp = (seconds) => formatDateTime(seconds * 1000)

const formatValue = (value) => (typeof value === 'object' ? JSON.stringify(value) : String(value))

const copyPart = (value, label) => copyText(value, { successMessage: `已复制 ${label}` })

const clearAll = () => {
  jwtInput.value = ''
}

const loadExample = () => {
  jwtInput.value =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
}

// 解码成功时记录历史（同一 Token 只记一次）
let lastRecordedToken = ''
watch(decoded, (val) => {
  if (!val.ok) return
  const token = jwtInput.value.trim()
  if (token === lastRecordedToken) return
  lastRecordedToken = token
  addHistory('JWT 解码', JSON.stringify(val.payload, null, 2))
})

const startTicker = () => {
  if (ticker) return
  ticker = setInterval(() => {
    now.value = Date.now()
  }, 1000)
}

const stopTicker = () => {
  if (!ticker) return
  clearInterval(ticker)
  ticker = null
}

onMounted(startTicker)
onActivated(startTicker)
onDeactivated(stopTicker)
onUnmounted(stopTicker)
</script>

<template>
  <div class="jwt-decoder">
    <h2>🔑 JWT 解码器</h2>
    <p class="description">解码和分析 JSON Web Token，本地解析，不会上传任何内容</p>

    <div v-if="error" class="error-message" role="alert">{{ error }}</div>

    <div class="input-section">
      <label for="jwt-input">粘贴 JWT Token</label>
      <textarea
        id="jwt-input"
        v-model="jwtInput"
        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
        class="input-textarea"
        spellcheck="false"
        autocomplete="off"
      ></textarea>
      <div class="action-buttons">
        <button type="button" class="btn btn-secondary" @click="loadExample">载入示例</button>
        <button type="button" class="btn btn-secondary" @click="clearAll">清空</button>
      </div>
    </div>

    <!-- Token 分段展示 -->
    <div v-if="parts.length === 3" class="token-visual" aria-label="Token 分段">
      <span class="token-part header-part">{{ parts[0] }}</span>
      <span class="token-dot">.</span>
      <span class="token-part payload-part">{{ parts[1] }}</span>
      <span class="token-dot">.</span>
      <span class="token-part signature-part">{{ parts[2] }}</span>
    </div>

    <div v-if="decoded.ok" class="results-section">
      <div v-if="timeStatus" class="status-strip">
        <span v-if="algorithm" class="status-chip">算法 {{ algorithm }}</span>
        <span v-if="decoded.header?.typ" class="status-chip">类型 {{ decoded.header.typ }}</span>
        <span v-if="timeStatus.exp !== null" :class="['status-chip', timeStatus.expired ? 'expired' : 'valid']">
          {{ timeStatus.expired ? '已过期' : '有效' }} · {{ expiryLabel }}
        </span>
        <span v-if="timeStatus.notYetValid" class="status-chip expired">尚未生效（nbf）</span>
        <span v-if="timeStatus.lifetimeSeconds !== null" class="status-chip">
          有效期 {{ formatDuration(timeStatus.lifetimeSeconds) }}
        </span>
        <span v-if="timeStatus.exp === null" class="status-chip">未设置过期时间</span>
      </div>

      <p v-if="algorithmWarning" class="algorithm-warning" role="alert">⚠️ {{ algorithmWarning }}</p>

      <!-- Header -->
      <div class="decode-block header-block">
        <div class="block-header">
          <h3>Header <span class="block-tag header-tag">HEADER</span></h3>
          <button type="button" class="btn-copy-small" aria-label="复制 Header" @click="copyPart(decoded.header, 'Header')">📋</button>
        </div>
        <pre class="code-block">{{ JSON.stringify(decoded.header, null, 2) }}</pre>
      </div>

      <!-- Payload -->
      <div class="decode-block payload-block">
        <div class="block-header">
          <h3>
            Payload <span class="block-tag payload-tag">PAYLOAD</span>
            <span v-if="timeStatus && timeStatus.exp !== null" :class="['expire-badge', timeStatus.expired ? 'expired' : 'valid']">
              {{ timeStatus.expired ? '已过期' : '有效' }}
            </span>
          </h3>
          <button type="button" class="btn-copy-small" aria-label="复制 Payload" @click="copyPart(decoded.payload, 'Payload')">📋</button>
        </div>
        <div class="payload-fields">
          <div v-for="(value, key) in decoded.payload" :key="key" class="payload-field">
            <span class="field-key" :title="claimDescription(key)">
              {{ key }}
              <span v-if="claimDescription(key)" class="field-hint">{{ claimDescription(key) }}</span>
            </span>
            <span class="field-value">
              <template v-if="isJwtTimeClaim(key, value)">
                <span class="time-value">{{ value }}</span>
                <span class="time-readable">{{ formatTimestamp(value) }}</span>
                <span v-if="key === 'exp' && timeStatus" :class="['expire-inline', timeStatus.expired ? 'expired' : 'valid']">
                  {{ timeStatus.expired ? '(已过期)' : '(未过期)' }}
                </span>
              </template>
              <template v-else>{{ formatValue(value) }}</template>
            </span>
          </div>
          <div v-if="Object.keys(decoded.payload).length === 0" class="payload-empty">Payload 为空对象</div>
        </div>
      </div>

      <!-- Signature -->
      <div class="decode-block signature-block">
        <div class="block-header">
          <h3>Signature <span class="block-tag signature-tag">SIGNATURE</span></h3>
          <button type="button" class="btn-copy-small" aria-label="复制 Signature" @click="copyPart(decoded.signature, 'Signature')">📋</button>
        </div>
        <pre class="code-block signature-code">{{ decoded.signature || '（无签名）' }}</pre>
        <p class="signature-note">签名验证需要密钥，此工具仅做解码展示，不校验签名真伪。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.jwt-decoder {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  --tool-accent: #ff6b6b;
}

h2 {
  margin: 0;
  color: var(--tool-accent);
  font-size: 1.8em;
}

h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.description {
  margin: 0;
  color: var(--text-3);
  font-size: 0.95rem;
}

.error-message {
  padding: 0.75rem;
  background-color: var(--danger-soft);
  color: #c33;
  border-radius: 6px;
  border-left: 4px solid #c33;
}

:global([data-theme='dark']) .error-message {
  color: #ff8a8a;
  border-left-color: #ff8a8a;
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-section label {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text);
}

.input-textarea {
  padding: 0.75rem;
  border: 2px solid var(--border);
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  background-color: var(--surface);
  color: var(--text);
  resize: vertical;
  min-height: 100px;
  transition: border-color 0.3s;
  word-break: break-all;
}

.input-textarea:focus {
  outline: none;
  border-color: var(--tool-accent);
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.12);
}

.action-buttons {
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

.btn-secondary {
  background-color: var(--surface-3);
  color: var(--text);
}

.btn-secondary:hover {
  background-color: var(--border);
}

.status-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.status-chip {
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-2);
}

.status-chip.valid {
  background: var(--success-soft);
  color: #2e7d32;
  border-color: transparent;
}

.status-chip.expired {
  background: var(--danger-soft);
  color: #c62828;
  border-color: transparent;
}

:global([data-theme='dark']) .status-chip.valid {
  color: #81c784;
}

:global([data-theme='dark']) .status-chip.expired {
  color: #ef9a9a;
}

.algorithm-warning {
  margin: 0;
  padding: 0.7rem 0.9rem;
  border-radius: 8px;
  background: var(--warning-soft);
  color: #8a5a00;
  font-weight: 600;
  font-size: 0.9rem;
}

:global([data-theme='dark']) .algorithm-warning {
  color: #ffc46b;
}

/* Token visual */
.token-visual {
  padding: 1rem;
  background: var(--surface-2);
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  word-break: break-all;
  line-height: 1.6;
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

:global([data-theme='dark']) .payload-part {
  color: #ce93d8;
}

.signature-part {
  color: #2980b9;
}

:global([data-theme='dark']) .signature-part {
  color: #64b5f6;
}

.token-dot {
  color: var(--text);
  font-weight: 700;
}

/* Results */
.results-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.decode-block {
  border-radius: 10px;
  padding: 1.25rem;
  border: 2px solid;
  background: var(--surface-2);
}

.header-block {
  border-color: rgba(231, 76, 60, 0.35);
}

.payload-block {
  border-color: rgba(142, 68, 173, 0.35);
}

.signature-block {
  border-color: rgba(41, 128, 185, 0.35);
}

.block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  gap: 0.5rem;
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
  background: var(--danger-soft);
  color: #c62828;
}

.expire-badge.valid {
  background: var(--success-soft);
  color: #2e7d32;
}

:global([data-theme='dark']) .expire-badge.expired {
  color: #ef9a9a;
}

:global([data-theme='dark']) .expire-badge.valid {
  color: #81c784;
}

.btn-copy-small {
  padding: 0.3rem 0.6rem;
  border: 1px solid var(--border);
  background-color: var(--surface);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  box-shadow: none;
}

.btn-copy-small:hover {
  background-color: var(--surface-3);
}

.code-block {
  margin: 0;
  padding: 0.75rem;
  background: var(--surface);
  border-radius: 6px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--text);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.signature-code {
  word-break: break-all;
}

.signature-note {
  margin: 0.5rem 0 0 0;
  color: var(--text-3);
  font-size: 0.8rem;
  font-style: italic;
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
  background: var(--surface);
  border-radius: 6px;
  align-items: flex-start;
}

.payload-empty {
  color: var(--text-3);
  font-size: 0.9rem;
  padding: 0.5rem 0.75rem;
}

.field-key {
  font-family: var(--font-mono);
  font-weight: 700;
  color: #8e44ad;
  min-width: 120px;
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

:global([data-theme='dark']) .field-key {
  color: #ce93d8;
}

.field-hint {
  font-family: var(--font-sans);
  font-weight: 400;
  font-size: 0.7rem;
  color: var(--text-3);
}

.field-value {
  font-family: var(--font-mono);
  color: var(--text);
  font-size: 0.85rem;
  word-break: break-all;
  flex: 1;
}

.time-value {
  color: var(--text-2);
  margin-right: 0.5rem;
}

.time-readable {
  color: #2196f3;
  font-weight: 600;
}

:global([data-theme='dark']) .time-readable {
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

.expire-inline.valid {
  color: #2e7d32;
}

:global([data-theme='dark']) .expire-inline.expired {
  color: #ff8a8a;
}

:global([data-theme='dark']) .expire-inline.valid {
  color: #81c784;
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

:global([data-theme='dark']) h2 {
  color: #ff8a8a;
}
</style>
