<script setup>
import { ref, computed } from 'vue'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()

const inputText = ref('')
const operation = ref('uuid')

// UUID 生成
const generateUUID = () => {
  const v4 = () => {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
      (c ^ (Math.random() * 16 >> (c / 4))).toString(16)
    )
  }
  return v4()
}

// 生成多个 UUID
const uuidCount = ref(1)
const uuidList = computed(() => {
  const list = []
  for (let i = 0; i < parseInt(uuidCount.value); i++) {
    list.push(generateUUID())
  }
  return list
})

// 密码生成
const passwordLength = ref(16)
const includeUppercase = ref(true)
const includeLowercase = ref(true)
const includeNumbers = ref(true)
const includeSpecial = ref(true)

const generatePassword = () => {
  let chars = ''
  if (includeLowercase.value) chars += 'abcdefghijklmnopqrstuvwxyz'
  if (includeUppercase.value) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (includeNumbers.value) chars += '0123456789'
  if (includeSpecial.value) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?'

  let password = ''
  for (let i = 0; i < passwordLength.value; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// 存储生成的密码
const generatedPassword = ref('')
let passwordInitialized = false

const refreshPassword = () => {
  generatedPassword.value = generatePassword()
  if (passwordInitialized) addHistory('密码生成', generatedPassword.value)
  passwordInitialized = true
}

// 初始化生成一次密码
refreshPassword()

// 字数统计
const charCount = computed(() => inputText.value.length)
const wordCount = computed(() => {
  return inputText.value.trim() === '' ? 0 : inputText.value.trim().split(/\s+/).length
})
const lineCount = computed(() => {
  return inputText.value === '' ? 0 : inputText.value.split('\n').length
})
const byteCount = computed(() => {
  return new Blob([inputText.value]).size
})

// 文本去重
const removeDuplicates = () => {
  const lines = inputText.value.split('\n').filter(line => line.trim() !== '')
  const unique = [...new Set(lines)]
  return unique.join('\n')
}

// 大小写转换
const toUpperCase = () => inputText.value.toUpperCase()
const toLowerCase = () => inputText.value.toLowerCase()
const toCamelCase = () => {
  return inputText.value
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (m, c) => c.toUpperCase())
}
const toPascalCase = () => {
  return inputText.value
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (m, c) => c.toUpperCase())
    .replace(/^./, c => c.toUpperCase())
}
const toSnakeCase = () => {
  return inputText.value
    .replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
    .replace(/\s+/g, '_')
    .toLowerCase()
}
const toKebabCase = () => {
  return inputText.value
    .replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)
    .replace(/\s+/g, '-')
    .toLowerCase()
}

// 输出
const output = ref('')

const executeOperation = () => {
  if (operation.value === 'uppercase') {
    output.value = toUpperCase()
  } else if (operation.value === 'lowercase') {
    output.value = toLowerCase()
  } else if (operation.value === 'camelCase') {
    output.value = toCamelCase()
  } else if (operation.value === 'PascalCase') {
    output.value = toPascalCase()
  } else if (operation.value === 'snake_case') {
    output.value = toSnakeCase()
  } else if (operation.value === 'kebab-case') {
    output.value = toKebabCase()
  } else if (operation.value === 'removeDuplicates') {
    output.value = removeDuplicates()
  }
  if (output.value) addHistory('文本处理', output.value)
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    showToast('已复制')
  } catch (err) {
    showToast('复制失败', 'error')
  }
}

const copyAllUUIDs = async () => {
  const text = uuidList.value.join('\n')
  await copyToClipboard(text)
  addHistory('UUID 生成', text)
}

const clearAll = () => {
  inputText.value = ''
  output.value = ''
}
</script>

