<script setup>
import { defineProps, onMounted, ref } from 'vue'
import { useConfig } from '../composables/useConfig'
import { useTheme } from '../composables/useTheme'

const props = defineProps({
  toolCount: { type: Number, default: 0 },
})

const { toggleTheme, isDark } = useTheme()
const { clearAllData, downloadConfig, getDataStats, importConfig } = useConfig()

const stats = ref({
  configSize: 0,
  historyCount: 0,
  favoritesCount: 0,
  notesCount: 0,
  lotteryRecordCount: 0,
  totalSize: 0,
})
const importStatus = ref('')

const statCards = [
  { key: 'history', icon: '📎', label: '历史记录', valueKey: 'historyCount', suffix: '条' },
  { key: 'favorites', icon: '⭐', label: '收藏夹', valueKey: 'favoritesCount', suffix: '项' },
  { key: 'notes', icon: '📝', label: '笔记与待办', valueKey: 'notesCount', suffix: '条' },
  { key: 'lotteryRecords', icon: '🎯', label: '抽奖记录', valueKey: 'lotteryRecordCount', suffix: '条' },
]

const refreshStats = () => {
  stats.value = getDataStats()
}

const formatSize = (bytes) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB']
  const base = 1024
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(base)))
  return `${Math.round((bytes / base ** index) * 100) / 100} ${units[index]}`
}

const getStoragePercent = () => {
  const maxStorageSize = 5 * 1024 * 1024
  return Math.min(100, (stats.value.totalSize / maxStorageSize) * 100)
}

const handleImport = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    importStatus.value = '导入中...'
    await importConfig(file)
    importStatus.value = '✅ 导入成功，页面将刷新...'
    setTimeout(() => window.location.reload(), 1500)
  } catch (error) {
    importStatus.value = `❌ ${error.message}`
    setTimeout(() => {
      importStatus.value = ''
    }, 3000)
  }

  event.target.value = ''
}

const handleClearAllData = () => {
  const confirmed = confirm(
    '确定要清空所有数据吗？此操作无法撤销！\n\n将清空：\n- 历史记录与收藏\n- 工具最近使用与工具收藏\n- 笔记与抽奖记录\n- 主题与其他本地配置',
  )
  if (!confirmed) return

  clearAllData()
  importStatus.value = '✅ 已清空所有浏览器本地数据'
  setTimeout(() => window.location.reload(), 1000)
}

onMounted(() => {
  refreshStats()
})
</script>

<template>
  <div class="settings-panel">
    <h2>⚙️ 设置与管理</h2>
    <p class="description">管理主题、本地数据、导入导出与存储占用。</p>

    <section class="setting-section">
      <div class="section-title">主题设置</div>
      <div class="theme-setting">
        <div class="theme-info">
          <div class="theme-label">当前主题</div>
          <div class="theme-value">{{ isDark ? '深色模式' : '浅色模式' }}</div>
        </div>
        <button class="btn btn-theme" @click="toggleTheme">
          {{ isDark ? '切换为浅色' : '切换为深色' }}
        </button>
      </div>
    </section>

    <section class="setting-section">
      <div class="section-title">数据统计</div>
      <div class="stats-grid">
        <div
          v-for="card in statCards"
          :key="card.key"
          class="stat-item"
          :data-stat-key="card.key"
        >
          <div class="stat-icon">{{ card.icon }}</div>
          <div class="stat-content">
            <div class="stat-label">{{ card.label }}</div>
            <div class="stat-value">{{ stats[card.valueKey] }} {{ card.suffix }}</div>
          </div>
        </div>
        <div class="stat-item" data-stat-key="totalSize">
          <div class="stat-icon">💾</div>
          <div class="stat-content">
            <div class="stat-label">总大小</div>
            <div class="stat-value">{{ formatSize(stats.totalSize) }}</div>
          </div>
        </div>
      </div>
    </section>

    <section class="setting-section">
      <div class="section-title">数据备份与恢复</div>
      <div class="backup-actions">
        <button class="btn btn-primary" @click="downloadConfig">⬇️ 导出配置</button>
        <label class="btn btn-primary">
          <input type="file" accept=".json" style="display: none" @change="handleImport" />
          ⬆️ 导入配置
        </label>
      </div>

      <div v-if="importStatus" :class="['import-status', { error: importStatus.startsWith('❌') }]">
        {{ importStatus }}
      </div>

      <div class="backup-info">
        <div class="info-icon">ℹ️</div>
        <div class="info-text">
          <p>导出配置会保存所有浏览器本地数据，包括：</p>
          <ul>
            <li>历史记录</li>
            <li>收藏夹</li>
            <li>主题设置</li>
            <li>应用配置</li>
            <li>工具最近使用与工具收藏</li>
            <li>笔记与抽奖记录</li>
          </ul>
          <p>导入时会覆盖现有数据，请谨慎操作。</p>
        </div>
      </div>
    </section>

    <section class="setting-section">
      <div class="section-title">存储空间</div>
      <div class="storage-info">
        <div class="storage-bar">
          <div class="storage-used" :style="{ width: `${getStoragePercent()}%` }"></div>
        </div>
        <div class="storage-text">已使用 {{ formatSize(stats.totalSize) }}（基于浏览器本地存储）</div>
      </div>
    </section>

    <section class="setting-section danger-zone">
      <div class="section-title">危险操作区</div>
      <div class="danger-actions">
        <button class="btn btn-danger" @click="handleClearAllData">🗑️ 清空所有数据</button>
      </div>
      <div class="danger-warning">
        <div class="warning-icon">⚠️</div>
        <div class="warning-text">
          此操作将删除历史记录、收藏、工具状态、笔记、抽奖记录和主题设置，且无法恢复。请先导出配置作为备份。
        </div>
      </div>
    </section>

    <section class="setting-section about">
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
          <span class="value">浏览器本地存储</span>
        </div>
      </div>
    </section>
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
  color: #6b7280;
}

