<script setup>
import { ref, computed, watch } from 'vue'
import { useHistory, useFavorites } from '../composables/useStorage'
import { useToast } from '../composables/useToast'

const { showToast } = useToast()

const activePanel = ref('history')
const history = useHistory()
const favorites = useFavorites()
const confirmId = ref(null)
let confirmTimer = null

const historyList = history.historyList
const favoriteList = favorites.favoriteList

// ---- 历史记录：筛选 + 分页 ----
const hSearch = ref('')
const hTypeFilter = ref('')
const historyPage = ref(1)
const historyPageSize = ref(10)
const pageSizeOptions = [5, 10, 20, 50]

const historyTypes = computed(() => {
  const set = new Set(historyList.value.map(i => i.type))
  return [...set].sort()
})

const filteredHistory = computed(() => {
  let list = historyList.value
  if (hTypeFilter.value) {
    list = list.filter(i => i.type === hTypeFilter.value)
  }
  if (hSearch.value.trim()) {
    const q = hSearch.value.trim().toLowerCase()
    list = list.filter(i =>
      i.type.toLowerCase().includes(q) ||
      (i.value && i.value.toLowerCase().includes(q))
    )
  }
  return list
})

const historyTotalPages = computed(() => Math.max(1, Math.ceil(filteredHistory.value.length / historyPageSize.value)))

const pagedHistory = computed(() => {
  const start = (historyPage.value - 1) * historyPageSize.value
  return filteredHistory.value.slice(start, start + historyPageSize.value)
})

// 筛选条件变化时回到第 1 页
watch([hSearch, hTypeFilter, historyPageSize], () => { historyPage.value = 1 })

const setHistoryPage = (p) => {
  if (p >= 1 && p <= historyTotalPages.value) historyPage.value = p
}

// ---- 收藏夹：筛选 + 分页 ----
const fSearch = ref('')
const fTypeFilter = ref('')
const favoritePage = ref(1)
const favoritePageSize = ref(10)

const favoriteTypes = computed(() => {
  const set = new Set(favoriteList.value.map(i => i.type))
  return [...set].sort()
})

const filteredFavorites = computed(() => {
  let list = favoriteList.value
  if (fTypeFilter.value) {
    list = list.filter(i => i.type === fTypeFilter.value)
  }
  if (fSearch.value.trim()) {
    const q = fSearch.value.trim().toLowerCase()
    list = list.filter(i =>
      i.type.toLowerCase().includes(q) ||
      (i.name && i.name.toLowerCase().includes(q)) ||
      (i.value && i.value.toLowerCase().includes(q))
    )
  }
  return list
})

const favoriteTotalPages = computed(() => Math.max(1, Math.ceil(filteredFavorites.value.length / favoritePageSize.value)))

const pagedFavorites = computed(() => {
  const start = (favoritePage.value - 1) * favoritePageSize.value
  return filteredFavorites.value.slice(start, start + favoritePageSize.value)
})

watch([fSearch, fTypeFilter, favoritePageSize], () => { favoritePage.value = 1 })

const setFavoritePage = (p) => {
  if (p >= 1 && p <= favoriteTotalPages.value) favoritePage.value = p
}

// ---- 通用操作 ----
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    showToast('已复制')
  } catch (err) {
    showToast('复制失败', 'error')
  }
}

const formatTime = (date) => {
  if (typeof date === 'string') date = new Date(date)
  const now = new Date()
  const diff = now - date
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  return date.toLocaleDateString('zh-CN')
}

const requestConfirm = (id, action) => {
  const key = `${action}-${id}`
  if (confirmId.value === key) {
    if (action === 'delete-history') history.deleteHistoryItem(id)
    else if (action === 'clear-history') { history.clearHistory(); historyPage.value = 1 }
    else if (action === 'delete-favorite') favorites.removeFavorite(id)
    else if (action === 'clear-favorites') { favorites.clearFavorites(); favoritePage.value = 1 }
    confirmId.value = null
    if (confirmTimer) clearTimeout(confirmTimer)
  } else {
    confirmId.value = key
    if (confirmTimer) clearTimeout(confirmTimer)
    confirmTimer = setTimeout(() => { confirmId.value = null }, 3000)
  }
}

