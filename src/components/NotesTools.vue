<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useLocalStorage } from '../composables/useStorage'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()
const storage = useLocalStorage('toolbox_notes', [])

const notes = ref(storage.getValue())
const newNoteTitle = ref('')
const newNoteContent = ref('')
const newNoteTags = ref([])
const newNotePriority = ref('normal')
const editingId = ref(null)
const editTitle = ref('')
const editContent = ref('')
const editTags = ref([])
const editPriority = ref('normal')
const activeTab = ref('all')
const searchQuery = ref('')
const filterTag = ref('')
const confirmDeleteId = ref(null)
let confirmTimer = null

const availableTags = ['工作', '学习', '生活', '重要', '待办']

onMounted(() => {
  notes.value = storage.getValue()
})

onUnmounted(() => {
  if (confirmTimer) {
    clearTimeout(confirmTimer)
    confirmTimer = null
  }
})

const filteredNotes = computed(() => {
  let filtered = notes.value

  // 按标签过滤
  if (activeTab.value === 'todo') {
    filtered = filtered.filter(n => n.isTodo)
  } else if (activeTab.value === 'note') {
    filtered = filtered.filter(n => !n.isTodo)
  }

  // 按标签筛选
  if (filterTag.value) {
    filtered = filtered.filter(n => n.tags && n.tags.includes(filterTag.value))
  }

  // 按搜索查询过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(n =>
      n.title.toLowerCase().includes(query) ||
      n.content.toLowerCase().includes(query)
    )
  }

  return filtered.sort((a, b) => {
    // 按优先级排序：high > normal > low
    const priorityOrder = { high: 0, normal: 1, low: 2 }
    const pa = priorityOrder[a.priority || 'normal'] ?? 1
    const pb = priorityOrder[b.priority || 'normal'] ?? 1
    if (pa !== pb) return pa - pb
    const dateA = new Date(a.updatedAt || a.createdAt || 0)
    const dateB = new Date(b.updatedAt || b.createdAt || 0)
    return dateB - dateA
  })
})

