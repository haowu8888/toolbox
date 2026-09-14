<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { tools as toolMeta, toolCategoryMap } from '../tools/meta.js'
import { readStorageArray, STORAGE_KEYS } from '../utils/storageKeys'

const emit = defineEmits(['select'])

const showSearch = ref(false)
const searchInput = ref('')
const selectedIndex = ref(0)
const searchInputRef = ref(null)
const resultsRef = ref(null)
const recentToolIds = ref([])
let previouslyFocused = null

const nameOverrideMap = {
  qrcode: '二维码生成',
  json: 'JSON 格式化',
}

const tools = toolMeta.map((t) => ({
  id: t.id,
  name: nameOverrideMap[t.id] || t.name,
  description: t.description || '',
  keywords: t.keywords || [],
  icon: t.icon,
  color: t.color,
  category: toolCategoryMap.get(t.id) || '',
}))

const getRecentRank = (toolId) => {
  const index = recentToolIds.value.indexOf(toolId)
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

const loadRecentTools = () => {
  recentToolIds.value = readStorageArray(STORAGE_KEYS.recentTools)
}

/**
 * 打分：名称前缀 > 名称包含 > id > 关键词前缀 > 关键词包含 > 描述包含。
 * 支持多关键词（空格分隔）全部命中。
 */
const scoreTool = (tool, terms) => {
  let total = 0
  for (const term of terms) {
    const name = tool.name.toLowerCase()
    const id = tool.id.toLowerCase()
    let best = 0
    if (name.startsWith(term)) best = 100
    else if (name.includes(term)) best = 80
    if (id === term) best = Math.max(best, 95)
    else if (id.includes(term)) best = Math.max(best, 60)
    for (const keyword of tool.keywords) {
      const kw = keyword.toLowerCase()
      if (kw === term) best = Math.max(best, 90)
      else if (kw.startsWith(term)) best = Math.max(best, 70)
      else if (kw.includes(term)) best = Math.max(best, 50)
    }
    if (tool.description.toLowerCase().includes(term)) best = Math.max(best, 30)
    if (best === 0) return 0
    total += best
  }
  return total
}

const filteredTools = computed(() => {
  const query = searchInput.value.trim().toLowerCase()
  if (!query) {
    return [...tools].sort((left, right) => {
      const rankDiff = getRecentRank(left.id) - getRecentRank(right.id)
      if (rankDiff !== 0) return rankDiff
      return tools.indexOf(left) - tools.indexOf(right)
    })
  }

  const terms = query.split(/\s+/).filter(Boolean)
  return tools
    .map((tool) => ({ tool, score: scoreTool(tool, terms) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const rankDiff = getRecentRank(a.tool.id) - getRecentRank(b.tool.id)
      if (rankDiff !== 0) return rankDiff
      return tools.indexOf(a.tool) - tools.indexOf(b.tool)
    })
    .map((entry) => entry.tool)
})

const isRecent = (toolId) => recentToolIds.value.includes(toolId)

/**
 * 将文本按查询词拆成片段用于高亮，避免使用 v-html。
 */
const highlightSegments = (text) => {
  const query = searchInput.value.trim().toLowerCase()
  if (!query || !text) return [{ text, hit: false }]
  const terms = query.split(/\s+/).filter(Boolean)
  const lower = text.toLowerCase()
  const segments = []
  let cursor = 0
  while (cursor < text.length) {
    let bestIndex = -1
    let bestLength = 0
    for (const term of terms) {
      const index = lower.indexOf(term, cursor)
      if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
        bestIndex = index
        bestLength = term.length
      }
    }
    if (bestIndex === -1) {
      segments.push({ text: text.slice(cursor), hit: false })
      break
    }
    if (bestIndex > cursor) segments.push({ text: text.slice(cursor, bestIndex), hit: false })
    segments.push({ text: text.slice(bestIndex, bestIndex + bestLength), hit: true })
    cursor = bestIndex + bestLength
  }
  return segments
}

const scrollSelectedIntoView = () => {
  nextTick(() => {
    const container = resultsRef.value
    const active = container?.querySelector('.result-item.active')
    active?.scrollIntoView({ block: 'nearest' })
  })
}

const moveSelection = (delta) => {
  const total = filteredTools.value.length
  if (!total) return
  selectedIndex.value = (selectedIndex.value + delta + total) % total
  scrollSelectedIntoView()
}

const handleKeyDown = (e) => {
  if (e.key === 'Enter') {
    const tool = filteredTools.value[selectedIndex.value]
    if (tool) selectTool(tool)
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    moveSelection(1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    moveSelection(-1)
  } else if (e.key === 'Home') {
    e.preventDefault()
    selectedIndex.value = 0
    scrollSelectedIntoView()
  } else if (e.key === 'End') {
    e.preventDefault()
    selectedIndex.value = Math.max(0, filteredTools.value.length - 1)
    scrollSelectedIntoView()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    closeSearch()
  } else if (e.key === 'Tab') {
    // 面板内只有一个输入框，Tab 不应离开对话框
    e.preventDefault()
  }
}

const selectTool = (tool) => {
  emit('select', tool.id)
  closeSearch()
}

const openSearch = () => {
  loadRecentTools()
  previouslyFocused = document.activeElement
  showSearch.value = true
  selectedIndex.value = 0
  searchInput.value = ''
  nextTick(() => {
    searchInputRef.value?.focus()
  })
}

const closeSearch = () => {
  if (!showSearch.value) return
  showSearch.value = false
  searchInput.value = ''
  if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
    previouslyFocused.focus()
  }
  previouslyFocused = null
}

const handleGlobalKeyDown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    if (showSearch.value) closeSearch()
    else openSearch()
  }
}

