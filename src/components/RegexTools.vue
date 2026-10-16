<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useClipboard } from '../composables/useClipboard'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'
import { useRegexWorker } from '../composables/useRegexWorker'
import { MAX_MATCHES } from '../utils/regexRunner'

const { copyText } = useClipboard()
const { showToast } = useToast()
const { addHistory } = useHistory()
const { run } = useRegexWorker()

const FLAG_OPTIONS = [
  { value: 'g', label: '全局(g)' },
  { value: 'i', label: '不区分大小写(i)' },
  { value: 'm', label: '多行(m)' },
  { value: 's', label: '点匹配换行(s)' },
  { value: 'u', label: 'Unicode(u)' },
]
const INPUT_DEBOUNCE_MS = 150

const pattern = ref('')
const flags = ref(['g'])
const testText = ref('')
const replaceText = ref('')
const error = ref('')
const running = ref(false)
const result = ref(null)
// 输出区展示的内容：highlight = 高亮原文，replace = 替换结果
const outputMode = ref('highlight')

const flagString = computed(() => FLAG_OPTIONS.map((f) => f.value).filter((f) => flags.value.includes(f)).join(''))
const matches = computed(() => result.value?.matches ?? [])
const summary = computed(() => {
  if (!result.value) return ''
  const count = matches.value.length
  if (!count) return '未找到匹配项'
  return `找到 ${count}${result.value.truncated ? '+' : ''} 个匹配项${result.value.truncated ? `（仅列出前 ${MAX_MATCHES} 个）` : ''}`
})
const hasGroups = (match) => match.groups.length > 0

const execute = async ({ withReplace = false } = {}) => {
  // 只判断是否为空，允许测试 \s 这类只匹配空白的正则
  if (!pattern.value || !testText.value) {
    result.value = null
    error.value = ''
    return null
  }
  running.value = true
  try {
    const next = await run({
      pattern: pattern.value,
      flags: flagString.value,
      text: testText.value,
      replacement: replaceText.value,
      withReplace,
    })
    result.value = next
    error.value = ''
    return next
  } catch (err) {
    if (err?.name === 'AbortError') return null
    result.value = null
    error.value = err?.name === 'TimeoutError' ? err.message : '正则表达式错误：' + err.message
    return null
  } finally {
    running.value = false
  }
}

let debounceTimer = null
const clearDebounce = () => {
  clearTimeout(debounceTimer)
  debounceTimer = null
}

// 输入时自动匹配（防抖）；按钮触发的立即执行
watch([pattern, flagString, testText], () => {
  clearDebounce()
  if (outputMode.value === 'replace') outputMode.value = 'highlight'
  debounceTimer = setTimeout(() => execute(), INPUT_DEBOUNCE_MS)
})

onBeforeUnmount(clearDebounce)

const testRegex = () => {
  clearDebounce()
  return execute()
}

const highlightMatches = async () => {
  outputMode.value = 'highlight'
  await testRegex()
}

const replace = async () => {
  if (!pattern.value || !testText.value) {
    showToast('请输入正则表达式和要替换的文本', 'info')
    return
  }
  clearDebounce()
  const next = await execute({ withReplace: true })
  if (!next) return
  outputMode.value = 'replace'
  addHistory('正则替换', next.replaced)
  copyToClipboard(next.replaced)
}

const copyToClipboard = (text) => copyText(text, { history: '正则工具' })

const clearAll = () => {
  clearDebounce()
  pattern.value = ''
  testText.value = ''
  replaceText.value = ''
  error.value = ''
  result.value = null
  outputMode.value = 'highlight'
}
</script>