<template>
  <div class="text-tools">
    <h2>📝 文本处理工具</h2>
    <p class="description">UUID生成、密码生成、字数统计、文本转换等</p>

    <div class="tabs">
      <button
        v-for="tab in ['uuid', 'password', 'count', 'case', 'duplicate']"
        :key="tab"
        :class="['tab-btn', { active: operation === tab }]"
        @click="operation = tab; output = ''"
      >
        {{ tab === 'uuid' ? '🔑 UUID' : tab === 'password' ? '🔐 密码' : tab === 'count' ? '📊 统计' : tab === 'case' ? '🔤 转换' : '⚙️ 去重' }}
      </button>
    </div>

    <!-- UUID 生成 -->
    <div v-show="operation === 'uuid'" class="tool-section">
      <div class="input-group">
        <label>生成数量：</label>
        <input v-model.number="uuidCount" type="number" min="1" max="100" class="input-field" />
        <button @click="copyAllUUIDs" class="btn btn-primary">📋 复制所有</button>
      </div>
      <div class="uuid-list">
        <div v-for="(uuid, index) in uuidList" :key="index" class="uuid-item">
          <code>{{ uuid }}</code>
          <button @click="copyToClipboard(uuid)" class="btn-copy">📋</button>
        </div>
      </div>
    </div>

    <!-- 密码生成 -->
    <div v-show="operation === 'password'" class="tool-section">
      <div class="input-group">
        <label>密码长度：</label>
        <input v-model.number="passwordLength" type="range" min="8" max="128" class="slider" />
        <span class="length-display">{{ passwordLength }}</span>
      </div>
      <div class="checkbox-group">
        <label>
          <input v-model="includeLowercase" type="checkbox" />
          小写字母 (a-z)
        </label>
        <label>
          <input v-model="includeUppercase" type="checkbox" />
          大写字母 (A-Z)
        </label>
        <label>
          <input v-model="includeNumbers" type="checkbox" />
          数字 (0-9)
        </label>
        <label>
          <input v-model="includeSpecial" type="checkbox" />
          特殊符号
        </label>
      </div>
      <div class="password-display">
        <div class="password-value">{{ generatedPassword }}</div>
        <button @click="refreshPassword" class="btn btn-secondary">🔄 刷新</button>
        <button @click="copyToClipboard(generatedPassword)" class="btn btn-primary">📋 复制密码</button>
      </div>
    </div>

    <!-- 字数统计 -->
    <div v-show="operation === 'count'" class="tool-section">
      <textarea
        v-model="inputText"
        placeholder="输入文本进行统计..."
        class="input-textarea"
      ></textarea>
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-label">字符数</div>
          <div class="stat-value">{{ charCount }}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">单词数</div>
          <div class="stat-value">{{ wordCount }}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">行数</div>
          <div class="stat-value">{{ lineCount }}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">字节数</div>
          <div class="stat-value">{{ byteCount }}</div>
        </div>
      </div>
    </div>

    <!-- 文本转换 -->
    <div v-show="operation === 'case'" class="tool-section">
      <textarea
        v-model="inputText"
        placeholder="输入文本进行转换..."
        class="input-textarea"
      ></textarea>
      <div class="case-buttons">
        <button @click="() => { output = toUpperCase(); executeOperation() }" class="btn btn-secondary">大写</button>
        <button @click="() => { output = toLowerCase(); executeOperation() }" class="btn btn-secondary">小写</button>
        <button @click="() => { output = toCamelCase(); executeOperation() }" class="btn btn-secondary">camelCase</button>
        <button @click="() => { output = toPascalCase(); executeOperation() }" class="btn btn-secondary">PascalCase</button>
        <button @click="() => { output = toSnakeCase(); executeOperation() }" class="btn btn-secondary">snake_case</button>
        <button @click="() => { output = toKebabCase(); executeOperation() }" class="btn btn-secondary">kebab-case</button>
      </div>
      <div v-if="output" class="output-section">
        <textarea v-model="output" readonly class="output-textarea"></textarea>
        <button @click="copyToClipboard(output)" class="btn btn-primary">📋 复制结果</button>
      </div>
    </div>

    <!-- 文本去重 -->
    <div v-show="operation === 'duplicate'" class="tool-section">
      <textarea
        v-model="inputText"
        placeholder="输入文本（每行一个），去除重复行..."
        class="input-textarea"
      ></textarea>
      <button @click="executeOperation" class="btn btn-primary">⚙️ 执行去重</button>
      <div v-if="output" class="output-section">
        <textarea v-model="output" readonly class="output-textarea"></textarea>
        <button @click="copyToClipboard(output)" class="btn btn-primary">📋 复制结果</button>
      </div>
    </div>

    <button @click="clearAll" class="btn btn-secondary">清空</button>
  </div>
</template>

<style scoped>
.text-tools {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  margin: 0;
  color: #ff6b6b;
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
  justify-content: center;
}

.tab-btn {
  padding: 0.6rem 1.2rem;
  border: 2px solid #ffe5e5;
  background-color: white;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  color: #666;
}

:global([data-theme='dark'] .tab-btn) {
  background-color: #2a2a2a;
  border-color: #4a2a2a;
  color: #a0c0e0;
}

.tab-btn:hover {
  border-color: #ff6b6b;
  color: #ff6b6b;
}