watch(searchInput, () => {
  selectedIndex.value = 0
})

watch(showSearch, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeyDown)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="command-palette">
    <!-- 搜索按钮 -->
    <button type="button" class="search-trigger" title="搜索工具 (Ctrl+K)" aria-label="搜索工具" @click="openSearch">
      <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M11.5 7a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10.7 11.4a6 6 0 1 1 .7-.7l3.65 3.65a.5.5 0 0 1-.7.7L10.7 11.4Z"
          fill="currentColor"
        />
      </svg>
      <span class="search-label">搜索</span>
      <kbd class="search-kbd">Ctrl K</kbd>
    </button>

    <!-- 搜索对话框 -->
    <Teleport to="body">
      <Transition name="overlay">
        <div v-if="showSearch" class="search-overlay" @click="closeSearch"></div>
      </Transition>

      <Transition name="panel">
        <div
          v-if="showSearch"
          class="search-panel"
          role="dialog"
          aria-modal="true"
          aria-label="搜索工具"
        >
          <div class="search-header">
            <svg class="input-icon" width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M11.5 7a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10.7 11.4a6 6 0 1 1 .7-.7l3.65 3.65a.5.5 0 0 1-.7.7L10.7 11.4Z"
                fill="currentColor"
              />
            </svg>
            <input
              ref="searchInputRef"
              v-model="searchInput"
              type="text"
              placeholder="输入工具名、关键词或功能描述…"
              class="search-input"
              role="combobox"
              aria-autocomplete="list"
              aria-controls="command-palette-results"
              :aria-expanded="true"
              :aria-activedescendant="filteredTools[selectedIndex] ? `palette-option-${filteredTools[selectedIndex].id}` : undefined"
              autocomplete="off"
              spellcheck="false"
              @keydown="handleKeyDown"
            />
            <kbd v-if="!searchInput" class="input-esc">Esc</kbd>
            <button v-else type="button" class="input-clear" aria-label="清空搜索" @click="searchInput = ''">✕</button>
          </div>

          <div id="command-palette-results" ref="resultsRef" class="search-results" role="listbox" aria-label="工具列表">
            <div v-if="filteredTools.length === 0" class="no-results">
              <div class="no-results-icon">🔍</div>
              <div class="no-results-text">未找到匹配的工具，试试其它关键词</div>
            </div>

            <div
              v-for="(tool, index) in filteredTools"
              :id="`palette-option-${tool.id}`"
              :key="tool.id"
              :class="['result-item', { active: index === selectedIndex }]"
              :data-tool-id="tool.id"
              role="option"
              :aria-selected="index === selectedIndex"
              :style="{ '--tool-color': tool.color }"
              @click="selectTool(tool)"
              @mousemove="selectedIndex = index"
            >
              <span class="tool-icon" aria-hidden="true">{{ tool.icon }}</span>
              <div class="tool-info">
                <div class="tool-name-row">
                  <span class="tool-name">
                    <span v-for="(seg, i) in highlightSegments(tool.name)" :key="i" :class="{ hit: seg.hit }">{{ seg.text }}</span>
                  </span>
                  <span v-if="!searchInput && isRecent(tool.id)" class="tool-badge">最近</span>
                  <span v-if="tool.category" class="tool-category">{{ tool.category }}</span>
                </div>
                <div class="tool-desc">
                  <span v-for="(seg, i) in highlightSegments(tool.description)" :key="i" :class="{ hit: seg.hit }">{{ seg.text }}</span>
                </div>
              </div>
              <svg v-if="index === selectedIndex" class="enter-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M13 3v6H4.5l3-3-.7-.7L2.8 9.3l4 4 .7-.7-3-3H14V3h-1Z" fill="currentColor" />
              </svg>
            </div>
          </div>

          <div class="search-footer">
            <div class="shortcut-group">
              <div class="shortcut">
                <kbd>↑</kbd><kbd>↓</kbd>
                <span>导航</span>
              </div>
              <div class="shortcut">
                <kbd>↵</kbd>
                <span>打开</span>
              </div>
              <div class="shortcut">
                <kbd>Esc</kbd>
                <span>关闭</span>
              </div>
            </div>
            <div class="results-count" aria-live="polite">
              {{ searchInput ? `${filteredTools.length} / ${tools.length} 个工具` : `共 ${tools.length} 个工具` }}
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.command-palette {
  pointer-events: none;
  z-index: 9999;
}

