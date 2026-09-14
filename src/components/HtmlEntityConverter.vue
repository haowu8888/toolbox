<script setup>
import { computed, ref } from 'vue'
import { useClipboard } from '../composables/useClipboard'
import { useToast } from '../composables/useToast'
import {
  decodeHtmlEntities,
  encodeHtmlEntities,
  QUICK_REFERENCE_ENTITIES,
} from '../utils/htmlEntities'

const { copyText } = useClipboard()
const { showToast } = useToast()

const inputText = ref('')
const outputText = ref('')
const encodingMode = ref('basic')
const numericStyle = ref('decimal')
const error = ref('')

const inputLength = computed(() => inputText.value.length)
const outputLength = computed(() => outputText.value.length)

// 浏览器兜底：内置表未覆盖的命名实体交给 DOM 解析
const domFallback = (entity) => {
  const textarea = document.createElement('textarea')
  textarea.innerHTML = entity
  return textarea.value
}

const handleEncode = () => {
  error.value = ''
  if (!inputText.value) {
    outputText.value = ''
    return
  }
  try {
    outputText.value = encodeHtmlEntities(inputText.value, {
      mode: encodingMode.value,
      numeric: numericStyle.value,
    })
  } catch (err) {
    error.value = '编码失败：' + err.message
    outputText.value = ''
  }
}

const handleDecode = () => {
  error.value = ''
  if (!inputText.value) {
    outputText.value = ''
    return
  }
  try {
    outputText.value = decodeHtmlEntities(inputText.value, { fallback: domFallback })
  } catch (err) {
    error.value = '解码失败：' + err.message
    outputText.value = ''
  }
}

const swapInputOutput = () => {
  const temp = inputText.value
  inputText.value = outputText.value
  outputText.value = temp
}

const copyResult = () => copyText(outputText.value, { history: 'HTML实体转换' })

const copyEntity = (entity) => copyText(entity, { successMessage: `已复制 ${entity}` })

const clearAll = () => {
  inputText.value = ''
  outputText.value = ''
  error.value = ''
}

const loadExample = () => {
  inputText.value = '<a href="https://example.com?a=1&b=2">Tom & Jerry ©2024 — 你好 🙂</a>'
  handleEncode()
  showToast('已载入示例并编码')
}
</script>

<template>
  <div class="html-entity-converter">
    <h2>🔣 HTML 实体编码/解码</h2>
    <p class="description">在 HTML 实体和普通字符之间互相转换，支持命名、十进制与十六进制实体</p>

    <div class="controls">
      <div class="mode-options">
        <span class="mode-label">编码模式：</span>
        <label>
          <input v-model="encodingMode" type="radio" value="basic" />
          基础（仅 &amp; &lt; &gt; &quot; &#39;）
        </label>
        <label>
          <input v-model="encodingMode" type="radio" value="named" />
          命名优先（©→&amp;copy;，其余非 ASCII 转数字实体）
        </label>
        <label>
          <input v-model="encodingMode" type="radio" value="full" />
          完整（所有非 ASCII 字符转为数字实体）
        </label>
      </div>
      <div v-if="encodingMode !== 'basic'" class="mode-options">
        <span class="mode-label">数字实体：</span>
        <label>
          <input v-model="numericStyle" type="radio" value="decimal" />
          十进制 &amp;#169;
        </label>
        <label>
          <input v-model="numericStyle" type="radio" value="hex" />
          十六进制 &amp;#xA9;
        </label>
      </div>
    </div>

    <div v-if="error" class="error-message" role="alert">{{ error }}</div>

    <div class="editor-container">
      <div class="editor">
        <div class="editor-label">
          <label for="entity-input">输入</label>
          <span class="editor-count">{{ inputLength }} 字符</span>
        </div>
        <textarea
          id="entity-input"
          v-model="inputText"
          placeholder="输入需要编码或解码的文本"
          class="editor-textarea"
          spellcheck="false"
        ></textarea>
      </div>

      <div class="swap-btn-container">
        <button type="button" class="btn-swap" title="交换输入输出" aria-label="交换输入输出" @click="swapInputOutput">⇄</button>
      </div>

      <div class="editor">
        <div class="editor-label">
          <label for="entity-output">输出</label>
          <span class="editor-count">{{ outputLength }} 字符</span>
        </div>
        <textarea
          id="entity-output"
          v-model="outputText"
          readonly
          placeholder="转换结果将显示在这里"
          class="editor-textarea"
        ></textarea>
      </div>
    </div>

    <div class="action-buttons">
      <button type="button" class="btn btn-primary" @click="handleEncode">编码</button>
      <button type="button" class="btn btn-primary" @click="handleDecode">解码</button>
      <button v-if="outputText" type="button" class="btn btn-primary" @click="copyResult">📋 复制结果</button>
      <button type="button" class="btn btn-secondary" @click="loadExample">载入示例</button>
      <button type="button" class="btn btn-secondary" @click="clearAll">清空</button>
    </div>

    <div class="quick-reference">
      <h3>常用 HTML 实体参考（点击复制）</h3>
      <div class="entity-grid">
        <button
          v-for="item in QUICK_REFERENCE_ENTITIES"
          :key="item.entity"
          type="button"
          class="entity-card"
          :title="`复制 ${item.entity}`"
          @click="copyEntity(item.entity)"
        >
          <span class="entity-char">{{ item.display || item.char }}</span>
          <span class="entity-arrow" aria-hidden="true">→</span>
          <code class="entity-code">{{ item.entity }}</code>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.html-entity-converter {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  --tool-accent: #795548;
  --tool-accent-strong: #5d4037;
  --tool-soft: rgba(121, 85, 72, 0.1);
  --tool-border: rgba(121, 85, 72, 0.35);
}

