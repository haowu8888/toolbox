<script setup>
import { computed, onActivated, onDeactivated, onMounted, onUnmounted, ref } from 'vue'
import { useClipboard } from '../composables/useClipboard'
import { useHistory } from '../composables/useStorage'

const { copyText } = useClipboard()
const { addHistory } = useHistory()

const ERROR = 'Error'
// 超过 15 位有效数字 double 就无法精确表示，输入到此为止
const MAX_INPUT_DIGITS = 15
const MAX_LOCAL_HISTORY = 50
const OPERATOR_SYMBOLS = { '+': '+', '-': '−', '*': '×', '/': '÷' }

const display = ref('0')
const previousValue = ref(null)
const operation = ref(null)
const newNumber = ref(true)
const history = ref([])

const isError = () => display.value === ERROR

// 正在进行的表达式，例如 "12 ×"
const pendingExpression = computed(() =>
  operation.value && previousValue.value !== null
    ? `${previousValue.value} ${OPERATOR_SYMBOLS[operation.value]}`
    : '',
)

// 二进制浮点误差（0.1 + 0.2 = 0.30000000000000004）对计算器用户毫无意义，统一按 12 位有效数字修约
const normalizeNumber = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return ERROR
  return parseFloat(value.toPrecision(12))
}

const safeCalc = (a, op, b) => {
  switch (op) {
    case '+': return normalizeNumber(a + b)
    case '-': return normalizeNumber(a - b)
    case '*': return normalizeNumber(a * b)
    case '/': return b !== 0 ? normalizeNumber(a / b) : ERROR
    default: return ERROR
  }
}

const handleClear = () => {
  display.value = '0'
  previousValue.value = null
  operation.value = null
  newNumber.value = true
}

// 单目运算：Error 状态下直接复位，避免出现 NaN / "Erro"
const applyUnary = (fn) => {
  if (isError()) {
    handleClear()
    return
  }
  const result = fn(parseFloat(display.value))
  display.value = String(result)
  newNumber.value = true
}

const handleNumber = (num) => {
  if (newNumber.value || isError()) {
    display.value = num.toString()
    newNumber.value = false
    return
  }
  if (display.value.replace(/[-.]/g, '').length >= MAX_INPUT_DIGITS) return
  display.value = display.value === '0' ? num.toString() : display.value + num
}

const handleOperation = (op) => {
  const currentValue = parseFloat(display.value)
  if (Number.isNaN(currentValue)) {
    // 上一步是 Error：从头开始，不把 NaN 带进后续运算
    handleClear()
    return
  }

  if (previousValue.value === null) {
    previousValue.value = currentValue
  } else if (operation.value && !newNumber.value) {
    // 只有在用户输入了新操作数后才结算，连续点运算符只是改变运算类型
    const result = safeCalc(previousValue.value, operation.value, currentValue)
    display.value = result.toString()
    if (result === ERROR) {
      previousValue.value = null
      operation.value = null
      newNumber.value = true
      return
    }
    previousValue.value = result
  }

  operation.value = op
  newNumber.value = true
}

const handleEquals = () => {
  if (!operation.value || previousValue.value === null || isError()) return
  const currentValue = parseFloat(display.value)
  const result = safeCalc(previousValue.value, operation.value, currentValue)
  const expression = `${previousValue.value} ${OPERATOR_SYMBOLS[operation.value]} ${currentValue}`

  history.value = [{ id: Date.now() + Math.random(), expression, result }, ...history.value].slice(
    0,
    MAX_LOCAL_HISTORY,
  )
  addHistory('计算器', `${expression} = ${result}`)

  display.value = result.toString()
  previousValue.value = null
  operation.value = null
  newNumber.value = true
}

const handleDecimal = () => {
  if (newNumber.value || isError()) {
    display.value = '0.'
    newNumber.value = false
  } else if (!display.value.includes('.')) {
    display.value += '.'
  }
}

const handleBackspace = () => {
  // 结果 / Error 不允许逐位删除，直接归零
  if (newNumber.value || isError()) {
    display.value = '0'
    newNumber.value = false
    return
  }
  const next = display.value.slice(0, -1)
  display.value = next === '' || next === '-' ? '0' : next
}

const handlePercent = () => applyUnary((value) => normalizeNumber(value / 100))

const handlePlusMinus = () => {
  if (isError() || display.value === '0') return
  // 直接改字符串，保留正在输入的 "12." 这类中间状态
  display.value = display.value.startsWith('-') ? display.value.slice(1) : `-${display.value}`
}

