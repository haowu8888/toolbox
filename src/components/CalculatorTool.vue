<script setup>
import { ref, computed } from 'vue'

const display = ref('0')
const previousValue = ref(null)
const operation = ref(null)
const newNumber = ref(true)
const history = ref([])

const safeEval = (expr) => {
  try {
    // 简单的安全计算器：只允许数字和基本操作符
    const result = new Function('return ' + expr)()
    return result
  } catch (err) {
    return 'Error'
  }
}

const handleNumber = (num) => {
  if (newNumber.value) {
    display.value = num.toString()
    newNumber.value = false
  } else {
    display.value = display.value === '0' ? num.toString() : display.value + num
  }
}

const handleOperation = (op) => {
  const currentValue = parseFloat(display.value)

  if (previousValue.value === null) {
    previousValue.value = currentValue
  } else if (operation.value) {
    const result = safeEval(`${previousValue.value}${operation.value}${currentValue}`)
    display.value = result.toString()
    previousValue.value = result
  }

  operation.value = op
  newNumber.value = true
}

const handleEquals = () => {
  if (operation.value && previousValue.value !== null) {
    const currentValue = parseFloat(display.value)
    const result = safeEval(`${previousValue.value}${operation.value}${currentValue}`)

    history.value.unshift({
      expression: `${previousValue.value} ${operation.value} ${currentValue}`,
      result: result,
    })

    display.value = result.toString()
    previousValue.value = null
    operation.value = null
    newNumber.value = true
  }
}

const handleClear = () => {
  display.value = '0'
  previousValue.value = null
  operation.value = null
  newNumber.value = true
}

const handleDecimal = () => {
  if (newNumber.value) {
    display.value = '0.'
    newNumber.value = false
  } else if (!display.value.includes('.')) {
    display.value += '.'
  }
}

const handleBackspace = () => {
  if (display.value.length > 1) {
    display.value = display.value.slice(0, -1)
  } else {
    display.value = '0'
  }
}

const handlePercent = () => {
  const value = parseFloat(display.value)
  display.value = (value / 100).toString()
  newNumber.value = true
}

const handlePlusMinus = () => {
  const value = parseFloat(display.value)
  display.value = (-value).toString()
}

const handleSquare = () => {
  const value = parseFloat(display.value)
  display.value = (value * value).toString()
  newNumber.value = true
}

const handleSquareRoot = () => {
  const value = parseFloat(display.value)
  display.value = Math.sqrt(value).toString()
  newNumber.value = true
}

const copyResult = async () => {
  try {
    await navigator.clipboard.writeText(display.value)
    alert('已复制！')
  } catch (err) {
    alert('复制失败')
  }
}

const clearHistory = () => {
  history.value = []
}
</script>

<template>
  <div class="calculator">
    <h2>🧮 高级计算器</h2>
    <p class="description">支持基本运算、高级函数、计算历史</p>

    <div class="calculator-container">
      <div class="display-section">
        <div class="display">{{ display }}</div>
        <button @click="copyResult" class="btn-copy">📋 复制</button>
      </div>

      <div class="buttons-grid">
        <!-- 第一行：清空和其他 -->
        <button @click="handleClear" class="btn btn-clear">C</button>
        <button @click="handleBackspace" class="btn btn-secondary">← 退格</button>
        <button @click="handlePercent" class="btn btn-secondary">%</button>
        <button @click="handleOperation('/')" class="btn btn-operator">÷</button>

        <!-- 第二行 -->
        <button @click="handleNumber(7)" class="btn">7</button>
        <button @click="handleNumber(8)" class="btn">8</button>
        <button @click="handleNumber(9)" class="btn">9</button>
        <button @click="handleOperation('*')" class="btn btn-operator">×</button>

        <!-- 第三行 -->
        <button @click="handleNumber(4)" class="btn">4</button>
        <button @click="handleNumber(5)" class="btn">5</button>
        <button @click="handleNumber(6)" class="btn">6</button>
        <button @click="handleOperation('-')" class="btn btn-operator">−</button>

        <!-- 第四行 -->
        <button @click="handleNumber(1)" class="btn">1</button>
        <button @click="handleNumber(2)" class="btn">2</button>
        <button @click="handleNumber(3)" class="btn">3</button>
        <button @click="handleOperation('+')" class="btn btn-operator">+</button>

        <!-- 第五行 -->
        <button @click="handleNumber(0)" class="btn btn-zero">0</button>
        <button @click="handleDecimal" class="btn">.</button>
        <button @click="handleEquals" class="btn btn-equals">=</button>

        <!-- 扩展功能 -->
        <button @click="handlePlusMinus" class="btn btn-secondary">±</button>
        <button @click="handleSquare" class="btn btn-secondary">x²</button>
        <button @click="handleSquareRoot" class="btn btn-secondary">√</button>
      </div>
    </div>

    <!-- 计算历史 -->
    <div v-if="history.length > 0" class="history-section">
      <div class="history-header">
        <h3>计算历史</h3>
        <button @click="clearHistory" class="btn btn-small">清空</button>
      </div>
      <div class="history-list">
        <div v-for="(item, index) in history" :key="index" class="history-item">
          <span class="expression">{{ item.expression }}</span>
          <span class="result">=</span>
          <span class="value">{{ item.result }}</span>
          <button @click="() => { display = item.result.toString(); newNumber = true }" class="btn-reuse">📌</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calculator {
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
  margin: 0;
  font-size: 1rem;
  color: #333;
}