h2 {
  margin: 0;
  color: var(--tool-accent);
  font-size: 1.8em;
}

:global([data-theme='dark']) h2 {
  color: #a1887f;
}

.description {
  margin: 0;
  color: var(--text-3);
  font-size: 0.95rem;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mode-options {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  flex-wrap: wrap;
}

.mode-label {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-2);
}

.mode-options label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.95rem;
  color: var(--text);
}

.mode-options input[type='radio'] {
  cursor: pointer;
  accent-color: var(--tool-accent);
  width: 16px;
  height: 16px;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-2);
}

.editor-count {
  font-weight: 400;
  font-size: 0.8rem;
  color: var(--text-3);
}

.editor-textarea {
  flex: 1;
  min-height: 250px;
  padding: 0.75rem;
  border: 2px solid var(--tool-border);
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 0.9rem;
  background-color: var(--surface);
  color: var(--text);
  resize: vertical;
  transition: border-color 0.3s;
}

.editor-textarea:focus {
  outline: none;
  border-color: var(--tool-accent);
  box-shadow: 0 0 0 3px var(--tool-soft);
}

.editor-textarea[readonly] {
  background-color: var(--surface-2);
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
  border: 2px solid var(--tool-accent);
  background-color: var(--surface);
  color: var(--tool-accent);
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  box-shadow: none;
}

.btn-swap:hover {
  background-color: var(--tool-accent);
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
  background-color: var(--tool-accent);
  color: white;
}

.btn-primary:hover {
  background-color: var(--tool-accent-strong);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(121, 85, 72, 0.3);
}

.btn-secondary {
  background-color: var(--surface-3);
  color: var(--text);
}

.btn-secondary:hover {
  background-color: var(--border);
}

.quick-reference {
  margin-top: 0.5rem;
}

.quick-reference h3 {
  margin: 0 0 1rem 0;
  color: var(--tool-accent);
  font-size: 1.1em;
}

:global([data-theme='dark']) .quick-reference h3 {
  color: #a1887f;
}

.entity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 0.75rem;
}

.entity-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  background-color: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.9rem;
  transition: all 0.2s;
  cursor: pointer;
  box-shadow: none;
  text-align: left;
  font-weight: 400;
}

.entity-card:hover {
  border-color: var(--tool-accent);
  box-shadow: 0 2px 8px rgba(121, 85, 72, 0.15);
  transform: translateY(-1px);
}

.entity-char {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--tool-accent);
  min-width: 30px;
  text-align: center;
}

:global([data-theme='dark']) .entity-char {
  color: #a1887f;
}

.entity-arrow {
  color: var(--text-3);
  font-size: 0.85rem;
}

.entity-code {
  font-family: var(--font-mono);
  background-color: var(--surface-3);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.85rem;
  color: var(--text);
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

  .mode-options {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .entity-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}
</style>
