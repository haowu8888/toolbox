<script setup>
import { ref, watch, computed, onMounted, onUnmounted, onErrorCaptured } from 'vue'
import { useTheme } from './composables/useTheme'
import { useToast } from './composables/useToast'
import { useClipboard } from './composables/useClipboard'
import { usePwa } from './composables/usePwa'
import { categoryGroups, toolComponentMap, toolMap, tools } from './tools/registry'
import { readStorageArray, readStorageRaw, STORAGE_KEYS, writeStorageJson, writeStorageRaw } from './utils/storageKeys'
// 常驻 UI 组件保持静态导入
import CommandPalette from './components/CommandPalette.vue'
import ToastNotification from './components/ToastNotification.vue'
import ToolLoading from './components/ToolLoading.vue'

const APP_TITLE = '工具箱'
const MAX_RECENT_TOOLS = 8

const { initTheme, isDark, toggleTheme, disposeThemeListener } = useTheme()
const { showToast } = useToast()
const { copyText } = useClipboard()
const { needRefresh, init: initPwa, applyUpdate, dismissUpdate } = usePwa()

const activeTab = ref(tools[0]?.id || 'qrcode')
const toolReady = ref(false)
const componentError = ref(null)
const componentRetryKey = ref(0)
const navRef = ref(null)
const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine)

const favoriteToolIds = ref([])
const recentToolIds = ref([])

// 错误边界：捕获子组件渲染错误，避免整个应用崩溃
onErrorCaptured((err) => {
  componentError.value = err?.message || '组件加载失败'
  console.error('组件错误:', err)
  return false
})

const retryComponent = () => {
  componentError.value = null
  componentRetryKey.value += 1
}

// ---------- Hash 路由 ----------
const toolIds = new Set(tools.map((t) => t.id))

