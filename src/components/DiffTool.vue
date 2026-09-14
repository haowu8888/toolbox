<script setup>
import { computed, ref, shallowRef, watch } from 'vue'
import { useClipboard } from '../composables/useClipboard'
import { useHistory } from '../composables/useStorage'
import { useToast } from '../composables/useToast'
import { downloadText } from '../utils/download'
import {
  buildSideBySideRows,
  diffInline,
  diffLines,
  formatSimpleDiff,
  formatUnifiedDiff,
} from '../utils/diff'

const { copyText } = useClipboard()
const { addHistory } = useHistory()
const { showToast } = useToast()

const MAX_LINES = 20000
const INLINE_HIGHLIGHT_LIMIT = 400

const originalText = ref('')
const modifiedText = ref('')
const ignoreWhitespace = ref(false)
const ignoreCase = ref(false)
const viewMode = ref('unified') // unified | split
const onlyChanges = ref(false)
// 结果可能有上万行，用 shallowRef 避免为每一行创建响应式代理
const result = shallowRef(null)
const hasCompared = ref(false)

const stats = computed(() => result.value?.stats ?? { added: 0, deleted: 0, unchanged: 0, changed: 0 })
const entries = computed(() => result.value?.entries ?? [])
const isIdentical = computed(() => hasCompared.value && stats.value.changed === 0)

const visibleEntries = computed(() =>
  onlyChanges.value ? entries.value.filter((entry) => entry.type !== 'equal') : entries.value,
)

const sideBySideRows = computed(() => {
  const rows = buildSideBySideRows(entries.value)
  return onlyChanges.value ? rows.filter((row) => row.kind !== 'equal') : rows
})

// 行内高亮：修改行成对时按字符对比，只对前 N 行做，避免大文件卡顿
const inlineCache = computed(() => {
  const cache = new Map()
  let count = 0
  for (const row of buildSideBySideRows(entries.value)) {
    if (row.kind !== 'modify') continue
    if (count++ >= INLINE_HIGHLIGHT_LIMIT) break
    const { oldSegments, newSegments } = diffInline(row.left.text, row.right.text)
    cache.set(row.left, oldSegments)
    cache.set(row.right, newSegments)
  }
  return cache
})

const segmentsFor = (entry) => inlineCache.value.get(entry) ?? [{ text: entry.text, changed: false }]

const compare = () => {
  const oldCount = originalText.value.split('\n').length
  const newCount = modifiedText.value.split('\n').length
  if (oldCount > MAX_LINES || newCount > MAX_LINES) {
    showToast(`文本过长（最大 ${MAX_LINES} 行），请缩减后重试`, 'error')
    return
  }

  result.value = diffLines(originalText.value, modifiedText.value, {
    ignoreWhitespace: ignoreWhitespace.value,
    ignoreCase: ignoreCase.value,
  })
  hasCompared.value = true
  addHistory('文本对比', `原始 ${result.value.oldLineCount} 行 / 修改 ${result.value.newLineCount} 行，变更 ${result.value.stats.changed} 行`)
}

// 选项变化后自动重新对比，保持结果与设置一致
watch([ignoreWhitespace, ignoreCase], () => {
  if (hasCompared.value) compare()
})

const copyDiff = () => {
  if (!entries.value.length) {
    showToast('没有对比结果可复制', 'info')
    return
  }
  copyText(formatSimpleDiff(entries.value), { successMessage: '已复制对比结果' })
}

const copyUnified = () => {
  if (!entries.value.length) {
    showToast('没有对比结果可复制', 'info')
    return
  }
  const text = formatUnifiedDiff(entries.value, { oldName: 'original.txt', newName: 'modified.txt' })
  copyText(text || '（两段文本完全相同）', { successMessage: '已复制 unified diff' })
}

const downloadPatch = () => {
  const text = formatUnifiedDiff(entries.value, { oldName: 'original.txt', newName: 'modified.txt' })
  if (!text) {
    showToast('两段文本完全相同，无需生成补丁', 'info')
    return
  }
  downloadText(text, 'diff.patch', 'text/x-patch;charset=utf-8')
  showToast('补丁文件已下载')
}

const swapTexts = () => {
  const temp = originalText.value
  originalText.value = modifiedText.value
  modifiedText.value = temp
  if (hasCompared.value) compare()
}

const clearAll = () => {
  originalText.value = ''
  modifiedText.value = ''
  result.value = null
  hasCompared.value = false
}

const prefixFor = (type) => (type === 'insert' ? '+' : type === 'delete' ? '-' : ' ')
</script>

