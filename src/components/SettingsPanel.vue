<script setup>
import { ref, onMounted, defineProps } from 'vue'
import { useTheme } from '../composables/useTheme'
import { useConfig } from '../composables/useConfig'

const props = defineProps({
  toolCount: { type: Number, default: 0 }
})

const { theme, toggleTheme, isDark } = useTheme()
const { downloadConfig, importConfig, clearAllData, getDataStats } = useConfig()

const stats = ref({ configSize: 0, historyCount: 0, favoritesCount: 0, totalSize: 0 })
const importStatus = ref('')
const showClearConfirm = ref(false)

onMounted(() => {
  updateStats()
})

const updateStats = () => {
  stats.value = getDataStats()
}

const handleImport = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    importStatus.value = '导入中...'
    await importConfig(file)
    importStatus.value = '✅ 导入成功！页面将刷新...'
    setTimeout(() => {
      window.location.reload()
    }, 1500)
  } catch (err) {
    importStatus.value = '❌ ' + err.message
    setTimeout(() => {
      importStatus.value = ''
    }, 3000)
  }

  // 重置文件输入
  event.target.value = ''
}

const handleClearAllData = () => {
  if (confirm('确定要清空所有数据吗？此操作无法撤销！\n\n将清空：\n- 历史记录\n- 收藏夹\n- 主题设置\n- 其他配置')) {
    clearAllData()
    importStatus.value = '✅ 已清空所有数据'
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }
}

const formatSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const getStoragePercent = () => {
  const maxSize = 5 * 1024 * 1024 // 5MB 作为参考
  return Math.min(100, (stats.value.totalSize / maxSize) * 100)
}
</script>

