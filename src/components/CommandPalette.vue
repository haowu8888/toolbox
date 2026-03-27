<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { tools as toolMeta } from '../tools/meta.js'
import { safeParseJson, STORAGE_KEYS } from '../utils/storageKeys'

const emit = defineEmits(['select'])

const showSearch = ref(false)
const searchInput = ref('')
const selectedIndex = ref(0)
const searchInputRef = ref(null)
const recentToolIds = ref([])

const keywordMap = {
  qrcode: ['二维码', 'qrcode', '生成'],
  json: ['json', '格式化', 'format'],
  encrypt: ['加密', '密码', 'encrypt', 'md5', 'sha'],
  encoding: ['编码', '解码', 'base64', 'url'],
  regex: ['正则', 'regex', '表达式'],
  markdown: ['markdown', 'md', '预览'],
  time: ['时间', '时间戳', '日期', 'time'],
  convert: ['转换', '长度', '温度', '重量', 'convert'],
  color: ['颜色', '色彩', 'color', 'hex', 'rgb'],
  validator: ['验证', '邮箱', '手机', 'email', 'validator'],
  network: ['网络', 'dns', 'ip', 'network'],
  urltools: ['url', 'query', 'querystring', 'encode', 'decode', '解析', '参数'],
  csvjson: ['csv', 'tsv', 'json', '转换', '表格'],
  curlfetch: ['curl', 'fetch', '转换', '请求'],
  chmod: ['chmod', '权限', 'rwx', '755', '644', '4755'],
  notes: ['笔记', '待办', '任务', 'notes', 'todo'],
  textadvanced: ['文本', 'uuid', '密码', '去重', '大小写'],
  calculator: ['计算', '计算器', 'calculator', '数学'],
  codeformatter: ['代码', '格式化', 'sql', 'html', 'xml', '对比'],
  fileconverter: ['文件', '图片', 'base64', '哈希', 'hash'],
  jwt: ['jwt', 'token', '解码', '令牌', 'json web token'],
  cron: ['cron', '定时', '计划任务', '表达式'],
  diff: ['对比', '差异', 'diff', '比较'],
  datagen: ['生成', '模拟', '随机', '数据', 'mock'],
  cssunit: ['css', '单位', 'px', 'rem', 'em', '转换'],
  imgcompress: ['图片', '压缩', '缩小', 'image', 'compress'],
  htmlentity: ['html', '实体', '转义', 'entity', '&amp;'],
  configconvert: ['配置', 'json', 'yaml', 'toml', '转换'],
  lottery: ['抽奖', '随机', '轮盘', '抽签'],
  storage: ['历史', '收藏', '记录', 'history'],
  settings: ['设置', '主题', '配置', 'settings'],
}

const nameOverrideMap = {
  qrcode: '二维码生成',
  json: 'JSON 格式化',
}

const tools = toolMeta.map((t) => ({
  id: t.id,
  name: nameOverrideMap[t.id] || t.name,
  keywords: keywordMap[t.id] || [],
  icon: t.icon,
}))

const getRecentRank = (toolId) => {
  const index = recentToolIds.value.indexOf(toolId)
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

const sortToolsByRecent = (items) =>
  [...items].sort((left, right) => {
    const rankDiff = getRecentRank(left.id) - getRecentRank(right.id)
    if (rankDiff !== 0) return rankDiff
    return tools.findIndex((tool) => tool.id === left.id) - tools.findIndex((tool) => tool.id === right.id)
  })

const loadRecentTools = () => {
  const raw = localStorage.getItem(STORAGE_KEYS.recentTools)
  const ids = safeParseJson(raw, [])
  recentToolIds.value = Array.isArray(ids) ? ids : []
}

const filteredTools = computed(() => {
  if (!searchInput.value.trim()) return sortToolsByRecent(tools)

  const query = searchInput.value.toLowerCase()
  const matches = tools.filter(tool =>
    tool.name.toLowerCase().includes(query) ||
    tool.id.toLowerCase().includes(query) ||
    tool.keywords.some(kw => kw.toLowerCase().includes(query))
  )
  return sortToolsByRecent(matches)
})

const handleKeyDown = (e) => {
  if (e.key === 'Enter' && filteredTools.value[selectedIndex.value]) {
    selectTool(filteredTools.value[selectedIndex.value])
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value + 1) % filteredTools.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value - 1 + filteredTools.value.length) % filteredTools.value.length
  } else if (e.key === 'Escape') {
    showSearch.value = false
  }
}

