<script setup>
import { ref, watch, computed, onMounted, onUnmounted, onErrorCaptured } from 'vue'
import { useTheme } from './composables/useTheme'
import { useToast } from './composables/useToast'
import { categoryGroups, toolComponentMap, toolMap, tools } from './tools/registry'
// 常驻UI组件保持静态导入
import CommandPalette from './components/CommandPalette.vue'
import ToastNotification from './components/ToastNotification.vue'
import ToolLoading from './components/ToolLoading.vue'

const { initTheme, isDark, toggleTheme, disposeThemeListener } = useTheme()
const { showToast } = useToast()

const activeTab = ref(tools[0]?.id || 'qrcode')
const toolReady = ref(false)
const componentError = ref(null)
const navRef = ref(null)
const lastToolKey = 'toolbox_last_tool'
const favoriteToolsKey = 'toolbox_favorite_tools'
const recentToolsKey = 'toolbox_recent_tools'

const favoriteToolIds = ref([])
const recentToolIds = ref([])

// 错误边界：捕获子组件渲染错误，避免整个应用崩溃
onErrorCaptured((err) => {
  componentError.value = err.message || '组件加载失败'
  console.error('组件错误:', err)
  return false
})

// Hash routing
const toolIds = new Set(tools.map((t) => t.id))

const syncHashToTab = () => {
  const hash = window.location.hash.replace('#tool-', '')
  if (hash && toolIds.has(hash)) {
    activeTab.value = hash
    return true
  }
  return false
}

const onHashChange = () => {
  syncHashToTab()
}

const safeLoadArray = (key, fallback = []) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const value = JSON.parse(raw)
    return Array.isArray(value) ? value : fallback
  } catch {
    return fallback
  }
}

const safeSaveArray = (key, arr) => {
  try {
    localStorage.setItem(key, JSON.stringify(arr))
  } catch {
    // ignore
  }
}

const loadToolPrefs = () => {
  favoriteToolIds.value = safeLoadArray(favoriteToolsKey, []).filter((id) => toolIds.has(id))
  recentToolIds.value = safeLoadArray(recentToolsKey, []).filter((id) => toolIds.has(id))
}

const closeAllCategories = () => {
  Object.keys(expandedCategories.value).forEach((key) => {
    expandedCategories.value[key] = false
  })
  hoveredCategory.value = null
}

const onDocumentClick = (e) => {
  const navEl = navRef.value
  if (!navEl) return
  if (navEl.contains(e.target)) return
  closeAllCategories()
}

const updateRecentTools = (toolId) => {
  const max = 8
  const next = [toolId, ...recentToolIds.value.filter((id) => id !== toolId)].slice(0, max)
  recentToolIds.value = next
  safeSaveArray(recentToolsKey, next)
}

const isFavoriteTool = (toolId) => favoriteToolIds.value.includes(toolId)

const toggleFavoriteTool = (toolId) => {
  const wasFavorite = isFavoriteTool(toolId)
  const next = wasFavorite
    ? favoriteToolIds.value.filter((id) => id !== toolId)
    : [toolId, ...favoriteToolIds.value]
  favoriteToolIds.value = next
  safeSaveArray(favoriteToolsKey, next)
  showToast(wasFavorite ? '已取消收藏' : '已收藏')
}

const copyCurrentToolLink = async () => {
  try {
    const url = `${window.location.origin}${window.location.pathname}#tool-${activeTab.value}`
    await navigator.clipboard.writeText(url)
    showToast('链接已复制')
  } catch {
    showToast('复制失败', 'error')
  }
}

onMounted(() => {
  initTheme()
  loadToolPrefs()
  const hasHash = syncHashToTab()
  if (!hasHash) {
    try {
      const saved = localStorage.getItem(lastToolKey)
      if (saved && toolIds.has(saved)) activeTab.value = saved
    } catch {
      // ignore
    }
  }
  window.addEventListener('hashchange', onHashChange)
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  window.removeEventListener('hashchange', onHashChange)
  document.removeEventListener('click', onDocumentClick)
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
  disposeThemeListener()
})

watch(activeTab, (newTab) => {
  componentError.value = null
  toolReady.value = false
  window.location.hash = `#tool-${newTab}`
  try {
    localStorage.setItem(lastToolKey, newTab)
  } catch {
    // ignore
  }
  updateRecentTools(newTab)
})
const hoveredCategory = ref(null)
const expandedCategories = ref(Object.fromEntries(categoryGroups.map((g) => [g.category, false])))