<template>
  <div class="settings-panel">
    <h2>⚙️ 设置与管理</h2>
    <p class="description">自定义应用设置、管理数据和主题</p>

    <!-- 主题设置 -->
    <div class="setting-section">
      <div class="section-title">主题设置</div>
      <div class="theme-setting">
        <div class="theme-info">
          <div class="theme-label">当前主题</div>
          <div class="theme-value">{{ isDark ? '🌙 深色模式' : '☀️ 亮色模式' }}</div>
        </div>
        <button @click="toggleTheme" class="btn btn-theme">
          {{ isDark ? '切换为亮色' : '切换为深色' }}
        </button>
      </div>
    </div>

    <!-- 数据统计 -->
    <div class="setting-section">
      <div class="section-title">数据统计</div>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-icon">📚</div>
          <div class="stat-content">
            <div class="stat-label">历史记录</div>
            <div class="stat-value">{{ stats.historyCount }} 条</div>
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-icon">⭐</div>
          <div class="stat-content">
            <div class="stat-label">收藏夹</div>
            <div class="stat-value">{{ stats.favoritesCount }} 项</div>
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-icon">💾</div>
          <div class="stat-content">
            <div class="stat-label">总大小</div>
            <div class="stat-value">{{ formatSize(stats.totalSize) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 数据备份 -->
    <div class="setting-section">
      <div class="section-title">数据备份与恢复</div>
      <div class="backup-actions">
        <button @click="downloadConfig" class="btn btn-primary">
          ⬇️ 导出配置
        </button>
        <label class="btn btn-primary">
          <input
            type="file"
            accept=".json"
            @change="handleImport"
            style="display: none"
          />
          ⬆️ 导入配置
        </label>
      </div>

      <div v-if="importStatus" :class="['import-status', { error: importStatus.includes('❌') }]">
        {{ importStatus }}
      </div>

      <div class="backup-info">
        <div class="info-icon">ℹ️</div>
        <div class="info-text">
          <p>导出配置将保存所有数据，包括：</p>
          <ul>
            <li>历史记录</li>
            <li>收藏夹</li>
            <li>主题设置</li>
            <li>应用配置</li>
          </ul>
          <p>导入时会覆盖现有数据，请谨慎操作。</p>
        </div>
      </div>
    </div>

    <!-- 存储空间 -->
    <div class="setting-section">
      <div class="section-title">存储空间</div>
      <div class="storage-info">
        <div class="storage-bar">
          <div class="storage-used" :style="{ width: getStoragePercent() + '%' }"></div>
        </div>
        <div class="storage-text">
          已使用 {{ formatSize(stats.totalSize) }} （基于浏览器本地存储）
        </div>
      </div>
    </div>

    <!-- 数据清理 -->
    <div class="setting-section danger-zone">
      <div class="section-title">危险操作区</div>
      <div class="danger-actions">
        <button @click="handleClearAllData" class="btn btn-danger">
          🗑️ 清空所有数据
        </button>
      </div>
      <div class="danger-warning">
        <div class="warning-icon">⚠️</div>
        <div class="warning-text">
          此操作将删除所有历史记录、收藏和设置，且无法恢复。请先导出配置作为备份。
        </div>
      </div>
    </div>

    <!-- 关于应用 -->
    <div class="setting-section about">
      <div class="section-title">关于</div>
      <div class="about-info">
        <div class="about-item">
          <span class="label">应用名称：</span>
          <span class="value">工具箱</span>
        </div>
        <div class="about-item">
          <span class="label">版本：</span>
          <span class="value">1.0.0</span>
        </div>
        <div class="about-item">
          <span class="label">工具数量：</span>
          <span class="value">{{ props.toolCount }} 个</span>
        </div>
        <div class="about-item">
          <span class="label">构建技术：</span>
          <span class="value">Vue 3 + Vite</span>
        </div>
        <div class="about-item">
          <span class="label">存储方式：</span>
          <span class="value">本地浏览器存储（完全隐私）</span>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.settings-panel {
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

.setting-section {
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 1.5rem;
  transition: all 0.3s;
}

.setting-section:hover {
  border-color: #4ecdc4;
  box-shadow: 0 2px 8px rgba(78, 205, 196, 0.1);
}

.section-title {
  font-weight: 700;
  font-size: 1.1rem;
  color: #333;
  margin-bottom: 1.2rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e0e0e0;
}

.theme-setting {
  display: flex;
  align-items: center;
  gap: 2rem;
  justify-content: space-between;
}

.theme-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.theme-label {
  font-size: 0.9rem;
  color: #666;
  font-weight: 600;
}

.theme-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: #4ecdc4;
}

.btn {
  padding: 0.7rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-theme {
  background-color: #4ecdc4;
  color: white;
  white-space: nowrap;
}

.btn-theme:hover {
  background-color: #3ab9b0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
}

.btn-primary {
  background-color: #4ecdc4;
  color: white;
}

.btn-primary:hover {
  background-color: #3ab9b0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.stat-item {
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  transition: all 0.3s;
}

.stat-item:hover {
  border-color: #4ecdc4;
  box-shadow: 0 2px 8px rgba(78, 205, 196, 0.1);
}

.stat-icon {
  font-size: 1.8rem;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.stat-label {
  font-size: 0.85rem;
  color: #666;
}

.stat-value {
  font-size: 1.3rem;
  font-weight: 700;
  color: #333;
}

.backup-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.import-status {
  padding: 0.75rem;
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-weight: 600;
}

.import-status.error {
  background-color: #f8d7da;
  color: #721c24;
  border-color: #f5c6cb;
}

.backup-info {
  background: #f0f9ff;
  border: 1px solid #b3e5fc;
  border-radius: 6px;
  padding: 1rem;
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.info-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.info-text {
  font-size: 0.9rem;
  color: #555;
  line-height: 1.6;
}

.info-text p {
  margin: 0.5rem 0;
}

.info-text ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.info-text li {
  margin: 0.3rem 0;
}

.storage-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.storage-bar {
  width: 100%;
  height: 20px;
  background-color: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
}

.storage-used {
  height: 100%;
  background: linear-gradient(90deg, #4ecdc4, #45b9b0);
  transition: width 0.3s;
}

.storage-text {
  font-size: 0.9rem;
  color: #666;
}

.danger-zone {
  border-color: #ff6b6b;
  background: #fff5f5;
}

.danger-zone .section-title {
  color: #ff6b6b;
  border-bottom-color: #ffe5e5;
}

.danger-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.danger-warning {
  background: #ffe5e5;
  border: 1px solid #ffcccc;
  border-radius: 6px;
  padding: 1rem;
  display: flex;
  gap: 1rem;
}

.warning-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.warning-text {
  font-size: 0.9rem;
  color: #c33;
  line-height: 1.6;
}

.about {
  background: linear-gradient(135deg, #f0f9ff, #f5f5f5);
  border-color: #b3e5fc;
}

.about-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.about-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  font-size: 0.95rem;
}

.about-item .label {
  font-weight: 600;
  color: #333;
}

.about-item .value {
  color: #4ecdc4;
  font-weight: 500;
}

@media (max-width: 768px) {
  .theme-setting {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .theme-info {
    order: 2;
  }

  .btn {
    width: 100%;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .backup-actions {
    flex-direction: column;
  }

  .about-info {
    grid-template-columns: 1fr;
  }
}

/* 深色模式样式 */
:global([data-theme='dark'] h2) {
  color: #6edddd;
}

:global([data-theme='dark'] .description) {
  color: #a0c0e0;
}

:global([data-theme='dark'] .setting-section) {
  background: #2a3a4a;
  border-color: #445566;
}

:global([data-theme='dark'] .section-title) {
  color: #e0e0e0;
  border-bottom-color: #445566;
}

:global([data-theme='dark'] .theme-label),
:global([data-theme='dark'] .stat-label) {
  color: #a0c0e0;
}

:global([data-theme='dark'] .theme-value),
:global([data-theme='dark'] .stat-value) {
  color: #4ecdc4;
}

:global([data-theme='dark'] .stat-item),
:global([data-theme='dark'] .about-item) {
  background: #1a2a3a;
  border-color: #445566;
}

:global([data-theme='dark'] .about-item) .label {
  color: #a0c0e0;
}

:global([data-theme='dark'] .about-item) .value {
  color: #4ecdc4;
}

:global([data-theme='dark'] .storage-bar) {
  background-color: #445566;
}

:global([data-theme='dark'] .storage-text) {
  color: #a0c0e0;
}

:global([data-theme='dark'] .backup-info) {
  background: #1a2a3a;
  border-color: #3a5a7a;
}

:global([data-theme='dark'] .info-text) {
  color: #a0c0e0;
}

:global([data-theme='dark'] .import-status) {
  background-color: #1a3a2a;
  color: #5ec89f;
  border-color: #2a5a3a;
}

:global([data-theme='dark'] .import-status.error) {
  background-color: #3a1a1a;
  color: #ff8fa3;
  border-color: #5a2a2a;
}

:global([data-theme='dark'] .danger-zone) {
  border-color: #ff6b6b;
  background: #2a1a1a;
}

:global([data-theme='dark'] .danger-zone) .section-title {
  color: #ff8fa3;
  border-bottom-color: #4a2a2a;
}

:global([data-theme='dark'] .danger-warning) {
  background: #4a2a2a;
  border-color: #8a4a4a;
}

:global([data-theme='dark'] .warning-text) {
  color: #ff8fa3;
}

:global([data-theme='dark'] .about) {
  background: linear-gradient(135deg, #1a2a3a, #2a3a4a);
  border-color: #3a5a7a;
}
</style>
