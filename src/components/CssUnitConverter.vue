<script setup>
import { ref, computed } from 'vue'
import { useToast } from '../composables/useToast'

const { showToast } = useToast()

// Base settings
const rootFontSize = ref(16)
const viewportWidth = ref(1920)
const viewportHeight = ref(1080)

// Converter
const inputValue = ref('')
const inputUnit = ref('px')

const units = ['px', 'rem', 'em', 'vw', 'vh', '%']

const toPx = (value, unit) => {
  const v = parseFloat(value)
  if (isNaN(v)) return NaN
  switch (unit) {
    case 'px': return v
    case 'rem':
    case 'em': return v * rootFontSize.value
    case 'vw': return (v * viewportWidth.value) / 100
    case 'vh': return (v * viewportHeight.value) / 100
    case '%': return (v * rootFontSize.value) / 100
    default: return NaN
  }
}

const fromPx = (px, unit) => {
  if (isNaN(px)) return ''
  switch (unit) {
    case 'px': return px
    case 'rem':
    case 'em': return px / rootFontSize.value
    case 'vw': return (px / viewportWidth.value) * 100
    case 'vh': return (px / viewportHeight.value) * 100
    case '%': return (px / rootFontSize.value) * 100
    default: return ''
  }
}

const formatValue = (val) => {
  if (val === '' || isNaN(val)) return '-'
  const num = parseFloat(val)
  if (Number.isInteger(num)) return num.toString()
  return parseFloat(num.toFixed(4)).toString()
}

const conversions = computed(() => {
  const v = parseFloat(inputValue.value)
  if (!inputValue.value || isNaN(v)) return []
  const px = toPx(v, inputUnit.value)
  if (isNaN(px)) return []
  return units
    .filter(u => u !== inputUnit.value)
    .map(u => ({
      unit: u,
      value: formatValue(fromPx(px, u))
    }))
})

// Quick reference table
const commonPxValues = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 64]

const referenceTable = computed(() => {
  return commonPxValues.map(px => ({
    px,
    rem: formatValue(px / rootFontSize.value)
  }))
})

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(String(text))
    showToast('已复制')
  } catch {
    showToast('复制失败', 'error')
  }
}
</script>

<template>
  <div class="css-unit-converter">
    <h2>📐 CSS 单位转换</h2>
    <p class="description">在 px、rem、em、vw、vh、% 之间快速换算</p>

    <!-- Base Settings -->
    <div class="section">
      <h3 class="section-title">基础设置</h3>
      <div class="settings-grid">
        <div class="setting-item">
          <label>根字体大小</label>
          <div class="setting-input-wrap">
            <input v-model.number="rootFontSize" type="number" min="1" class="setting-input" />
            <span class="setting-unit">px</span>
          </div>
        </div>
        <div class="setting-item">
          <label>视口宽度</label>
          <div class="setting-input-wrap">
            <input v-model.number="viewportWidth" type="number" min="1" class="setting-input" />
            <span class="setting-unit">px</span>
          </div>
        </div>
        <div class="setting-item">
          <label>视口高度</label>
          <div class="setting-input-wrap">
            <input v-model.number="viewportHeight" type="number" min="1" class="setting-input" />
            <span class="setting-unit">px</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Converter -->
    <div class="section">
      <h3 class="section-title">单位转换</h3>
      <div class="converter-input-row">
        <input
          v-model="inputValue"
          type="number"
          placeholder="输入数值"
          class="input-field"
        />
        <select v-model="inputUnit" class="select-field">
          <option v-for="u in units" :key="u" :value="u">{{ u }}</option>
        </select>
      </div>
      <div v-if="conversions.length" class="results-grid">
        <div
          v-for="item in conversions"
          :key="item.unit"
          class="result-card"
          @click="copyToClipboard(item.value)"
          title="点击复制"
        >
          <span class="result-value">{{ item.value }}</span>
          <span class="result-unit">{{ item.unit }}</span>
        </div>
      </div>
      <div v-else class="results-placeholder">输入数值后自动显示所有单位换算结果</div>
    </div>

    <!-- Quick Reference Table -->
    <div class="section">
      <h3 class="section-title">快速参考表 <span class="section-hint">(基于根字体 {{ rootFontSize }}px)</span></h3>
      <div class="ref-table">
        <div class="ref-header">
          <span>px</span>
          <span>rem</span>
        </div>
        <div
          v-for="row in referenceTable"
          :key="row.px"
          class="ref-row"
        >
          <span class="ref-cell" @click="copyToClipboard(row.px + 'px')" title="点击复制">{{ row.px }}px</span>
          <span class="ref-cell" @click="copyToClipboard(row.rem + 'rem')" title="点击复制">{{ row.rem }}rem</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.css-unit-converter {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  margin: 0;
  color: #607d8b;
  font-size: 1.8em;
}

.description {
  margin: 0;
  color: #888;
  font-size: 0.95rem;
}

.section {
  background: #f8fafb;
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid #e0e8ec;
}

.section-title {
  margin: 0 0 1rem 0;
  font-size: 1.05rem;
  color: #455a64;
  font-weight: 600;
}

.section-hint {
  font-weight: 400;
  font-size: 0.85rem;
  color: #90a4ae;
}

