<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()

const currentTime = ref('')
const timestamp = ref('')
const dateFormat = ref('yyyy-MM-dd HH:mm:ss')
const selectedDate = ref(new Date().toISOString().split('T')[0])
const selectedTime = ref('12:00')

// 实时更新当前时间
const timer = setInterval(() => {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN')
}, 1000)

onUnmounted(() => {
  clearInterval(timer)
})

const formatDate = (date, format) => {
  const d = new Date(date)
  const map = {
    'yyyy': d.getFullYear(),
    'MM': String(d.getMonth() + 1).padStart(2, '0'),
    'dd': String(d.getDate()).padStart(2, '0'),
    'HH': String(d.getHours()).padStart(2, '0'),
    'mm': String(d.getMinutes()).padStart(2, '0'),
    'ss': String(d.getSeconds()).padStart(2, '0'),
  }
  return format.replace(/yyyy|MM|dd|HH|mm|ss/g, matched => map[matched])
}

const timestampToDate = () => {
  if (!timestamp.value) return ''
  try {
    const ts = parseInt(timestamp.value)
    const d = ts > 9999999999 ? new Date(ts) : new Date(ts * 1000)
    return formatDate(d, dateFormat.value)
  } catch (err) {
    return '无效的时间戳'
  }
}

const dateToTimestamp = () => {
  try {
    const datetime = `${selectedDate.value}T${selectedTime.value}:00`
    const d = new Date(datetime)
    return Math.floor(d.getTime() / 1000)
  } catch (err) {
    return '转换失败'
  }
}

const getCurrentTimestamp = () => {
  return Math.floor(Date.now() / 1000)
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(String(text))
    showToast('已复制')
    addHistory('时间工具', String(text))
  } catch (err) {
    showToast('复制失败', 'error')
  }
}

const timeUnits = [
  { name: '毫秒', value: 1 },
  { name: '秒', value: 1000 },
  { name: '分钟', value: 60000 },
  { name: '小时', value: 3600000 },
  { name: '天', value: 86400000 },
]

const duration = ref('60')
const fromUnit = ref('秒')
const toUnit = ref('分钟')

const convertDuration = () => {
  const fromValue = timeUnits.find(u => u.name === fromUnit.value)?.value || 1
  const toValue = timeUnits.find(u => u.name === toUnit.value)?.value || 1
  return (parseFloat(duration.value) * fromValue / toValue).toFixed(4)
}
</script>

<template>
  <div class="time-tools">
    <h2>⏰ 时间工具</h2>
    <p class="description">时间戳转换、日期格式化、时间单位转换</p>

    <div class="current-time">
      <div class="time-display">
        <div class="time-label">现在时间</div>
        <div class="time-value">{{ currentTime }}</div>
        <button @click="copyToClipboard(getCurrentTimestamp())" class="btn btn-copy">
          当前时间戳: {{ getCurrentTimestamp() }}
        </button>
      </div>
    </div>

    <!-- 时间戳转日期 -->
    <div class="section">
      <h3>时间戳 → 日期</h3>
      <div class="input-group">
        <input
          v-model="timestamp"
          type="text"
          placeholder="输入时间戳 (秒 或 毫秒)"
          class="input-field"
        />
        <select v-model="dateFormat" class="input-field">
          <option value="yyyy-MM-dd HH:mm:ss">2024-01-15 14:30:45</option>
          <option value="yyyy-MM-dd">2024-01-15</option>
          <option value="HH:mm:ss">14:30:45</option>
          <option value="yyyy/MM/dd HH:mm">2024/01/15 14:30</option>
        </select>
      </div>
      <div v-if="timestamp" class="result-box">
        <div class="result-item">
          <span class="label">转换结果：</span>
          <code>{{ timestampToDate() }}</code>
          <button @click="copyToClipboard(timestampToDate())" class="btn-copy-small">
            📋
          </button>
        </div>
      </div>
    </div>

    <!-- 日期转时间戳 -->
    <div class="section">
      <h3>日期 → 时间戳</h3>
      <div class="input-group">
        <input v-model="selectedDate" type="date" class="input-field" />
        <input v-model="selectedTime" type="time" class="input-field" />
      </div>
      <div class="result-box">
        <div class="result-item">
          <span class="label">时间戳：</span>
          <code>{{ dateToTimestamp() }}</code>
          <button @click="copyToClipboard(dateToTimestamp())" class="btn-copy-small">
            📋
          </button>
        </div>
      </div>
    </div>

    <!-- 时间单位转换 -->
    <div class="section">
      <h3>时间单位转换</h3>
      <div class="input-group">
        <input
          v-model="duration"
          type="number"
          placeholder="输入数值"
          class="input-field"
        />
        <select v-model="fromUnit" class="input-field">
          <option v-for="unit in timeUnits" :key="unit.name" :value="unit.name">
            {{ unit.name }}
          </option>
        </select>
        <span class="arrow">→</span>
        <select v-model="toUnit" class="input-field">
          <option v-for="unit in timeUnits" :key="unit.name" :value="unit.name">
            {{ unit.name }}
          </option>
        </select>
      </div>
      <div class="result-box">
        <div class="result-item">
          <span class="label">{{ duration }} {{ fromUnit }} =</span>
          <code>{{ convertDuration() }} {{ toUnit }}</code>
          <button @click="copyToClipboard(convertDuration())" class="btn-copy-small">
            📋
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.time-tools {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  margin: 0;
  color: #2196f3;
  font-size: 1.8em;
}