const addNote = () => {
  if (!newNoteTitle.value.trim()) {
    showToast('请输入标题', 'info')
    return
  }

  const note = {
    id: Date.now(),
    title: newNoteTitle.value,
    content: newNoteContent.value,
    isTodo: false,
    completed: false,
    tags: [...newNoteTags.value],
    priority: newNotePriority.value,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  notes.value.unshift(note)
  storage.setValue(notes.value)
  addHistory('新建笔记', newNoteTitle.value)
  newNoteTitle.value = ''
  newNoteContent.value = ''
  newNoteTags.value = []
  newNotePriority.value = 'normal'
}

const addTodo = () => {
  if (!newNoteTitle.value.trim()) {
    showToast('请输入任务', 'info')
    return
  }

  const note = {
    id: Date.now(),
    title: newNoteTitle.value,
    content: newNoteContent.value,
    isTodo: true,
    completed: false,
    tags: [...newNoteTags.value],
    priority: newNotePriority.value,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  notes.value.unshift(note)
  storage.setValue(notes.value)
  addHistory('新建待办', newNoteTitle.value)
  newNoteTitle.value = ''
  newNoteContent.value = ''
  newNoteTags.value = []
  newNotePriority.value = 'normal'
}

const requestDelete = (id) => {
  if (confirmDeleteId.value === id) {
    // Second click: actually delete
    notes.value = notes.value.filter(n => n.id !== id)
    storage.setValue(notes.value)
    confirmDeleteId.value = null
    if (confirmTimer) clearTimeout(confirmTimer)
  } else {
    // First click: show confirmation
    confirmDeleteId.value = id
    if (confirmTimer) clearTimeout(confirmTimer)
    confirmTimer = setTimeout(() => {
      confirmDeleteId.value = null
    }, 3000)
  }
}

const startEdit = (note) => {
  editingId.value = note.id
  editTitle.value = note.title
  editContent.value = note.content
  editTags.value = [...(note.tags || [])]
  editPriority.value = note.priority || 'normal'
}

const saveEdit = () => {
  const note = notes.value.find(n => n.id === editingId.value)
  if (note) {
    note.title = editTitle.value
    note.content = editContent.value
    note.tags = [...editTags.value]
    note.priority = editPriority.value
    note.updatedAt = new Date()
    storage.setValue(notes.value)
    showToast('笔记已更新')
  }
  cancelEdit()
}

const cancelEdit = () => {
  editingId.value = null
  editTitle.value = ''
  editContent.value = ''
  editTags.value = []
  editPriority.value = 'normal'
}

const toggleCompleted = (id) => {
  const note = notes.value.find(n => n.id === id)
  if (note) {
    note.completed = !note.completed
    note.updatedAt = new Date()
    storage.setValue(notes.value)
  }
}

const toggleNewTag = (tag) => {
  const idx = newNoteTags.value.indexOf(tag)
  if (idx > -1) {
    newNoteTags.value.splice(idx, 1)
  } else {
    newNoteTags.value.push(tag)
  }
}

const toggleEditTag = (tag) => {
  const idx = editTags.value.indexOf(tag)
  if (idx > -1) {
    editTags.value.splice(idx, 1)
  } else {
    editTags.value.push(tag)
  }
}

const formatDate = (date) => {
  if (!date) return ''
  if (typeof date === 'string' || typeof date === 'number') date = new Date(date)
  if (!(date instanceof Date)) date = new Date(date)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const diff = now - date

  if (diff < 60000) {
    return '刚刚'
  } else if (diff < 3600000) {
    return Math.floor(diff / 60000) + '分钟前'
  } else if (diff < 86400000) {
    return Math.floor(diff / 3600000) + '小时前'
  } else if (diff < 604800000) {
    return Math.floor(diff / 86400000) + '天前'
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

const showExportMenu = ref(false)

const exportAsJson = () => {
  const data = JSON.stringify(notes.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'toolbox-notes.json'
  link.click()
  URL.revokeObjectURL(url)
  showExportMenu.value = false
  showToast('已导出为 JSON')
}

const exportAsMarkdown = () => {
  const priorityMap = { high: '高', normal: '普通', low: '低' }
  let md = '# 我的笔记\n\n'
  notes.value.forEach(note => {
    md += `## ${note.title}\n`
    if (note.tags && note.tags.length) md += `- 标签: ${note.tags.join(', ')}\n`
    md += `- 优先级: ${priorityMap[note.priority] || '普通'}\n`
    md += `- 创建时间: ${new Date(note.createdAt).toLocaleString('zh-CN')}\n`
    if (note.isTodo) md += `- 状态: ${note.completed ? '已完成' : '未完成'}\n`
    md += `\n${note.content}\n\n---\n\n`
  })
  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'toolbox-notes.md'
  link.click()
  URL.revokeObjectURL(url)
  showExportMenu.value = false
  showToast('已导出为 Markdown')
}

const copyContent = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    showToast('已复制')
  } catch (err) {
    showToast('复制失败', 'error')
  }
}

const clearAll = () => {
  confirmDeleteId.value = 'all'
  if (confirmTimer) clearTimeout(confirmTimer)
  confirmTimer = setTimeout(() => {
    confirmDeleteId.value = null
  }, 3000)
}

const confirmClearAll = () => {
  notes.value = []
  storage.setValue([])
  searchQuery.value = ''
  confirmDeleteId.value = null
}

const priorityColor = (priority) => {
  if (priority === 'high') return '#ff6b6b'
  if (priority === 'low') return '#999'
  return '#4caf50'
}
</script>

<template>
  <div class="notes-tools">
    <h2>📝 笔记 & TODO</h2>
    <p class="description">管理你的笔记和待办事项</p>

    <!-- 添加笔记/TODO -->
    <div class="add-section">
      <input
        v-model="newNoteTitle"
        type="text"
        placeholder="输入标题或任务..."
        class="input-field"
        @keyup.enter="addNote"
      />
      <textarea
        v-model="newNoteContent"
        placeholder="输入内容（可选）"
        class="textarea-field"
      ></textarea>

      <div class="tag-selector">
        <span class="tag-label">标签：</span>
        <button
          v-for="tag in availableTags"
          :key="tag"
          :class="['tag-btn', { selected: newNoteTags.includes(tag) }]"
          @click="toggleNewTag(tag)"
        >
          {{ tag }}
        </button>
      </div>

      <div class="priority-selector">
        <span class="priority-label">优先级：</span>
        <label v-for="p in ['high', 'normal', 'low']" :key="p" class="priority-option">
          <input type="radio" v-model="newNotePriority" :value="p" />
          <span :class="['priority-badge', `priority-${p}`]">
            {{ p === 'high' ? '高' : p === 'normal' ? '普通' : '低' }}
          </span>
        </label>
      </div>

      <div class="button-group">
        <button @click="addNote" class="btn btn-primary">➕ 添加笔记</button>
        <button @click="addTodo" class="btn btn-success">✓ 添加任务</button>
      </div>
    </div>

    <!-- 筛选和搜索 -->
    <div class="filter-section">
      <div class="tabs">
        <button
          v-for="tab in ['all', 'note', 'todo']"
          :key="tab"
          :class="['tab-btn', { active: activeTab === tab }]"
          @click="activeTab = tab"
        >
          {{ tab === 'all' ? '全部' : tab === 'note' ? '📔 笔记' : '✓ 任务' }}
        </button>
      </div>
      <div class="filter-row">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="🔍 搜索笔记..."
          class="search-field"
        />
        <select v-model="filterTag" class="filter-select">
          <option value="">全部标签</option>
          <option v-for="tag in availableTags" :key="tag" :value="tag">{{ tag }}</option>
        </select>
        <div class="export-wrapper">
          <button @click="showExportMenu = !showExportMenu" class="btn-export">📤 导出</button>
          <div v-if="showExportMenu" class="export-menu">
            <button @click="exportAsJson" class="export-option">导出为 JSON</button>
            <button @click="exportAsMarkdown" class="export-option">导出为 Markdown</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 笔记列表 -->
    <div v-if="filteredNotes.length > 0" class="notes-list">
      <div
        v-for="note in filteredNotes"
        :key="note.id"
        :class="['note-card', { completed: note.completed, todo: note.isTodo }]"
        :style="{ borderLeftColor: note.isTodo ? priorityColor(note.priority || 'normal') : undefined }"
      >
        <!-- 编辑模式 -->
        <template v-if="editingId === note.id">
          <div class="edit-form">
            <input v-model="editTitle" class="input-field edit-input" placeholder="标题" />
            <textarea v-model="editContent" class="textarea-field edit-textarea" placeholder="内容"></textarea>
            <div class="tag-selector">
              <span class="tag-label">标签：</span>
              <button
                v-for="tag in availableTags"
                :key="tag"
                :class="['tag-btn', { selected: editTags.includes(tag) }]"
                @click="toggleEditTag(tag)"
              >
                {{ tag }}
              </button>
            </div>
            <div class="priority-selector">
              <span class="priority-label">优先级：</span>
              <label v-for="p in ['high', 'normal', 'low']" :key="p" class="priority-option">
                <input type="radio" v-model="editPriority" :value="p" />
                <span :class="['priority-badge', `priority-${p}`]">
                  {{ p === 'high' ? '高' : p === 'normal' ? '普通' : '低' }}
                </span>
              </label>
            </div>
            <div class="edit-actions">
              <button @click="saveEdit" class="btn btn-primary">💾 保存</button>
              <button @click="cancelEdit" class="btn btn-secondary">取消</button>
            </div>
          </div>
        </template>

        <!-- 显示模式 -->
        <template v-else>
          <div class="note-header">
            <div class="note-title-section">
              <input
                v-if="note.isTodo"
                type="checkbox"
                :checked="note.completed"
                @change="toggleCompleted(note.id)"
                class="todo-checkbox"
              />
              <h3 :class="{ completed: note.completed }">{{ note.title }}</h3>
            </div>
            <div class="note-actions">
              <button @click="startEdit(note)" class="btn-edit" title="编辑">
                ✏️
              </button>
              <button @click="copyContent(note.title + '\n' + note.content)" class="btn-copy" title="复制">
                📋
              </button>
              <button
                @click="requestDelete(note.id)"
                :class="['btn-delete', { confirming: confirmDeleteId === note.id }]"
                :title="confirmDeleteId === note.id ? '再次点击确认删除' : '删除'"
              >
                {{ confirmDeleteId === note.id ? '确认？' : '🗑️' }}
              </button>
            </div>
          </div>

          <div v-if="note.content" class="note-content">
            {{ note.content }}
          </div>

          <div class="note-footer">
            <div class="footer-left">
              <span class="note-time">{{ formatDate(note.updatedAt) }}</span>
              <span v-if="note.isTodo && note.completed" class="badge completed">✓ 已完成</span>
            </div>
            <div v-if="note.tags && note.tags.length > 0" class="note-tags">
              <span v-for="tag in note.tags" :key="tag" class="tag-badge">{{ tag }}</span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-icon">📭</div>
      <p>
        {{ activeTab === 'all' ? '还没有笔记' : activeTab === 'note' ? '还没有笔记' : '还没有任务' }}
      </p>
    </div>

    <!-- 清空按钮 -->
    <div v-if="notes.length > 0" class="footer-action">
      <button
        v-if="confirmDeleteId === 'all'"
        @click="confirmClearAll"
        class="btn btn-danger"
      >
        ⚠️ 确认清空所有？
      </button>
      <button
        v-else
        @click="clearAll"
        class="btn btn-danger"
      >
        🗑️ 清空所有
      </button>
    </div>
  </div>
</template>

<style scoped>
.notes-tools {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  margin: 0;
  color: #9c27b0;
  font-size: 1.8em;
}

h3 {
  margin: 0;
  font-size: 1rem;
  color: #333;
}

:global([data-theme='dark'] h3) {
  color: #e0e0e0;
}

h3.completed {
  text-decoration: line-through;
  color: #999;
}

:global([data-theme='dark'] h3.completed) {
  color: #669;
}

.description {
  margin: 0;
  color: #888;
  font-size: 0.95rem;
}

.add-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: #f9f5fb;
  border: 2px solid #e0bee7;
  border-radius: 10px;
  padding: 1.5rem;
}

:global([data-theme='dark'] .add-section) {
  background: #2a2a3a;
  border-color: #4a3a5a;
}

.input-field,
.textarea-field {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0bee7;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  background-color: white;
  color: #333;
  transition: border-color 0.3s;
}

:global([data-theme='dark'] .input-field),
:global([data-theme='dark'] .textarea-field) {
  background-color: #1a1a2e;
  border-color: #4a3a5a;
  color: #e0e0e0;
}

.input-field:focus,
.textarea-field:focus {
  outline: none;
  border-color: #9c27b0;
  box-shadow: 0 0 0 3px rgba(156, 39, 176, 0.1);
}

.textarea-field {
  min-height: 100px;
  resize: vertical;
}

.tag-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag-label,
.priority-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #555;
  margin-right: 0.25rem;
}

:global([data-theme='dark'] .tag-label),
:global([data-theme='dark'] .priority-label) {
  color: #a0a0a0;
}

.tag-btn {
  padding: 0.25rem 0.6rem;
  border: 1.5px solid #e0bee7;
  border-radius: 12px;
  background: white;
  color: #666;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

:global([data-theme='dark'] .tag-btn) {
  background: #2a2a3a;
  border-color: #4a3a5a;
  color: #a0a0a0;
}

.tag-btn.selected {
  background: #9c27b0;
  color: white;
  border-color: #9c27b0;
}

.tag-btn:hover {
  border-color: #9c27b0;
}

.priority-selector {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.priority-option {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
}

.priority-option input[type="radio"] {
  display: none;
}

.priority-badge {
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1.5px solid transparent;
  transition: all 0.2s;
}

.priority-option input[type="radio"]:checked + .priority-badge {
  box-shadow: 0 0 0 2px rgba(156, 39, 176, 0.3);
}

.priority-high {
  background: #ffebee;
  color: #c62828;
  border-color: #ef9a9a;
}

:global([data-theme='dark']) .priority-high {
  background: #3a1a1a;
  color: #ff6b6b;
  border-color: #5a2a2a;
}

.priority-normal {
  background: #e8f5e9;
  color: #2e7d32;
  border-color: #a5d6a7;
}

:global([data-theme='dark']) .priority-normal {
  background: #1a3a1a;
  color: #66bb6a;
  border-color: #2a5a2a;
}

.priority-low {
  background: #f5f5f5;
  color: #757575;
  border-color: #e0e0e0;
}

:global([data-theme='dark']) .priority-low {
  background: #2a2a2a;
  color: #999;
  border-color: #444;
}

.button-group {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.7rem 1.4rem;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  flex: 1;
  min-width: 150px;
}

.btn-primary {
  background-color: #9c27b0;
  color: white;
}

.btn-primary:hover {
  background-color: #8b1fa0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(156, 39, 176, 0.3);
}

.btn-secondary {
  background-color: #f0f0f0;
  color: #333;
}

:global([data-theme='dark'] .btn-secondary) {
  background-color: #3a3a4a;
  color: #e0e0e0;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

:global([data-theme='dark'] .btn-secondary:hover) {
  background-color: #4a4a5a;
}

.btn-success {
  background-color: #4caf50;
  color: white;
}

.btn-success:hover {
  background-color: #45a049;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
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

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.tab-btn {
  padding: 0.6rem 1.2rem;
  border: 2px solid #e0bee7;
  background-color: white;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  color: #666;
}

:global([data-theme='dark'] .tab-btn) {
  background-color: #2a2a3a;
  border-color: #4a3a5a;
  color: #a0c0e0;
}

.tab-btn:hover {
  border-color: #9c27b0;
  color: #9c27b0;
}

.tab-btn.active {
  background-color: #9c27b0;
  color: white;
  border-color: #9c27b0;
  box-shadow: 0 4px 12px rgba(156, 39, 176, 0.3);
}

.filter-row {
  display: flex;
  gap: 0.75rem;
}

.search-field {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid #e0bee7;
  border-radius: 8px;
  font-size: 0.95rem;
  background-color: white;
  color: #333;
  transition: border-color 0.3s;
}

:global([data-theme='dark'] .search-field) {
  background-color: #1a1a2e;
  border-color: #4a3a5a;
  color: #e0e0e0;
}

.search-field:focus {
  outline: none;
  border-color: #9c27b0;
  box-shadow: 0 0 0 3px rgba(156, 39, 176, 0.1);
}

.filter-select {
  padding: 0.75rem;
  border: 2px solid #e0bee7;
  border-radius: 8px;
  font-size: 0.9rem;
  background-color: white;
  color: #333;
  cursor: pointer;
}

:global([data-theme='dark'] .filter-select) {
  background-color: #1a1a2e;
  border-color: #4a3a5a;
  color: #e0e0e0;
}

.export-wrapper {
  position: relative;
}

.btn-export {
  padding: 0.75rem 1rem;
  border: 2px solid #9c27b0;
  background: white;
  color: #9c27b0;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-export:hover {
  background: #9c27b0;
  color: white;
}

.export-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.3rem;
  background: white;
  border: 2px solid #e0bee7;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  overflow: hidden;
  min-width: 160px;
}

.export-option {
  display: block;
  width: 100%;
  padding: 0.7rem 1rem;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-size: 0.9rem;
  color: #333;
  transition: background 0.2s;
}

.export-option:hover {
  background: #f3e5f5;
}

:global([data-theme='dark'] .btn-export) {
  background: #2a2a3e;
  border-color: #9c27b0;
  color: #ce93d8;
}

:global([data-theme='dark'] .export-menu) {
  background: #2a2a3e;
  border-color: #4a3a5a;
}

:global([data-theme='dark'] .export-option) {
  color: #e0e0e0;
}

:global([data-theme='dark'] .export-option:hover) {
  background: #3a2a4a;
}

.notes-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.note-card {
  background: white;
  border: 2px solid #e0bee7;
  border-radius: 10px;
  padding: 1.5rem;
  transition: all 0.3s;
  animation: slideUp 0.3s ease-out;
}

:global([data-theme='dark'] .note-card) {
  background: #1a1a2e;
  border-color: #4a3a5a;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.note-card:hover {
  border-color: #9c27b0;
  box-shadow: 0 4px 12px rgba(156, 39, 176, 0.2);
  transform: translateY(-2px);
}

.note-card.completed {
  opacity: 0.7;
  background: #f5f5f5;
}

:global([data-theme='dark'] .note-card.completed) {
  background: #2a2a3a;
}

.note-card.todo {
  border-left: 4px solid #4caf50;
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.note-title-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.todo-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #4caf50;
}

.note-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-copy,
.btn-delete,
.btn-edit {
  padding: 0.4rem 0.6rem;
  border: 1px solid #e0bee7;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

:global([data-theme='dark'] .btn-copy),
:global([data-theme='dark'] .btn-delete),
:global([data-theme='dark'] .btn-edit) {
  background-color: #2a2a3a;
  border-color: #4a3a5a;
}

.btn-edit:hover {
  background-color: #f3e5f5;
  border-color: #9c27b0;
}

:global([data-theme='dark'] .btn-edit:hover) {
  background-color: #3a2a4a;
}

.btn-copy:hover {
  background-color: #f0f0f0;
  border-color: #9c27b0;
}

:global([data-theme='dark'] .btn-copy:hover) {
  background-color: #3a3a4a;
}

.btn-delete:hover {
  background-color: #ffe5e5;
  border-color: #ff6b6b;
}

:global([data-theme='dark'] .btn-delete:hover) {
  background-color: #3a2a2a;
}

.btn-delete.confirming {
  background-color: #ff6b6b;
  color: white;
  border-color: #ff6b6b;
  font-size: 0.75rem;
  font-weight: 600;
}

.note-content {
  color: #666;
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0.75rem 0;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 150px;
  overflow-y: auto;
}

:global([data-theme='dark'] .note-content) {
  color: #a0c0e0;
}

.note-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid #e0bee7;
  font-size: 0.85rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

:global([data-theme='dark'] .note-footer) {
  border-top-color: #4a3a5a;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.note-time {
  color: #999;
}

:global([data-theme='dark'] .note-time) {
  color: #669;
}

.badge {
  padding: 0.2rem 0.6rem;
  background: #4caf50;
  color: white;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.note-tags {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.tag-badge {
  padding: 0.15rem 0.5rem;
  background: #f3e5f5;
  color: #9c27b0;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 600;
}

:global([data-theme='dark'] .tag-badge) {
  background: #3a2a4a;
  color: #ce93d8;
}

/* Edit form styles */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.edit-input {
  font-size: 1rem;
  font-weight: 600;
}

.edit-textarea {
  min-height: 80px;
}

.edit-actions {
  display: flex;
  gap: 0.5rem;
}

.edit-actions .btn {
  flex: 1;
  min-width: auto;
  padding: 0.5rem 1rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  background: #f9f5fb;
  border: 2px dashed #e0bee7;
  border-radius: 10px;
}

:global([data-theme='dark'] .empty-state) {
  background: #2a2a3a;
  border-color: #4a3a5a;
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

:global([data-theme='dark'] .empty-state p) {
  color: #669;
}

.footer-action {
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .button-group {
    flex-direction: column;
  }

  .btn {
    min-width: auto;
  }

  .notes-list {
    grid-template-columns: 1fr;
  }

  .filter-row {
    flex-direction: column;
  }
}

/* Dark mode overrides */
:global([data-theme='dark'] h2) {
  color: #ce93d8;
}

:global([data-theme='dark'] .description) {
  color: #a0c0e0;
}
</style>