const deleteHistoryItem = (id) => requestConfirm(id, 'delete-history')
const clearAllHistory = () => requestConfirm('all', 'clear-history')
const removeFavorite = (id) => requestConfirm(id, 'delete-favorite')
const clearAllFavorites = () => requestConfirm('all', 'clear-favorites')

const isItemFavorited = (value) => favorites.isFavorite(value)

const toggleFavorite = (item) => {
  if (isItemFavorited(item.value)) {
    const fav = favoriteList.value.find(f => f.value === item.value)
    if (fav) favorites.removeFavorite(fav.id)
    showToast('已取消收藏')
  } else {
    favorites.addFavorite(item.type, item.value, item.type)
    showToast('已添加到收藏')
  }
}

const truncateText = (text, length = 50) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

const resetHistoryFilter = () => {
  hSearch.value = ''
  hTypeFilter.value = ''
}

const resetFavoriteFilter = () => {
  fSearch.value = ''
  fTypeFilter.value = ''
}
</script>

<template>
  <div class="storage-panel">
    <h2>📚 历史与收藏</h2>
    <p class="description">管理你的历史记录和收藏内容</p>

    <div class="tabs">
      <button
        :class="['tab-btn', { active: activePanel === 'history' }]"
        @click="activePanel = 'history'"
      >
        ⏱️ 历史记录 ({{ historyList.length }})
      </button>
      <button
        :class="['tab-btn', { active: activePanel === 'favorites' }]"
        @click="activePanel = 'favorites'"
      >
        ⭐ 收藏夹 ({{ favoriteList.length }})
      </button>
    </div>

    <!-- ===================== 历史记录 ===================== -->
    <div v-show="activePanel === 'history'" class="panel-content">
      <div v-if="historyList.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <p>还没有历史记录</p>
        <p class="empty-hint">使用工具时会自动记录操作结果</p>
      </div>

      <div v-else>
        <!-- 筛选栏 -->
        <div class="filter-bar">
          <div class="filter-row">
            <input
              v-model="hSearch"
              type="text"
              class="filter-input"
              placeholder="搜索关键词..."
            />
            <select v-model="hTypeFilter" class="filter-select">
              <option value="">全部类型</option>
              <option v-for="t in historyTypes" :key="t" :value="t">{{ t }}</option>
            </select>
            <button
              v-if="hSearch || hTypeFilter"
              class="filter-reset"
              @click="resetHistoryFilter"
              title="清除筛选"
            >✕</button>
          </div>
          <div v-if="hSearch || hTypeFilter" class="filter-result-hint">
            筛选结果：{{ filteredHistory.length }} 条
          </div>
        </div>

        <div class="panel-header">
          <button @click="clearAllHistory" :class="['btn', confirmId === 'clear-history-all' ? 'btn-danger-confirm' : 'btn-danger']">
            {{ confirmId === 'clear-history-all' ? '⚠️ 确认清空？' : '🗑️ 清空所有' }}
          </button>
          <span class="page-info" v-if="filteredHistory.length">
            {{ (historyPage - 1) * historyPageSize + 1 }}-{{ Math.min(historyPage * historyPageSize, filteredHistory.length) }} / {{ filteredHistory.length }}
          </span>
        </div>

        <div v-if="filteredHistory.length === 0" class="empty-state small">
          <p>没有匹配的记录</p>
        </div>

        <div v-else class="list">
          <div v-for="item in pagedHistory" :key="item.id" class="list-item">
            <div class="item-content">
              <div class="item-type">{{ item.type }}</div>
              <div class="item-value">{{ truncateText(item.value, 60) }}</div>
              <div class="item-time">{{ formatTime(item.timestamp) }}</div>
            </div>
            <div class="item-actions">
              <button
                @click="toggleFavorite(item)"
                :class="['btn-action', 'btn-star', { 'is-favorited': isItemFavorited(item.value) }]"
                :title="isItemFavorited(item.value) ? '取消收藏' : '添加收藏'"
              >{{ isItemFavorited(item.value) ? '★' : '☆' }}</button>
              <button @click="copyToClipboard(item.value)" class="btn-action" title="复制">📋</button>
              <button
                @click="deleteHistoryItem(item.id)"
                :class="['btn-action', 'btn-delete', { 'confirm-delete': confirmId === `delete-history-${item.id}` }]"
                :title="confirmId === `delete-history-${item.id}` ? '再点一次确认删除' : '删除'"
              >{{ confirmId === `delete-history-${item.id}` ? '❗' : '🗑️' }}</button>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="filteredHistory.length > 0" class="pagination-bar">
          <div class="page-size-control">
            <label>每页</label>
            <select v-model.number="historyPageSize" class="page-size-select">
              <option v-for="s in pageSizeOptions" :key="s" :value="s">{{ s }}</option>
            </select>
            <label>条</label>
          </div>
          <div v-if="historyTotalPages > 1" class="pagination">
            <button class="page-btn" :disabled="historyPage === 1" @click="setHistoryPage(1)">«</button>
            <button class="page-btn" :disabled="historyPage === 1" @click="setHistoryPage(historyPage - 1)">‹</button>
            <template v-for="p in historyTotalPages" :key="p">
              <button
                v-if="p === 1 || p === historyTotalPages || (p >= historyPage - 1 && p <= historyPage + 1)"
                :class="['page-btn', { active: p === historyPage }]"
                @click="setHistoryPage(p)"
              >{{ p }}</button>
              <span v-else-if="p === historyPage - 2 || p === historyPage + 2" class="page-dots">...</span>
            </template>
            <button class="page-btn" :disabled="historyPage === historyTotalPages" @click="setHistoryPage(historyPage + 1)">›</button>
            <button class="page-btn" :disabled="historyPage === historyTotalPages" @click="setHistoryPage(historyTotalPages)">»</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===================== 收藏夹 ===================== -->
    <div v-show="activePanel === 'favorites'" class="panel-content">
      <div v-if="favoriteList.length === 0" class="empty-state">
        <div class="empty-icon">⭐</div>
        <p>还没有收藏内容</p>
        <p class="empty-hint">在历史记录中点击 ☆ 可收藏</p>
      </div>

      <div v-else>
        <!-- 筛选栏 -->
        <div class="filter-bar">
          <div class="filter-row">
            <input
              v-model="fSearch"
              type="text"
              class="filter-input"
              placeholder="搜索关键词..."
            />
            <select v-model="fTypeFilter" class="filter-select">
              <option value="">全部类型</option>
              <option v-for="t in favoriteTypes" :key="t" :value="t">{{ t }}</option>
            </select>
            <button
              v-if="fSearch || fTypeFilter"
              class="filter-reset"
              @click="resetFavoriteFilter"
              title="清除筛选"
            >✕</button>
          </div>
          <div v-if="fSearch || fTypeFilter" class="filter-result-hint">
            筛选结果：{{ filteredFavorites.length }} 条
          </div>
        </div>

        <div class="panel-header">
          <button @click="clearAllFavorites" :class="['btn', confirmId === 'clear-favorites-all' ? 'btn-danger-confirm' : 'btn-danger']">
            {{ confirmId === 'clear-favorites-all' ? '⚠️ 确认清空？' : '🗑️ 清空所有' }}
          </button>
          <span class="page-info" v-if="filteredFavorites.length">
            {{ (favoritePage - 1) * favoritePageSize + 1 }}-{{ Math.min(favoritePage * favoritePageSize, filteredFavorites.length) }} / {{ filteredFavorites.length }}
          </span>
        </div>

        <div v-if="filteredFavorites.length === 0" class="empty-state small">
          <p>没有匹配的收藏</p>
        </div>

        <div v-else class="list">
          <div v-for="item in pagedFavorites" :key="item.id" class="list-item">
            <div class="item-content">
              <div class="item-name">{{ item.name }}</div>
              <div class="item-value">{{ truncateText(item.value, 60) }}</div>
              <div class="item-type">{{ item.type }}</div>
            </div>
            <div class="item-actions">
              <button @click="copyToClipboard(item.value)" class="btn-action" title="复制">📋</button>
              <button
                @click="removeFavorite(item.id)"
                :class="['btn-action', 'btn-delete', { 'confirm-delete': confirmId === `delete-favorite-${item.id}` }]"
                :title="confirmId === `delete-favorite-${item.id}` ? '再点一次确认删除' : '删除'"
              >{{ confirmId === `delete-favorite-${item.id}` ? '❗' : '🗑️' }}</button>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="filteredFavorites.length > 0" class="pagination-bar">
          <div class="page-size-control">
            <label>每页</label>
            <select v-model.number="favoritePageSize" class="page-size-select">
              <option v-for="s in pageSizeOptions" :key="s" :value="s">{{ s }}</option>
            </select>
            <label>条</label>
          </div>
          <div v-if="favoriteTotalPages > 1" class="pagination">
            <button class="page-btn" :disabled="favoritePage === 1" @click="setFavoritePage(1)">«</button>
            <button class="page-btn" :disabled="favoritePage === 1" @click="setFavoritePage(favoritePage - 1)">‹</button>
            <template v-for="p in favoriteTotalPages" :key="p">
              <button
                v-if="p === 1 || p === favoriteTotalPages || (p >= favoritePage - 1 && p <= favoritePage + 1)"
                :class="['page-btn', { active: p === favoritePage }]"
                @click="setFavoritePage(p)"
              >{{ p }}</button>
              <span v-else-if="p === favoritePage - 2 || p === favoritePage + 2" class="page-dots">...</span>
            </template>
            <button class="page-btn" :disabled="favoritePage === favoriteTotalPages" @click="setFavoritePage(favoritePage + 1)">›</button>
            <button class="page-btn" :disabled="favoritePage === favoriteTotalPages" @click="setFavoritePage(favoriteTotalPages)">»</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.storage-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  margin: 0;
  color: #4ecdc4;
  font-size: 1.8em;
}

