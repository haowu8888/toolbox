<script setup>
import { ref, computed, watch } from 'vue'
import { useClipboard } from '../composables/useClipboard'
import { contrastRatio, hexToRgb, hslToHex, hslToRgb, normalizeHex, rgbToHex, rgbToHsl, wcagLevel } from '../utils/color'

const { copyText } = useClipboard()

const activeTab = ref('convert')
const colorInput = ref('#4ecdc4')
const rgbInput = ref({ r: 78, g: 205, b: 196 })
const hslInput = ref({ h: 174, s: 56, l: 56 })
// 最近一次合法的颜色：用户在文本框里输入到一半时，预览 / 配色 / 取色器仍显示有效颜色
const currentHex = ref('#4ECDC4')

// 数字输入框清空时 v-model.number 会给出 ''，越界值也要夹到合法范围，否则会生成 "#NaNNaNNaN"
const clampChannel = (value, max) => {
  if (value === '' || value === null || value === undefined) return null
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  return Math.min(max, Math.max(0, Math.round(num)))
}

const isUpdating = ref(false)

// 三个 watcher 互相回写，必须用 flush: 'sync' 让 isUpdating 守卫在同一调用栈内生效；
// 否则默认的异步批处理会在守卫复位后才触发另一侧 watcher，把用户正在输入的 HSL/RGB 值用四舍五入后的结果覆盖掉
const SYNC = { flush: 'sync' }

// 监听 HEX 输入
watch(
  () => colorInput.value,
  (newValue) => {
    if (isUpdating.value) return
    // 支持 #abc / abc / aabbcc 等写法
    const hex = normalizeHex(newValue)
    if (hex) {
      isUpdating.value = true
      currentHex.value = hex
      const rgb = hexToRgb(hex)
      rgbInput.value = rgb
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
      hslInput.value = hsl
      isUpdating.value = false
    }
  },
  SYNC,
)

// 监听 RGB 输入
watch(
  () => rgbInput.value,
  (newValue) => {
    if (isUpdating.value) return
    const r = clampChannel(newValue.r, 255)
    const g = clampChannel(newValue.g, 255)
    const b = clampChannel(newValue.b, 255)
    if (r === null || g === null || b === null) return
    isUpdating.value = true
    colorInput.value = rgbToHex(r, g, b)
    currentHex.value = colorInput.value
    const hsl = rgbToHsl(r, g, b)
    hslInput.value = hsl
    isUpdating.value = false
  },
  { deep: true, ...SYNC },
)

// 监听 HSL 输入
watch(
  () => hslInput.value,
  (newValue) => {
    if (isUpdating.value) return
    const h = clampChannel(newValue.h, 360)
    const s = clampChannel(newValue.s, 100)
    const l = clampChannel(newValue.l, 100)
    if (h === null || s === null || l === null) return
    isUpdating.value = true
    const rgb = hslToRgb(h, s, l)
    rgbInput.value = rgb
    colorInput.value = rgbToHex(rgb.r, rgb.g, rgb.b)
    currentHex.value = colorInput.value
    isUpdating.value = false
  },
  { deep: true, ...SYNC },
)

const copyToClipboard = (text) => copyText(text, { history: '颜色工具' })

