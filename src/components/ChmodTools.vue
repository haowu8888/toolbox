<script setup>
import { computed, ref, watch } from 'vue'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'
import { normalizeOctal, octalToRwx, rwxToOctal } from '../utils/chmodUtils'

const { showToast } = useToast()
const { addHistory } = useHistory()

const octalInput = ref('755')
const rwxInput = ref('rwxr-xr-x')
const isUpdating = ref(false)

const rwxPreview = computed(() => octalToRwx(octalInput.value).rwx)
const octalPreview = computed(() => rwxToOctal(rwxInput.value).octal)

const octalError = computed(() => octalToRwx(octalInput.value).error)
const rwxError = computed(() => rwxToOctal(rwxInput.value).error)

watch(
  () => octalInput.value,
  (v) => {
    if (isUpdating.value) return
    const { rwx, error } = octalToRwx(v)
    if (error) return
    isUpdating.value = true
    rwxInput.value = rwx
    isUpdating.value = false
  }
)

watch(
  () => rwxInput.value,
  (v) => {
    if (isUpdating.value) return
    const { octal, error } = rwxToOctal(v)
    if (error) return
    isUpdating.value = true
    octalInput.value = octal
    isUpdating.value = false
  }
)

const copyToClipboard = async (text, historyType = '') => {
  try {
    await navigator.clipboard.writeText(String(text ?? ''))
    showToast('已复制')
    if (historyType) addHistory(historyType, String(text ?? ''))
  } catch {
    showToast('复制失败', 'error')
  }
}

const normalize = () => {
  const { octal, error } = normalizeOctal(octalInput.value)
  if (error) {
    showToast(error || '请输入有效权限值', 'info')
    return
  }
  octalInput.value = octal
  const { rwx } = octalToRwx(octal)
  rwxInput.value = rwx
  addHistory('权限换算', `${octal} → ${rwx}`)
}
</script>

<template>
  <div class="chmod-tools">
    <h2>🛡️ 权限换算 (chmod)</h2>
    <p class="description">八进制 (755/644/4755) ↔ rwx 字符串</p>

    <div class="panel">
      <div class="field">
        <div class="label">八进制（Octal）</div>
        <input
          v-model="octalInput"
          class="input"
          placeholder="755 / 644 / 4755"
          aria-label="chmod 八进制输入"
          inputmode="numeric"
        />
        <div v-if="octalError" class="error" role="alert">{{ octalError }}</div>
      </div>

      <div class="field">
        <div class="label">rwx 字符串</div>
        <input
          v-model="rwxInput"
          class="input mono"
          placeholder="rwxr-xr-x"
          aria-label="chmod rwx 输入"
          spellcheck="false"
        />
        <div v-if="rwxError" class="error" role="alert">{{ rwxError }}</div>
      </div>

      <div class="preview">
        <div class="preview-item">
          <div class="preview-label">预览</div>
          <code class="preview-code">{{ rwxPreview || rwxInput || '(empty)' }}</code>
        </div>
        <div class="preview-item">
          <div class="preview-label">结果</div>
          <code class="preview-code">{{ octalPreview || octalInput || '(empty)' }}</code>
        </div>
      </div>

      <div class="actions">
        <button class="btn btn-primary" @click="normalize">✅ 规范化</button>
        <button class="btn btn-secondary" @click="copyToClipboard(octalInput, 'chmod 复制')">📋 复制 Octal</button>
        <button class="btn btn-secondary" @click="copyToClipboard(rwxInput, 'chmod 复制')">📋 复制 rwx</button>
      </div>

      <div class="examples">
        <div class="examples-title">常见示例</div>
        <div class="examples-grid">
          <button class="example" type="button" @click="octalInput = '755'; normalize()">755 → rwxr-xr-x</button>
          <button class="example" type="button" @click="octalInput = '644'; normalize()">644 → rw-r--r--</button>
          <button class="example" type="button" @click="octalInput = '600'; normalize()">600 → rw-------</button>
          <button class="example" type="button" @click="octalInput = '4755'; normalize()">4755 → rwsr-xr-x</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chmod-tools {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  margin: 0;
  color: #607d8b;
  font-size: 1.8em;
}

.description {
  margin: 0;
  color: #888;
  font-size: 0.95rem;
}

.panel {
  padding: 1.2rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

:global([data-theme='dark'] .panel) {
  background: rgba(26, 26, 46, 0.55);
  border-color: rgba(255, 255, 255, 0.08);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.label {
  font-weight: 800;
  color: #444;
}

:global([data-theme='dark'] .label) {
  color: #d6e6f3;
}

.input {
  padding: 0.75rem 0.9rem;
  border-radius: 10px;
  border: 2px solid rgba(96, 125, 139, 0.18);
  font-size: 1rem;
  font-weight: 600;
  background: white;
}

:global([data-theme='dark'] .input) {
  background: rgba(42, 58, 74, 0.85);
  border-color: rgba(96, 125, 139, 0.3);
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.error {
  color: #ff6b6b;
  font-weight: 700;
}

.preview {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  padding-top: 0.4rem;
}

.preview-item {
  padding: 0.8rem;
  border-radius: 12px;
  background: rgba(96, 125, 139, 0.06);
  border: 1px solid rgba(96, 125, 139, 0.15);
}

:global([data-theme='dark'] .preview-item) {
  background: rgba(96, 125, 139, 0.12);
  border-color: rgba(96, 125, 139, 0.25);
}

.preview-label {
  font-weight: 800;
  margin-bottom: 0.3rem;
  color: #444;
}

:global([data-theme='dark'] .preview-label) {
  color: #d6e6f3;
}

.preview-code {
  display: inline-block;
  font-size: 1.05rem;
  padding: 0.2rem 0.45rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.7);
}

:global([data-theme='dark'] .preview-code) {
  background: rgba(42, 58, 74, 0.85);
}

.actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

.examples {
  padding-top: 0.5rem;
}

.examples-title {
  font-weight: 900;
  color: #444;
  margin-bottom: 0.5rem;
}

:global([data-theme='dark'] .examples-title) {
  color: #d6e6f3;
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}

.example {
  padding: 0.65rem 0.9rem;
  border-radius: 12px;
  border: 1px solid rgba(96, 125, 139, 0.22);
  background: rgba(255, 255, 255, 0.6);
  font-weight: 700;
  box-shadow: none;
}

:global([data-theme='dark'] .example) {
  background: rgba(42, 58, 74, 0.45);
  border-color: rgba(96, 125, 139, 0.3);
}

@media (max-width: 900px) {
  .preview,
  .examples-grid {
    grid-template-columns: 1fr;
  }
}
</style>