.description {
  margin: 0;
  color: #888;
  font-size: 0.95rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tab-btn {
  flex: 1;
  padding: 0.7rem 1.2rem;
  border: 2px solid #b3e5fc;
  background-color: white;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  color: #555;
  min-width: 150px;
}

.tab-btn:hover {
  border-color: #4ecdc4;
  color: #4ecdc4;
}

.tab-btn.active {
  background-color: #4ecdc4;
  color: white;
  border-color: #4ecdc4;
  box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
}

.panel-content {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 筛选栏 */
.filter-bar {
  margin-bottom: 1rem;
}

.filter-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.filter-input {
  flex: 1;
  min-width: 0;
  padding: 0.55rem 0.75rem;
  border: 1.5px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.filter-input:focus {
  border-color: #4ecdc4;
}

.filter-select {
  padding: 0.55rem 0.5rem;
  border: 1.5px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  outline: none;
  background: white;
  cursor: pointer;
  min-width: 120px;
  transition: border-color 0.2s;
}

.filter-select:focus {
  border-color: #4ecdc4;
}

.filter-reset {
  width: 34px;
  height: 34px;
  border: 1.5px solid #ddd;
  border-radius: 6px;
  background: white;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  transition: all 0.2s;
  flex-shrink: 0;
}

.filter-reset:hover {
  border-color: #ff6b6b;
  color: #ff6b6b;
  background-color: #ffe5e5;
}

.filter-result-hint {
  margin-top: 0.4rem;
  font-size: 0.8rem;
  color: #4ecdc4;
  font-weight: 500;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  background: linear-gradient(135deg, #f0f9ff, #f5f5f5);
  border: 2px dashed #b3e5fc;
  border-radius: 10px;
}

.empty-state.small {
  padding: 1.5rem 1rem;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state p {
  color: #999;
  margin: 0;
  font-size: 1rem;
}

.empty-hint {
  margin-top: 0.5rem !important;
  font-size: 0.85rem !important;
  color: #bbb !important;
}

/* 头部 */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.page-info {
  font-size: 0.85rem;
  color: #999;
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

.btn-danger {
  background-color: #ff6b6b;
  color: white;
}

.btn-danger:hover {
  background-color: #ff5252;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

.btn-danger-confirm {
  background-color: #ff5252;
  color: white;
  animation: pulse 0.5s ease-in-out;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* 列表 */
.list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.3s;
}

.list-item:hover {
  border-color: #4ecdc4;
  box-shadow: 0 2px 8px rgba(78, 205, 196, 0.15);
}

.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  overflow: hidden;
}

.item-type,
.item-name {
  font-weight: 600;
  color: #4ecdc4;
  font-size: 0.9rem;
}

.item-value {
  color: #333;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  max-height: 2.4em;
}

.item-time {
  color: #999;
  font-size: 0.8rem;
}

.item-actions {
  display: flex;
  gap: 0.5rem;
  margin-left: 1rem;
  flex-shrink: 0;
}

.btn-action {
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid #ddd;
  background-color: white;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-action:hover {
  border-color: #4ecdc4;
  background-color: #f0f9ff;
}

.btn-action.btn-delete:hover {
  border-color: #ff6b6b;
  background-color: #ffe5e5;
}

.btn-action.btn-delete.confirm-delete {
  border-color: #ff6b6b;
  background-color: #ffe5e5;
  animation: pulse 0.5s ease-in-out;
}

.btn-action.btn-star {
  font-size: 1.2rem;
  color: #ccc;
}

.btn-action.btn-star:hover {
  border-color: #ffa502;
  background-color: #fff8e5;
  color: #ffa502;
}

.btn-action.btn-star.is-favorited {
  color: #ffa502;
  border-color: #ffa502;
  background-color: #fff8e5;
}

/* 分页栏 */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1.25rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.page-size-control {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: #888;
}

.page-size-select {
  padding: 0.3rem 0.35rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.85rem;
  outline: none;
  background: white;
  cursor: pointer;
}

.page-size-select:focus {
  border-color: #4ecdc4;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 0.5rem;
  border: 1px solid #ddd;
  background-color: white;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-btn:hover:not(:disabled) {
  border-color: #4ecdc4;
  color: #4ecdc4;
}

.page-btn.active {
  background-color: #4ecdc4;
  color: white;
  border-color: #4ecdc4;
  font-weight: 600;
}

.page-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.page-dots {
  padding: 0 0.25rem;
  color: #999;
  font-size: 0.85rem;
}

/* 响应式 */
@media (max-width: 768px) {
  .tab-btn {
    min-width: auto;
    flex: 1;
  }

  .filter-row {
    flex-wrap: wrap;
  }

  .filter-input {
    flex: 1 1 100%;
  }

  .filter-select {
    flex: 1;
    min-width: 0;
  }

  .list-item {
    flex-wrap: wrap;
  }

  .item-actions {
    margin-left: 0;
    margin-top: 0.75rem;
    width: 100%;
    justify-content: flex-end;
  }

  .item-value {
    max-width: 100%;
  }

  .panel-header {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .pagination-bar {
    justify-content: center;
  }
}

/* ========== Dark mode ========== */
:global([data-theme='dark']) .storage-panel h2 {
  color: #6edddd;
}

:global([data-theme='dark']) .description {
  color: #a0a0a0;
}

:global([data-theme='dark']) .tab-btn {
  border-color: #446677;
  background-color: #2a2a3e;
  color: #a0a0a0;
}

:global([data-theme='dark']) .tab-btn:hover {
  border-color: #6edddd;
  color: #6edddd;
}

:global([data-theme='dark']) .tab-btn.active {
  background-color: #4ecdc4;
  color: white;
}

:global([data-theme='dark']) .filter-input,
:global([data-theme='dark']) .filter-select {
  background-color: #2a2a3e;
  border-color: #444;
  color: #e0e0e0;
}

:global([data-theme='dark']) .filter-input:focus,
:global([data-theme='dark']) .filter-select:focus {
  border-color: #6edddd;
}

:global([data-theme='dark']) .filter-input::placeholder {
  color: #666;
}

:global([data-theme='dark']) .filter-reset {
  background-color: #2a2a3e;
  border-color: #444;
  color: #888;
}

:global([data-theme='dark']) .filter-reset:hover {
  border-color: #ff6b6b;
  color: #ff6b6b;
  background-color: #3a2a2a;
}

:global([data-theme='dark']) .filter-result-hint {
  color: #6edddd;
}

:global([data-theme='dark']) .empty-state {
  background: linear-gradient(135deg, #2a3a4a, #2a2a3e);
  border-color: #446677;
}

:global([data-theme='dark']) .empty-state p {
  color: #707070;
}

:global([data-theme='dark']) .list-item {
  background: #2a2a3e;
  border-color: #444;
}

:global([data-theme='dark']) .list-item:hover {
  border-color: #6edddd;
  box-shadow: 0 2px 8px rgba(110, 221, 221, 0.2);
}

:global([data-theme='dark']) .item-value {
  color: #e0e0e0;
}

:global([data-theme='dark']) .item-time {
  color: #a0a0a0;
}

:global([data-theme='dark']) .page-info,
:global([data-theme='dark']) .page-size-control {
  color: #a0a0a0;
}

:global([data-theme='dark']) .page-size-select {
  background-color: #2a2a3e;
  border-color: #444;
  color: #e0e0e0;
}

:global([data-theme='dark']) .page-size-select:focus {
  border-color: #6edddd;
}

:global([data-theme='dark']) .btn-action {
  border-color: #444;
  background-color: #333;
}

:global([data-theme='dark']) .btn-action:hover {
  border-color: #6edddd;
  background-color: #3a3a4e;
}

:global([data-theme='dark']) .btn-action.btn-delete:hover,
:global([data-theme='dark']) .btn-action.btn-delete.confirm-delete {
  border-color: #ff6b6b;
  background-color: #3a2a2a;
}

:global([data-theme='dark']) .btn-action.btn-star {
  color: #666;
}

:global([data-theme='dark']) .btn-action.btn-star:hover {
  border-color: #ffa502;
  background-color: #3a3520;
  color: #ffa502;
}

:global([data-theme='dark']) .btn-action.btn-star.is-favorited {
  color: #ffa502;
  border-color: #ffa502;
  background-color: #3a3520;
}

:global([data-theme='dark']) .page-btn {
  border-color: #444;
  background-color: #2a2a3e;
  color: #a0a0a0;
}

:global([data-theme='dark']) .page-btn:hover:not(:disabled) {
  border-color: #6edddd;
  color: #6edddd;
}

:global([data-theme='dark']) .page-btn.active {
  background-color: #4ecdc4;
  color: white;
  border-color: #4ecdc4;
}

:global([data-theme='dark']) .page-btn:disabled {
  opacity: 0.25;
}

:global([data-theme='dark']) .page-dots {
  color: #666;
}
</style>
