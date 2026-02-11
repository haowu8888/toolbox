<script setup>
import { ref, watch, computed, onMounted, onUnmounted, defineAsyncComponent, onErrorCaptured } from 'vue'
import { useTheme } from './composables/useTheme'
// 常驻UI组件保持静态导入
import CommandPalette from './components/CommandPalette.vue'
import ToastNotification from './components/ToastNotification.vue'

// 工具组件全部懒加载，按需加载减少首屏体积
const QRCodeGenerator = defineAsyncComponent(() => import('./components/QRCodeGenerator.vue'))
const JsonFormatter = defineAsyncComponent(() => import('./components/JsonFormatter.vue'))
const TextEncryption = defineAsyncComponent(() => import('./components/TextEncryption.vue'))
const EncodingTools = defineAsyncComponent(() => import('./components/EncodingTools.vue'))
const RegexTools = defineAsyncComponent(() => import('./components/RegexTools.vue'))
const MarkdownTools = defineAsyncComponent(() => import('./components/MarkdownTools.vue'))
const TimeTools = defineAsyncComponent(() => import('./components/TimeTools.vue'))
const ConversionTools = defineAsyncComponent(() => import('./components/ConversionTools.vue'))
const ColorTools = defineAsyncComponent(() => import('./components/ColorTools.vue'))
const ValidatorTools = defineAsyncComponent(() => import('./components/ValidatorTools.vue'))
const NetworkTools = defineAsyncComponent(() => import('./components/NetworkTools.vue'))
const NotesTools = defineAsyncComponent(() => import('./components/NotesTools.vue'))
const StoragePanel = defineAsyncComponent(() => import('./components/StoragePanel.vue'))
const SettingsPanel = defineAsyncComponent(() => import('./components/SettingsPanel.vue'))
const TextToolsAdvanced = defineAsyncComponent(() => import('./components/TextToolsAdvanced.vue'))
const CalculatorTool = defineAsyncComponent(() => import('./components/CalculatorTool.vue'))
const CodeFormatterTools = defineAsyncComponent(() => import('./components/CodeFormatterTools.vue'))
const FileConverterTools = defineAsyncComponent(() => import('./components/FileConverterTools.vue'))
const JwtDecoder = defineAsyncComponent(() => import('./components/JwtDecoder.vue'))
const CronParser = defineAsyncComponent(() => import('./components/CronParser.vue'))
const DiffTool = defineAsyncComponent(() => import('./components/DiffTool.vue'))
const DataGenerator = defineAsyncComponent(() => import('./components/DataGenerator.vue'))
const CssUnitConverter = defineAsyncComponent(() => import('./components/CssUnitConverter.vue'))
const ImageCompressor = defineAsyncComponent(() => import('./components/ImageCompressor.vue'))
const HtmlEntityConverter = defineAsyncComponent(() => import('./components/HtmlEntityConverter.vue'))
const LotteryTool = defineAsyncComponent(() => import('./components/LotteryTool.vue'))
const ConfigConverter = defineAsyncComponent(() => import('./components/ConfigConverter.vue'))

const { initTheme, isDark, toggleTheme } = useTheme()

const activeTab = ref('qrcode')
const componentError = ref(null)

// 错误边界：捕获子组件渲染错误，避免整个应用崩溃
onErrorCaptured((err) => {
  componentError.value = err.message || '组件加载失败'
  console.error('组件错误:', err)
  return false
})

// Hash routing
const toolIds = new Set()

const syncHashToTab = () => {
  const hash = window.location.hash.replace('#tool-', '')
  if (hash && toolIds.has(hash)) {
    activeTab.value = hash
  }
}

const onHashChange = () => {
  syncHashToTab()
}

onMounted(() => {
  initTheme()
  // Populate toolIds after tools array is ready
  tools.forEach(t => toolIds.add(t.id))
  syncHashToTab()
  window.addEventListener('hashchange', onHashChange)
})

onUnmounted(() => {
  window.removeEventListener('hashchange', onHashChange)
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
})

watch(activeTab, (newTab) => {
  componentError.value = null
  window.location.hash = `#tool-${newTab}`
})
const hoveredCategory = ref(null)
const expandedCategories = ref({
  '基础工具': false,
  '编码转换': false,
  '内容处理': false,
  '数据转换': false,
  '验证工具': false,
  '高级工具': false,
  '数据管理': false,
})