<template>
  <div class="regex-tools">
    <h2>正则表达式工具</h2>
    <p class="description">测试和替换正则表达式（在独立线程中执行，回溯过久会自动中止）</p>

    <div v-if="error" class="error-message" role="alert">{{ error }}</div>

    <div class="input-section">
      <div class="form-group">
        <label for="regex-pattern">正则表达式</label>
        <div class="regex-input-group">
          <input
            id="regex-pattern"
            v-model="pattern"
            placeholder="输入正则表达式，如：\d+"
            class="regex-input"
            spellcheck="false"
            autocomplete="off"
          />
          <div class="flags">
            <label v-for="flag in FLAG_OPTIONS" :key="flag.value" class="flag-label">
              <input v-model="flags" type="checkbox" :value="flag.value" />
              {{ flag.label }}
            </label>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label for="regex-text">测试文本</label>
        <textarea
          id="regex-text"
          v-model="testText"
          placeholder="输入要测试的文本"
          class="input-textarea"
          spellcheck="false"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="regex-replace">替换内容</label>
        <input
          id="regex-replace"
          v-model="replaceText"
          placeholder="输入替换文本，支持 $1、$<name>（点击替换按钮执行）"
          class="regex-input"
          spellcheck="false"
        />
      </div>
    </div>

    <div class="action-buttons">
      <button @click="testRegex" class="btn btn-primary">🔍 测试</button>
      <button @click="highlightMatches" class="btn btn-primary">🎨 高亮</button>
      <button @click="replace" class="btn btn-primary">🔄 替换</button>
      <button @click="clearAll" class="btn btn-secondary">清空</button>
    </div>

    <div v-if="result" class="results-section" :aria-busy="running">
      <p class="summary" role="status">{{ summary }}</p>

      <div v-if="matches.length > 0" class="matches-list">
        <h3>匹配结果</h3>
        <div class="match-items">
          <div v-for="(match, index) in matches" :key="`${match.index}-${index}`" class="match-item">
            <span class="match-index">{{ index + 1 }}.</span>
            <code class="match-text">{{ match.text || '(空匹配)' }}</code>
            <span class="match-pos">@{{ match.index }}</span>
            <span v-if="hasGroups(match)" class="match-groups">
              <code v-for="(group, gi) in match.groups" :key="gi" class="group-chip">
                ${{ gi + 1 }}={{ group ?? 'undefined' }}
              </code>
              <template v-if="match.named">
                <code v-for="(value, name) in match.named" :key="name" class="group-chip named">
                  {{ name }}={{ value ?? 'undefined' }}
                </code>
              </template>
            </span>
          </div>
        </div>
      </div>

      <div class="output-section">
        <h3>{{ outputMode === 'replace' ? '替换结果' : '高亮预览' }}</h3>
        <div class="output-content">
          <code v-if="outputMode === 'replace'" class="output-text">{{ result.replaced }}</code>
          <div v-else class="html-render"><template v-for="(segment, i) in result.segments" :key="i"><mark v-if="segment.match">{{ segment.text }}</mark><template v-else>{{ segment.text }}</template></template></div>
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
  flex-wrap: wrap;
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
  /* 保留测试文本中的换行与缩进 */
  white-space: pre-wrap;
}

.summary {
  margin: 0 0 1rem;
  font-weight: 600;
  color: var(--text-2);
}

.match-pos {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-3);
}

.match-groups {
  flex-basis: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.group-chip {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-2);
  word-break: break-all;
}

.group-chip.named {
  border-color: #ffb74d;
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

:root[data-theme='dark'] h2 {
  color: #ffb84d;
}

:root[data-theme='dark'] .description {
  color: #a0a0a0;
}

:root[data-theme='dark'] .error-message {
  background-color: #4a2a2a;
  color: #ff6b6b;
  border-left-color: #ff6b6b;
}

:root[data-theme='dark'] .form-group label {
  color: #e0e0e0;
}

:root[data-theme='dark'] .regex-input {
  background-color: #2a2a3e;
  color: #e0e0e0;
  border-color: #664a33;
}

:root[data-theme='dark'] .regex-input:focus {
  background-color: #333;
  border-color: #ffb84d;
  box-shadow: 0 0 0 3px rgba(255, 165, 2, 0.1);
}

:root[data-theme='dark'] .flag-label {
  color: #a0a0a0;
}

:root[data-theme='dark'] .input-textarea {
  background-color: #2a2a3e;
  color: #e0e0e0;
  border-color: #664a33;
}

:root[data-theme='dark'] .input-textarea:focus {
  background-color: #333;
  border-color: #ffb84d;
  box-shadow: 0 0 0 3px rgba(255, 165, 2, 0.1);
}

:root[data-theme='dark'] .btn-secondary {
  background-color: #404050;
  color: #e0e0e0;
}

:root[data-theme='dark'] .btn-secondary:hover {
  background-color: #505060;
}

:root[data-theme='dark'] .matches-list h3,
:root[data-theme='dark'] .output-section h3 {
  color: #e0e0e0;
}

:root[data-theme='dark'] .match-item {
  background: linear-gradient(135deg, #3a2a1e, #3a3a2e);
  border-color: #664a33;
}

:root[data-theme='dark'] .match-text {
  color: #e0e0e0;
}

:root[data-theme='dark'] .output-section {
  background: linear-gradient(135deg, #3a2a1e, #3a3a2e);
  border-color: #664a33;
}

:root[data-theme='dark'] .output-content {
  background-color: #333;
}

:root[data-theme='dark'] .output-text,
:root[data-theme='dark'] .html-render {
  color: #e0e0e0;
}

:root[data-theme='dark'] mark {
  background-color: #666600;
  color: #ffff99;
}
</style>
