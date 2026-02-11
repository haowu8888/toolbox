<script setup>
import { ref, computed } from 'vue'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()

const originalText = ref('')
const modifiedText = ref('')
const ignoreWhitespace = ref(false)
const diffResult = ref([])
const hasCompared = ref(false)

function lcs(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
  // backtrack to build diff
  let i = m, j = n
  const result = []
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: 'unchanged', text: a[i - 1] })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', text: b[j - 1] })
      j--
    } else {
      result.unshift({ type: 'deleted', text: a[i - 1] })
      i--
    }
  }
  return result
}

const stats = computed(() => {
  const added = diffResult.value.filter(d => d.type === 'added').length
  const deleted = diffResult.value.filter(d => d.type === 'deleted').length
  const unchanged = diffResult.value.filter(d => d.type === 'unchanged').length
  return { added, deleted, unchanged }
})

const MAX_LINES = 5000

const compare = () => {
  let origLines = originalText.value.split('\n')
  let modLines = modifiedText.value.split('\n')

  if (origLines.length > MAX_LINES || modLines.length > MAX_LINES) {
    showToast(`文本过长（最大 ${MAX_LINES} 行），请缩减后重试`, 'error')
    return
  }

  if (ignoreWhitespace.value) {
    origLines = origLines.map(line => line.replace(/\s+/g, ' ').trim())
    modLines = modLines.map(line => line.replace(/\s+/g, ' ').trim())
  }

  diffResult.value = lcs(origLines, modLines)
  hasCompared.value = true
  addHistory('文本对比', `原始: ${origLines.length}行, 修改: ${modLines.length}行`)
}

const diffText = computed(() => {
  return diffResult.value.map(d => {
    if (d.type === 'added') return '+ ' + d.text
    if (d.type === 'deleted') return '- ' + d.text
    return '  ' + d.text
  }).join('\n')
})

const copyDiff = async () => {
  if (!diffResult.value.length) {
    showToast('没有对比结果可复制', 'error')
    return
  }
  try {
    await navigator.clipboard.writeText(diffText.value)
    showToast('已复制对比结果')
  } catch (err) {
    showToast('复制失败', 'error')
  }
}

const clearAll = () => {
  originalText.value = ''
  modifiedText.value = ''
  diffResult.value = []
  hasCompared.value = false
}
</script>

<template>
  <div class="diff-tool">
    <h2>📄 文本对比工具</h2>
    <p class="description">对比两段文本的差异，基于 LCS 算法逐行比较</p>

    <div class="editor-area">
      <div class="editor-pane">
        <label class="pane-label">原始文本</label>
        <textarea
          v-model="originalText"
          placeholder="在此输入原始文本..."
          class="input-textarea"
        ></textarea>
      </div>
      <div class="editor-pane">
        <label class="pane-label">修改后文本</label>
        <textarea
          v-model="modifiedText"
          placeholder="在此输入修改后的文本..."
          class="input-textarea"
        ></textarea>
      </div>
    </div>

    <div class="controls">
      <label class="checkbox-label">
        <input v-model="ignoreWhitespace" type="checkbox" />
        忽略空白字符
      </label>
      <div class="button-group">
        <button @click="compare" class="btn btn-primary">对比</button>
        <button @click="copyDiff" class="btn btn-secondary">📋 复制结果</button>
        <button @click="clearAll" class="btn btn-secondary">清空</button>
      </div>
    </div>

    <div v-if="hasCompared" class="result-section">
      <div class="stats-grid">
        <div class="stat-box stat-added">
          <div class="stat-label">新增行</div>
          <div class="stat-value">{{ stats.added }}</div>
        </div>
        <div class="stat-box stat-deleted">
          <div class="stat-label">删除行</div>
          <div class="stat-value">{{ stats.deleted }}</div>
        </div>
        <div class="stat-box stat-unchanged">
          <div class="stat-label">未变行</div>
          <div class="stat-value">{{ stats.unchanged }}</div>
        </div>
      </div>

      <div class="diff-output">
        <div
          v-for="(line, index) in diffResult"
          :key="index"
          :class="['diff-line', 'diff-' + line.type]"
        >
          <span class="line-prefix">{{ line.type === 'added' ? '+' : line.type === 'deleted' ? '-' : ' ' }}</span>
          <span class="line-text">{{ line.text }}</span>
        </div>
        <div v-if="diffResult.length === 0" class="no-diff">两段文本完全相同，没有差异。</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.diff-tool {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  margin: 0;
  color: #00bcd4;
  font-size: 1.8em;
}

.description {
  margin: 0;
  color: #888;
  font-size: 0.95rem;
}