<template>
  <div class="diff-tool">
    <h2>📄 文本对比工具</h2>
    <p class="description">逐行对比两段文本，支持忽略空白与大小写、并排视图、行内高亮与 unified diff 导出</p>

    <div class="editor-area">
      <div class="editor-pane">
        <label class="pane-label" for="diff-original">原始文本</label>
        <textarea
          id="diff-original"
          v-model="originalText"
          placeholder="在此输入原始文本..."
          class="input-textarea"
          spellcheck="false"
        ></textarea>
      </div>
      <div class="editor-pane">
        <label class="pane-label" for="diff-modified">修改后文本</label>
        <textarea
          id="diff-modified"
          v-model="modifiedText"
          placeholder="在此输入修改后的文本..."
          class="input-textarea"
          spellcheck="false"
        ></textarea>
      </div>
    </div>

    <div class="controls">
      <div class="option-group">
        <label class="checkbox-label">
          <input v-model="ignoreWhitespace" type="checkbox" />
          忽略空白字符
        </label>
        <label class="checkbox-label">
          <input v-model="ignoreCase" type="checkbox" />
          忽略大小写
        </label>
      </div>
      <div class="button-group">
        <button type="button" class="btn btn-primary" @click="compare">对比</button>
        <button type="button" class="btn btn-secondary" title="交换两侧文本" @click="swapTexts">⇄ 交换</button>
        <button type="button" class="btn btn-secondary" @click="clearAll">清空</button>
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

      <div class="result-toolbar">
        <div class="view-switch" role="group" aria-label="视图模式">
          <button
            type="button"
            :class="['view-btn', { active: viewMode === 'unified' }]"
            :aria-pressed="viewMode === 'unified'"
            @click="viewMode = 'unified'"
          >
            统一视图
          </button>
          <button
            type="button"
            :class="['view-btn', { active: viewMode === 'split' }]"
            :aria-pressed="viewMode === 'split'"
            @click="viewMode = 'split'"
          >
            并排视图
          </button>
          <label class="checkbox-label compact">
            <input v-model="onlyChanges" type="checkbox" />
            仅显示变更
          </label>
        </div>
        <div class="button-group">
          <button type="button" class="btn btn-secondary" @click="copyDiff">📋 复制结果</button>
          <button type="button" class="btn btn-secondary" @click="copyUnified">📋 复制 unified</button>
          <button type="button" class="btn btn-secondary" @click="downloadPatch">⬇️ 下载 .patch</button>
        </div>
      </div>

      <div v-if="isIdentical" class="no-diff">两段文本完全相同，没有差异。</div>

      <div v-else-if="viewMode === 'unified'" class="diff-output" role="table" aria-label="对比结果">
        <div
          v-for="(line, index) in visibleEntries"
          :key="index"
          :class="['diff-line', `diff-${line.type}`]"
          role="row"
        >
          <span class="line-no" role="cell">{{ line.oldLine ?? '' }}</span>
          <span class="line-no" role="cell">{{ line.newLine ?? '' }}</span>
          <span class="line-prefix" role="cell" aria-hidden="true">{{ prefixFor(line.type) }}</span>
          <span class="line-text" role="cell">
            <template v-if="line.type === 'equal'">{{ line.text }}</template>
            <template v-else>
              <span v-for="(seg, i) in segmentsFor(line)" :key="i" :class="{ 'inline-hit': seg.changed }">{{ seg.text }}</span>
            </template>
          </span>
        </div>
        <div v-if="visibleEntries.length === 0" class="no-diff">没有可显示的行。</div>
      </div>

      <div v-else class="split-output" role="table" aria-label="并排对比结果">
        <div class="split-header" role="row">
          <span role="columnheader">原始文本</span>
          <span role="columnheader">修改后文本</span>
        </div>
        <div v-for="(row, index) in sideBySideRows" :key="index" :class="['split-row', `split-${row.kind}`]" role="row">
          <div :class="['split-cell', row.left ? `cell-${row.left.type}` : 'cell-empty']" role="cell">
            <span class="line-no">{{ row.left?.oldLine ?? '' }}</span>
            <span class="line-text">
              <template v-if="row.left">
                <span v-for="(seg, i) in segmentsFor(row.left)" :key="i" :class="{ 'inline-hit': seg.changed }">{{ seg.text }}</span>
              </template>
            </span>
          </div>
          <div :class="['split-cell', row.right ? `cell-${row.right.type}` : 'cell-empty']" role="cell">
            <span class="line-no">{{ row.right?.newLine ?? '' }}</span>
            <span class="line-text">
              <template v-if="row.right">
                <span v-for="(seg, i) in segmentsFor(row.right)" :key="i" :class="{ 'inline-hit': seg.changed }">{{ seg.text }}</span>
              </template>
            </span>
          </div>
        </div>
        <div v-if="sideBySideRows.length === 0" class="no-diff">没有可显示的行。</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.diff-tool {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  --tool-accent: #00bcd4;
}

h2 {
  margin: 0;
  color: var(--tool-accent);
  font-size: 1.8em;
}

.description {
  margin: 0;
  color: var(--text-3);
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
  color: var(--text);
  font-size: 0.95rem;
}

.input-textarea {
  width: 100%;
  min-height: 200px;
  padding: 0.75rem;
  border: 2px solid var(--border);
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 0.9rem;
  background-color: var(--surface);
  color: var(--text);
  resize: vertical;
  transition: border-color 0.3s;
  box-sizing: border-box;
  tab-size: 4;
}

.input-textarea:focus {
  outline: none;
  border-color: var(--tool-accent);
  box-shadow: 0 0 0 3px rgba(0, 188, 212, 0.12);
}