// 预定义色板
const palettes = [
  { name: '热趣风', colors: ['#ff6b6b', '#4ecdc4', '#ffa502', '#9c27b0', '#2196f3'] },
  { name: '莫兰迪', colors: ['#c1988e', '#7b8b7a', '#8b9aad', '#a88a7a', '#9a8879'] },
  { name: '清爽', colors: ['#6dd5ed', '#2193b0', '#a8edea', '#fed6e3', '#00d2d3'] },
  { name: '温暖', colors: ['#ff9999', '#ffcc99', '#ffff99', '#99cc99', '#99ccff'] },
  { name: '夜间', colors: ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#c7417b'] },
  { name: '自然', colors: ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'] },
]

// 配色方案基于最近一次合法颜色计算，避免输入框临时为空时生成 #NANNANNAN
const baseHsl = computed(() => {
  const { r, g, b } = hexToRgb(currentHex.value)
  return rgbToHsl(r, g, b)
})

const withHue = (offset) => hslToHex(baseHsl.value.h + offset, baseHsl.value.s, baseHsl.value.l)
const withLightness = (l) => hslToHex(baseHsl.value.h, baseHsl.value.s, l)

const generateComplementary = () => withHue(180)
const generateAnalogous = () => [-30, 0, 30].map(withHue)
const generateTriadic = () => [0, 120, 240].map(withHue)
const generateTints = () => [0, 1, 2, 3, 4, 5].map((i) => withLightness(50 + i * 8))
const generateShades = () => [0, 1, 2, 3, 4, 5].map((i) => withLightness(50 - i * 8))

// WCAG 对比度：该颜色作为背景时，白字 / 黑字是否清晰可读
const contrastInfo = computed(() => {
  const rgb = hexToRgb(currentHex.value)
  return [
    { label: '白色文字', text: '#FFFFFF', ratio: contrastRatio(rgb, { r: 255, g: 255, b: 255 }) },
    { label: '黑色文字', text: '#000000', ratio: contrastRatio(rgb, { r: 0, g: 0, b: 0 }) },
  ].map((item) => ({ ...item, ratioText: item.ratio.toFixed(2), level: wcagLevel(item.ratio) }))
})

const applyColor = (color) => {
  colorInput.value = normalizeHex(color) ?? color
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
        <input
          :value="currentHex.toLowerCase()"
          type="color"
          class="color-picker"
          aria-label="颜色选择器"
          @input="colorInput = $event.target.value.toUpperCase()"
        />
        <div class="color-display" :style="{ backgroundColor: currentHex }"></div>
      </div>

      <div class="input-section">
        <div class="input-group">
          <label>HEX</label>
          <div class="input-with-btn">
            <input v-model="colorInput" type="text" class="input-field" aria-label="HEX 输入" />
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

      <div class="contrast-section">
        <h3>WCAG 对比度（以该颜色为背景）</h3>
        <div class="contrast-grid">
          <div
            v-for="item in contrastInfo"
            :key="item.label"
            class="contrast-card"
            :style="{ backgroundColor: currentHex, color: item.text }"
          >
            <span class="contrast-sample">Aa 示例文字</span>
            <span class="contrast-meta">{{ item.label }} · {{ item.ratioText }}:1</span>
            <span :class="['contrast-level', { fail: item.level === '不达标' }]">{{ item.level }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 配色方案 -->
    <div v-show="activeTab === 'schemes'" class="section">
      <div class="scheme">
        <h3>互补色</h3>
        <div class="color-row">
          <div class="color-box" :style="{ backgroundColor: currentHex }"></div>
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
.contrast-section {
  margin-top: 1.5rem;
}

.contrast-section h3 {
  font-size: 0.95rem;
  margin: 0 0 0.75rem;
}

.contrast-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.contrast-card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.contrast-sample {
  font-size: 1.25rem;
  font-weight: 700;
}

.contrast-meta {
  font-size: 0.85rem;
  font-family: var(--font-mono);
}

.contrast-level {
  align-self: flex-start;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  background: rgba(46, 204, 113, 0.9);
  color: #fff;
}

.contrast-level.fail {
  background: rgba(231, 76, 60, 0.9);
}

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

:root[data-theme='dark'] h2 {
  color: #ce93d8;
}

:root[data-theme='dark'] h3 {
  color: #e0e0e0;
}

:root[data-theme='dark'] .description {
  color: #a0a0a0;
}

:root[data-theme='dark'] .tab-btn {
  border-color: #664a7a;
  background-color: #2a2a3e;
  color: #a0a0a0;
}

:root[data-theme='dark'] .tab-btn:hover {
  border-color: #c792e0;
  color: #c792e0;
}

:root[data-theme='dark'] .tab-btn.active {
  background-color: #9c27b0;
  color: white;
}

:root[data-theme='dark'] .input-group label {
  color: #e0e0e0;
}

:root[data-theme='dark'] .input-field {
  background-color: #2a2a3e;
  color: #e0e0e0;
  border-color: #664a7a;
}

:root[data-theme='dark'] .input-field:focus {
  border-color: #c792e0;
  box-shadow: 0 0 0 3px rgba(199, 146, 224, 0.1);
}

:root[data-theme='dark'] .rgb-item label,
:root[data-theme='dark'] .hsl-item label {
  color: #a0a0a0;
}

:root[data-theme='dark'] .rgb-item input,
:root[data-theme='dark'] .hsl-item input {
  background-color: #2a2a3e;
  color: #e0e0e0;
  border-color: #664a7a;
}

:root[data-theme='dark'] .rgb-item input:focus,
:root[data-theme='dark'] .hsl-item input:focus {
  border-color: #c792e0;
}

:root[data-theme='dark'] .btn-copy {
  border-color: #c792e0;
  background-color: #2a2a3e;
  color: #c792e0;
}

:root[data-theme='dark'] .btn-copy:hover {
  background-color: #9c27b0;
  color: white;
}

:root[data-theme='dark'] .scheme,
:root[data-theme='dark'] .palette {
  background: #2a2a3e;
  border-color: #664a7a;
}

:root[data-theme='dark'] .color-box:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
}
</style>