/* ===== 搜索触发按钮 ===== */
.search-trigger {
  position: fixed;
  top: 1.25rem;
  right: 1.5rem;
  padding: 0.5rem 0.85rem;
  border: 1px solid var(--border);
  background: var(--surface-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 10px;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-2);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
  pointer-events: auto;
  z-index: 9998;
}

.search-trigger:hover {
  background: var(--surface);
  border-color: var(--border-strong);
  box-shadow: var(--shadow-md);
  color: var(--text);
}

.search-icon {
  flex-shrink: 0;
  opacity: 0.6;
}

.search-label {
  font-weight: 500;
  letter-spacing: 0.01em;
}

.search-kbd {
  font-family: inherit;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.4rem;
  background: var(--surface-3);
  border: 1px solid var(--border);
  border-radius: 5px;
  color: inherit;
  opacity: 0.7;
  letter-spacing: 0.05em;
}

/* ===== 遮罩层 ===== */
.search-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  pointer-events: auto;
  z-index: 10000;
}

:global([data-theme='dark']) .search-overlay {
  background: rgba(0, 0, 0, 0.55);
}

/* ===== 搜索面板 ===== */
.search-panel {
  position: fixed;
  top: min(20%, 140px);
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 600px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
  z-index: 10001;
}

/* ===== 搜索输入区域 ===== */
.search-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}

.input-icon {
  flex-shrink: 0;
  color: var(--text-3);
}

.search-input {
  flex: 1;
  padding: 0;
  border: none;
  font-size: 1rem;
  font-family: inherit;
  background: transparent;
  color: var(--text);
  outline: none;
  min-width: 0;
}

