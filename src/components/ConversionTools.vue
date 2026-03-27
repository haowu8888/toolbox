<script setup>
import { ref } from 'vue'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()

const activeTab = ref('length')

// 长度转换
const lengthValue = ref('')
const lengthFrom = ref('m')
const lengthTo = ref('km')

const lengthUnits = {
  mm: { name: '毫米', factor: 0.001 },
  cm: { name: '厘米', factor: 0.01 },
  m: { name: '米', factor: 1 },
  km: { name: '千米', factor: 1000 },
  ft: { name: '英尺', factor: 0.3048 },
  in: { name: '英寸', factor: 0.0254 },
  yd: { name: '码', factor: 0.9144 },
  mi: { name: '英里', factor: 1609.34 },
}

const convertLength = () => {
  if (!lengthValue.value) return ''
  const value = parseFloat(lengthValue.value)
  const fromFactor = lengthUnits[lengthFrom.value].factor
  const toFactor = lengthUnits[lengthTo.value].factor
  return ((value * fromFactor) / toFactor).toFixed(6)
}

// 温度转换
const tempValue = ref('')
const tempFrom = ref('C')
const tempTo = ref('F')

const convertTemp = () => {
  if (!tempValue.value) return ''
  const value = parseFloat(tempValue.value)
  let kelvin = 0

  if (tempFrom.value === 'C') kelvin = value + 273.15
  else if (tempFrom.value === 'F') kelvin = (value - 32) * 5 / 9 + 273.15
  else kelvin = value

  let result = 0
  if (tempTo.value === 'C') result = kelvin - 273.15
  else if (tempTo.value === 'F') result = (kelvin - 273.15) * 9 / 5 + 32
  else result = kelvin

  return result.toFixed(2)
}

// 进制转换
const numberValue = ref('')
const fromBase = ref('10')
const toBase = ref('2')

const convertBase = () => {
  if (!numberValue.value.trim()) return ''
  try {
    const fromBaseNum = parseInt(fromBase.value)
    const toBaseNum = parseInt(toBase.value)
    const decimal = parseInt(numberValue.value, fromBaseNum)
    if (isNaN(decimal)) return '无效输入'
    return decimal.toString(toBaseNum).toUpperCase()
  } catch (err) {
    return '转换失败'
  }
}

const copyToClipboard = async (text, label) => {
  try {
    await navigator.clipboard.writeText(String(text))
    showToast('已复制')
    if (label) addHistory('单位转换', `${label}: ${text}`)
  } catch (err) {
    showToast('复制失败', 'error')
  }
}

// 重量转换
const weightValue = ref('')
const weightFrom = ref('kg')
const weightTo = ref('lb')

const weightUnits = {
  mg: { name: '毫克', factor: 0.000001 },
  g: { name: '克', factor: 0.001 },
  kg: { name: '千克', factor: 1 },
  t: { name: '吨', factor: 1000 },
  oz: { name: '盎司', factor: 0.0283495 },
  lb: { name: '磅', factor: 0.453592 },
  st: { name: '英石', factor: 6.35029 },
}

const convertWeight = () => {
  if (!weightValue.value) return ''
  const value = parseFloat(weightValue.value)
  const fromFactor = weightUnits[weightFrom.value].factor
  const toFactor = weightUnits[weightTo.value].factor
  return ((value * fromFactor) / toFactor).toFixed(6)
}

// 体积转换
const volumeValue = ref('')
const volumeFrom = ref('L')
const volumeTo = ref('mL')

const volumeUnits = {
  mL: { name: '毫升', factor: 0.001 },
  L: { name: '升', factor: 1 },
  gal: { name: '美加仑', factor: 3.78541 },
  pt: { name: '品脱', factor: 0.473176 },
  cup: { name: '杯', factor: 0.236588 },
  fl_oz: { name: '液盎司', factor: 0.0295735 },
}