const tools = [
  { id: 'qrcode', name: '二维码', icon: '📱', color: '#ff6b6b' },
  { id: 'json', name: 'JSON', icon: '📄', color: '#4ecdc4' },
  { id: 'encrypt', name: '文本加密', icon: '🔐', color: '#9c27b0' },
  { id: 'encoding', name: '编码/解码', icon: '🔤', color: '#4ecdc4' },
  { id: 'regex', name: '正则表达式', icon: '🔍', color: '#ffa502' },
  { id: 'markdown', name: 'Markdown', icon: '📝', color: '#2196f3' },
  { id: 'time', name: '时间工具', icon: '⏰', color: '#2196f3' },
  { id: 'convert', name: '单位转换', icon: '🔄', color: '#ff6b6b' },
  { id: 'color', name: '颜色工具', icon: '🎨', color: '#9c27b0' },
  { id: 'validator', name: '数据验证', icon: '✔️', color: '#42b883' },
  { id: 'network', name: '网络工具', icon: '🌐', color: '#2196f3' },
  { id: 'notes', name: '笔记 & TODO', icon: '📝', color: '#9c27b0' },
  { id: 'textadvanced', name: '文本处理', icon: '✨', color: '#ff6b6b' },
  { id: 'calculator', name: '计算器', icon: '🧮', color: '#2196f3' },
  { id: 'codeformatter', name: '代码工具', icon: '💻', color: '#9c27b0' },
  { id: 'fileconverter', name: '文件转换', icon: '🔄', color: '#4ecdc4' },
  { id: 'jwt', name: 'JWT 解码', icon: '🔑', color: '#ff6b6b' },
  { id: 'cron', name: 'Cron解析', icon: '⏱️', color: '#e91e63' },
  { id: 'diff', name: '文本对比', icon: '📄', color: '#00bcd4' },
  { id: 'datagen', name: '数据生成', icon: '🎲', color: '#ff9800' },
  { id: 'cssunit', name: 'CSS单位', icon: '📐', color: '#607d8b' },
  { id: 'imgcompress', name: '图片压缩', icon: '🖼️', color: '#8bc34a' },
  { id: 'htmlentity', name: 'HTML实体', icon: '🔣', color: '#795548' },
  { id: 'configconvert', name: '配置转换', icon: '⚙️', color: '#ff9800' },
  { id: 'lottery', name: '抽奖工具', icon: '🎰', color: '#e91e63' },
  { id: 'storage', name: '历史/收藏', icon: '📚', color: '#4ecdc4' },
  { id: 'settings', name: '设置', icon: '⚙️', color: '#4ecdc4' },
]

// O(1) 查找，替代模板中的 tools.find()
const toolMap = new Map(tools.map(t => [t.id, t]))

const categoryGroups = [
  { category: '基础工具', ids: ['qrcode', 'json'] },
  { category: '编码转换', ids: ['encrypt', 'encoding', 'regex', 'jwt', 'htmlentity', 'configconvert'] },
  { category: '内容处理', ids: ['markdown', 'diff'] },
  { category: '数据转换', ids: ['time', 'convert', 'color', 'cssunit'] },
  { category: '验证工具', ids: ['validator', 'network', 'cron'] },
  { category: '高级工具', ids: ['textadvanced', 'calculator', 'codeformatter', 'fileconverter', 'datagen', 'imgcompress', 'lottery'] },
  { category: '数据管理', ids: ['notes', 'storage', 'settings'] },
]

const toolComponentMap = {
  qrcode: QRCodeGenerator,
  json: JsonFormatter,
  encrypt: TextEncryption,
  encoding: EncodingTools,
  regex: RegexTools,
  markdown: MarkdownTools,
  time: TimeTools,
  convert: ConversionTools,
  color: ColorTools,
  validator: ValidatorTools,
  network: NetworkTools,
  notes: NotesTools,
  textadvanced: TextToolsAdvanced,
  calculator: CalculatorTool,
  codeformatter: CodeFormatterTools,
  fileconverter: FileConverterTools,
  jwt: JwtDecoder,
  cron: CronParser,
  diff: DiffTool,
  datagen: DataGenerator,
  cssunit: CssUnitConverter,
  imgcompress: ImageCompressor,
  htmlentity: HtmlEntityConverter,
  configconvert: ConfigConverter,
  lottery: LotteryTool,
  storage: StoragePanel,
  settings: SettingsPanel,
}

