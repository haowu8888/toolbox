<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()

const activeTab = ref('convert')
const colorInput = ref('#4ecdc4')
const rgbInput = ref({ r: 78, g: 205, b: 196 })
const hslInput = ref({ h: 174, s: 56, l: 56 })

// HEX 转 RGB
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 }
}

// RGB 转 HEX
const rgbToHex = (r, g, b) => {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16)
        return hex.length === 1 ? '0' + hex : hex
      })
      .join('')
      .toUpperCase()
  )
}

// RGB 转 HSL
const rgbToHsl = (r, g, b) => {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2

  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

// HSL 转 RGB
const hslToRgb = (h, s, l) => {
  h = h / 360
  s = s / 100
  l = l / 100
  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  }
}

// 监听 HEX 输入
watch(
  () => colorInput.value,
  (newValue) => {
    if (/^#[0-9A-F]{6}$/i.test(newValue)) {
      const rgb = hexToRgb(newValue)
      rgbInput.value = rgb
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
      hslInput.value = hsl
    }
  }
)

// 监听 RGB 输入
watch(
  () => rgbInput.value,
  (newValue) => {
    colorInput.value = rgbToHex(newValue.r, newValue.g, newValue.b)
    const hsl = rgbToHsl(newValue.r, newValue.g, newValue.b)
    hslInput.value = hsl
  },
  { deep: true }
)

// 监听 HSL 输入
watch(
  () => hslInput.value,
  (newValue) => {
    const rgb = hslToRgb(newValue.h, newValue.s, newValue.l)
    rgbInput.value = rgb
    colorInput.value = rgbToHex(rgb.r, rgb.g, rgb.b)
  },
  { deep: true }
)

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    showToast('已复制')
    addHistory('颜色工具', text)
  } catch (err) {
    showToast('复制失败', 'error')
  }
}