const convertVolume = () => {
  if (!volumeValue.value) return ''
  const value = parseFloat(volumeValue.value)
  const fromFactor = volumeUnits[volumeFrom.value].factor
  const toFactor = volumeUnits[volumeTo.value].factor
  return ((value * fromFactor) / toFactor).toFixed(6)
}
</script>

<template>
  <div class="convert-tools">
    <h2>🔄 单位转换</h2>
    <p class="description">长度、温度、重量、体积、进制多种转换</p>

    <div class="tabs">
      <button
        v-for="tab in ['length', 'weight', 'volume', 'temp', 'base']"
        :key="tab"
        :class="['tab-btn', { active: activeTab === tab }]"
        @click="activeTab = tab"
      >
        {{ tab === 'length' ? '📏 长度' : tab === 'weight' ? '⚖️ 重量' : tab === 'volume' ? '🧪 体积' : tab === 'temp' ? '🌡️ 温度' : '💻 进制' }}
      </button>
    </div>

    <!-- 长度转换 -->
    <div v-show="activeTab === 'length'" class="convert-section">
      <div class="converter">
        <div class="input-group">
          <input
            v-model="lengthValue"
            type="number"
            placeholder="输入数值"
            class="input-field"
          />
          <select v-model="lengthFrom" class="select-field">
            <option v-for="(unit, key) in lengthUnits" :key="key" :value="key">
              {{ unit.name }}
            </option>
          </select>
        </div>
        <div class="input-group">
          <div class="result-field">{{ convertLength() || '0' }}</div>
          <select v-model="lengthTo" class="select-field">
            <option v-for="(unit, key) in lengthUnits" :key="key" :value="key">
              {{ unit.name }}
            </option>
          </select>
          <button @click="copyToClipboard(convertLength(), '长度转换')" class="btn-copy">📋</button>
        </div>
      </div>
    </div>

    <!-- 重量转换 -->
    <div v-show="activeTab === 'weight'" class="convert-section">
      <div class="converter">
        <div class="input-group">
          <input
            v-model="weightValue"
            type="number"
            placeholder="输入数值"
            class="input-field"
          />
          <select v-model="weightFrom" class="select-field">
            <option v-for="(unit, key) in weightUnits" :key="key" :value="key">
              {{ unit.name }}
            </option>
          </select>
        </div>
        <div class="input-group">
          <div class="result-field">{{ convertWeight() || '0' }}</div>
          <select v-model="weightTo" class="select-field">
            <option v-for="(unit, key) in weightUnits" :key="key" :value="key">
              {{ unit.name }}
            </option>
          </select>
          <button @click="copyToClipboard(convertWeight(), '重量转换')" class="btn-copy">📋</button>
        </div>
      </div>
    </div>

    <!-- 体积转换 -->
    <div v-show="activeTab === 'volume'" class="convert-section">
      <div class="converter">
        <div class="input-group">
          <input
            v-model="volumeValue"
            type="number"
            placeholder="输入数值"
            class="input-field"
          />
          <select v-model="volumeFrom" class="select-field">
            <option v-for="(unit, key) in volumeUnits" :key="key" :value="key">
              {{ unit.name }}
            </option>
          </select>
        </div>
        <div class="input-group">
          <div class="result-field">{{ convertVolume() || '0' }}</div>
          <select v-model="volumeTo" class="select-field">
            <option v-for="(unit, key) in volumeUnits" :key="key" :value="key">
              {{ unit.name }}
            </option>
          </select>
          <button @click="copyToClipboard(convertVolume(), '体积转换')" class="btn-copy">📋</button>
        </div>
      </div>
    </div>

    <!-- 温度转换 -->
    <div v-show="activeTab === 'temp'" class="convert-section">
      <div class="converter">
        <div class="input-group">
          <input
            v-model="tempValue"
            type="number"
            placeholder="输入数值"
            class="input-field"
          />
          <select v-model="tempFrom" class="select-field">
            <option value="C">摄氏度 (°C)</option>
            <option value="F">华氏度 (°F)</option>
            <option value="K">开尔文 (K)</option>
          </select>
        </div>
        <div class="input-group">
          <div class="result-field">{{ convertTemp() || '0' }}</div>
          <select v-model="tempTo" class="select-field">
            <option value="C">摄氏度 (°C)</option>
            <option value="F">华氏度 (°F)</option>
            <option value="K">开尔文 (K)</option>
          </select>
          <button @click="copyToClipboard(convertTemp(), '温度转换')" class="btn-copy">📋</button>
        </div>
      </div>
    </div>

    <!-- 进制转换 -->
    <div v-show="activeTab === 'base'" class="convert-section">
      <div class="converter">
        <div class="input-group">
          <input
            v-model="numberValue"
            type="text"
            placeholder="输入数值"
            class="input-field"
          />
          <select v-model="fromBase" class="select-field">
            <option value="2">二进制 (Binary)</option>
            <option value="8">八进制 (Octal)</option>
            <option value="10">十进制 (Decimal)</option>
            <option value="16">十六进制 (Hex)</option>
          </select>
        </div>
        <div class="input-group">
          <div class="result-field">{{ convertBase() || '0' }}</div>
          <select v-model="toBase" class="select-field">
            <option value="2">二进制 (Binary)</option>
            <option value="8">八进制 (Octal)</option>
            <option value="10">十进制 (Decimal)</option>
            <option value="16">十六进制 (Hex)</option>
          </select>
          <button @click="copyToClipboard(convertBase(), '进制转换')" class="btn-copy">📋</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.convert-tools {
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

.convert-section {
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

.converter {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.input-group {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.input-field,
.result-field,
.select-field {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #ffe5e5;
  border-radius: 8px;
  font-size: 1rem;
  background-color: white;
  color: #333;
  transition: border-color 0.3s;
}

.input-field:focus,
.select-field:focus {
  outline: none;
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

.result-field {
  background-color: #fff9f9;
  color: #ff6b6b;
  font-weight: 600;
  font-family: 'Courier New', monospace;
  cursor: text;
  user-select: all;
}

.btn-copy {
  padding: 0.75rem;
  border: 2px solid #ff6b6b;
  background-color: white;
  color: #ff6b6b;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s;
  min-width: 45px;
}

.btn-copy:hover {
  background-color: #ff6b6b;
  color: white;
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .tabs {
    gap: 0.25rem;
  }

  .tab-btn {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
  }

  .input-group {
    flex-wrap: wrap;
  }

  .input-field,
  .result-field,
  .select-field {
    min-width: 100px;
  }

  .btn-copy {
    padding: 0.75rem 0.5rem;
  }
}

:global([data-theme='dark'] h2) {
  color: #ff8a8a;
}

:global([data-theme='dark'] .description) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .tab-btn) {
  background-color: #2a2a3e;
  border-color: #664444;
  color: #a0a0a0;
}

:global([data-theme='dark'] .tab-btn:hover) {
  border-color: #ff8a8a;
  color: #ff8a8a;
}

:global([data-theme='dark'] .tab-btn.active) {
  background-color: #ff6b6b;
  color: white;
  border-color: #ff6b6b;
}

:global([data-theme='dark'] .input-field),
:global([data-theme='dark'] .result-field),
:global([data-theme='dark'] .select-field) {
  background-color: #2a2a3e;
  color: #e0e0e0;
  border-color: #664444;
}

:global([data-theme='dark'] .input-field:focus),
:global([data-theme='dark'] .select-field:focus) {
  border-color: #ff8a8a;
  box-shadow: 0 0 0 3px rgba(255, 138, 138, 0.1);
}

:global([data-theme='dark'] .result-field) {
  background-color: #333;
  color: #ff8a8a;
}

:global([data-theme='dark'] .btn-copy) {
  background-color: #2a2a3e;
  color: #ff8a8a;
  border-color: #ff8a8a;
}

:global([data-theme='dark'] .btn-copy:hover) {
  background-color: #ff6b6b;
  color: white;
}
</style>