const handleSquare = () => applyUnary((value) => normalizeNumber(value * value))

const handleSquareRoot = () => applyUnary((value) => (value < 0 ? ERROR : normalizeNumber(Math.sqrt(value))))

const reuseResult = (value) => {
  display.value = String(value)
  newNumber.value = true
}

const copyResult = () => copyText(display.value)

const clearHistory = () => {
  history.value = []
}

// ---------- 键盘输入 ----------
const KEY_ACTIONS = {
  Enter: handleEquals,
  '=': handleEquals,
  Backspace: handleBackspace,
  Escape: handleClear,
  Delete: handleClear,
  '.': handleDecimal,
  ',': handleDecimal,
  '%': handlePercent,
  '+': () => handleOperation('+'),
  '-': () => handleOperation('-'),
  '*': () => handleOperation('*'),
  x: () => handleOperation('*'),
  '/': () => handleOperation('/'),
}

const isEditableTarget = (target) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

const onKeydown = (event) => {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
  if (isEditableTarget(event.target)) return
  // 焦点在按钮上时，Enter 交给按钮自身的 click，避免同一次按键触发两次
  if (event.key === 'Enter' && event.target instanceof HTMLButtonElement) return

  const action = /^\d$/.test(event.key) ? () => handleNumber(Number(event.key)) : KEY_ACTIONS[event.key]
  if (!action) return
  event.preventDefault()
  action()
}

// KeepAlive 缓存时不监听，免得在其它工具里按键也改动计算器
let listening = false
const listen = () => {
  if (listening) return
  window.addEventListener('keydown', onKeydown)
  listening = true
}
const unlisten = () => {
  if (!listening) return
  window.removeEventListener('keydown', onKeydown)
  listening = false
}

onMounted(listen)
onActivated(listen)
onDeactivated(unlisten)
onUnmounted(unlisten)
</script>

<template>
  <div class="calculator">
    <h2>🧮 高级计算器</h2>
    <p class="description">支持基本运算、高级函数、计算历史，可直接用键盘输入（Enter 求值，Esc 清空）</p>

    <div class="calculator-container">
      <div class="display-section">
        <div class="display-stack">
          <div class="pending" aria-hidden="true">{{ pendingExpression || '\u00a0' }}</div>
          <div class="display" role="status" aria-live="polite">{{ display }}</div>
        </div>
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
        <div v-for="item in history" :key="item.id" class="history-item">
          <span class="expression">{{ item.expression }}</span>
          <span class="result">=</span>
          <span class="value">{{ item.result }}</span>
          <button @click="reuseResult(item.result)" class="btn-reuse" title="使用该结果" aria-label="使用该结果">📌</button>
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

:root[data-theme='dark'] h3 {
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

:root[data-theme='dark'] .calculator-container {
  background: #1a2a3a;
  border-color: #3a5a7a;
}

.display-section {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  align-items: flex-end;
}

.display-stack {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.pending {
  min-height: 1.2em;
  text-align: right;
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: var(--text-3);
}

.display {
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

:root[data-theme='dark'] .display {
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

:root[data-theme='dark'] .btn-copy {
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

:root[data-theme='dark'] .btn {
  background: #2a3a4a;
  color: #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:root[data-theme='dark'] .btn:hover {
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

:root[data-theme='dark'] .btn-secondary {
  background: #3a4a5a;
  color: #a0c0e0;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

:root[data-theme='dark'] .btn-secondary:hover {
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

:root[data-theme='dark'] .btn-small {
  background: #2a3a4a;
  color: #e0e0e0;
}

.history-section {
  background: linear-gradient(135deg, #f0f9ff, #f5f5f5);
  border: 2px solid #bbdefb;
  border-radius: 12px;
  padding: 1.5rem;
}

:root[data-theme='dark'] .history-section {
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

:root[data-theme='dark'] .history-item {
  background: #2a3a4a;
  color: #e0e0e0;
}

.expression {
  flex: 1;
  color: #666;
}

:root[data-theme='dark'] .expression {
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

:root[data-theme='dark'] h2 {
  color: #42a5f5;
}

:root[data-theme='dark'] .description {
  color: #a0a0a0;
}

:root[data-theme='dark'] .result {
  color: #a0c0e0;
}

:root[data-theme='dark'] .value {
  color: #42a5f5;
}

:root[data-theme='dark'] .btn-reuse {
  border-color: #42a5f5;
  color: #42a5f5;
}

:root[data-theme='dark'] .btn-reuse:hover {
  background: #42a5f5;
  color: white;
}
</style>