// 预定义色板
const palettes = [
  { name: '热趣风', colors: ['#ff6b6b', '#4ecdc4', '#ffa502', '#9c27b0', '#2196f3'] },
  { name: '莫兰迪', colors: ['#c1988e', '#7b8b7a', '#8b9aad', '#a88a7a', '#9a8879'] },
  { name: '清爽', colors: ['#6dd5ed', '#2193b0', '#a8edea', '#fed6e3', '#00d2d3'] },
  { name: '温暖', colors: ['#ff9999', '#ffcc99', '#ffff99', '#99cc99', '#99ccff'] },
  { name: '夜间', colors: ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#c7417b'] },
  { name: '自然', colors: ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'] },
]

const schemes = ref([])

const generateComplementary = () => {
  const h = (hslInput.value.h + 180) % 360
  return rgbToHex(...Object.values(hslToRgb(h, hslInput.value.s, hslInput.value.l)))
}

const generateAnalogous = () => {
  const colors = []
  for (let i = -30; i <= 30; i += 30) {
    const h = (hslInput.value.h + i + 360) % 360
    colors.push(rgbToHex(...Object.values(hslToRgb(h, hslInput.value.s, hslInput.value.l))))
  }
  return colors
}

const generateTriadic = () => {
  const colors = []
  for (let i = 0; i < 3; i++) {
    const h = (hslInput.value.h + (i * 120)) % 360
    colors.push(rgbToHex(...Object.values(hslToRgb(h, hslInput.value.s, hslInput.value.l))))
  }
  return colors
}

const generateTints = () => {
  const colors = []
  for (let i = 0; i <= 5; i++) {
    const l = Math.round(50 + (i * 8))
    colors.push(rgbToHex(...Object.values(hslToRgb(hslInput.value.h, hslInput.value.s, l))))
  }
  return colors
}

const generateShades = () => {
  const colors = []
  for (let i = 0; i <= 5; i++) {
    const l = Math.round(50 - (i * 8))
    colors.push(rgbToHex(...Object.values(hslToRgb(hslInput.value.h, hslInput.value.s, l))))
  }
  return colors
}

const applyColor = (color) => {
  colorInput.value = color
}

const rgbString = computed(() => {
  return `rgb(${rgbInput.value.r}, ${rgbInput.value.g}, ${rgbInput.value.b})`
})

const hslString = computed(() => {
  return `hsl(${hslInput.value.h}, ${hslInput.value.s}%, ${hslInput.value.l}%)`
})
</script>

<template>
  <div class="color-tools">
    <h2>🎨 颜色工具</h2>
    <p class="description">颜色转换、色板生成、配色方案</p>

    <div class="tabs">
      <button
        :class="['tab-btn', { active: activeTab === 'convert' }]"
        @click="activeTab = 'convert'"
      >
        🔄 颜色转换
      </button>
      <button
        :class="['tab-btn', { active: activeTab === 'schemes' }]"
        @click="activeTab = 'schemes'"
      >
        🎨 配色方案
      </button>
      <button
        :class="['tab-btn', { active: activeTab === 'palettes' }]"
        @click="activeTab = 'palettes'"
      >
        📋 预设色板
      </button>
    </div>

    <!-- 颜色转换 -->
    <div v-show="activeTab === 'convert'" class="section">
      <div class="color-preview">
        <input v-model="colorInput" type="color" class="color-picker" />
        <div class="color-display" :style="{ backgroundColor: colorInput }"></div>
      </div>

      <div class="input-section">
        <div class="input-group">
          <label>HEX</label>
          <div class="input-with-btn">
            <input v-model="colorInput" type="text" class="input-field" />
            <button @click="copyToClipboard(colorInput)" class="btn-copy">📋</button>
          </div>
        </div>

        <div class="input-group">
          <label>RGB</label>
          <div class="rgb-inputs">
            <div class="rgb-item">
              <label>R</label>
              <input v-model.number="rgbInput.r" type="number" min="0" max="255" />
            </div>
            <div class="rgb-item">
              <label>G</label>
              <input v-model.number="rgbInput.g" type="number" min="0" max="255" />
            </div>
            <div class="rgb-item">
              <label>B</label>
              <input v-model.number="rgbInput.b" type="number" min="0" max="255" />
            </div>
            <button @click="copyToClipboard(rgbString)" class="btn-copy">📋</button>
          </div>
        </div>

        <div class="input-group">
          <label>HSL</label>
          <div class="hsl-inputs">
            <div class="hsl-item">
              <label>H</label>
              <input v-model.number="hslInput.h" type="number" min="0" max="360" />
            </div>
            <div class="hsl-item">
              <label>S</label>
              <input v-model.number="hslInput.s" type="number" min="0" max="100" />
            </div>
            <div class="hsl-item">
              <label>L</label>
              <input v-model.number="hslInput.l" type="number" min="0" max="100" />
            </div>
            <button @click="copyToClipboard(hslString)" class="btn-copy">📋</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 配色方案 -->
    <div v-show="activeTab === 'schemes'" class="section">
      <div class="scheme">
        <h3>互补色</h3>
        <div class="color-row">
          <div class="color-box" :style="{ backgroundColor: colorInput }"></div>
          <div class="color-box" :style="{ backgroundColor: generateComplementary() }"></div>
        </div>
      </div>

      <div class="scheme">
        <h3>类似色</h3>
        <div class="color-row">
          <div
            v-for="(color, index) in generateAnalogous()"
            :key="index"
            class="color-box"
            :style="{ backgroundColor: color }"
            @click="applyColor(color)"
          ></div>
        </div>
      </div>

      <div class="scheme">
        <h3>三色配色</h3>
        <div class="color-row">
          <div
            v-for="(color, index) in generateTriadic()"
            :key="index"
            class="color-box"
            :style="{ backgroundColor: color }"
            @click="applyColor(color)"
          ></div>
        </div>
      </div>

      <div class="scheme">
        <h3>色调变化</h3>
        <div class="color-row">
          <div
            v-for="(color, index) in generateTints()"
            :key="index"
            class="color-box"
            :style="{ backgroundColor: color }"
            @click="applyColor(color)"
          ></div>
        </div>
      </div>

      <div class="scheme">
        <h3>深浅变化</h3>
        <div class="color-row">
          <div
            v-for="(color, index) in generateShades()"
            :key="index"
            class="color-box"
            :style="{ backgroundColor: color }"
            @click="applyColor(color)"
          ></div>
        </div>
      </div>
    </div>

    <!-- 预设色板 -->
    <div v-show="activeTab === 'palettes'" class="section">
      <div v-for="palette in palettes" :key="palette.name" class="palette">
        <h3>{{ palette.name }}</h3>
        <div class="color-row">
          <div
            v-for="color in palette.colors"
            :key="color"
            class="color-box"
            :style="{ backgroundColor: color }"
            @click="applyColor(color)"
            :title="color"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.color-tools {
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
  margin: 0 0 0.8rem 0;
  font-size: 1rem;
  color: #333;
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
  border: 2px solid #e0bee7;
  background-color: white;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  color: #666;
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

.section {
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

.color-preview {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  margin-bottom: 2rem;
}

.color-picker {
  width: 80px;
  height: 80px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.color-display {
  flex: 1;
  height: 80px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group label {
  font-weight: 600;
  font-size: 0.95rem;
  color: #333;
}

.input-with-btn {
  display: flex;
  gap: 0.75rem;
}

.input-field {
  flex: 1;
  padding: 0.7rem;
  border: 2px solid #e0bee7;
  border-radius: 6px;
  font-size: 1rem;
  font-family: 'Courier New', monospace;
  color: #333;
  transition: border-color 0.3s;
}

.input-field:focus {
  outline: none;
  border-color: #9c27b0;
  box-shadow: 0 0 0 3px rgba(156, 39, 176, 0.1);
}

.rgb-inputs,
.hsl-inputs {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.rgb-item,
.hsl-item {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  align-items: center;
}

.rgb-item label,
.hsl-item label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #666;
}

.rgb-item input,
.hsl-item input {
  width: 60px;
  padding: 0.5rem;
  border: 2px solid #e0bee7;
  border-radius: 4px;
  font-size: 0.9rem;
  text-align: center;
  color: #333;
}

.rgb-item input:focus,
.hsl-item input:focus {
  outline: none;
  border-color: #9c27b0;
}

.btn-copy {
  padding: 0.6rem 0.8rem;
  border: 1px solid #9c27b0;
  background-color: white;
  color: #9c27b0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-copy:hover {
  background-color: #9c27b0;
  color: white;
}

.scheme,
.palette {
  background: #f9f5fb;
  border: 1px solid #e0bee7;
  border-radius: 10px;
  padding: 1.2rem;
}

.color-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.color-box {
  flex: 1;
  min-width: 60px;
  height: 60px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.color-box:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

@media (max-width: 768px) {
  .color-preview {
    flex-direction: column;
  }

  .color-picker,
  .color-display {
    width: 100%;
  }

  .color-box {
    min-width: 50px;
    height: 50px;
  }

  .rgb-inputs,
  .hsl-inputs {
    flex-wrap: wrap;
  }

  .rgb-item,
  .hsl-item {
    flex: 1;
    min-width: 70px;
  }
}

:global([data-theme='dark'] h2) {
  color: #ce93d8;
}

:global([data-theme='dark'] h3) {
  color: #e0e0e0;
}

:global([data-theme='dark'] .description) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .tab-btn) {
  border-color: #664a7a;
  background-color: #2a2a3e;
  color: #a0a0a0;
}

:global([data-theme='dark'] .tab-btn:hover) {
  border-color: #c792e0;
  color: #c792e0;
}

:global([data-theme='dark'] .tab-btn.active) {
  background-color: #9c27b0;
  color: white;
}

:global([data-theme='dark'] .input-group label) {
  color: #e0e0e0;
}

:global([data-theme='dark'] .input-field) {
  background-color: #2a2a3e;
  color: #e0e0e0;
  border-color: #664a7a;
}

:global([data-theme='dark'] .input-field:focus) {
  border-color: #c792e0;
  box-shadow: 0 0 0 3px rgba(199, 146, 224, 0.1);
}

:global([data-theme='dark'] .rgb-item label),
:global([data-theme='dark'] .hsl-item label) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .rgb-item input),
:global([data-theme='dark'] .hsl-item input) {
  background-color: #2a2a3e;
  color: #e0e0e0;
  border-color: #664a7a;
}

:global([data-theme='dark'] .rgb-item input:focus),
:global([data-theme='dark'] .hsl-item input:focus) {
  border-color: #c792e0;
}

:global([data-theme='dark'] .btn-copy) {
  border-color: #c792e0;
  background-color: #2a2a3e;
  color: #c792e0;
}

:global([data-theme='dark'] .btn-copy:hover) {
  background-color: #9c27b0;
  color: white;
}

:global([data-theme='dark'] .scheme),
:global([data-theme='dark'] .palette) {
  background: #2a2a3e;
  border-color: #664a7a;
}

:global([data-theme='dark'] .color-box:hover) {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
}
</style>