const currentComponent = computed(() => toolComponentMap[activeTab.value])
const currentComponentProps = computed(() => {
  if (activeTab.value === 'settings') return { toolCount: tools.length }
  return {}
})

const toggleCategory = (category) => {
  // 如果点击的菜单已展开，则关闭它
  if (expandedCategories.value[category]) {
    expandedCategories.value[category] = false
  } else {
    // 关闭所有其他菜单，只展开点击的这个
    Object.keys(expandedCategories.value).forEach(key => {
      expandedCategories.value[key] = key === category
    })
  }
}

let closeTimer = null

const handleMouseEnter = (category) => {
  hoveredCategory.value = category
  // 清除之前的关闭计时器
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

const handleMouseLeave = (category) => {
  if (hoveredCategory.value === category) {
    // 延迟关闭菜单，给用户移动鼠标到菜单的时间
    closeTimer = setTimeout(() => {
      if (hoveredCategory.value === category) {
        expandedCategories.value[category] = false
        hoveredCategory.value = null
      }
    }, 300)
  }
}

const handleCommandSelect = (toolId) => {
  activeTab.value = toolId
}
</script>

<template>
  <div id="app">
    <!-- Toast 通知 -->
    <ToastNotification />

    <!-- 快捷搜索面板 -->
    <CommandPalette @select="handleCommandSelect" />

    <header class="header" role="banner">
      <div class="header-content">
        <div class="header-top">
          <h1>✨ 工具箱</h1>
          <button @click="toggleTheme" class="theme-toggle"
            :title="isDark ? '切换为亮色' : '切换为深色'"
            :aria-label="isDark ? '切换为亮色主题' : '切换为深色主题'">
            {{ isDark ? '☀️' : '🌙' }}
          </button>
        </div>
        <p class="subtitle">简单高效的在线工具集 | 免费 · 无需注册 · 隐私优先</p>
        <p class="hint">💡 快捷键：按 Ctrl+K (或 Cmd+K) 快速搜索工具</p>
      </div>
    </header>

    <nav class="nav" role="navigation" aria-label="工具导航">
      <div v-for="group in categoryGroups" :key="group.category" class="nav-group"
           @mouseenter="handleMouseEnter(group.category)"
           @mouseleave="handleMouseLeave(group.category)">
        <button
          class="category-btn"
          @click="toggleCategory(group.category)"
          :class="{ expanded: expandedCategories[group.category] }"
          :aria-expanded="expandedCategories[group.category]"
          :aria-label="`${group.category}分类`"
        >
          <span class="category-name">{{ group.category }}</span>
          <span class="expand-icon" aria-hidden="true">{{ expandedCategories[group.category] ? '▼' : '▶' }}</span>
        </button>
        <div v-show="expandedCategories[group.category]" class="nav-buttons" role="group"
             :aria-label="`${group.category}工具列表`"
             @mouseenter="handleMouseEnter(group.category)"
             @mouseleave="handleMouseLeave(group.category)">
          <button
            v-for="toolId in group.ids"
            :key="toolId"
            :class="['nav-btn', { active: activeTab === toolId }]"
            @click="activeTab = toolId; expandedCategories[group.category] = false"
            :style="{ '--btn-color': toolMap.get(toolId)?.color }"
            :aria-label="toolMap.get(toolId)?.name"
            :aria-current="activeTab === toolId ? 'page' : undefined"
          >
            <span class="nav-icon" aria-hidden="true">{{ toolMap.get(toolId)?.icon }}</span>
            <span class="nav-text">{{ toolMap.get(toolId)?.name }}</span>
          </button>
        </div>
      </div>
    </nav>

    <main class="content" role="main">
      <div class="tool-panel">
        <div v-if="componentError" class="error-boundary" role="alert">
          <p>{{ componentError }}</p>
          <button @click="componentError = null">重试</button>
        </div>
        <KeepAlive v-else :max="10">
          <component :is="currentComponent" :key="activeTab" v-bind="currentComponentProps" />
        </KeepAlive>
      </div>
    </main>

    <footer class="footer" role="contentinfo">
      <p>&copy; {{ new Date().getFullYear() }} 工具箱 | Made with ❤️ for developers | {{ tools.length }} 工具 | 完全隐私 | 离线可用</p>
    </footer>
  </div>
</template>

<style>
:root {
  --primary-color: #4ecdc4;
  --danger-color: #ff6b6b;
  --warning-color: #ffa502;
  --purple-color: #9c27b0;
  --blue-color: #2196f3;
}

:root[data-theme='dark'] {
  --bg-primary: #1a1a2e;
  --bg-secondary: #2a3a4a;
  --text-primary: #e0e0e0;
  --text-secondary: #a0c0e0;
  color: #e0e0e0;
}

[data-theme='dark'] .category-btn {
  color: #e0e0e0 !important;
  background: linear-gradient(135deg, #2a3a4a 0%, #34475f 100%) !important;
  border-color: #445566 !important;
}

[data-theme='dark'] .nav-buttons {
  background: rgba(78, 205, 196, 0.12) !important;
  border-color: #4ecdc4 !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3) !important;
}

[data-theme='dark'] .nav-btn {
  color: #c0c0c0 !important;
  background-color: #2d3d4d !important;
  border-color: #3a4a5a !important;
}

[data-theme='dark'] .nav-btn:hover {
  background-color: #3a4a5a !important;
  color: var(--btn-color, #ff6b6b) !important;
  border-color: #4a5a6a !important;
}

[data-theme='dark'] .nav-btn.active {
  color: white !important;
  background-color: var(--btn-color, #ff6b6b) !important;
  border-color: var(--btn-color, #ff6b6b) !important;
}

[data-theme='dark'] .header {
  color: #e0e0e0 !important;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%) !important;
}

[data-theme='dark'] .content {
  color: #e0e0e0 !important;
  background: #1a1a2e !important;
  border-color: #2a3a4a;
}

[data-theme='dark'] .subtitle {
  color: #a0c0e0 !important;
}

[data-theme='dark'] .hint {
  color: #8ab0d0 !important;
}

[data-theme='dark'] .footer {
  color: #8ab0d0 !important;
  border-top-color: #2a3a4a;
}

[data-theme='dark'] .category-name,
[data-theme='dark'] .nav-text {
  color: inherit !important;
}
</style>

<style scoped>
.header {
  background: linear-gradient(135deg, #ffd4e5 0%, #fff9f0 50%, #e0f7ff 100%);
  padding: 2rem;
  text-align: center;
  margin-bottom: 2rem;
  border-bottom: 3px solid transparent;
  border-image: linear-gradient(90deg, #ff6b6b, #4ecdc4, #ffa502) 1;
  animation: fadeInDown 0.6s ease-out;
  position: relative;
  color: #333;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.header-content {
  max-width: 800px;
  margin: 0 auto;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1rem;
  position: relative;
}

.header h1 {
  margin: 0;
  font-size: 3em;
  background: linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 50%, #ffa502 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 800;
  letter-spacing: 2px;
}


.theme-toggle {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 2px solid #ffd4e5;
  background: white;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}


.theme-toggle:hover {
  transform: scale(1.1) rotate(20deg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.subtitle {
  margin: 0.5rem 0 0 0;
  color: #555;
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: 0.5px;
}


.hint {
  margin: 0.5rem 0 0 0;
  color: #999;
  font-size: 0.85rem;
  font-style: italic;
}


.nav {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  animation: fadeInUp 0.6s ease-out 0.2s both;
  position: relative;
  z-index: 100;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  position: relative;
}

.category-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.8rem;
  background: linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%);
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #333;
}


.category-btn:hover {
  border-color: #4ecdc4;
  box-shadow: 0 4px 12px rgba(78, 205, 196, 0.15);
}

.category-btn.expanded {
  border-color: #4ecdc4;
  background: linear-gradient(135deg, #e8f9f8 0%, #f0fdfb 100%);
}


.category-name {
  flex: 1;
  text-align: left;
}

.expand-icon {
  font-size: 0.7rem;
  transition: transform 0.3s;
  margin-left: 0.3rem;
}

.category-btn.expanded .expand-icon {
  transform: rotate(0deg);
}

.nav-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-start;
  padding: 0.75rem 0 0.75rem 1.5rem;
  margin-left: 0;
  margin-top: 0;
  border-left: 3px solid #4ecdc4;
  border-radius: 0 8px 8px 0;
  animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(78, 205, 196, 0.04);
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 300px;
  z-index: 1000;
  margin-top: 0.3rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(78, 205, 196, 0.2);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}


.nav-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1rem;
  border: 1.5px solid #e8e8e8;
  background-color: #fafafa;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  color: #555;
}


.nav-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #d0d0d0;
  background-color: white;
  color: var(--btn-color, #ff6b6b);
}

.nav-btn.active {
  border-color: var(--btn-color, #ff6b6b);
  color: white;
  font-weight: 600;
  background: linear-gradient(135deg, var(--btn-color, #ff6b6b) 0%, var(--btn-color, #ff6b6b) 100%);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.nav-icon {
  font-size: 0.95em;
}

.nav-text {
  white-space: nowrap;
}

.content {
  background: white;
  border-radius: 16px;
  padding: 2.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 107, 107, 0.08);
  animation: fadeIn 0.6s ease-in-out 0.3s both;
  color: #333;
  position: relative;
  z-index: 1;
}


@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.tool-panel {
  animation: fadeIn 0.3s ease-in-out;
}

.error-boundary {
  text-align: center;
  padding: 3rem 2rem;
  color: #ff6b6b;
}

.error-boundary p {
  font-size: 1.1rem;
  margin-bottom: 1rem;
}

.error-boundary button {
  background: #4ecdc4;
  color: white;
  border: none;
  padding: 0.6rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
}

.footer {
  text-align: center;
  color: #999;
  font-size: 0.9em;
  padding-top: 1.5rem;
  border-top: 2px solid #f0f0f0;
  animation: fadeIn 0.6s ease-in-out 0.4s both;
}


@media (max-width: 1024px) {
  .header h1 {
    font-size: 2.2em;
  }

  .content {
    padding: 1.5rem;
  }

  .nav-buttons {
    padding: 0;
    min-width: 280px;
  }

  .category-btn {
    padding: 0.45rem 0.7rem;
    font-size: 0.8rem;
  }

  .nav-btn {
    padding: 0.45rem 0.8rem;
    font-size: 0.75rem;
  }

  .expand-icon {
    font-size: 0.65rem;
  }

  .nav-icon {
    font-size: 0.9em;
  }
}

@media (max-width: 768px) {
  .header {
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .header h1 {
    font-size: 1.8em;
  }

  .header-top {
    gap: 1rem;
  }

  .theme-toggle {
    width: 40px;
    height: 40px;
    font-size: 1.2rem;
  }

  .subtitle,
  .hint {
    font-size: 0.85rem;
  }

  .nav {
    gap: 0.4rem;
    margin-bottom: 1rem;
  }

  .group-title {
    font-size: 0.75rem;
    padding: 0 0.5rem;
  }

  .nav-buttons {
    gap: 0.35rem;
    min-width: 250px;
  }

  .category-btn {
    padding: 0.4rem 0.6rem;
    font-size: 0.75rem;
  }

  .nav-btn {
    padding: 0.4rem 0.7rem;
    font-size: 0.7rem;
  }

  .expand-icon {
    font-size: 0.6rem;
  }

  .nav-icon {
    font-size: 0.85em;
  }

  .content {
    padding: 1.25rem;
    margin-bottom: 1.5rem;
  }
}

@media (max-width: 480px) {
  .header h1 {
    font-size: 1.5em;
  }

  .header-top {
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .subtitle,
  .hint {
    font-size: 0.75rem;
  }

  .nav {
    gap: 0.3rem;
  }

  .nav-buttons {
    gap: 0.25rem;
    min-width: 220px;
    padding: 0.5rem 0 0.5rem 1rem;
  }

  .category-btn {
    padding: 0.35rem 0.5rem;
    font-size: 0.65rem;
  }

  .nav-btn {
    padding: 0.35rem 0.6rem;
    font-size: 0.65rem;
  }

  .expand-icon {
    font-size: 0.55rem;
  }

  .nav-text {
    display: none;
  }

  .nav-icon {
    font-size: 0.8em;
  }

  .content {
    padding: 1rem;
  }
}
</style>