const readToolFromHash = () => {
  const hash = window.location.hash.replace(/^#tool-/, '')
  return hash && toolIds.has(hash) ? hash : ''
}

const syncHashToTab = () => {
  const id = readToolFromHash()
  if (id) activeTab.value = id
  return Boolean(id)
}

const onHashChange = () => {
  syncHashToTab()
}

// ---------- 偏好 ----------
const loadToolPrefs = () => {
  favoriteToolIds.value = readStorageArray(STORAGE_KEYS.favoriteTools).filter((id) => toolIds.has(id))
  recentToolIds.value = readStorageArray(STORAGE_KEYS.recentTools).filter((id) => toolIds.has(id))
}

const updateRecentTools = (toolId) => {
  const next = [toolId, ...recentToolIds.value.filter((id) => id !== toolId)].slice(0, MAX_RECENT_TOOLS)
  recentToolIds.value = next
  writeStorageJson(STORAGE_KEYS.recentTools, next)
}

const isFavoriteTool = (toolId) => favoriteToolIds.value.includes(toolId)

const toggleFavoriteTool = (toolId) => {
  const wasFavorite = isFavoriteTool(toolId)
  const next = wasFavorite
    ? favoriteToolIds.value.filter((id) => id !== toolId)
    : [toolId, ...favoriteToolIds.value]
  favoriteToolIds.value = next
  writeStorageJson(STORAGE_KEYS.favoriteTools, next)
  showToast(wasFavorite ? '已取消收藏' : '已收藏')
}

const copyCurrentToolLink = () => {
  const url = `${window.location.origin}${window.location.pathname}#tool-${activeTab.value}`
  copyText(url, { successMessage: '链接已复制' })
}

// ---------- 导航菜单 ----------
const hoveredCategory = ref(null)
const expandedCategories = ref(Object.fromEntries(categoryGroups.map((g) => [g.category, false])))
let closeTimer = null

const displayCategoryGroups = computed(() => {
  const favorites = favoriteToolIds.value.filter((id) => toolIds.has(id))
  const favoriteSet = new Set(favorites)
  const recent = recentToolIds.value.filter((id) => toolIds.has(id) && !favoriteSet.has(id))

  const groups = categoryGroups
    .map((g) => ({
      category: g.category,
      ids: g.ids.filter((id) => !favoriteSet.has(id)),
    }))
    .filter((g) => g.ids.length > 0)

  const head = []
  if (favorites.length) head.push({ category: '⭐ 收藏', ids: favorites })
  if (recent.length) head.push({ category: '🕘 最近', ids: recent })
  return [...head, ...groups]
})

watch(
  displayCategoryGroups,
  (groups) => {
    for (const g of groups) {
      if (!(g.category in expandedCategories.value)) {
        expandedCategories.value[g.category] = false
      }
    }
  },
  { immediate: true },
)

const closeAllCategories = () => {
  Object.keys(expandedCategories.value).forEach((key) => {
    expandedCategories.value[key] = false
  })
  hoveredCategory.value = null
}

// 分类名可能包含空格/emoji，转成合法的 DOM id 供 aria-controls 引用
const groupDomId = (category) => `nav-group-${encodeURIComponent(category).replace(/%/g, '')}`

const toggleCategory = (category) => {
  const willExpand = !expandedCategories.value[category]
  Object.keys(expandedCategories.value).forEach((key) => {
    expandedCategories.value[key] = willExpand && key === category
  })
}

const clearCloseTimer = () => {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

const handleMouseEnter = (category) => {
  hoveredCategory.value = category
  clearCloseTimer()
}

const handleMouseLeave = (category) => {
  if (hoveredCategory.value !== category) return
  // 延迟关闭菜单，给用户移动鼠标到菜单的时间
  closeTimer = setTimeout(() => {
    if (hoveredCategory.value === category) {
      expandedCategories.value[category] = false
      hoveredCategory.value = null
    }
  }, 300)
}

const selectTool = (toolId, category) => {
  activeTab.value = toolId
  if (category) expandedCategories.value[category] = false
}

const onDocumentClick = (e) => {
  const navEl = navRef.value
  if (!navEl || navEl.contains(e.target)) return
  closeAllCategories()
}

const onNavKeydown = (e) => {
  if (e.key !== 'Escape') return
  const anyOpen = Object.values(expandedCategories.value).some(Boolean)
  if (!anyOpen) return
  closeAllCategories()
  e.target?.closest('.nav-group')?.querySelector('.category-btn')?.focus()
}

// ---------- 当前工具 ----------
const currentTool = computed(() => toolMap.get(activeTab.value))
const currentComponent = computed(() => toolComponentMap[activeTab.value])
const currentComponentProps = computed(() =>
  activeTab.value === 'settings' ? { toolCount: tools.length } : {},
)

const handleCommandSelect = (toolId) => {
  activeTab.value = toolId
}

watch(activeTab, (newTab) => {
  componentError.value = null
  toolReady.value = false
  if (readToolFromHash() !== newTab) window.location.hash = `#tool-${newTab}`
  writeStorageRaw(STORAGE_KEYS.lastTool, newTab)
  updateRecentTools(newTab)
  document.title = `${toolMap.get(newTab)?.name ?? ''} · ${APP_TITLE}`
})

// ---------- 在线状态 ----------
const onOnline = () => {
  isOnline.value = true
  showToast('网络已恢复', 'success')
}
const onOffline = () => {
  isOnline.value = false
  showToast('当前离线，本地工具仍可正常使用', 'info', 4000)
}

// ---------- 生命周期 ----------
onMounted(() => {
  initTheme()
  loadToolPrefs()
  const hasHash = syncHashToTab()
  if (!hasHash) {
    const saved = readStorageRaw(STORAGE_KEYS.lastTool)
    if (saved && toolIds.has(saved)) activeTab.value = saved
  }
  document.title = `${currentTool.value?.name ?? ''} · ${APP_TITLE}`
  window.addEventListener('hashchange', onHashChange)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  document.addEventListener('click', onDocumentClick)
  initPwa()
})

onUnmounted(() => {
  window.removeEventListener('hashchange', onHashChange)
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
  document.removeEventListener('click', onDocumentClick)
  clearCloseTimer()
  disposeThemeListener()
})
</script>

<template>
  <div id="app-shell">
    <a class="skip-link" href="#main-content">跳到主要内容</a>

    <!-- Toast 通知 -->
    <ToastNotification />

    <!-- 快捷搜索面板 -->
    <CommandPalette @select="handleCommandSelect" />

    <!-- PWA 更新提示 -->
    <Transition name="banner">
      <div v-if="needRefresh" class="update-banner" role="status" aria-live="polite">
        <span>🚀 新版本已就绪</span>
        <div class="update-actions">
          <button type="button" class="update-btn primary" @click="applyUpdate">立即刷新</button>
          <button type="button" class="update-btn" @click="dismissUpdate">稍后</button>
        </div>
      </div>
    </Transition>

    <header class="header" role="banner">
      <div class="header-content">
        <div class="header-top">
          <h1>✨ 工具箱</h1>
          <button
            type="button"
            @click="toggleTheme"
            class="theme-toggle"
            :title="isDark ? '切换为亮色' : '切换为深色'"
            :aria-label="isDark ? '切换为亮色主题' : '切换为深色主题'"
            :aria-pressed="isDark"
          >
            {{ isDark ? '☀️' : '🌙' }}
          </button>
        </div>
        <p class="subtitle">简单高效的在线工具集 | 免费 · 无需注册 · 隐私优先</p>
        <p class="hint">
          💡 快捷键：按 <kbd>Ctrl</kbd> + <kbd>K</kbd>（Mac 上为 <kbd>⌘</kbd> + <kbd>K</kbd>）快速搜索工具
          <span v-if="!isOnline" class="offline-badge" title="当前处于离线状态">离线模式</span>
        </p>
      </div>
    </header>

    <nav ref="navRef" class="nav" aria-label="工具导航" @keydown="onNavKeydown">
      <div
        v-for="group in displayCategoryGroups"
        :key="group.category"
        class="nav-group"
        @mouseenter="handleMouseEnter(group.category)"
        @mouseleave="handleMouseLeave(group.category)"
      >
        <button
          type="button"
          class="category-btn"
          :class="{ expanded: expandedCategories[group.category], 'has-active': group.ids.includes(activeTab) }"
          :aria-expanded="expandedCategories[group.category]"
          :aria-controls="groupDomId(group.category)"
          @click="toggleCategory(group.category)"
        >
          <span class="category-name">{{ group.category }}</span>
          <span class="category-count" aria-hidden="true">{{ group.ids.length }}</span>
          <span class="expand-icon" aria-hidden="true">▾</span>
        </button>
        <div
          v-show="expandedCategories[group.category]"
          :id="groupDomId(group.category)"
          class="nav-buttons"
          role="group"
          :aria-label="`${group.category}工具列表`"
          @mouseenter="handleMouseEnter(group.category)"
          @mouseleave="handleMouseLeave(group.category)"
        >
          <button
            v-for="toolId in group.ids"
            :key="toolId"
            type="button"
            :class="['nav-btn', { active: activeTab === toolId }]"
            :style="{ '--btn-color': toolMap.get(toolId)?.color }"
            :title="toolMap.get(toolId)?.description"
            :aria-current="activeTab === toolId ? 'page' : undefined"
            @click="selectTool(toolId, group.category)"
          >
            <span class="nav-icon" aria-hidden="true">{{ toolMap.get(toolId)?.icon }}</span>
            <span class="nav-text">{{ toolMap.get(toolId)?.name }}</span>
          </button>
        </div>
      </div>
    </nav>

    <main id="main-content" class="content" tabindex="-1">
      <div class="tool-panel" :data-active-tool="activeTab" :data-tool-ready="toolReady ? 'true' : 'false'">
        <div class="tool-toolbar" role="region" aria-label="工具操作栏">
          <div class="tool-title">
            <span class="tool-title-icon" aria-hidden="true">{{ currentTool?.icon }}</span>
            <div class="tool-title-copy">
              <span class="tool-title-text">{{ currentTool?.name }}</span>
              <span v-if="currentTool?.description" class="tool-title-desc">{{ currentTool.description }}</span>
            </div>
          </div>
          <div class="tool-actions">
            <button
              type="button"
              class="tool-action-btn"
              :class="{ favorited: isFavoriteTool(activeTab) }"
              :aria-label="isFavoriteTool(activeTab) ? '取消收藏' : '收藏该工具'"
              :aria-pressed="isFavoriteTool(activeTab)"
              :title="isFavoriteTool(activeTab) ? '取消收藏' : '收藏'"
              @click="toggleFavoriteTool(activeTab)"
            >
              {{ isFavoriteTool(activeTab) ? '★' : '☆' }}
            </button>
            <button
              type="button"
              class="tool-action-btn"
              aria-label="复制工具链接"
              title="复制链接"
              @click="copyCurrentToolLink"
            >
              🔗
            </button>
          </div>
        </div>
        <div v-if="componentError" class="error-boundary" role="alert">
          <p class="error-title">工具加载时出错</p>
          <p class="error-detail">{{ componentError }}</p>
          <button type="button" @click="retryComponent">重试</button>
        </div>
        <Suspense v-else @pending="toolReady = false" @resolve="toolReady = true">
          <template #default>
            <KeepAlive :max="10">
              <component
                :is="currentComponent"
                :key="`${activeTab}-${componentRetryKey}`"
                v-bind="currentComponentProps"
              />
            </KeepAlive>
          </template>
          <template #fallback>
            <ToolLoading :tool-name="currentTool?.name" />
          </template>
        </Suspense>
      </div>
    </main>

    <footer class="footer" role="contentinfo">
      <p>
        &copy; {{ new Date().getFullYear() }} 工具箱 | Made with ❤️ for developers | {{ tools.length }} 个工具 |
        数据仅保存在本地 | 支持离线使用
      </p>
    </footer>
  </div>
</template>

<style scoped>
.header {
  background: var(--header-gradient);
  padding: 2rem;
  text-align: center;
  margin-bottom: 2rem;
  border-bottom: 3px solid transparent;
  border-image: linear-gradient(90deg, #ff6b6b, #4ecdc4, #ffa502) 1;
  animation: fadeInDown 0.6s ease-out;
  position: relative;
  color: var(--text);
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.header-content {
  max-width: 800px;
  margin: 0 auto;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1rem;
  position: relative;
}

.header h1 {
  margin: 0;
  font-size: 3em;
  background: linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 50%, #ffa502 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 800;
  letter-spacing: 2px;
}

.theme-toggle {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 2px solid rgba(255, 107, 107, 0.25);
  background: var(--surface);
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
  padding: 0;
}

.theme-toggle:hover {
  transform: scale(1.1) rotate(20deg);
  box-shadow: var(--shadow-md);
}

.subtitle {
  margin: 0.5rem 0 0 0;
  color: var(--text-2);
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.hint {
  margin: 0.5rem 0 0 0;
  color: var(--text-3);
  font-size: 0.85rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.35rem;
}

.hint kbd {
  padding: 0.1rem 0.4rem;
  border-radius: 5px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 0.75rem;
  font-family: inherit;
  font-weight: 600;
  color: var(--text-2);
}

.offline-badge {
  margin-left: 0.5rem;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  background: var(--warning-soft);
  color: #b26a00;
  font-weight: 700;
  font-size: 0.75rem;
}

:global([data-theme='dark']) .offline-badge {
  color: #ffc46b;
}

/* ---------- PWA 更新提示 ---------- */
.update-banner {
  position: fixed;
  left: 50%;
  bottom: 1.25rem;
  transform: translateX(-50%);
  z-index: 9000;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.1rem;
  border-radius: 14px;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  font-weight: 600;
  max-width: calc(100vw - 2rem);
}

.update-actions {
  display: flex;
  gap: 0.5rem;
}

.update-btn {
  padding: 0.4rem 0.9rem;
  border-radius: 8px;
  font-size: 0.85rem;
  box-shadow: none;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
}

.update-btn.primary {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

.banner-enter-active,
.banner-leave-active {
  transition: all 0.25s ease;
}

.banner-enter-from,
.banner-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}

/* ---------- 导航 ---------- */
.nav {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  animation: fadeInUp 0.6s ease-out 0.2s both;
  position: relative;
  z-index: 100;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  position: relative;
}

.category-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  padding: 0.5rem 0.8rem;
  background: var(--surface-2);
  border: 2px solid var(--border);
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--text);
  box-shadow: none;
}

.category-btn:hover {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(78, 205, 196, 0.15);
}

.category-btn.expanded,
.category-btn.has-active {
  border-color: var(--primary);
  background: var(--primary-soft);
}

.category-name {
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category-count {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-3);
  background: var(--surface);
  border-radius: 999px;
  padding: 0 0.4rem;
  line-height: 1.4;
}

.expand-icon {
  font-size: 0.75rem;
  transition: transform 0.3s;
  color: var(--text-3);
}

.category-btn.expanded .expand-icon {
  transform: rotate(180deg);
}

.nav-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-start;
  padding: 0.75rem 0.75rem 0.75rem 1.5rem;
  border-left: 3px solid var(--primary);
  border-radius: 0 8px 8px 0;
  animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--surface);
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 300px;
  z-index: 1000;
  margin-top: 0.3rem;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border);
  border-left: 3px solid var(--primary);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1rem;
  border: 1.5px solid var(--border);
  background-color: var(--surface-2);
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-sm);
  color: var(--text-2);
}