h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: #333;
}

.description {
  margin: 0;
  color: #888;
  font-size: 0.95rem;
}

.current-time {
  margin-bottom: 1rem;
}

.time-display {
  background: linear-gradient(135deg, #e3f2fd, #f3e5f5);
  border: 2px solid #bbdefb;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
}

.time-label {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.time-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #2196f3;
  font-family: 'Monaco', 'Courier New', monospace;
  margin-bottom: 1rem;
}

.section {
  background: linear-gradient(135deg, #f5f5f5, #fafafa);
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 1.2rem;
}

.input-group {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 1rem;
}

.input-field {
  flex: 1;
  min-width: 120px;
  padding: 0.7rem;
  border: 2px solid #bbdefb;
  border-radius: 6px;
  font-size: 0.95rem;
  background-color: white;
  color: #333;
  transition: border-color 0.3s;
}

.input-field:focus {
  outline: none;
  border-color: #2196f3;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
}

.arrow {
  color: #2196f3;
  font-weight: bold;
  font-size: 1.2em;
}

.result-box {
  background: white;
  border-left: 4px solid #2196f3;
  border-radius: 6px;
  padding: 1rem;
  margin-top: 0.75rem;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.label {
  font-weight: 600;
  color: #333;
  min-width: fit-content;
}

code {
  flex: 1;
  min-width: 150px;
  padding: 0.5rem;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-family: 'Monaco', 'Courier New', monospace;
  color: #2196f3;
  word-break: break-all;
  font-weight: 600;
}

.btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  background-color: #2196f3;
  color: white;
}

.btn:hover {
  background-color: #1976d2;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
}

.btn-copy {
  padding: 0.7rem 1.4rem;
  background: linear-gradient(135deg, #2196f3, #1976d2);
  white-space: nowrap;
  flex: 1;
}

.btn-copy-small {
  padding: 0.4rem 0.8rem;
  border: 1px solid #2196f3;
  background-color: white;
  color: #2196f3;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.btn-copy-small:hover {
  background-color: #e3f2fd;
}

@media (max-width: 768px) {
  .time-value {
    font-size: 1.4rem;
  }

  .input-group {
    flex-direction: column;
  }

  .input-field {
    width: 100%;
  }

  .arrow {
    transform: rotate(90deg);
  }

  .result-item {
    flex-direction: column;
    align-items: flex-start;
  }

  code {
    width: 100%;
    min-width: auto;
  }
}

:global([data-theme='dark'] h2) {
  color: #64b5f6;
}

:global([data-theme='dark'] .description) {
  color: #a0c0e0;
}

:global([data-theme='dark'] h3) {
  color: #e0e0e0;
}

:global([data-theme='dark'] .time-display) {
  background: linear-gradient(135deg, #2a3a4a, #3a2a4a);
  border-color: #444;
}

:global([data-theme='dark'] .time-label) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .section) {
  background: linear-gradient(135deg, #2a2a3e, #3a3a4a);
  border-color: #444;
}

:global([data-theme='dark'] .input-field) {
  background-color: #2a2a3e;
  color: #e0e0e0;
  border-color: #444;
}

:global([data-theme='dark'] .input-field:focus) {
  border-color: #42a5f5;
  box-shadow: 0 0 0 3px rgba(66, 165, 245, 0.1);
}

:global([data-theme='dark'] .result-box) {
  background: #2a2a3e;
  border-left-color: #42a5f5;
}

:global([data-theme='dark'] .label) {
  color: #e0e0e0;
}

:global([data-theme='dark'] code) {
  background-color: #333;
  color: #42a5f5;
}

:global([data-theme='dark'] .btn-copy-small) {
  background-color: #2a2a3e;
  color: #42a5f5;
  border-color: #42a5f5;
}

:global([data-theme='dark'] .btn-copy-small:hover) {
  background-color: #333;
}
</style>
