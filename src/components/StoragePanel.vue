<script setup>
import { ref, computed } from 'vue'
import { useHistory, useFavorites } from '../composables/useStorage'

const activePanel = ref('history')
const history = useHistory()
const favorites = useFavorites()

const historyList = computed(() => history.getHistory())
const favoriteList = computed(() => favorites.getFavorites())

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    alert('已复制！')
  } catch (err) {
    alert('复制失败')
  }
}

const formatTime = (date) => {
  if (typeof date === 'string') {
    date = new Date(date)
  }
  const now = new Date()
  const diff = now - date

  if (diff < 60000) {
    return '刚刚'
  } else if (diff < 3600000) {
    return Math.floor(diff / 60000) + '分钟前'
  } else if (diff < 86400000) {
    return Math.floor(diff / 3600000) + '小时前'
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

const deleteHistoryItem = (id) => {
  if (confirm('确定删除这条记录吗？')) {
    history.deleteHistoryItem(id)
  }
}

const clearAllHistory = () => {
  if (confirm('确定清空所有历史记录吗？')) {
    history.clearHistory()
  }
}

const removeFavorite = (id) => {
  if (confirm('确定删除这个收藏吗？')) {
    favorites.removeFavorite(id)
  }
}

const clearAllFavorites = () => {
  if (confirm('确定清空所有收藏吗？')) {
    favorites.clearFavorites()
  }
}

const truncateText = (text, length = 50) => {
  return text.length > length ? text.substring(0, length) + '...' : text
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

    <!-- 历史记录 -->
    <div v-show="activePanel === 'history'" class="panel-content">
      <div v-if="historyList.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <p>还没有历史记录</p>
      </div>

      <div v-else>
        <button @click="clearAllHistory" class="btn btn-danger">🗑️ 清空所有</button>

        <div class="list">
          <div v-for="item in historyList" :key="item.id" class="list-item">
            <div class="item-content">
              <div class="item-type">{{ item.type }}</div>
              <div class="item-value">{{ truncateText(item.value, 40) }}</div>
              <div class="item-time">{{ formatTime(item.timestamp) }}</div>
            </div>
            <div class="item-actions">
              <button
                @click="copyToClipboard(item.value)"
                class="btn-action"
                title="复制"
              >
                📋
              </button>
              <button
                @click="deleteHistoryItem(item.id)"
                class="btn-action btn-delete"
                title="删除"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 收藏夹 -->
    <div v-show="activePanel === 'favorites'" class="panel-content">
      <div v-if="favoriteList.length === 0" class="empty-state">
        <div class="empty-icon">⭐</div>
        <p>还没有收藏内容</p>
      </div>

      <div v-else>
        <button @click="clearAllFavorites" class="btn btn-danger">🗑️ 清空所有</button>

        <div class="list">
          <div v-for="item in favoriteList" :key="item.id" class="list-item">
            <div class="item-content">
              <div class="item-name">{{ item.name }}</div>
              <div class="item-value">{{ truncateText(item.value, 40) }}</div>
              <div class="item-type">{{ item.type }}</div>
            </div>
            <div class="item-actions">
              <button
                @click="copyToClipboard(item.value)"
                class="btn-action"
                title="复制"
              >
                📋
              </button>
              <button
                @click="removeFavorite(item.id)"
                class="btn-action btn-delete"
                title="删除"
              >
                🗑️
              </button>
            </div>
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
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  background: linear-gradient(135deg, #f0f9ff, #f5f5f5);
  border: 2px dashed #b3e5fc;
  border-radius: 10px;
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

.btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 1rem;
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

@media (max-width: 768px) {
  .tab-btn {
    min-width: auto;
    flex: 1;
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
}

:global([data-theme='dark'] h2) {
  color: #6edddd;
}

:global([data-theme='dark'] .description) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .tab-btn) {
  border-color: #446677;
  background-color: #2a2a3e;
  color: #a0a0a0;
}

:global([data-theme='dark'] .tab-btn:hover) {
  border-color: #6edddd;
  color: #6edddd;
}

:global([data-theme='dark'] .tab-btn.active) {
  background-color: #4ecdc4;
  color: white;
}

:global([data-theme='dark'] .empty-state) {
  background: linear-gradient(135deg, #2a3a4a, #2a2a3e);
  border-color: #446677;
}

:global([data-theme='dark'] .empty-state p) {
  color: #707070;
}

:global([data-theme='dark'] .list-item) {
  background: #2a2a3e;
  border-color: #444;
}

:global([data-theme='dark'] .list-item:hover) {
  border-color: #6edddd;
  box-shadow: 0 2px 8px rgba(110, 221, 221, 0.2);
}

:global([data-theme='dark'] .item-value) {
  color: #e0e0e0;
}

:global([data-theme='dark'] .item-time) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .btn-action) {
  border-color: #444;
  background-color: #333;
}

:global([data-theme='dark'] .btn-action:hover) {
  border-color: #6edddd;
  background-color: #333;
}

:global([data-theme='dark'] .btn-action.btn-delete:hover) {
  border-color: #ff6b6b;
  background-color: #3a2a2a;
}
</style>
