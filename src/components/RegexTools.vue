<script setup>
import { ref } from 'vue'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()

const pattern = ref('')
const flags = ref(['g'])
const testText = ref('')
const output = ref('')
const error = ref('')
const matches = ref([])
const replaceText = ref('')

const testRegex = () => {
  if (!pattern.value.trim() || !testText.value.trim()) {
    output.value = ''
    matches.value = []
    error.value = ''
    return
  }

  try {
    error.value = ''
    const regex = new RegExp(pattern.value, flags.value.join(''))
    const allMatches = testText.value.match(regex)

    if (allMatches) {
      matches.value = allMatches
      output.value = `找到 ${allMatches.length} 个匹配项`
    } else {
      matches.value = []
      output.value = '未找到匹配项'
    }
  } catch (err) {
    error.value = '正则表达式错误：' + err.message
    output.value = ''
    matches.value = []
  }
}

const replace = () => {
  if (!pattern.value.trim() || !testText.value.trim()) {
    showToast('请输入正则表达式和要替换的文本', 'info')
    return
  }

  try {
    error.value = ''
    const regex = new RegExp(pattern.value, flags.value.join(''))
    const result = testText.value.replace(regex, replaceText.value)
    output.value = result
    addHistory('正则替换', result)
    copyToClipboard(result)
  } catch (err) {
    error.value = '替换失败：' + err.message
    output.value = ''
  }
}

const escapeHtml = (str) => {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const highlightMatches = () => {
  if (!pattern.value.trim() || !testText.value.trim()) {
    return
  }

  try {
    const flagStr = flags.value.join('')
    const regex = new RegExp(pattern.value, flagStr.includes('g') ? flagStr : flagStr + 'g')
    let result = ''
    let lastIndex = 0
    let match
    while ((match = regex.exec(testText.value)) !== null) {
      result += escapeHtml(testText.value.slice(lastIndex, match.index))
      result += '<mark>' + escapeHtml(match[0]) + '</mark>'
      lastIndex = match.index + match[0].length
      if (match[0].length === 0) {
        regex.lastIndex++
      }
    }
    result += escapeHtml(testText.value.slice(lastIndex))
    output.value = result
  } catch (err) {
    error.value = '高亮失败：' + err.message
  }
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    showToast('已复制')
    addHistory('正则工具', text)
  } catch (err) {
    showToast('复制失败', 'error')
  }
}

const clearAll = () => {
  pattern.value = ''
  testText.value = ''
  output.value = ''
  error.value = ''
  matches.value = []
  replaceText.value = ''
}
</script>

<template>
  <div class="regex-tools">
    <h2>正则表达式工具</h2>
    <p class="description">测试和替换正则表达式</p>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div class="input-section">
      <div class="form-group">
        <label>正则表达式</label>
        <div class="regex-input-group">
          <input
            v-model="pattern"
            @input="testRegex"
            placeholder="输入正则表达式，如：\d+"
            class="regex-input"
          />
          <div class="flags">
            <label class="flag-label">
              <input
                v-model="flags"
                type="checkbox"
                value="g"
                @change="testRegex"
              />
              全局(g)
            </label>
            <label class="flag-label">
              <input
                v-model="flags"
                type="checkbox"
                value="i"
                @change="testRegex"
              />
              不区分大小写(i)
            </label>
            <label class="flag-label">
              <input
                v-model="flags"
                type="checkbox"
                value="m"
                @change="testRegex"
              />
              多行(m)
            </label>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>测试文本</label>
        <textarea
          v-model="testText"
          @input="testRegex"
          placeholder="输入要测试的文本"
          class="input-textarea"
        ></textarea>
      </div>

      <div class="form-group">
        <label>替换内容</label>
        <input
          v-model="replaceText"
          placeholder="输入替换文本（点击替换按钮执行）"
          class="regex-input"
        />
      </div>
    </div>

    <div class="action-buttons">
      <button @click="testRegex" class="btn btn-primary">🔍 测试</button>
      <button @click="highlightMatches" class="btn btn-primary">🎨 高亮</button>
      <button @click="replace" class="btn btn-primary">🔄 替换</button>
      <button @click="clearAll" class="btn btn-secondary">清空</button>
    </div>

    <div v-if="output || matches.length > 0" class="results-section">
      <div v-if="matches.length > 0" class="matches-list">
        <h3>匹配结果</h3>
        <div class="match-items">
          <div v-for="(match, index) in matches" :key="index" class="match-item">
            <span class="match-index">{{ index + 1 }}.</span>
            <code class="match-text">{{ match }}</code>
          </div>
        </div>
      </div>

      <div v-if="output" class="output-section">
        <h3>输出</h3>
        <div class="output-content">
          <div
            v-if="output.includes('<mark>')"
            class="html-render"
            v-html="output"
          ></div>
          <code v-else class="output-text">{{ output }}</code>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.regex-tools {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  margin: 0;
  color: #ffa502;
  font-size: 1.8em;
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

.input-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  font-size: 0.95rem;
  color: #333;
}