.editor-area {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.editor-pane {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pane-label {
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
}

:global([data-theme='dark'] .pane-label) {
  color: #e0e0e0;
}

.input-textarea {
  width: 100%;
  min-height: 200px;
  padding: 0.75rem;
  border: 2px solid #b2ebf2;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.95rem;
  background-color: white;
  color: #333;
  resize: vertical;
  transition: border-color 0.3s;
  box-sizing: border-box;
}

:global([data-theme='dark'] .input-textarea) {
  background-color: #1a1a2a;
  border-color: #1a3a4a;
  color: #e0e0e0;
}

.input-textarea:focus {
  outline: none;
  border-color: #00bcd4;
  box-shadow: 0 0 0 3px rgba(0, 188, 212, 0.1);
}

.controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  color: #333;
}

:global([data-theme='dark'] .checkbox-label) {
  color: #a0c0e0;
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
  accent-color: #00bcd4;
  width: 18px;
  height: 18px;
}

.button-group {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background-color: #00bcd4;
  color: white;
}

.btn-primary:hover {
  background-color: #00acc1;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 188, 212, 0.3);
}

.btn-secondary {
  background-color: #f0f0f0;
  color: #333;
}

:global([data-theme='dark'] .btn-secondary) {
  background-color: #2a2a2a;
  color: #e0e0e0;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

:global([data-theme='dark'] .btn-secondary:hover) {
  background-color: #3a3a3a;
}

.result-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-box {
  border-radius: 10px;
  padding: 1.25rem;
  text-align: center;
  border: 2px solid transparent;
}

.stat-added {
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  border-color: #4caf50;
}

:global([data-theme='dark'] .stat-added) {
  background: linear-gradient(135deg, #1a2e1a, #2a3e2a);
  border-color: #4caf50;
}

.stat-deleted {
  background: linear-gradient(135deg, #ffebee, #ffcdd2);
  border-color: #f44336;
}

:global([data-theme='dark'] .stat-deleted) {
  background: linear-gradient(135deg, #2e1a1a, #3e2a2a);
  border-color: #f44336;
}

.stat-unchanged {
  background: linear-gradient(135deg, #e0f7fa, #b2ebf2);
  border-color: #00bcd4;
}

:global([data-theme='dark'] .stat-unchanged) {
  background: linear-gradient(135deg, #1a2a2e, #2a3a3e);
  border-color: #00bcd4;
}

.stat-label {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
}

:global([data-theme='dark'] .stat-label) {
  color: #a0c0e0;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
}

.stat-added .stat-value {
  color: #4caf50;
}

.stat-deleted .stat-value {
  color: #f44336;
}

.stat-unchanged .stat-value {
  color: #00bcd4;
}

.diff-output {
  background: #fafafa;
  border: 2px solid #b2ebf2;
  border-radius: 8px;
  overflow: hidden;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

:global([data-theme='dark'] .diff-output) {
  background: #1a1a2a;
  border-color: #1a3a4a;
}

.diff-line {
  display: flex;
  padding: 0.3rem 0.75rem;
  border-bottom: 1px solid #eee;
  min-height: 1.6em;
  align-items: center;
}

:global([data-theme='dark'] .diff-line) {
  border-bottom-color: #2a2a3a;
}

.diff-added {
  background-color: #e8f5e9;
  color: #2e7d32;
}

:global([data-theme='dark'] .diff-added) {
  background-color: #1a2e1a;
  color: #81c784;
}

.diff-deleted {
  background-color: #ffebee;
  color: #c62828;
}

:global([data-theme='dark'] .diff-deleted) {
  background-color: #2e1a1a;
  color: #ef9a9a;
}

.diff-unchanged {
  color: #333;
}

:global([data-theme='dark'] .diff-unchanged) {
  color: #ccc;
}

.line-prefix {
  display: inline-block;
  width: 1.5em;
  font-weight: 700;
  flex-shrink: 0;
  user-select: none;
}

.line-text {
  white-space: pre-wrap;
  word-break: break-all;
}

.no-diff {
  padding: 2rem;
  text-align: center;
  color: #888;
  font-family: inherit;
}

:global([data-theme='dark'] .no-diff) {
  color: #a0c0e0;
}

@media (max-width: 768px) {
  .editor-area {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .controls {
    flex-direction: column;
    align-items: stretch;
  }

  .button-group {
    justify-content: center;
  }
}

/* Dark mode overrides */
:global([data-theme='dark'] h2) {
  color: #4dd0e1;
}

:global([data-theme='dark'] .description) {
  color: #a0c0e0;
}
</style>