.setting-section {
  border: 1px solid #d8e4ec;
  border-radius: 12px;
  padding: 1.5rem;
  background: #f8fbfd;
}

.section-title {
  font-weight: 700;
  margin-bottom: 1rem;
  color: #1f2937;
}

.theme-setting,
.backup-actions,
.danger-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}

.theme-value,
.stat-value,
.value {
  font-weight: 700;
  color: #111827;
}

.stats-grid,
.about-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.stat-item,
.about-item {
  background: #fff;
  border: 1px solid #d8e4ec;
  border-radius: 10px;
  padding: 1rem;
}

.stat-icon {
  font-size: 1.4rem;
  margin-bottom: 0.5rem;
}

.stat-label,
.label,
.storage-text,
.info-text,
.warning-text {
  color: #4b5563;
}

.btn {
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.25rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary,
.btn-theme {
  background: #4ecdc4;
  color: #fff;
}

.btn-danger {
  background: #ff6b6b;
  color: #fff;
}

.backup-info,
.danger-warning {
  margin-top: 1rem;
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-radius: 10px;
}

.backup-info {
  background: #eef8ff;
  border: 1px solid #b7ddff;
}

.danger-zone {
  border-color: #ffc7c7;
  background: #fff6f6;
}

.danger-warning {
  background: #ffe8e8;
  border: 1px solid #ffc7c7;
}

.storage-bar {
  height: 16px;
  background: #d8e4ec;
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.storage-used {
  height: 100%;
  background: linear-gradient(90deg, #4ecdc4, #5b8def);
}

.import-status {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: #e8f7ec;
  color: #166534;
}

.import-status.error {
  background: #ffe8e8;
  color: #b91c1c;
}

ul {
  margin: 0.75rem 0;
  padding-left: 1.25rem;
}

@media (max-width: 768px) {
  .theme-setting,
  .backup-actions,
  .danger-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .btn {
    width: 100%;
  }
}

:global([data-theme='dark']) .setting-section {
  background: #243240;
  border-color: #41576b;
}

:global([data-theme='dark']) .stat-item,
:global([data-theme='dark']) .about-item {
  background: #1b2733;
  border-color: #41576b;
}

:global([data-theme='dark']) .description,
:global([data-theme='dark']) .stat-label,
:global([data-theme='dark']) .label,
:global([data-theme='dark']) .storage-text,
:global([data-theme='dark']) .info-text,
:global([data-theme='dark']) .warning-text {
  color: #b7c7d6;
}

:global([data-theme='dark']) .theme-value,
:global([data-theme='dark']) .stat-value,
:global([data-theme='dark']) .value,
:global([data-theme='dark']) .section-title,
:global([data-theme='dark']) h2 {
  color: #f3f7fb;
}

:global([data-theme='dark']) .backup-info {
  background: #193041;
  border-color: #2f526d;
}

:global([data-theme='dark']) .danger-zone,
:global([data-theme='dark']) .danger-warning,
:global([data-theme='dark']) .import-status.error {
  background: #3a2020;
  border-color: #7f3b3b;
}

:global([data-theme='dark']) .import-status {
  background: #163524;
  color: #a7f3d0;
}

:global([data-theme='dark']) .storage-bar {
  background: #41576b;
}
</style>