.tab-btn.active {
  background-color: #ff6b6b;
  color: white;
  border-color: #ff6b6b;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

.tool-section {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.input-group {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.input-group label {
  font-weight: 600;
  color: #333;
}

:global([data-theme='dark'] .input-group label) {
  color: #e0e0e0;
}

.input-field,
.slider {
  padding: 0.5rem;
  border: 2px solid #ffe5e5;
  border-radius: 6px;
  font-size: 0.95rem;
  background-color: white;
  color: #333;
}

:global([data-theme='dark'] .input-field),
:global([data-theme='dark'] .slider) {
  background-color: #1a1a2a;
  border-color: #4a2a2a;
  color: #e0e0e0;
}

.input-field:focus {
  outline: none;
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

.length-display {
  font-weight: 600;
  color: #ff6b6b;
  min-width: 40px;
  text-align: center;
}

.uuid-list {
  display: grid;
  gap: 0.75rem;
}

.uuid-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: #f9f9f9;
  border-radius: 6px;
  justify-content: space-between;
}

:global([data-theme='dark'] .uuid-item) {
  background: #2a2a2a;
}

.uuid-item code {
  flex: 1;
  font-family: 'Courier New', monospace;
  color: #ff6b6b;
  word-break: break-all;
}

.checkbox-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: normal;
  color: #333;
}

:global([data-theme='dark'] .checkbox-group label) {
  color: #a0c0e0;
}

.checkbox-group input[type="checkbox"] {
  cursor: pointer;
  accent-color: #ff6b6b;
  width: 18px;
  height: 18px;
}

.password-display {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.password-value {
  flex: 1;
  padding: 1rem;
  background: #fff5f5;
  border: 2px solid #ff6b6b;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 1.1rem;
  font-weight: 600;
  color: #ff6b6b;
  word-break: break-all;
}

:global([data-theme='dark'] .password-value) {
  background: #2a1a1a;
  border-color: #ff6b6b;
}

.input-textarea {
  width: 100%;
  min-height: 150px;
  padding: 0.75rem;
  border: 2px solid #ffe5e5;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.95rem;
  background-color: white;
  color: #333;
  resize: vertical;
  transition: border-color 0.3s;
}

:global([data-theme='dark'] .input-textarea) {
  background-color: #1a1a2a;
  border-color: #4a2a2a;
  color: #e0e0e0;
}

.input-textarea:focus {
  outline: none;
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.stat-box {
  background: linear-gradient(135deg, #fff5f5, #ffe5e5);
  border: 2px solid #ff6b6b;
  border-radius: 10px;
  padding: 1.5rem;
  text-align: center;
}

:global([data-theme='dark'] .stat-box) {
  background: linear-gradient(135deg, #2a1a1a, #3a2a2a);
  border-color: #ff6b6b;
}

.stat-label {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
}

:global([data-theme='dark'] .stat-label) {
  color: #a0c0e0;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #ff6b6b;
}

.case-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  margin: 1.5rem 0;
}

.output-section {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.output-textarea {
  width: 100%;
  min-height: 150px;
  padding: 0.75rem;
  border: 2px solid #ffe5e5;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.95rem;
  background-color: #f9f9f9;
  color: #333;
  resize: vertical;
}

:global([data-theme='dark'] .output-textarea) {
  background-color: #2a2a2a;
  border-color: #4a2a2a;
  color: #e0e0e0;
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

.btn-primary {
  background-color: #ff6b6b;
  color: white;
}

.btn-primary:hover {
  background-color: #ff5252;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

.btn-secondary {
  background-color: #f0f0f0;
  color: #333;
  flex: 1;
}

:global([data-theme='dark'] .btn-secondary) {
  background-color: #2a2a2a;
  color: #e0e0e0;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

:global([data-theme='dark'] .btn-secondary:hover) {
  background-color: #3a3a3a;
}

.btn-copy {
  padding: 0.4rem 0.8rem;
  border: 1px solid #ff6b6b;
  background-color: white;
  color: #ff6b6b;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

:global([data-theme='dark'] .btn-copy) {
  background-color: #1a1a2a;
}

.btn-copy:hover {
  background-color: #ff6b6b;
  color: white;
}

@media (max-width: 768px) {
  .case-buttons {
    grid-template-columns: repeat(2, 1fr);
  }

  .checkbox-group {
    grid-template-columns: 1fr;
  }

  .password-display {
    flex-direction: column;
  }

  .input-field,
  .slider {
    flex: 1;
  }
}

/* Dark mode overrides */
:global([data-theme='dark'] h2) {
  color: #ff8a8a;
}

:global([data-theme='dark'] .description) {
  color: #a0c0e0;
}

:global([data-theme='dark'] .uuid-item code) {
  color: #ff8fa3;
}

:global([data-theme='dark'] .slider) {
  accent-color: #ff6b6b;
}
</style>