.nav-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-strong);
  background-color: var(--surface);
  color: var(--btn-color, #ff6b6b);
}

.nav-btn.active {
  border-color: var(--btn-color, #ff6b6b);
  color: #fff;
  font-weight: 600;
  background: var(--btn-color, #ff6b6b);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.nav-icon {
  font-size: 0.95em;
}

.nav-text {
  white-space: nowrap;
}

/* ---------- 内容区 ---------- */
.content {
  background: var(--surface);
  border-radius: 16px;
  padding: 2.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--border);
  animation: fadeIn 0.6s ease-in-out 0.3s both;
  color: var(--text);
  position: relative;
  z-index: 1;
  outline: none;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.tool-panel {
  animation: fadeIn 0.3s ease-in-out;
}

.tool-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1.1rem;
  margin-bottom: 1rem;
  border-radius: 14px;
  background: var(--surface-glass);
  border: 1px solid var(--border);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.tool-title {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.tool-title-icon {
  font-size: 1.35rem;
}

.tool-title-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.tool-title-text {
  font-weight: 900;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tool-title-desc {
  font-size: 0.8rem;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tool-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.tool-action-btn {
  width: 42px;
  height: 42px;
  padding: 0;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: none;
  font-size: 1.1rem;
  display: grid;
  place-items: center;
}

.tool-action-btn.favorited {
  color: var(--warning);
}

.tool-action-btn:hover {
  transform: translateY(-1px);
}

.error-boundary {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--danger);
}

.error-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
}

.error-detail {
  margin: 0 0 1rem;
  color: var(--text-2);
  font-family: var(--font-mono);
  font-size: 0.9rem;
  word-break: break-word;
}

.error-boundary button {
  background: var(--primary);
  color: #fff;
  border: none;
  padding: 0.6rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
}

.footer {
  text-align: center;
  color: var(--text-3);
  font-size: 0.9em;
  padding-top: 1.5rem;
  border-top: 2px solid var(--border);
  animation: fadeIn 0.6s ease-in-out 0.4s both;
}

@media (max-width: 1024px) {
  .header h1 {
    font-size: 2.2em;
  }

  .content {
    padding: 1.5rem;
  }

  .nav-buttons {
    padding: 0.6rem;
    min-width: 280px;
  }

  .category-btn {
    padding: 0.45rem 0.7rem;
    font-size: 0.8rem;
  }

  .nav-btn {
    padding: 0.45rem 0.8rem;
    font-size: 0.75rem;
  }

  .nav-icon {
    font-size: 0.9em;
  }
}

@media (max-width: 768px) {
  .header {
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .header h1 {
    font-size: 1.8em;
  }

  .header-top {
    gap: 1rem;
  }

  .theme-toggle {
    width: 40px;
    height: 40px;
    font-size: 1.2rem;
  }

  .subtitle,
  .hint {
    font-size: 0.85rem;
  }

  .nav {
    gap: 0.4rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .nav-group {
    flex: 1 1 calc(50% - 0.4rem);
  }

  .nav-buttons {
    gap: 0.35rem;
    min-width: 0;
    width: 100%;
    position: static;
    margin-top: 0.5rem;
    padding: 0.6rem;
    border-left: none;
    box-shadow: var(--shadow-sm);
  }

  .category-btn {
    padding: 0.4rem 0.6rem;
    font-size: 0.75rem;
  }

  .category-count {
    display: none;
  }

  .nav-btn {
    padding: 0.4rem 0.7rem;
    font-size: 0.7rem;
  }

  .content {
    padding: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .tool-toolbar {
    padding: 0.75rem 0.85rem;
  }

  .tool-title-desc {
    white-space: normal;
  }

  .tool-action-btn {
    width: 40px;
    height: 40px;
    border-radius: 10px;
  }

  .update-banner {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
    bottom: 0.75rem;
  }
}

@media (max-width: 480px) {
  .header h1 {
    font-size: 1.5em;
  }

  .header-top {
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .subtitle,
  .hint {
    font-size: 0.75rem;
  }

  .nav {
    gap: 0.3rem;
  }

  .nav-group {
    flex: 1 1 100%;
  }

  .nav-buttons {
    gap: 0.25rem;
    min-width: 0;
    width: 100%;
    padding: 0.5rem 0 0.5rem 1rem;
    position: static;
    margin-top: 0.45rem;
    border-left: none;
  }

  .category-btn {
    padding: 0.35rem 0.5rem;
    font-size: 0.7rem;
  }

  .nav-btn {
    padding: 0.35rem 0.6rem;
    font-size: 0.7rem;
  }

  .content {
    padding: 1rem;
  }

  .tool-title-desc {
    display: none;
  }
}
</style>