const selectTool = (tool) => {
  emit('select', tool.id)
  showSearch.value = false
  searchInput.value = ''
}

const openSearch = () => {
  loadRecentTools()
  showSearch.value = true
  selectedIndex.value = 0
  searchInput.value = ''
  nextTick(() => {
    searchInputRef.value?.focus()
  })
}

const handleGlobalKeyDown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    if (showSearch.value) {
      showSearch.value = false
    } else {
      openSearch()
    }
  }
}

watch(searchInput, () => {
  selectedIndex.value = 0
})

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeyDown)
})
</script>

<template>
  <div class="command-palette">
    <!-- 搜索按钮 -->
    <button class="search-trigger" @click="openSearch" title="搜索工具 (Ctrl+K)">
      <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M11.5 7a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10.7 11.4a6 6 0 1 1 .7-.7l3.65 3.65a.5.5 0 0 1-.7.7L10.7 11.4Z" fill="currentColor"/>
      </svg>
      <span class="search-label">搜索</span>
      <kbd class="search-kbd">Ctrl K</kbd>
    </button>

    <!-- 搜索对话框 -->
    <Teleport to="body">
      <Transition name="overlay">
        <div v-if="showSearch" class="search-overlay" @click="showSearch = false"></div>
      </Transition>

      <Transition name="panel">
        <div v-if="showSearch" class="search-panel">
          <div class="search-header">
            <svg class="input-icon" width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M11.5 7a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10.7 11.4a6 6 0 1 1 .7-.7l3.65 3.65a.5.5 0 0 1-.7.7L10.7 11.4Z" fill="currentColor"/>
            </svg>
            <input
              ref="searchInputRef"
              v-model="searchInput"
              type="text"
              placeholder="输入关键词搜索工具..."
              class="search-input"
              @keydown="handleKeyDown"
            />
            <kbd v-if="!searchInput" class="input-esc">Esc</kbd>
          </div>

          <div class="search-results">
            <div v-if="filteredTools.length === 0" class="no-results">
              <div class="no-results-icon">🔍</div>
              <div class="no-results-text">未找到匹配的工具</div>
            </div>

            <div
              v-for="(tool, index) in filteredTools"
              :key="tool.id"
              :class="['result-item', { active: index === selectedIndex }]"
              :data-tool-id="tool.id"
              @click="selectTool(tool)"
              @mousemove="selectedIndex = index"
            >
              <span class="tool-icon">{{ tool.icon }}</span>
              <div class="tool-info">
                <div class="tool-name">{{ tool.name }}</div>
                <div class="tool-keywords">{{ tool.keywords.join(' · ') }}</div>
              </div>
              <svg v-if="index === selectedIndex" class="enter-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M13 3v6H4.5l3-3-.7-.7L2.8 9.3l4 4 .7-.7-3-3H14V3h-1Z" fill="currentColor"/>
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
            <div class="results-count" v-if="searchInput">
              {{ filteredTools.length }} / {{ tools.length }} 个工具
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
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 10px;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #555;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  pointer-events: auto;
  z-index: 9998;
}

:global([data-theme='dark'] .search-trigger) {
  background: rgba(30, 40, 55, 0.8);
  border-color: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.search-trigger:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(0, 0, 0, 0.12);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06);
  color: #333;
}

:global([data-theme='dark'] .search-trigger:hover) {
  background: rgba(40, 52, 70, 0.95);
  border-color: rgba(255, 255, 255, 0.15);
  color: #e0e8f0;
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
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 5px;
  color: inherit;
  opacity: 0.5;
  letter-spacing: 0.05em;
}

:global([data-theme='dark'] .search-kbd) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
}

/* ===== 遮罩层 ===== */
.search-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  pointer-events: auto;
  z-index: 10000;
}

:global([data-theme='dark'] .search-overlay) {
  background: rgba(0, 0, 0, 0.5);
}