.search-input:focus-visible {
  outline: none;
}

.search-input::placeholder {
  color: var(--text-3);
}

.input-esc,
.input-clear {
  flex-shrink: 0;
  font-family: inherit;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.45rem;
  background: var(--surface-3);
  border: 1px solid var(--border);
  border-radius: 5px;
  color: var(--text-3);
  box-shadow: none;
  line-height: 1.2;
}

.input-clear {
  cursor: pointer;
}

.input-clear:hover {
  color: var(--text);
  transform: none;
}

/* ===== 搜索结果列表 ===== */
.search-results {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
  padding: 0.5rem;
  scroll-padding: 0.5rem;
}

.search-results::-webkit-scrollbar {
  width: 4px;
}

.search-results::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border-radius: 4px;
}

.no-results {
  padding: 2.5rem 1rem;
  text-align: center;
}

.no-results-icon {
  font-size: 2rem;
  margin-bottom: 0.75rem;
  opacity: 0.4;
}

.no-results-text {
  color: var(--text-3);
  font-size: 0.9rem;
}

.result-item {
  padding: 0.6rem 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  cursor: pointer;
  border-radius: 10px;
  transition: background 0.12s ease;
}

.result-item.active {
  background: var(--primary-soft);
}

.tool-icon {
  font-size: 1.35rem;
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-2);
  border-radius: 10px;
  border: 1px solid transparent;
}

.result-item.active .tool-icon {
  border-color: var(--tool-color, var(--primary));
  background: var(--surface);
}

.tool-info {
  flex: 1;
  min-width: 0;
}

.tool-name-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.tool-name {
  font-weight: 600;
  color: var(--text);
  font-size: 0.92rem;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-item.active .tool-name {
  color: var(--tool-color, var(--primary));
}

.tool-badge {
  flex-shrink: 0;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  background: var(--warning-soft);
  color: #b26a00;
}

:global([data-theme='dark']) .tool-badge {
  color: #ffc46b;
}

.tool-category {
  flex-shrink: 0;
  margin-left: auto;
  font-size: 0.68rem;
  color: var(--text-3);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.05rem 0.45rem;
  white-space: nowrap;
}

.tool-desc {
  font-size: 0.76rem;
  color: var(--text-3);
  margin-top: 0.15rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hit {
  color: var(--tool-color, var(--primary));
  font-weight: 700;
  background: var(--primary-soft);
  border-radius: 3px;
}

.enter-icon {
  flex-shrink: 0;
  color: var(--primary);
  opacity: 0.7;
}

/* ===== 底部快捷键 ===== */
.search-footer {
  padding: 0.65rem 1.25rem;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.shortcut-group {
  display: flex;
  gap: 1rem;
}

.shortcut {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  color: var(--text-3);
}

kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  padding: 0.12rem 0.35rem;
  background: var(--surface-3);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-2);
  line-height: 1;
}

.results-count {
  font-size: 0.75rem;
  color: var(--text-3);
}

/* ===== 动画 ===== */
.overlay-enter-active {
  transition: opacity 0.2s ease;
}
.overlay-leave-active {
  transition: opacity 0.15s ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.panel-enter-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel-leave-active {
  transition: all 0.15s ease-in;
}
.panel-enter-from {
  opacity: 0;
  transform: translateX(-50%) scale(0.96) translateY(-8px);
}
.panel-leave-to {
  opacity: 0;
  transform: translateX(-50%) scale(0.98);
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .search-trigger {
    padding: 0.45rem 0.65rem;
    gap: 0.35rem;
  }

  .search-label,
  .search-kbd {
    display: none;
  }

  .search-panel {
    width: 95%;
    top: 1rem;
    max-height: calc(100vh - 2rem);
    border-radius: 14px;
  }

  .search-results {
    max-height: 55vh;
  }

  .tool-category {
    display: none;
  }

  .search-footer {
    gap: 0.75rem;
  }
}
</style>