/* Base Settings */
.settings-grid {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.setting-item {
  flex: 1;
  min-width: 140px;
}

.setting-item label {
  display: block;
  font-size: 0.85rem;
  color: #78909c;
  margin-bottom: 0.4rem;
  font-weight: 500;
}

.setting-input-wrap {
  display: flex;
  align-items: center;
  border: 2px solid #cfd8dc;
  border-radius: 8px;
  background: white;
  overflow: hidden;
  transition: border-color 0.3s;
}

.setting-input-wrap:focus-within {
  border-color: #607d8b;
  box-shadow: 0 0 0 3px rgba(96, 125, 139, 0.1);
}

.setting-input {
  flex: 1;
  border: none;
  padding: 0.6rem 0.75rem;
  font-size: 0.95rem;
  outline: none;
  background: transparent;
  color: #333;
  min-width: 60px;
}

.setting-unit {
  padding: 0 0.75rem;
  font-size: 0.85rem;
  color: #90a4ae;
  font-weight: 600;
  background: #eceff1;
  align-self: stretch;
  display: flex;
  align-items: center;
}

/* Converter */
.converter-input-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.input-field {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #cfd8dc;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  color: #333;
  transition: border-color 0.3s;
}

.input-field:focus {
  outline: none;
  border-color: #607d8b;
  box-shadow: 0 0 0 3px rgba(96, 125, 139, 0.1);
}

.select-field {
  padding: 0.75rem;
  border: 2px solid #cfd8dc;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  color: #333;
  cursor: pointer;
  min-width: 80px;
  transition: border-color 0.3s;
}

.select-field:focus {
  outline: none;
  border-color: #607d8b;
  box-shadow: 0 0 0 3px rgba(96, 125, 139, 0.1);
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
}

.result-card {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  padding: 0.85rem 1rem;
  background: white;
  border: 2px solid #cfd8dc;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.result-card:hover {
  border-color: #607d8b;
  background: #eceff1;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(96, 125, 139, 0.15);
}

.result-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #607d8b;
  font-family: 'Courier New', monospace;
}

.result-unit {
  font-size: 0.85rem;
  color: #90a4ae;
  font-weight: 600;
}

.results-placeholder {
  text-align: center;
  color: #b0bec5;
  font-size: 0.9rem;
  padding: 1.5rem 0;
}

/* Quick Reference Table */
.ref-table {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 2px solid #cfd8dc;
  border-radius: 8px;
  overflow: hidden;
}

.ref-header {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #607d8b;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
}

.ref-header span {
  padding: 0.6rem 1rem;
}

.ref-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-top: 1px solid #eceff1;
  transition: background 0.2s;
}

.ref-row:hover {
  background: #f1f5f7;
}

.ref-cell {
  padding: 0.55rem 1rem;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: #455a64;
  cursor: pointer;
  transition: all 0.2s;
}

.ref-cell:hover {
  color: #607d8b;
  background: #e0e8ec;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 768px) {
  .settings-grid {
    flex-direction: column;
  }

  .converter-input-row {
    flex-wrap: wrap;
  }

  .results-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
}

@media (max-width: 480px) {
  .results-grid {
    grid-template-columns: 1fr 1fr;
  }
}

/* Dark mode */
:global([data-theme='dark'] .css-unit-converter h2) {
  color: #90a4ae;
}

:global([data-theme='dark'] .css-unit-converter .description) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .css-unit-converter .section) {
  background: #1e1e2e;
  border-color: #3a3a4e;
}

:global([data-theme='dark'] .css-unit-converter .section-title) {
  color: #b0bec5;
}

:global([data-theme='dark'] .css-unit-converter .section-hint) {
  color: #78909c;
}

:global([data-theme='dark'] .css-unit-converter .setting-item label) {
  color: #90a4ae;
}

:global([data-theme='dark'] .css-unit-converter .setting-input-wrap) {
  background: #2a2a3e;
  border-color: #4a4a5e;
}

:global([data-theme='dark'] .css-unit-converter .setting-input-wrap:focus-within) {
  border-color: #90a4ae;
  box-shadow: 0 0 0 3px rgba(144, 164, 174, 0.1);
}

:global([data-theme='dark'] .css-unit-converter .setting-input) {
  color: #e0e0e0;
}

:global([data-theme='dark'] .css-unit-converter .setting-unit) {
  background: #3a3a4e;
  color: #90a4ae;
}

:global([data-theme='dark'] .css-unit-converter .input-field),
:global([data-theme='dark'] .css-unit-converter .select-field) {
  background: #2a2a3e;
  color: #e0e0e0;
  border-color: #4a4a5e;
}

:global([data-theme='dark'] .css-unit-converter .input-field:focus),
:global([data-theme='dark'] .css-unit-converter .select-field:focus) {
  border-color: #90a4ae;
  box-shadow: 0 0 0 3px rgba(144, 164, 174, 0.1);
}

:global([data-theme='dark'] .css-unit-converter .result-card) {
  background: #2a2a3e;
  border-color: #4a4a5e;
}

:global([data-theme='dark'] .css-unit-converter .result-card:hover) {
  border-color: #90a4ae;
  background: #333348;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

:global([data-theme='dark'] .css-unit-converter .result-value) {
  color: #90a4ae;
}

:global([data-theme='dark'] .css-unit-converter .result-unit) {
  color: #78909c;
}

:global([data-theme='dark'] .css-unit-converter .results-placeholder) {
  color: #546e7a;
}

:global([data-theme='dark'] .css-unit-converter .ref-table) {
  border-color: #4a4a5e;
}

:global([data-theme='dark'] .css-unit-converter .ref-header) {
  background: #455a64;
}

:global([data-theme='dark'] .css-unit-converter .ref-row) {
  border-top-color: #3a3a4e;
}

:global([data-theme='dark'] .css-unit-converter .ref-row:hover) {
  background: #2a2a3e;
}

:global([data-theme='dark'] .css-unit-converter .ref-cell) {
  color: #b0bec5;
}

:global([data-theme='dark'] .css-unit-converter .ref-cell:hover) {
  color: #e0e0e0;
  background: #333348;
}
</style>