const displayCategoryGroups = computed(() => {
  const favorites = favoriteToolIds.value.filter((id) => toolIds.has(id))
  const recent = recentToolIds.value.filter((id) => toolIds.has(id) && !favorites.includes(id))

  const favoriteSet = new Set(favorites)
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

const currentComponent = computed(() => toolComponentMap[activeTab.value])
const currentComponentProps = computed(() => {
  if (activeTab.value === 'settings') return { toolCount: tools.length }
  return {}
})

const toggleCategory = (category) => {
  // 如果点击的菜单已展开，则关闭它
  if (expandedCategories.value[category]) {
    expandedCategories.value[category] = false
  } else {
    // 关闭所有其他菜单，只展开点击的这个
    Object.keys(expandedCategories.value).forEach(key => {
      expandedCategories.value[key] = key === category
    })
  }
}

let closeTimer = null

const handleMouseEnter = (category) => {
  hoveredCategory.value = category
  // 清除之前的关闭计时器
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

const handleMouseLeave = (category) => {
  if (hoveredCategory.value === category) {
    // 延迟关闭菜单，给用户移动鼠标到菜单的时间
    closeTimer = setTimeout(() => {
      if (hoveredCategory.value === category) {
        expandedCategories.value[category] = false
        hoveredCategory.value = null
      }
    }, 300)
  }
}

const handleCommandSelect = (toolId) => {
  activeTab.value = toolId
}
</script>

<template>
  <div id="app">
    <!-- Toast 通知 -->
    <ToastNotification />

    <!-- 快捷搜索面板 -->
    <CommandPalette @select="handleCommandSelect" />

    <header class="header" role="banner">
      <div class="header-content">
        <div class="header-top">
          <h1>✨ 工具箱</h1>
          <button @click="toggleTheme" class="theme-toggle"
            :title="isDark ? '切换为亮色' : '切换为深色'"
            :aria-label="isDark ? '切换为亮色主题' : '切换为深色主题'">
            {{ isDark ? '☀️' : '🌙' }}
          </button>
        </div>
        <p class="subtitle">简单高效的在线工具集 | 免费 · 无需注册 · 隐私优先</p>
        <p class="hint">💡 快捷键：按 Ctrl+K (或 Cmd+K) 快速搜索工具</p>
      </div>
    </header>

    <nav ref="navRef" class="nav" role="navigation" aria-label="工具导航">
      <div v-for="group in displayCategoryGroups" :key="group.category" class="nav-group"
           @mouseenter="handleMouseEnter(group.category)"
           @mouseleave="handleMouseLeave(group.category)">
        <button
          class="category-btn"
          @click="toggleCategory(group.category)"
          :class="{ expanded: expandedCategories[group.category] }"
          :aria-expanded="expandedCategories[group.category]"
          :aria-label="`${group.category}分类`"
        >
          <span class="category-name">{{ group.category }}</span>
          <span class="expand-icon" aria-hidden="true">{{ expandedCategories[group.category] ? '▼' : '▶' }}</span>
        </button>
        <div v-show="expandedCategories[group.category]" class="nav-buttons" role="group"
             :aria-label="`${group.category}工具列表`"
             @mouseenter="handleMouseEnter(group.category)"
             @mouseleave="handleMouseLeave(group.category)">
          <button
            v-for="toolId in group.ids"
            :key="toolId"
            :class="['nav-btn', { active: activeTab === toolId }]"
            @click="activeTab = toolId; expandedCategories[group.category] = false"
            :style="{ '--btn-color': toolMap.get(toolId)?.color }"
            :aria-label="toolMap.get(toolId)?.name"
            :aria-current="activeTab === toolId ? 'page' : undefined"
          >
            <span class="nav-icon" aria-hidden="true">{{ toolMap.get(toolId)?.icon }}</span>
            <span class="nav-text">{{ toolMap.get(toolId)?.name }}</span>
          </button>
        </div>
      </div>
    </nav>

    <main class="content" role="main">
      <div class="tool-panel" :data-active-tool="activeTab" :data-tool-ready="toolReady ? 'true' : 'false'">
        <div class="tool-toolbar" role="region" aria-label="工具操作栏">
          <div class="tool-title">
            <span class="tool-title-icon" aria-hidden="true">{{ toolMap.get(activeTab)?.icon }}</span>
            <span class="tool-title-text">{{ toolMap.get(activeTab)?.name }}</span>
          </div>
          <div class="tool-actions">
            <button
              type="button"
              class="tool-action-btn"
              :aria-label="isFavoriteTool(activeTab) ? '取消收藏' : '收藏该工具'"
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
          <p>{{ componentError }}</p>
          <button @click="componentError = null">重试</button>
        </div>
        <Suspense v-else @pending="toolReady = false" @resolve="toolReady = true">
          <template #default>
            <KeepAlive :max="10">
              <component :is="currentComponent" :key="activeTab" v-bind="currentComponentProps" />
            </KeepAlive>
          </template>
          <template #fallback>
            <ToolLoading :tool-name="toolMap.get(activeTab)?.name" />
          </template>
        </Suspense>
      </div>
    </main>

    <footer class="footer" role="contentinfo">
      <p>&copy; {{ new Date().getFullYear() }} 工具箱 | Made with ❤️ for developers | {{ tools.length }} 工具 | 完全隐私 | 离线可用</p>
    </footer>
  </div>
</template>

<style>
:root {
  --primary-color: #4ecdc4;
  --danger-color: #ff6b6b;
  --warning-color: #ffa502;
  --purple-color: #9c27b0;
  --blue-color: #2196f3;
}

:root[data-theme='dark'] {
  --bg-primary: #1a1a2e;
  --bg-secondary: #2a3a4a;
  --text-primary: #e0e0e0;
  --text-secondary: #a0c0e0;
  color: #e0e0e0;
}

[data-theme='dark'] .category-btn {
  color: #e0e0e0 !important;
  background: linear-gradient(135deg, #2a3a4a 0%, #34475f 100%) !important;
  border-color: #445566 !important;
}

[data-theme='dark'] .nav-buttons {
  background: rgba(78, 205, 196, 0.12) !important;
  border-color: #4ecdc4 !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3) !important;
}

[data-theme='dark'] .nav-btn {
  color: #c0c0c0 !important;
  background-color: #2d3d4d !important;
  border-color: #3a4a5a !important;
}

[data-theme='dark'] .nav-btn:hover {
  background-color: #3a4a5a !important;
  color: var(--btn-color, #ff6b6b) !important;
  border-color: #4a5a6a !important;
}

[data-theme='dark'] .nav-btn.active {
  color: white !important;
  background-color: var(--btn-color, #ff6b6b) !important;
  border-color: var(--btn-color, #ff6b6b) !important;
}

[data-theme='dark'] .header {
  color: #e0e0e0 !important;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%) !important;
}

[data-theme='dark'] .content {
  color: #e0e0e0 !important;
  background: #1a1a2e !important;
  border-color: #2a3a4a;
}

[data-theme='dark'] .subtitle {
  color: #a0c0e0 !important;
}

[data-theme='dark'] .hint {
  color: #8ab0d0 !important;
}

[data-theme='dark'] .footer {
  color: #8ab0d0 !important;
  border-top-color: #2a3a4a;
}

[data-theme='dark'] .category-name,
[data-theme='dark'] .nav-text {
  color: inherit !important;
}
</style>

<style scoped>
.header {
  background: linear-gradient(135deg, #ffd4e5 0%, #fff9f0 50%, #e0f7ff 100%);
  padding: 2rem;
  text-align: center;
  margin-bottom: 2rem;
  border-bottom: 3px solid transparent;
  border-image: linear-gradient(90deg, #ff6b6b, #4ecdc4, #ffa502) 1;
  animation: fadeInDown 0.6s ease-out;
  position: relative;
  color: #333;
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
  border: 2px solid #ffd4e5;
  background: white;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}


.theme-toggle:hover {
  transform: scale(1.1) rotate(20deg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.subtitle {
  margin: 0.5rem 0 0 0;
  color: #555;
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: 0.5px;
}


.hint {
  margin: 0.5rem 0 0 0;
  color: #999;
  font-size: 0.85rem;
  font-style: italic;
}


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
  padding: 0.5rem 0.8rem;
  background: linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%);
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #333;
}


.category-btn:hover {
  border-color: #4ecdc4;
  box-shadow: 0 4px 12px rgba(78, 205, 196, 0.15);
}

.category-btn.expanded {
  border-color: #4ecdc4;
  background: linear-gradient(135deg, #e8f9f8 0%, #f0fdfb 100%);
}


.category-name {
  flex: 1;
  text-align: left;
}

.expand-icon {
  font-size: 0.7rem;
  transition: transform 0.3s;
  margin-left: 0.3rem;
}

.category-btn.expanded .expand-icon {
  transform: rotate(0deg);
}

.nav-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-start;
  padding: 0.75rem 0 0.75rem 1.5rem;
  margin-left: 0;
  margin-top: 0;
  border-left: 3px solid #4ecdc4;
  border-radius: 0 8px 8px 0;
  animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(78, 205, 196, 0.04);
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 300px;
  z-index: 1000;
  margin-top: 0.3rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(78, 205, 196, 0.2);
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
  border: 1.5px solid #e8e8e8;
  background-color: #fafafa;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  color: #555;
}


.nav-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #d0d0d0;
  background-color: white;
  color: var(--btn-color, #ff6b6b);
}

.nav-btn.active {
  border-color: var(--btn-color, #ff6b6b);
  color: white;
  font-weight: 600;
  background: linear-gradient(135deg, var(--btn-color, #ff6b6b) 0%, var(--btn-color, #ff6b6b) 100%);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.nav-icon {
  font-size: 0.95em;
}

.nav-text {
  white-space: nowrap;
}

.content {
  background: white;
  border-radius: 16px;
  padding: 2.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 107, 107, 0.08);
  animation: fadeIn 0.6s ease-in-out 0.3s both;
  color: #333;
  position: relative;
  z-index: 1;
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
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

:global([data-theme='dark']) .tool-toolbar {
  background: rgba(26, 26, 46, 0.55);
  border-color: rgba(255, 255, 255, 0.08);
}

.tool-title {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.tool-title-icon {
  font-size: 1.1rem;
}

.tool-title-text {
  font-weight: 900;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:global([data-theme='dark']) .tool-title-text {
  color: #e0e0e0;
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
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.85);
  box-shadow: none;
  font-size: 1.1rem;
  display: grid;
  place-items: center;
}

:global([data-theme='dark']) .tool-action-btn {
  background: rgba(42, 58, 74, 0.85);
  border-color: rgba(255, 255, 255, 0.12);
}

.tool-action-btn:hover {
  transform: translateY(-1px);
}

.error-boundary {
  text-align: center;
  padding: 3rem 2rem;
  color: #ff6b6b;
}

.error-boundary p {
  font-size: 1.1rem;
  margin-bottom: 1rem;
}

.error-boundary button {
  background: #4ecdc4;
  color: white;
  border: none;
  padding: 0.6rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
}

.footer {
  text-align: center;
  color: #999;
  font-size: 0.9em;
  padding-top: 1.5rem;
  border-top: 2px solid #f0f0f0;
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
    padding: 0;
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

  .expand-icon {
    font-size: 0.65rem;
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

  .group-title {
    font-size: 0.75rem;
    padding: 0 0.5rem;
  }

  .nav-buttons {
    gap: 0.35rem;
    min-width: 0;
    width: 100%;
    position: static;
    margin-top: 0.5rem;
    padding: 0.6rem;
    border-left: none;
  }

  .category-btn {
    padding: 0.4rem 0.6rem;
    font-size: 0.75rem;
  }

  .nav-btn {
    padding: 0.4rem 0.7rem;
    font-size: 0.7rem;
  }

  .expand-icon {
    font-size: 0.6rem;
  }

  .nav-icon {
    font-size: 0.85em;
  }

  .content {
    padding: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .tool-toolbar {
    padding: 0.75rem 0.85rem;
  }

  .tool-action-btn {
    width: 40px;
    height: 40px;
    border-radius: 10px;
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
    font-size: 0.65rem;
  }

  .nav-btn {
    padding: 0.35rem 0.6rem;
    font-size: 0.65rem;
  }

  .expand-icon {
    font-size: 0.55rem;
  }

  .nav-text {
    display: none;
  }

  .nav-icon {
    font-size: 0.8em;
  }

  .content {
    padding: 1rem;
  }
}
</style>