.controls,
.result-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.option-group,
.view-switch {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  color: var(--text);
}

.checkbox-label.compact {
  font-size: 0.9rem;
}

.checkbox-label input[type='checkbox'] {
  cursor: pointer;
  accent-color: var(--tool-accent);
  width: 18px;
  height: 18px;
}

.button-group {
  display: flex;
  gap: 0.6rem;
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
  background-color: var(--tool-accent);
  color: #fff;
}

.btn-primary:hover {
  background-color: #00acc1;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 188, 212, 0.3);
}

.btn-secondary {
  background-color: var(--surface-3);
  color: var(--text);
}

.btn-secondary:hover {
  background-color: var(--border);
}

.view-btn {
  padding: 0.45rem 0.9rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 0.85rem;
  box-shadow: none;
}

.view-btn.active {
  background: var(--tool-accent);
  border-color: var(--tool-accent);
  color: #fff;
}

.result-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-box {
  border-radius: 10px;
  padding: 1.1rem;
  text-align: center;
  border: 2px solid transparent;
  background: var(--surface-2);
}

.stat-added {
  border-color: #4caf50;
  background: var(--success-soft);
}

.stat-deleted {
  border-color: #f44336;
  background: var(--danger-soft);
}

.stat-unchanged {
  border-color: var(--tool-accent);
  background: var(--info-soft);
}

.stat-label {
  font-size: 0.9rem;
  color: var(--text-2);
  margin-bottom: 0.4rem;
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
  color: var(--tool-accent);
}

.diff-output,
.split-output {
  background: var(--surface-2);
  border: 2px solid var(--border);
  border-radius: 8px;
  overflow: auto;
  font-family: var(--font-mono);
  font-size: 0.88rem;
  max-height: 70vh;
}

.diff-line {
  display: flex;
  align-items: flex-start;
  border-bottom: 1px solid var(--border);
  min-height: 1.7em;
  line-height: 1.7;
}

.line-no {
  flex: 0 0 3.5em;
  padding: 0 0.4rem;
  text-align: right;
  color: var(--text-3);
  user-select: none;
  background: rgba(0, 0, 0, 0.03);
  font-size: 0.8em;
}

:global([data-theme='dark']) .line-no {
  background: rgba(255, 255, 255, 0.04);
}

.line-prefix {
  flex: 0 0 1.5em;
  text-align: center;
  font-weight: 700;
  user-select: none;
}

.line-text {
  flex: 1;
  padding-right: 0.75rem;
  white-space: pre-wrap;
  word-break: break-all;
}

.diff-insert {
  background-color: rgba(76, 175, 80, 0.14);
  color: #2e7d32;
}

.diff-delete {
  background-color: rgba(244, 67, 54, 0.14);
  color: #c62828;
}

.diff-equal {
  color: var(--text);
}

:global([data-theme='dark']) .diff-insert {
  color: #81c784;
}

:global([data-theme='dark']) .diff-delete {
  color: #ef9a9a;
}

.inline-hit {
  border-radius: 3px;
  background: rgba(255, 193, 7, 0.45);
}

.diff-delete .inline-hit,
.cell-delete .inline-hit {
  background: rgba(244, 67, 54, 0.35);
}

.diff-insert .inline-hit,
.cell-insert .inline-hit {
  background: rgba(76, 175, 80, 0.35);
}

/* 并排视图 */
.split-header {
  display: grid;
  grid-template-columns: 1fr 1fr;
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--text-2);
  border-bottom: 2px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--surface-2);
  z-index: 1;
}

.split-header span {
  padding: 0.5rem 0.75rem;
}

.split-header span + span {
  border-left: 1px solid var(--border);
}

.split-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid var(--border);
}

.split-cell {
  display: flex;
  align-items: flex-start;
  min-height: 1.7em;
  line-height: 1.7;
  min-width: 0;
}

.split-cell + .split-cell {
  border-left: 1px solid var(--border);
}

.cell-delete {
  background-color: rgba(244, 67, 54, 0.14);
  color: #c62828;
}

.cell-insert {
  background-color: rgba(76, 175, 80, 0.14);
  color: #2e7d32;
}

:global([data-theme='dark']) .cell-delete {
  color: #ef9a9a;
}

:global([data-theme='dark']) .cell-insert {
  color: #81c784;
}

.cell-empty {
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 6px,
    rgba(0, 0, 0, 0.03) 6px,
    rgba(0, 0, 0, 0.03) 12px
  );
}

.no-diff {
  padding: 2rem;
  text-align: center;
  color: var(--text-3);
  font-family: inherit;
  background: var(--surface-2);
  border-radius: 8px;
}

@media (max-width: 768px) {
  .editor-area,
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .controls,
  .result-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .button-group {
    justify-content: center;
  }

  .split-row,
  .split-header {
    grid-template-columns: 1fr;
  }

  .split-cell + .split-cell {
    border-left: none;
    border-top: 1px dashed var(--border);
  }
}

:global([data-theme='dark']) h2 {
  color: #4dd0e1;
}
</style>
