<script setup>
import { ref } from 'vue'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()

const inputText = ref('')
const outputText = ref('')
const encodingMode = ref('basic')
const error = ref('')

const basicEntityMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const basicDecodeMap = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
}

const encodeBasic = (text) => {
  return text.replace(/[&<>"']/g, (char) => basicEntityMap[char])
}

const encodeFull = (text) => {
  let result = ''
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (basicEntityMap[char]) {
      result += basicEntityMap[char]
    } else if (text.charCodeAt(i) > 127) {
      result += '&#' + text.charCodeAt(i) + ';'
    } else {
      result += char
    }
  }
  return result
}

const decodeEntities = (text) => {
  const textarea = document.createElement('textarea')
  textarea.innerHTML = text
  return textarea.value
}

const handleEncode = () => {
  if (!inputText.value) {
    outputText.value = ''
    error.value = ''
    return
  }
  try {
    error.value = ''
    if (encodingMode.value === 'basic') {
      outputText.value = encodeBasic(inputText.value)
    } else {
      outputText.value = encodeFull(inputText.value)
    }
  } catch (err) {
    error.value = '编码失败：' + err.message
    outputText.value = ''
  }
}

const handleDecode = () => {
  if (!inputText.value) {
    outputText.value = ''
    error.value = ''
    return
  }
  try {
    error.value = ''
    outputText.value = decodeEntities(inputText.value)
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

const copyResult = async () => {
  if (!outputText.value) return
  try {
    await navigator.clipboard.writeText(outputText.value)
    showToast('已复制')
    addHistory('HTML实体转换', outputText.value)
  } catch (err) {
    showToast('复制失败', 'error')
  }
}

const clearAll = () => {
  inputText.value = ''
  outputText.value = ''
  error.value = ''
}

const quickReferenceEntities = [
  { char: '&', entity: '&amp;' },
  { char: '<', entity: '&lt;' },
  { char: '>', entity: '&gt;' },
  { char: '"', entity: '&quot;' },
  { char: "'", entity: '&#39;' },
  { char: ' ', entity: '&nbsp;', display: '(space)' },
  { char: '\u00A9', entity: '&copy;' },
  { char: '\u00AE', entity: '&reg;' },
  { char: '\u2122', entity: '&trade;' },
  { char: '\u20AC', entity: '&euro;' },
  { char: '\u00A3', entity: '&pound;' },
  { char: '\u00A5', entity: '&yen;' },
]
</script>

<template>
  <div class="html-entity-converter">
    <h2>HTML 实体编码/解码</h2>
    <p class="description">在 HTML 实体和普通字符之间互相转换</p>

    <div class="controls">
      <div class="mode-options">
        <span class="mode-label">编码模式：</span>
        <label>
          <input v-model="encodingMode" type="radio" value="basic" />
          基础（仅 &amp; &lt; &gt; &quot; &#39;）
        </label>
        <label>
          <input v-model="encodingMode" type="radio" value="full" />
          完整（所有非 ASCII 字符转为数字实体）
        </label>
      </div>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div class="editor-container">
      <div class="editor">
        <div class="editor-label">输入</div>
        <textarea
          v-model="inputText"
          placeholder="输入需要编码或解码的文本"
          class="editor-textarea"
        ></textarea>
      </div>

      <div class="swap-btn-container">
        <button @click="swapInputOutput" class="btn-swap" title="交换输入输出">
          ⇄
        </button>
      </div>

      <div class="editor">
        <div class="editor-label">输出</div>
        <textarea
          v-model="outputText"
          readonly
          placeholder="转换结果将显示在这里"
          class="editor-textarea"
        ></textarea>
      </div>
    </div>

    <div class="action-buttons">
      <button @click="handleEncode" class="btn btn-primary">编码</button>
      <button @click="handleDecode" class="btn btn-primary">解码</button>
      <button @click="copyResult" class="btn btn-primary" v-if="outputText">
        📋 复制结果
      </button>
      <button @click="clearAll" class="btn btn-secondary">清空</button>
    </div>

    <div class="quick-reference">
      <h3>常用 HTML 实体参考</h3>
      <div class="entity-grid">
        <div
          v-for="item in quickReferenceEntities"
          :key="item.entity"
          class="entity-card"
        >
          <span class="entity-char">{{ item.display || item.char }}</span>
          <span class="entity-arrow">&rarr;</span>
          <code class="entity-code">{{ item.entity }}</code>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.html-entity-converter {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  margin: 0;
  color: #795548;
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

.mode-options {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  flex-wrap: wrap;
}

.mode-label {
  font-weight: 600;
  font-size: 0.95rem;
  color: #555;
}

.mode-options label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.95rem;
  color: #333;
}

.mode-options input[type="radio"] {
  cursor: pointer;
  accent-color: #795548;
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
  border: 2px solid #bcaaa4;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  background-color: #faf5f2;
  color: #333;
  resize: vertical;
  transition: border-color 0.3s;
}

.editor-textarea:focus {
  outline: none;
  border-color: #795548;
  background-color: white;
  box-shadow: 0 0 0 3px rgba(121, 85, 72, 0.1);
}

.editor-textarea[readonly] {
  background-color: #f9f6f4;
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
  border: 2px solid #795548;
  background-color: white;
  color: #795548;
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.btn-swap:hover {
  background-color: #795548;
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
  background-color: #795548;
  color: white;
}

.btn-primary:hover {
  background-color: #5d4037;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(121, 85, 72, 0.3);
}

.btn-secondary {
  background-color: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

.quick-reference {
  margin-top: 0.5rem;
}

.quick-reference h3 {
  margin: 0 0 1rem 0;
  color: #795548;
  font-size: 1.1em;
}

.entity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
}

.entity-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  background-color: #faf5f2;
  border: 1px solid #d7ccc8;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.entity-card:hover {
  border-color: #795548;
  box-shadow: 0 2px 8px rgba(121, 85, 72, 0.1);
}

.entity-char {
  font-weight: 700;
  font-size: 1.1rem;
  color: #795548;
  min-width: 30px;
  text-align: center;
}

.entity-arrow {
  color: #aaa;
  font-size: 0.85rem;
}

.entity-code {
  font-family: 'Courier New', monospace;
  background-color: #efebe9;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #5d4037;
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
  }

  .entity-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}

/* Dark mode styles */
:global([data-theme='dark'] .html-entity-converter h2) {
  color: #a1887f;
}

:global([data-theme='dark'] .html-entity-converter .description) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .html-entity-converter .mode-label) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .html-entity-converter .mode-options label) {
  color: #e0e0e0;
}