:global([data-theme='dark'] h3) {
  color: #e0e0e0;
}

.description {
  margin: 0;
  color: #888;
  font-size: 0.95rem;
}

.calculator-container {
  background: #f0f9ff;
  border: 2px solid #bbdefb;
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 400px;
  margin: 0 auto;
}

:global([data-theme='dark'] .calculator-container) {
  background: #1a2a3a;
  border-color: #3a5a7a;
}

.display-section {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  align-items: center;
}

.display {
  flex: 1;
  background: white;
  border: 2px solid #2196f3;
  border-radius: 8px;
  padding: 1rem;
  font-size: 1.8rem;
  font-weight: 700;
  color: #2196f3;
  text-align: right;
  word-break: break-all;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-family: 'Courier New', monospace;
}

:global([data-theme='dark'] .display) {
  background: #2a3a4a;
  border-color: #2196f3;
  color: #42a5f5;
}

.btn-copy {
  padding: 0.6rem 0.8rem;
  border: 1px solid #2196f3;
  background: white;
  color: #2196f3;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
}

:global([data-theme='dark'] .btn-copy) {
  background: #2a3a4a;
}

.btn-copy:hover {
  background: #2196f3;
  color: white;
}

.buttons-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

.btn {
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  background: white;
  color: #333;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

:global([data-theme='dark'] .btn) {
  background: #2a3a4a;
  color: #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:global([data-theme='dark'] .btn:hover) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.btn-operator {
  background: #2196f3;
  color: white;
  font-weight: 700;
}

.btn-operator:hover {
  background: #1976d2;
}

.btn-equals {
  background: #4caf50;
  color: white;
  font-weight: 700;
  grid-column: span 2;
}

.btn-equals:hover {
  background: #45a049;
}

.btn-clear {
  background: #ff6b6b;
  color: white;
  font-weight: 700;
}

.btn-clear:hover {
  background: #ff5252;
}

.btn-secondary {
  background: #f5f5f5;
  color: #555;
}

:global([data-theme='dark'] .btn-secondary) {
  background: #3a4a5a;
  color: #a0c0e0;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

:global([data-theme='dark'] .btn-secondary:hover) {
  background: #4a5a6a;
}

.btn-zero {
  grid-column: span 2;
}

.btn-small {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
  background: #f0f0f0;
  color: #333;
}

:global([data-theme='dark'] .btn-small) {
  background: #2a3a4a;
  color: #e0e0e0;
}

.history-section {
  background: linear-gradient(135deg, #f0f9ff, #f5f5f5);
  border: 2px solid #bbdefb;
  border-radius: 12px;
  padding: 1.5rem;
}

:global([data-theme='dark'] .history-section) {
  background: linear-gradient(135deg, #1a2a3a, #2a2a2a);
  border-color: #3a5a7a;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 300px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  font-size: 0.9rem;
}

:global([data-theme='dark'] .history-item) {
  background: #2a3a4a;
  color: #e0e0e0;
}

.expression {
  flex: 1;
  color: #666;
}

:global([data-theme='dark'] .expression) {
  color: #a0c0e0;
}

.result {
  color: #999;
  margin: 0 0.5rem;
}

.value {
  font-weight: 700;
  color: #2196f3;
  font-family: 'Courier New', monospace;
}

.btn-reuse {
  padding: 0.3rem 0.6rem;
  border: 1px solid #2196f3;
  background: transparent;
  color: #2196f3;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.btn-reuse:hover {
  background: #2196f3;
  color: white;
}

@media (max-width: 600px) {
  .calculator-container {
    max-width: 100%;
  }

  .buttons-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .btn-zero,
  .btn-equals {
    grid-column: span 1;
  }

  .btn-equals {
    grid-column: span 2;
  }
}

:global([data-theme='dark'] h2) {
  color: #42a5f5;
}

:global([data-theme='dark'] .description) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .result) {
  color: #a0c0e0;
}

:global([data-theme='dark'] .value) {
  color: #42a5f5;
}

:global([data-theme='dark'] .btn-reuse) {
  border-color: #42a5f5;
  color: #42a5f5;
}

:global([data-theme='dark'] .btn-reuse:hover) {
  background: #42a5f5;
  color: white;
}
</style>
