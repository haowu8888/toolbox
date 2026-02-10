<script setup>
import { ref, computed, onMounted } from 'vue'
import { useLocalStorage } from '../composables/useStorage'

const storage = useLocalStorage('toolbox_notes', [])

const notes = ref(storage.getValue())
const newNoteTitle = ref('')
const newNoteContent = ref('')
const editingId = ref(null)
const activeTab = ref('all')
const searchQuery = ref('')

onMounted(() => {
  notes.value = storage.getValue()
})

const filteredNotes = computed(() => {
  let filtered = notes.value

  // 按标签过滤
  if (activeTab.value === 'todo') {
    filtered = filtered.filter(n => n.isTodo)
  } else if (activeTab.value === 'note') {
    filtered = filtered.filter(n => !n.isTodo)
  }

  // 按搜索查询过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(n =>
      n.title.toLowerCase().includes(query) ||
      n.content.toLowerCase().includes(query)
    )
  }

  return filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
})

const addNote = () => {
  if (!newNoteTitle.value.trim()) {
    alert('请输入标题')
    return
  }

  const note = {
    id: Date.now(),
    title: newNoteTitle.value,
    content: newNoteContent.value,
    isTodo: false,
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  notes.value.unshift(note)
  storage.setValue(notes.value)
  newNoteTitle.value = ''
  newNoteContent.value = ''
}

const addTodo = () => {
  if (!newNoteTitle.value.trim()) {
    alert('请输入任务')
    return
  }

  const note = {
    id: Date.now(),
    title: newNoteTitle.value,
    content: newNoteContent.value,
    isTodo: true,
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  notes.value.unshift(note)
  storage.setValue(notes.value)
  newNoteTitle.value = ''
  newNoteContent.value = ''
}

const deleteNote = (id) => {
  if (confirm('确定删除此笔记吗？')) {
    notes.value = notes.value.filter(n => n.id !== id)
    storage.setValue(notes.value)
  }
}

const toggleCompleted = (id) => {
  const note = notes.value.find(n => n.id === id)
  if (note) {
    note.completed = !note.completed
    note.updatedAt = new Date()
    storage.setValue(notes.value)
  }
}

const formatDate = (date) => {
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
  } else if (diff < 604800000) {
    return Math.floor(diff / 86400000) + '天前'
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

const copyContent = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    alert('已复制！')
  } catch (err) {
    alert('复制失败')
  }
}

const clearAll = () => {
  if (confirm('确定清空所有笔记吗？')) {
    notes.value = []
    storage.setValue([])
    searchQuery.value = ''
  }
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
          ({{ filteredNotes.filter(n => tab === 'all' || (tab === 'note' ? !n.isTodo : n.isTodo)).length }})
        </button>
      </div>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="🔍 搜索笔记..."
        class="search-field"
      />
    </div>

    <!-- 笔记列表 -->
    <div v-if="filteredNotes.length > 0" class="notes-list">
      <div
        v-for="note in filteredNotes"
        :key="note.id"
        :class="['note-card', { completed: note.completed, todo: note.isTodo }]"
      >
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
            <button @click="copyContent(note.title + '\n' + note.content)" class="btn-copy" title="复制">
              📋
            </button>
            <button @click="deleteNote(note.id)" class="btn-delete" title="删除">
              🗑️
            </button>
          </div>
        </div>

        <div v-if="note.content" class="note-content">
          {{ note.content }}
        </div>

        <div class="note-footer">
          <span class="note-time">{{ formatDate(note.updatedAt) }}</span>
          <span v-if="note.isTodo && note.completed" class="badge completed">✓ 已完成</span>
        </div>
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
      <button @click="clearAll" class="btn btn-danger">🗑️ 清空所有</button>
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

.search-field {
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
.btn-delete {
  padding: 0.4rem 0.6rem;
  border: 1px solid #e0bee7;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

:global([data-theme='dark'] .btn-copy),
:global([data-theme='dark'] .btn-delete) {
  background-color: #2a2a3a;
  border-color: #4a3a5a;
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
}

:global([data-theme='dark'] .note-footer) {
  border-top-color: #4a3a5a;
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
}

/* Dark mode overrides */
:global([data-theme='dark'] h2) {
  color: #ce93d8;
}

:global([data-theme='dark'] .description) {
  color: #a0c0e0;
}
</style>