:global([data-theme='dark'] .html-entity-converter .error-message) {
  background-color: #4a2a2a;
  color: #ff6b6b;
  border-left-color: #ff6b6b;
}

:global([data-theme='dark'] .html-entity-converter .editor-label) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .html-entity-converter .editor-textarea) {
  background-color: #2a2a3e;
  color: #e0e0e0;
  border-color: #444;
}

:global([data-theme='dark'] .html-entity-converter .editor-textarea:focus) {
  background-color: #333;
  border-color: #a1887f;
  box-shadow: 0 0 0 3px rgba(161, 136, 127, 0.1);
}

:global([data-theme='dark'] .html-entity-converter .editor-textarea[readonly]) {
  background-color: #333;
  color: #e0e0e0;
}

:global([data-theme='dark'] .html-entity-converter .btn-swap) {
  border-color: #a1887f;
  background-color: #2a2a3e;
  color: #a1887f;
}

:global([data-theme='dark'] .html-entity-converter .btn-swap:hover) {
  background-color: #a1887f;
  color: #1a1a2e;
}

:global([data-theme='dark'] .html-entity-converter .btn-primary) {
  background-color: #795548;
}

:global([data-theme='dark'] .html-entity-converter .btn-primary:hover) {
  background-color: #8d6e63;
}

:global([data-theme='dark'] .html-entity-converter .btn-secondary) {
  background-color: #404050;
  color: #e0e0e0;
}

:global([data-theme='dark'] .html-entity-converter .btn-secondary:hover) {
  background-color: #505060;
}

:global([data-theme='dark'] .html-entity-converter .quick-reference h3) {
  color: #a1887f;
}

:global([data-theme='dark'] .html-entity-converter .entity-card) {
  background-color: #2a2a3e;
  border-color: #444;
}

:global([data-theme='dark'] .html-entity-converter .entity-card:hover) {
  border-color: #a1887f;
  box-shadow: 0 2px 8px rgba(161, 136, 127, 0.15);
}

:global([data-theme='dark'] .html-entity-converter .entity-char) {
  color: #a1887f;
}

:global([data-theme='dark'] .html-entity-converter .entity-arrow) {
  color: #666;
}

:global([data-theme='dark'] .html-entity-converter .entity-code) {
  background-color: #3a3a4e;
  color: #d7ccc8;
}
</style>