/* ===== 搜索面板 ===== */
.search-panel {
  position: fixed;
  top: min(20%, 140px);
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 580px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  box-shadow:
    0 24px 48px rgba(0, 0, 0, 0.12),
    0 8px 16px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
  z-index: 10001;
}

:global([data-theme='dark'] .search-panel) {
  background: rgba(22, 28, 40, 0.97);
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow:
    0 24px 48px rgba(0, 0, 0, 0.4),
    0 8px 16px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.04);
}

/* ===== 搜索输入区域 ===== */
.search-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

:global([data-theme='dark'] .search-header) {
  border-bottom-color: rgba(255, 255, 255, 0.06);
}

.input-icon {
  flex-shrink: 0;
  color: #aaa;
}

:global([data-theme='dark'] .input-icon) {
  color: #556677;
}

.search-input {
  flex: 1;
  padding: 0;
  border: none;
  font-size: 1rem;
  font-family: inherit;
  background: transparent;
  color: #1a1a1a;
  outline: none;
}

:global([data-theme='dark'] .search-input) {
  color: #e8edf3;
}

.search-input::placeholder {
  color: #bbb;
}

:global([data-theme='dark'] .search-input::placeholder) {
  color: #4a5568;
}

.input-esc {
  flex-shrink: 0;
  font-family: inherit;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.45rem;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 5px;
  color: #aaa;
}

:global([data-theme='dark'] .input-esc) {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
  color: #556677;
}

/* ===== 搜索结果列表 ===== */
.search-results {
  flex: 1;
  overflow-y: auto;
  max-height: 380px;
  padding: 0.5rem;
}

.search-results::-webkit-scrollbar {
  width: 4px;
}

.search-results::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}

:global([data-theme='dark'] .search-results::-webkit-scrollbar-thumb) {
  background: rgba(255, 255, 255, 0.1);
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
  color: #999;
  font-size: 0.9rem;
}

:global([data-theme='dark'] .no-results-text) {
  color: #556677;
}

.result-item {
  padding: 0.65rem 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  cursor: pointer;
  border-radius: 10px;
  transition: background 0.12s ease;
}

.result-item.active {
  background: rgba(78, 205, 196, 0.08);
}

:global([data-theme='dark'] .result-item.active) {
  background: rgba(78, 205, 196, 0.1);
}

.tool-icon {
  font-size: 1.35rem;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 9px;
}

:global([data-theme='dark'] .tool-icon) {
  background: rgba(255, 255, 255, 0.04);
}

.result-item.active .tool-icon {
  background: rgba(78, 205, 196, 0.1);
}

:global([data-theme='dark'] .result-item.active .tool-icon) {
  background: rgba(78, 205, 196, 0.12);
}

.tool-info {
  flex: 1;
  min-width: 0;
}

.tool-name {
  font-weight: 600;
  color: #2d3748;
  font-size: 0.9rem;
  line-height: 1.3;
}

:global([data-theme='dark'] .tool-name) {
  color: #e0e8f0;
}

.result-item.active .tool-name {
  color: #1a8a82;
}

:global([data-theme='dark'] .result-item.active .tool-name) {
  color: #5ecec5;
}

.tool-keywords {
  font-size: 0.75rem;
  color: #a0aec0;
  margin-top: 0.15rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:global([data-theme='dark'] .tool-keywords) {
  color: #4a5568;
}

.enter-icon {
  flex-shrink: 0;
  color: #4ecdc4;
  opacity: 0.6;
}

/* ===== 底部快捷键 ===== */
.search-footer {
  padding: 0.65rem 1.25rem;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

:global([data-theme='dark'] .search-footer) {
  border-top-color: rgba(255, 255, 255, 0.06);
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
  color: #a0aec0;
}

:global([data-theme='dark'] .shortcut) {
  color: #4a5568;
}

kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  padding: 0.12rem 0.35rem;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.7rem;
  font-weight: 600;
  color: #718096;
  line-height: 1;
}

:global([data-theme='dark'] kbd) {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
  color: #556677;
}

.results-count {
  font-size: 0.75rem;
  color: #a0aec0;
}

:global([data-theme='dark'] .results-count) {
  color: #4a5568;
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

  .search-label {
    display: none;
  }

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
    max-height: 50vh;
  }

  .search-footer {
    gap: 0.75rem;
  }
}
</style>