.regex-input-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.regex-input {
  padding: 0.75rem;
  border: 2px solid #ffe0b2;
  border-radius: 8px;
  font-size: 1rem;
  font-family: 'Courier New', monospace;
  background-color: #fffbf0;
  color: #333;
  transition: border-color 0.3s;
}

.regex-input:focus {
  outline: none;
  border-color: #ffa502;
  background-color: white;
  box-shadow: 0 0 0 3px rgba(255, 165, 2, 0.1);
}

.flags {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.flag-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: normal;
  color: #555;
}

.flag-label input[type="checkbox"] {
  cursor: pointer;
  accent-color: #ffa502;
  width: 16px;
  height: 16px;
}

.input-textarea {
  padding: 0.75rem;
  border: 2px solid #ffe0b2;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  background-color: #fffbf0;
  color: #333;
  resize: vertical;
  min-height: 150px;
  transition: border-color 0.3s;
}

.input-textarea:focus {
  outline: none;
  border-color: #ffa502;
  background-color: white;
  box-shadow: 0 0 0 3px rgba(255, 165, 2, 0.1);
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
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
  background-color: #ffa502;
  color: white;
}

.btn-primary:hover {
  background-color: #ff8c00;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 165, 2, 0.3);
}

.btn-secondary {
  background-color: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

.results-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.matches-list h3,
.output-section h3 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1rem;
}

.match-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}

.match-item {
  background: linear-gradient(135deg, #fff8f0, #fffcf9);
  border: 1px solid #ffe0b2;
  border-radius: 6px;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.match-index {
  font-weight: 600;
  color: #ffa502;
  min-width: 25px;
}

.match-text {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  word-break: break-all;
  color: #333;
}

.output-section {
  background: linear-gradient(135deg, #fff8f0, #fffcf9);
  border: 2px solid #ffe0b2;
  border-radius: 8px;
  padding: 1rem;
}

.output-content {
  background-color: #f9f9f9;
  border-radius: 4px;
  padding: 0.75rem;
}

.output-text,
.html-render {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: #333;
  word-break: break-all;
}

mark {
  background-color: #ffeb3b;
  padding: 2px 4px;
  border-radius: 2px;
  color: #333;
}

@media (max-width: 768px) {
  .match-items {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }

  .btn {
    flex: 1;
  }
}

:global([data-theme='dark'] h2) {
  color: #ffb84d;
}

:global([data-theme='dark'] .description) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .error-message) {
  background-color: #4a2a2a;
  color: #ff6b6b;
  border-left-color: #ff6b6b;
}

:global([data-theme='dark'] .form-group label) {
  color: #e0e0e0;
}

:global([data-theme='dark'] .regex-input) {
  background-color: #2a2a3e;
  color: #e0e0e0;
  border-color: #664a33;
}

:global([data-theme='dark'] .regex-input:focus) {
  background-color: #333;
  border-color: #ffb84d;
  box-shadow: 0 0 0 3px rgba(255, 165, 2, 0.1);
}

:global([data-theme='dark'] .flag-label) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .input-textarea) {
  background-color: #2a2a3e;
  color: #e0e0e0;
  border-color: #664a33;
}

:global([data-theme='dark'] .input-textarea:focus) {
  background-color: #333;
  border-color: #ffb84d;
  box-shadow: 0 0 0 3px rgba(255, 165, 2, 0.1);
}

:global([data-theme='dark'] .btn-secondary) {
  background-color: #404050;
  color: #e0e0e0;
}

:global([data-theme='dark'] .btn-secondary:hover) {
  background-color: #505060;
}

:global([data-theme='dark'] .matches-list h3),
:global([data-theme='dark'] .output-section h3) {
  color: #e0e0e0;
}

:global([data-theme='dark'] .match-item) {
  background: linear-gradient(135deg, #3a2a1e, #3a3a2e);
  border-color: #664a33;
}

:global([data-theme='dark'] .match-text) {
  color: #e0e0e0;
}

:global([data-theme='dark'] .output-section) {
  background: linear-gradient(135deg, #3a2a1e, #3a3a2e);
  border-color: #664a33;
}

:global([data-theme='dark'] .output-content) {
  background-color: #333;
}

:global([data-theme='dark'] .output-text),
:global([data-theme='dark'] .html-render) {
  color: #e0e0e0;
}

:global([data-theme='dark'] mark) {
  background-color: #666600;
  color: #ffff99;
}
</style>
