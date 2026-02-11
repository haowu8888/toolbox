<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()

// ===== Tab =====
const activeTab = ref('quick')

// ===== Wheel Colors (premium palette) =====
const wheelColors = [
  '#E74C3C', '#3498DB', '#2ECC71', '#F39C12',
  '#9B59B6', '#1ABC9C', '#E67E22', '#2C3E50',
  '#E91E63', '#00BCD4', '#8BC34A', '#FF9800',
  '#673AB7', '#009688', '#FF5722', '#607D8B',
]

// ===== Preset Templates =====
const presetTemplates = [
  { label: '是/否', items: '是\n否', icon: '✅' },
  { label: '1-10', items: Array.from({ length: 10 }, (_, i) => i + 1).join('\n'), icon: '🔢' },
  { label: '石头剪刀布', items: '石头\n剪刀\n布', icon: '✊' },
  { label: '今天吃什么', items: '火锅\n烧烤\n炒菜\n面条\n饺子\n汉堡\n披萨\n寿司\n沙拉\n麻辣烫', icon: '🍕' },
  { label: '选谁来干', items: '张三\n李四\n王五\n赵六\n钱七', icon: '👤' },
  { label: '年会抽奖', items: '特等奖\n一等奖\n二等奖\n三等奖\n安慰奖', icon: '🏆' },
]

// ===== Custom Templates =====
const customTemplates = ref([])
const newTemplatesCount = ref(0)
const showTemplateModal = ref(false)
const newTemplateName = ref('')
const newTemplateItems = ref('')

const loadCustomTemplates = () => {
  try {
    const saved = localStorage.getItem('toolbox_lottery_templates')
    if (saved) customTemplates.value = JSON.parse(saved)
  } catch { customTemplates.value = [] }
}

const saveCustomTemplates = () => {
  localStorage.setItem('toolbox_lottery_templates', JSON.stringify(customTemplates.value))
}

const addCustomTemplate = () => {
  const name = newTemplateName.value.trim()
  const items = newTemplateItems.value.trim()
  if (!name) { showToast('请输入模板名称', 'info'); return }
  if (!items) { showToast('请输入模板内容', 'info'); return }
  if (customTemplates.value.some(t => t.name === name)) {
    showToast('模板名称已存在', 'error'); return
  }
  customTemplates.value.push({
    id: Date.now(), name, items,
    createdAt: new Date().toLocaleDateString(),
  })
  saveCustomTemplates()
  newTemplateName.value = ''
  newTemplateItems.value = ''
  showTemplateModal.value = false
  showToast('模板已保存')
  newTemplatesCount.value++
}

const deleteCustomTemplate = (id) => {
  customTemplates.value = customTemplates.value.filter(t => t.id !== id)
  saveCustomTemplates()
  showToast('模板已删除')
}

const editingTemplate = ref(null)
const editTemplateName = ref('')
const editTemplateItems = ref('')

const startEditTemplate = (tpl) => {
  editingTemplate.value = tpl.id
  editTemplateName.value = tpl.name
  editTemplateItems.value = tpl.items
}

const saveEditTemplate = () => {
  const name = editTemplateName.value.trim()
  const items = editTemplateItems.value.trim()
  if (!name || !items) { showToast('名称和内容不能为空', 'info'); return }
  const tpl = customTemplates.value.find(t => t.id === editingTemplate.value)
  if (tpl) {
    tpl.name = name
    tpl.items = items
    saveCustomTemplates()
    showToast('模板已更新')
  }
  editingTemplate.value = null
}

const cancelEditTemplate = () => { editingTemplate.value = null }

const applyTemplate = (items) => {
  quickInput.value = items
  quickResult.value = []
  quickWinnerIndex.value = -1
  nextTick(() => scheduleRedraw('quick'))
  showToast('已应用模板')
}

const saveCurrentAsTemplate = () => {
  if (!quickInput.value.trim()) {
    showToast('当前没有可保存的内容', 'info')
    return
  }
  newTemplateItems.value = quickInput.value
  newTemplateName.value = ''
  showTemplateModal.value = true
}

// ===== Quick Lottery State =====
const quickInput = ref('')
const drawCount = ref(1)
const allowDuplicate = ref(false)
const quickResult = ref([])
const isQuickSpinning = ref(false)
const quickWinnerIndex = ref(-1)

const quickItems = computed(() => {
  return quickInput.value.split('\n').map(s => s.trim()).filter(Boolean)
})

// ===== Advanced Lottery State =====
const weightedItems = ref([
  { name: '一等奖', weight: 1, limit: 1 },
  { name: '二等奖', weight: 3, limit: 3 },
  { name: '三等奖', weight: 6, limit: 5 },
  { name: '谢谢参与', weight: 10, limit: 0 },
])
const advancedResult = ref([])
const isAdvancedSpinning = ref(false)
const advancedWinnerIndex = ref(-1)
const newItemName = ref('')
const newItemWeight = ref(1)
const newItemLimit = ref(0)

const totalWeight = computed(() => weightedItems.value.reduce((s, i) => s + i.weight, 0))

const addWeightedItem = () => {
  const name = newItemName.value.trim()
  if (!name) { showToast('请输入奖品名称', 'info'); return }
  if (weightedItems.value.some(i => i.name === name)) {
    showToast('奖品名称已存在', 'error'); return
  }
  weightedItems.value.push({
    name,
    weight: Math.max(1, Math.round(newItemWeight.value)),
    limit: Math.max(0, Math.round(newItemLimit.value)),
  })
  newItemName.value = ''
  newItemWeight.value = 1
  newItemLimit.value = 0
  nextTick(() => scheduleRedraw('advanced'))
}

const removeWeightedItem = (index) => {
  weightedItems.value.splice(index, 1)
  nextTick(() => scheduleRedraw('advanced'))
}

const weightPercentage = (item) => {
  if (totalWeight.value === 0) return 0
  return ((item.weight / totalWeight.value) * 100).toFixed(1)
}

// ===== Records =====
const records = ref([])
const newRecordsCount = ref(0)

const loadRecords = () => {
  try {
    const saved = localStorage.getItem('toolbox_lottery_records')
    if (saved) records.value = JSON.parse(saved)
  } catch { records.value = [] }
}

const saveRecords = () => {
  try {
    localStorage.setItem('toolbox_lottery_records', JSON.stringify(records.value))
  } catch (e) { console.error('保存抽奖记录失败', e) }
}

const addRecord = (mode, items, results) => {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const time = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  records.value.unshift({
    id: Date.now(), time, mode,
    items: items.slice(0, 10),
    results,
    drawCount: results.length,
  })
  if (records.value.length > 100) records.value = records.value.slice(0, 100)
  saveRecords()
  newRecordsCount.value++
}

const clearRecords = () => {
  records.value = []
  saveRecords()
  showToast('抽奖记录已清空')
}

// ===== Confetti =====
const showConfetti = ref(false)
const confettiParticles = ref([])

const triggerConfetti = () => {
  showConfetti.value = true
  confettiParticles.value = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1.2 + Math.random() * 1.5,
    color: wheelColors[Math.floor(Math.random() * wheelColors.length)],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
  }))
  setTimeout(() => { showConfetti.value = false }, 3500)
}

// ===== Canvas Drawing =====
const quickCanvasRef = ref(null)
const advancedCanvasRef = ref(null)
let quickRotation = 0
let advancedRotation = 0
let quickAnimId = null
let advancedAnimId = null
let quickLightPhase = 0
let advancedLightPhase = 0

const isDarkMode = () => document.documentElement.getAttribute('data-theme') === 'dark'

const drawWheel = (canvas, segments, rotation, options = {}) => {
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  if (rect.width === 0) return

  const dpr = window.devicePixelRatio || 1
  const size = rect.width
  canvas.width = size * dpr
  canvas.height = size * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const cx = size / 2
  const cy = size / 2
  const outerR = cx - 24
  const innerR = 32
  const dark = isDarkMode()
  const n = segments.length
  if (n === 0) {
    // Decorative empty placeholder wheel
    const placeholderColors = dark
      ? ['#2a2040', '#252545', '#2a3040', '#302540', '#253040', '#2a2535', '#302a40', '#253540']
      : ['#f8e0e6', '#e0e8f8', '#e0f5e8', '#f8f0e0', '#f0e0f8', '#e0f0f0', '#f5e8e0', '#e8e0f5']
    const pn = placeholderColors.length
    const pAngle = (Math.PI * 2) / pn

    // Outer ring (muted)
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, outerR + 16, 0, Math.PI * 2)
    ctx.arc(cx, cy, outerR + 2, 0, Math.PI * 2, true)
    ctx.fillStyle = dark ? '#1a1a28' : '#ddd'
    ctx.fill()
    ctx.restore()

    // Placeholder segments
    for (let i = 0; i < pn; i++) {
      const sa = i * pAngle - Math.PI / 2
      const ea = sa + pAngle
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, outerR, sa, ea)
      ctx.closePath()
      ctx.fillStyle = placeholderColors[i]
      ctx.fill()
      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    // Dashed lines for "empty" feel
    ctx.save()
    ctx.setLineDash([6, 6])
    for (let i = 0; i < pn; i++) {
      const a = i * pAngle - Math.PI / 2
      ctx.beginPath()
      ctx.moveTo(cx + 50 * Math.cos(a), cy + 50 * Math.sin(a))
      ctx.lineTo(cx + outerR * Math.cos(a), cy + outerR * Math.sin(a))
      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
    ctx.setLineDash([])
    ctx.restore()

    // Inner shadow
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
    const emptyShadow = ctx.createRadialGradient(cx, cy, outerR - 40, cx, cy, outerR)
    emptyShadow.addColorStop(0, 'rgba(0,0,0,0)')
    emptyShadow.addColorStop(1, dark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)')
    ctx.fillStyle = emptyShadow
    ctx.fill()
    ctx.restore()

    // Center hub (muted)
    ctx.save()
    const emptyHubR = innerR + 12
    ctx.beginPath()
    ctx.arc(cx, cy, emptyHubR, 0, Math.PI * 2)
    const emptyHubGrad = ctx.createRadialGradient(cx - 3, cy - 3, 0, cx, cy, emptyHubR)
    emptyHubGrad.addColorStop(0, dark ? '#3a3a50' : '#f0f0f0')
    emptyHubGrad.addColorStop(1, dark ? '#25253a' : '#ddd')
    ctx.fillStyle = emptyHubGrad
    ctx.fill()
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // "?" text in center
    ctx.font = `bold 22px "Microsoft YaHei", sans-serif`
    ctx.fillStyle = dark ? '#555' : '#bbb'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('?', cx, cy)
    ctx.restore()

    // Pointer (muted)
    ctx.save()
    const epTipY = cy - outerR + 2
    ctx.beginPath()
    ctx.moveTo(cx, epTipY)
    ctx.lineTo(cx - 12, epTipY - 24)
    ctx.lineTo(cx + 12, epTipY - 24)
    ctx.closePath()
    ctx.fillStyle = dark ? '#3a3040' : '#ddd'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx, epTipY - 24, 4, 0, Math.PI * 2)
    ctx.fillStyle = dark ? '#4a4050' : '#ccc'
    ctx.fill()
    ctx.restore()

    return
  }

  // === Outer dark ring ===
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, outerR + 16, 0, Math.PI * 2)
  ctx.arc(cx, cy, outerR + 2, 0, Math.PI * 2, true)
  const ringGrad = ctx.createRadialGradient(cx, cy, outerR + 2, cx, cy, outerR + 16)
  ringGrad.addColorStop(0, dark ? '#1a1a2e' : '#2c3e50')
  ringGrad.addColorStop(0.5, dark ? '#252540' : '#34495e')
  ringGrad.addColorStop(1, dark ? '#1a1a2e' : '#2c3e50')
  ctx.fillStyle = ringGrad
  ctx.fill()
  ctx.restore()

  // === Light bulbs ===
  const numLights = Math.max(20, n * 3)
  for (let i = 0; i < numLights; i++) {
    const a = (i / numLights) * Math.PI * 2 - Math.PI / 2
    const lx = cx + (outerR + 9) * Math.cos(a)
    const ly = cy + (outerR + 9) * Math.sin(a)
    const lit = options.spinning
      ? (i + (options.lightPhase || 0)) % 3 === 0
      : true

    ctx.beginPath()
    ctx.arc(lx, ly, 3.5, 0, Math.PI * 2)
    if (lit) {
      ctx.fillStyle = '#FFD700'
      ctx.shadowColor = '#FFD700'
      ctx.shadowBlur = 6
    } else {
      ctx.fillStyle = dark ? '#3a3a4a' : '#5a4a2a'
      ctx.shadowBlur = 0
    }
    ctx.fill()
    ctx.shadowBlur = 0
  }

  // === Segments ===
  let angleOffset = 0
  for (let i = 0; i < n; i++) {
    const seg = segments[i]
    const sa = rotation + angleOffset - Math.PI / 2
    const ea = sa + seg.angle

    // Fill
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, outerR, sa, ea)
    ctx.closePath()

    // Subtle gradient
    const midA = sa + seg.angle / 2
    const gx = cx + outerR * 0.5 * Math.cos(midA)
    const gy = cy + outerR * 0.5 * Math.sin(midA)
    const grad = ctx.createRadialGradient(cx, cy, innerR, gx, gy, outerR)
    const baseColor = seg.color
    grad.addColorStop(0, lightenColor(baseColor, 25))
    grad.addColorStop(1, baseColor)
    ctx.fillStyle = grad
    ctx.fill()

    // Winner glow
    if (options.winnerIndex === i && !options.spinning) {
      ctx.save()
      ctx.shadowColor = '#FFD700'
      ctx.shadowBlur = 20
      ctx.strokeStyle = '#FFD700'
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.restore()
    }

    // Border
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.35)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Text
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(sa + seg.angle / 2)
    const maxChars = n <= 6 ? 8 : n <= 12 ? 6 : 4
    let text = seg.label
    if (text.length > maxChars) text = text.substring(0, maxChars - 1) + '…'
    const fontSize = n <= 6 ? 15 : n <= 10 ? 13 : n <= 16 ? 11 : 9
    ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0,0,0,0.6)'
    ctx.shadowBlur = 3
    ctx.fillText(text, outerR * 0.62, 0)
    ctx.shadowBlur = 0
    ctx.restore()

    angleOffset += seg.angle
  }

  // === Inner shadow ring ===
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
  const innerShadow = ctx.createRadialGradient(cx, cy, outerR - 30, cx, cy, outerR)
  innerShadow.addColorStop(0, 'rgba(0,0,0,0)')
  innerShadow.addColorStop(1, 'rgba(0,0,0,0.15)')
  ctx.fillStyle = innerShadow
  ctx.fill()
  ctx.restore()

  // === Center hub ===
  ctx.save()
  const hubR = innerR + 12
  const hubGrad = ctx.createRadialGradient(cx - 5, cy - 5, 0, cx, cy, hubR)
  hubGrad.addColorStop(0, '#FFF8DC')
  hubGrad.addColorStop(0.3, '#FFD700')
  hubGrad.addColorStop(0.7, '#DAA520')
  hubGrad.addColorStop(1, '#B8860B')
  ctx.beginPath()
  ctx.arc(cx, cy, hubR, 0, Math.PI * 2)
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur = 10
  ctx.fillStyle = hubGrad
  ctx.fill()
  ctx.shadowBlur = 0

  // Hub border
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = 2
  ctx.stroke()

  // Center text
  const centerText = options.centerText || 'GO'
  const ctxFontSize = centerText.length > 3 ? 11 : centerText.length > 2 ? 13 : 16
  ctx.font = `bold ${ctxFontSize}px "Microsoft YaHei", sans-serif`
  ctx.fillStyle = '#5D4037'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(255,255,255,0.4)'
  ctx.shadowBlur = 1
  ctx.fillText(centerText, cx, cy)
  ctx.restore()

  // === Pointer (triangle at top) ===
  ctx.save()
  const pTipY = cy - outerR + 2
  ctx.beginPath()
  ctx.moveTo(cx, pTipY)
  ctx.lineTo(cx - 14, pTipY - 28)
  ctx.lineTo(cx + 14, pTipY - 28)
  ctx.closePath()
  const pGrad = ctx.createLinearGradient(cx, pTipY - 28, cx, pTipY)
  pGrad.addColorStop(0, '#C0392B')
  pGrad.addColorStop(1, '#E74C3C')
  ctx.fillStyle = pGrad
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur = 6
  ctx.fill()
  ctx.strokeStyle = '#FFD700'
  ctx.lineWidth = 2
  ctx.stroke()
  // Small circle at pointer base
  ctx.beginPath()
  ctx.arc(cx, pTipY - 28, 5, 0, Math.PI * 2)
  ctx.fillStyle = '#FFD700'
  ctx.fill()
  ctx.restore()
}

// Color utility
function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + Math.round(2.55 * percent))
  const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(2.55 * percent))
  const b = Math.min(255, (num & 0x0000FF) + Math.round(2.55 * percent))
  return `rgb(${r},${g},${b})`
}

// ===== Quick Wheel Helpers =====
const buildQuickSegments = () => {
  const items = quickItems.value
  if (items.length === 0) return []
  const angle = (Math.PI * 2) / items.length
  return items.map((item, i) => ({
    label: item,
    angle,
    color: wheelColors[i % wheelColors.length],
  }))
}

const redrawQuickWheel = () => {
  const segs = buildQuickSegments()
  drawWheel(quickCanvasRef.value, segs, quickRotation, {
    spinning: isQuickSpinning.value,
    lightPhase: quickLightPhase,
    winnerIndex: quickWinnerIndex.value,
    centerText: isQuickSpinning.value ? '···' : (quickWinnerIndex.value >= 0 ? '🎉' : 'GO'),
  })
}

// ===== Advanced Wheel Helpers =====
const buildAdvancedSegments = () => {
  const items = weightedItems.value
  if (items.length === 0 || totalWeight.value === 0) return []
  return items.map((item, i) => ({
    label: item.name,
    angle: (item.weight / totalWeight.value) * Math.PI * 2,
    color: wheelColors[i % wheelColors.length],
  }))
}

const redrawAdvancedWheel = () => {
  const segs = buildAdvancedSegments()
  drawWheel(advancedCanvasRef.value, segs, advancedRotation, {
    spinning: isAdvancedSpinning.value,
    lightPhase: advancedLightPhase,
    winnerIndex: advancedWinnerIndex.value,
    centerText: isAdvancedSpinning.value ? '···' : (advancedWinnerIndex.value >= 0 ? '🎉' : 'GO'),
  })
}

const scheduleRedraw = (which) => {
  nextTick(() => requestAnimationFrame(() => {
    if (which === 'quick') redrawQuickWheel()
    else redrawAdvancedWheel()
  }))
}

// ===== Quick Spin Animation =====
const startQuickSpin = () => {
  const items = quickItems.value
  if (items.length < 2) { showToast('至少需要 2 个选项', 'info'); return }

  const count = Math.min(drawCount.value, allowDuplicate.value ? 999 : items.length)
  if (count <= 0) { showToast('抽取数量无效', 'info'); return }
  if (!allowDuplicate.value && count > items.length) {
    showToast(`选项只有 ${items.length} 个，无法不重复抽取 ${drawCount.value} 个`, 'error')
    return
  }

  // Determine winners
  let winners = []
  if (allowDuplicate.value) {
    for (let i = 0; i < count; i++) winners.push(items[Math.floor(Math.random() * items.length)])
  } else {
    const pool = [...items]
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * pool.length)
      winners.push(pool[idx])
      pool.splice(idx, 1)
    }
  }

  // Wheel targets first winner
  const winnerIdx = items.indexOf(winners[0])
  isQuickSpinning.value = true
  quickResult.value = []
  quickWinnerIndex.value = -1

  const n = items.length
  const sliceAngle = (Math.PI * 2) / n
  const startRot = quickRotation
  // Target: the pointer (at -PI/2) should point to the center of winnerIdx's segment
  // Segment i center is at rotation + (i+0.5)*sliceAngle - PI/2 = pointer angle -PI/2
  // So we need: finalRotation mod 2PI = 2PI - (winnerIdx+0.5)*sliceAngle
  const targetAngle = (Math.PI * 2) - (winnerIdx + 0.5) * sliceAngle
  const currentAngle = ((startRot % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  let delta = targetAngle - currentAngle
  if (delta < 0) delta += Math.PI * 2
  const fullSpins = 5 + Math.floor(Math.random() * 4)
  const totalRot = fullSpins * Math.PI * 2 + delta
  const startTime = performance.now()
  const duration = 4000 + Math.random() * 1500

  const animate = (now) => {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3.5)
    quickRotation = startRot + eased * totalRot
    quickLightPhase++
    redrawQuickWheel()

    if (progress < 1) {
      quickAnimId = requestAnimationFrame(animate)
    } else {
      isQuickSpinning.value = false
      quickWinnerIndex.value = winnerIdx
      quickResult.value = winners
      redrawQuickWheel()
      triggerConfetti()
      addRecord('快速抽奖', items, winners)
      addHistory('抽奖工具', `快速抽奖: ${winners.join(', ')}`)
    }
  }

  if (quickAnimId) cancelAnimationFrame(quickAnimId)
  quickAnimId = requestAnimationFrame(animate)
}

// ===== Advanced Spin Animation =====
const startAdvancedSpin = () => {
  const items = weightedItems.value
  if (items.length === 0) { showToast('请先添加奖品', 'info'); return }
  if (totalWeight.value === 0) { showToast('所有奖品权重为 0', 'error'); return }

  // Weighted random
  const rand = Math.random() * totalWeight.value
  let cumulative = 0
  let winnerIdx = 0
  for (let i = 0; i < items.length; i++) {
    cumulative += items[i].weight
    if (rand < cumulative) { winnerIdx = i; break }
  }

  isAdvancedSpinning.value = true
  advancedResult.value = []
  advancedWinnerIndex.value = -1

  // Calculate target angle for weighted segments
  let winnerCenterAngle = 0
  for (let i = 0; i < winnerIdx; i++) {
    winnerCenterAngle += (items[i].weight / totalWeight.value) * Math.PI * 2
  }
  winnerCenterAngle += (items[winnerIdx].weight / totalWeight.value) * Math.PI

  const startRot = advancedRotation
  const targetAngle = (Math.PI * 2) - winnerCenterAngle
  const currentAngle = ((startRot % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  let delta = targetAngle - currentAngle
  if (delta < 0) delta += Math.PI * 2
  const fullSpins = 5 + Math.floor(Math.random() * 4)
  const totalRot = fullSpins * Math.PI * 2 + delta

  const startTime = performance.now()
  const duration = 4500 + Math.random() * 1500

  const animate = (now) => {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3.5)
    advancedRotation = startRot + eased * totalRot
    advancedLightPhase++
    redrawAdvancedWheel()

    if (progress < 1) {
      advancedAnimId = requestAnimationFrame(animate)
    } else {
      isAdvancedSpinning.value = false
      advancedWinnerIndex.value = winnerIdx
      advancedResult.value = [items[winnerIdx].name]
      redrawAdvancedWheel()
      triggerConfetti()
      const names = items.map(i => i.name)
      addRecord('高级抽奖', names, [items[winnerIdx].name])
      addHistory('抽奖工具', `高级抽奖: ${items[winnerIdx].name}`)
    }
  }

  if (advancedAnimId) cancelAnimationFrame(advancedAnimId)
  advancedAnimId = requestAnimationFrame(animate)
}

// ===== Resize handling =====
let resizeTimer = null
const handleResize = () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    if (activeTab.value === 'quick' && !isQuickSpinning.value) redrawQuickWheel()
    if (activeTab.value === 'advanced' && !isAdvancedSpinning.value) redrawAdvancedWheel()
  }, 200)
}

// ===== Watchers =====
watch(quickItems, () => {
  if (!isQuickSpinning.value) {
    quickWinnerIndex.value = -1
    quickResult.value = []
    scheduleRedraw('quick')
  }
})

watch(() => weightedItems.value.map(i => `${i.name}:${i.weight}`).join(','), () => {
  if (!isAdvancedSpinning.value) {
    advancedWinnerIndex.value = -1
    advancedResult.value = []
    scheduleRedraw('advanced')
  }
})

watch(activeTab, (tab) => {
  if (tab === 'quick') scheduleRedraw('quick')
  if (tab === 'advanced') scheduleRedraw('advanced')
  if (tab === 'records') newRecordsCount.value = 0
  if (tab === 'templates') newTemplatesCount.value = 0
})

// ===== Lifecycle =====
onMounted(() => {
  loadRecords()
  loadCustomTemplates()
  scheduleRedraw('quick')
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (quickAnimId) cancelAnimationFrame(quickAnimId)
  if (advancedAnimId) cancelAnimationFrame(advancedAnimId)
  window.removeEventListener('resize', handleResize)
  clearTimeout(resizeTimer)
})
</script>

<template>
  <div class="lottery-tool">
    <div class="page-header">
      <h2>幸运转盘</h2>
      <p class="description">自定义奖池，华丽转盘动画，支持快速抽奖和加权抽奖</p>
    </div>

    <!-- Tab 切换 -->
    <div class="mode-tabs">
      <button :class="['tab-btn', { active: activeTab === 'quick' }]" @click="activeTab = 'quick'">
        <span class="tab-icon">🎯</span> 快速抽奖
      </button>
      <button :class="['tab-btn', { active: activeTab === 'advanced' }]" @click="activeTab = 'advanced'">
        <span class="tab-icon">🏆</span> 高级抽奖
      </button>
      <button :class="['tab-btn', { active: activeTab === 'templates' }]" @click="activeTab = 'templates'">
        <span class="tab-icon">📋</span> 模板管理
        <span v-if="newTemplatesCount > 0" class="badge tpl-badge">{{ newTemplatesCount }}</span>
      </button>
      <button :class="['tab-btn', { active: activeTab === 'records' }]" @click="activeTab = 'records'">
        <span class="tab-icon">📊</span> 抽奖记录
        <span v-if="newRecordsCount > 0" class="badge">{{ newRecordsCount }}</span>
      </button>
    </div>

    <!-- ========== 快速抽奖 ========== -->
    <div v-show="activeTab === 'quick'" class="tab-content">
      <!-- 模板 -->
      <div class="template-bar">
        <span class="template-label">快捷模板</span>
        <div class="template-scroll">
          <button v-for="tpl in presetTemplates" :key="tpl.label" class="tpl-chip" @click="applyTemplate(tpl.items)">
            {{ tpl.icon }} {{ tpl.label }}
          </button>
          <button v-for="tpl in customTemplates" :key="tpl.id" class="tpl-chip custom-chip" @click="applyTemplate(tpl.items)">
            ⭐ {{ tpl.name }}
          </button>
        </div>
      </div>

      <!-- 紧凑输入区 -->
      <div class="quick-input-bar">
        <div class="input-col">
          <div class="input-header">
            <label class="input-label">选项（每行一个）</label>
            <button v-if="quickItems.length > 0" class="btn-save-tpl" @click="saveCurrentAsTemplate">
              💾 存为模板
            </button>
          </div>
          <textarea
            v-model="quickInput"
            placeholder="选项A&#10;选项B&#10;选项C&#10;..."
            class="input-textarea"
            rows="3"
          ></textarea>
        </div>
        <div class="settings-col">
          <div class="setting-item">
            <label>🎲 数量</label>
            <input v-model.number="drawCount" type="number" min="1" max="100" class="config-input" />
          </div>
          <div class="setting-item">
            <label>🔁 重复</label>
            <button class="toggle-btn" :class="{ on: allowDuplicate }" @click="allowDuplicate = !allowDuplicate">
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
              {{ allowDuplicate ? '是' : '否' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 选项预览标签 -->
      <div v-if="quickItems.length > 0" class="items-preview">
        <div class="items-preview-tags">
          <span class="items-preview-count">{{ quickItems.length }} 项</span>
          <span
            v-for="(item, idx) in quickItems.slice(0, 24)"
            :key="idx"
            class="preview-tag"
            :style="{ '--tag-color': wheelColors[idx % wheelColors.length] }"
          >
            <span class="preview-tag-dot"></span>
            {{ item }}
          </span>
          <span v-if="quickItems.length > 24" class="preview-more">
            +{{ quickItems.length - 24 }}...
          </span>
        </div>
      </div>

      <!-- 转盘舞台（全宽） -->
      <div class="wheel-stage">
        <div class="stage-glow"></div>
        <div class="wheel-wrapper">
          <canvas
            ref="quickCanvasRef"
            class="wheel-canvas"
            @click="!isQuickSpinning && quickItems.length >= 2 && startQuickSpin()"
            :class="{ clickable: !isQuickSpinning && quickItems.length >= 2 }"
          ></canvas>
          <div v-if="quickItems.length < 2 && !isQuickSpinning" class="wheel-hint">
            <span class="wheel-hint-icon">🎡</span>
            <span class="wheel-hint-text">请输入至少 2 个选项</span>
            <span class="wheel-hint-sub">或点击上方模板快速开始</span>
          </div>
        </div>
        <button
          class="spin-btn"
          :class="{ spinning: isQuickSpinning }"
          :disabled="isQuickSpinning || quickItems.length < 2"
          @click="startQuickSpin"
        >
          <span v-if="!isQuickSpinning">🎰 开始抽奖</span>
          <span v-else class="spinning-text">转盘旋转中<span class="dot-anim">...</span></span>
        </button>
      </div>

      <!-- 结果 -->
      <div v-if="quickResult.length > 0 && !isQuickSpinning" class="result-section">
        <div class="result-decoration">
          <span class="result-star" style="--d:0.1s;--x:-40px">✨</span>
          <span class="result-star" style="--d:0.3s;--x:40px">🎉</span>
          <span class="result-star" style="--d:0.5s;--x:-20px">🌟</span>
          <span class="result-star" style="--d:0.2s;--x:30px">✨</span>
        </div>
        <div class="result-title">恭喜！抽奖结果</div>
        <div class="result-items">
          <div
            v-for="(item, idx) in quickResult"
            :key="idx"
            class="result-tag"
            :style="{ animationDelay: idx * 0.1 + 's' }"
          >
            <span class="result-tag-rank" v-if="quickResult.length > 1">#{{ idx + 1 }}</span>
            {{ item }}
          </div>
        </div>
        <div class="result-actions">
          <button class="btn-again" @click="startQuickSpin">🔄 再来一次</button>
        </div>
      </div>
    </div>

    <!-- ========== 高级抽奖 ========== -->
    <div v-show="activeTab === 'advanced'" class="tab-content">
      <!-- 添加奖品 -->
      <div class="section-card">
        <div class="section-card-title">奖品配置</div>
        <div class="add-item-row">
          <input v-model="newItemName" placeholder="奖品名称" class="add-input name-input" @keyup.enter="addWeightedItem" />
          <div class="add-field">
            <label>权重</label>
            <input v-model.number="newItemWeight" type="number" min="1" class="add-input small-input" />
          </div>
          <div class="add-field">
            <label>数量限制</label>
            <input v-model.number="newItemLimit" type="number" min="0" class="add-input small-input" placeholder="0=不限" />
          </div>
          <button class="btn-add" @click="addWeightedItem">+ 添加</button>
        </div>

        <!-- 奖品列表 -->
        <div v-if="weightedItems.length > 0" class="prize-list">
          <div class="prize-header">
            <span class="ph-name">奖品</span>
            <span class="ph-weight">权重</span>
            <span class="ph-prob">概率</span>
            <span class="ph-limit">数量</span>
            <span class="ph-action">操作</span>
          </div>
          <div v-for="(item, idx) in weightedItems" :key="idx" class="prize-row">
            <span class="pr-name">
              <span class="color-dot" :style="{ background: wheelColors[idx % wheelColors.length] }"></span>
              {{ item.name }}
            </span>
            <span class="pr-weight">
              <input v-model.number="item.weight" type="number" min="1" class="inline-input" />
            </span>
            <span class="pr-prob">{{ weightPercentage(item) }}%</span>
            <span class="pr-limit">{{ item.limit === 0 ? '不限' : item.limit }}</span>
            <span class="pr-action">
              <button class="btn-remove" @click="removeWeightedItem(idx)">✕</button>
            </span>
          </div>
        </div>
      </div>

      <!-- 转盘 -->
      <div class="wheel-stage">
        <div class="wheel-wrapper">
          <canvas
            ref="advancedCanvasRef"
            class="wheel-canvas"
            @click="!isAdvancedSpinning && weightedItems.length >= 2 && startAdvancedSpin()"
            :class="{ clickable: !isAdvancedSpinning && weightedItems.length >= 2 }"
          ></canvas>
          <div v-if="weightedItems.length < 2 && !isAdvancedSpinning" class="wheel-hint">请添加至少 2 个奖品</div>
        </div>
        <button
          class="spin-btn"
          :class="{ spinning: isAdvancedSpinning }"
          :disabled="isAdvancedSpinning || weightedItems.length < 2"
          @click="startAdvancedSpin"
        >
          {{ isAdvancedSpinning ? '转盘旋转中...' : '开始抽奖' }}
        </button>
      </div>

      <!-- 结果 -->
      <div v-if="advancedResult.length > 0 && !isAdvancedSpinning" class="result-section">
        <div class="result-title">🎊 恭喜获得</div>
        <div class="result-items">
          <div v-for="(item, idx) in advancedResult" :key="idx" class="result-tag big">{{ item }}</div>
        </div>
        <button class="btn-again" @click="startAdvancedSpin">🔄 再来一次</button>
      </div>
    </div>

    <!-- ========== 模板管理 ========== -->
    <div v-show="activeTab === 'templates'" class="tab-content">
      <!-- 预设模板 -->
      <div class="tpl-section">
        <h3 class="tpl-section-title">预设模板</h3>
        <div class="tpl-grid">
          <div v-for="tpl in presetTemplates" :key="tpl.label" class="tpl-card preset">
            <div class="tpl-card-header">
              <span class="tpl-card-icon">{{ tpl.icon }}</span>
              <span class="tpl-card-name">{{ tpl.label }}</span>
            </div>
            <div class="tpl-card-preview">{{ tpl.items.split('\n').slice(0, 3).join('、') }}{{ tpl.items.split('\n').length > 3 ? '...' : '' }}</div>
            <div class="tpl-card-meta">{{ tpl.items.split('\n').filter(Boolean).length }} 个选项</div>
            <button class="tpl-card-btn" @click="applyTemplate(tpl.items); activeTab = 'quick'">使用此模板</button>
          </div>
        </div>
      </div>

      <!-- 自定义模板 -->
      <div class="tpl-section">
        <div class="tpl-section-header">
          <h3 class="tpl-section-title">自定义模板</h3>
          <button class="btn-new-tpl" @click="newTemplateName = ''; newTemplateItems = ''; showTemplateModal = true">+ 新建模板</button>
        </div>
        <div v-if="customTemplates.length === 0" class="tpl-empty">
          暂无自定义模板，点击右上角"新建模板"创建
        </div>
        <div v-else class="tpl-grid">
          <div v-for="tpl in customTemplates" :key="tpl.id" class="tpl-card custom">
            <template v-if="editingTemplate !== tpl.id">
              <div class="tpl-card-header">
                <span class="tpl-card-icon">⭐</span>
                <span class="tpl-card-name">{{ tpl.name }}</span>
              </div>
              <div class="tpl-card-preview">{{ tpl.items.split('\n').slice(0, 3).join('、') }}{{ tpl.items.split('\n').length > 3 ? '...' : '' }}</div>
              <div class="tpl-card-meta">{{ tpl.items.split('\n').filter(Boolean).length }} 个选项 · {{ tpl.createdAt }}</div>
              <div class="tpl-card-actions">
                <button class="tpl-card-btn" @click="applyTemplate(tpl.items); activeTab = 'quick'">使用</button>
                <button class="tpl-card-btn edit" @click="startEditTemplate(tpl)">编辑</button>
                <button class="tpl-card-btn delete" @click="deleteCustomTemplate(tpl.id)">删除</button>
              </div>
            </template>
            <template v-else>
              <div class="tpl-edit-form">
                <input v-model="editTemplateName" placeholder="模板名称" class="tpl-edit-input" />
                <textarea v-model="editTemplateItems" rows="4" placeholder="每行一个选项" class="tpl-edit-textarea"></textarea>
                <div class="tpl-edit-actions">
                  <button class="tpl-card-btn" @click="saveEditTemplate">保存</button>
                  <button class="tpl-card-btn delete" @click="cancelEditTemplate">取消</button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 抽奖记录 ========== -->
    <div v-show="activeTab === 'records'" class="tab-content">
      <div v-if="records.length === 0" class="empty-records">暂无抽奖记录</div>
      <template v-else>
        <div class="records-header">
          <span>共 {{ records.length }} 条记录</span>
          <button class="btn-clear" @click="clearRecords">🗑️ 清空记录</button>
        </div>
        <div class="records-list">
          <div v-for="record in records" :key="record.id" class="record-card">
            <div class="record-top">
              <span class="record-mode">{{ record.mode }}</span>
              <span class="record-time">{{ record.time }}</span>
            </div>
            <div class="record-results">
              <span v-for="(r, idx) in record.results" :key="idx" class="record-result-tag">{{ r }}</span>
            </div>
            <div class="record-pool">从 {{ record.items.length }} 个选项中抽取 {{ record.drawCount }} 个</div>
          </div>
        </div>
      </template>
    </div>

    <!-- 彩屑 -->
    <div v-if="showConfetti" class="confetti-container">
      <div
        v-for="p in confettiParticles"
        :key="p.id"
        class="confetti-particle"
        :style="{
          left: p.left + '%',
          animationDelay: p.delay + 's',
          animationDuration: p.duration + 's',
          background: p.color,
          width: p.size + 'px',
          height: p.size + 'px',
          transform: `rotate(${p.rotation}deg)`,
        }"
      ></div>
    </div>

    <!-- 新建模板弹窗 -->
    <Teleport to="body">
      <div v-if="showTemplateModal" class="modal-overlay" @click.self="showTemplateModal = false">
        <div class="modal-box">
          <h3 class="modal-title">保存为自定义模板</h3>
          <div class="modal-field">
            <label>模板名称</label>
            <input v-model="newTemplateName" placeholder="例如：团建抽奖" class="modal-input" @keyup.enter="addCustomTemplate" />
          </div>
          <div class="modal-field">
            <label>模板内容（每行一个）</label>
            <textarea v-model="newTemplateItems" rows="5" class="modal-textarea" placeholder="选项A&#10;选项B&#10;选项C"></textarea>
          </div>
          <div class="modal-actions">
            <button class="modal-btn cancel" @click="showTemplateModal = false">取消</button>
            <button class="modal-btn confirm" @click="addCustomTemplate">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.lottery-tool {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: relative;
}

/* ===== Page Header ===== */
.page-header {
  text-align: center;
  padding-bottom: 0.5rem;
}

h2 {
  margin: 0;
  font-size: 1.8em;
  background: linear-gradient(135deg, #e91e63, #ff6090);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.description {
  margin: 0.3rem 0 0;
  color: #888;
  font-size: 0.95rem;
}

/* ===== Tabs ===== */
.mode-tabs {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  background: #f8f0f2;
  padding: 0.35rem;
  border-radius: 12px;
}

.tab-btn {
  flex: 1;
  min-width: fit-content;
  padding: 0.6rem 1rem;
  border: none;
  background: transparent;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #888;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  box-shadow: none;
}

.tab-btn:hover {
  transform: none;
  box-shadow: none;
}

.tab-icon {
  font-size: 1rem;
}

.tab-btn.active {
  background: white;
  color: #e91e63;
  box-shadow: 0 2px 8px rgba(233, 30, 99, 0.15);
}

.tab-btn:hover:not(.active) {
  color: #e91e63;
  background: rgba(233, 30, 99, 0.06);
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  background: #e91e63;
  color: white;
  font-size: 0.68rem;
  padding: 0 0.35rem;
  border-radius: 10px;
  margin-left: 0.3rem;
  line-height: 1;
}

.tab-btn.active .badge {
  background: #fce4ec;
  color: #e91e63;
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

/* ===== Section Card ===== */
.section-card {
  background: white;
  border-radius: 14px;
  padding: 1.2rem;
  box-shadow: 0 2px 12px rgba(233, 30, 99, 0.06);
  border: 1px solid rgba(233, 30, 99, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.section-card-title {
  font-weight: 700;
  font-size: 0.95rem;
  color: #c2185b;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #fce4ec;
}

/* ===== Quick Input Bar (compact horizontal) ===== */
.quick-input-bar {
  display: flex;
  gap: 1rem;
  align-items: stretch;
  background: white;
  border-radius: 14px;
  padding: 1rem 1.2rem;
  box-shadow: 0 2px 12px rgba(233, 30, 99, 0.06);
  border: 1px solid rgba(233, 30, 99, 0.08);
}

.input-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
}

.settings-col {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  justify-content: center;
  min-width: 120px;
  padding-left: 1rem;
  border-left: 1.5px solid #fce4ec;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.setting-item label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #888;
  white-space: nowrap;
}

/* ===== Items Preview ===== */
.items-preview {
  display: flex;
  align-items: center;
}

.items-preview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  align-items: center;
}

.items-preview-count {
  font-size: 0.75rem;
  font-weight: 700;
  color: #e91e63;
  background: #fce4ec;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  white-space: nowrap;
}

.preview-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.5rem;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  font-size: 0.75rem;
  color: #555;
  transition: all 0.2s;
}

.preview-tag:hover {
  border-color: var(--tag-color);
  background: white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.preview-tag-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--tag-color);
  flex-shrink: 0;
}

.preview-more {
  padding: 0.15rem 0.5rem;
  font-size: 0.75rem;
  color: #bbb;
}

/* ===== Toggle Switch ===== */
.toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.3rem 0.7rem;
  border: none;
  border-radius: 20px;
  background: #f0f0f0;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  color: #999;
  box-shadow: none;
}

.toggle-btn:hover {
  transform: none;
  box-shadow: none;
}

.toggle-track {
  position: relative;
  width: 32px;
  height: 18px;
  background: #ddd;
  border-radius: 10px;
  transition: background 0.3s;
  flex-shrink: 0;
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-btn.on {
  background: #fce4ec;
  color: #e91e63;
}

.toggle-btn.on .toggle-track {
  background: #e91e63;
}

.toggle-btn.on .toggle-thumb {
  transform: translateX(14px);
}

/* ===== Template Bar ===== */
.template-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.template-label {
  font-weight: 700;
  color: #c2185b;
  font-size: 0.85rem;
  white-space: nowrap;
  padding: 0.3rem 0.7rem;
  background: #fce4ec;
  border-radius: 8px;
}

.template-scroll {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  flex: 1;
}

.tpl-chip {
  padding: 0.3rem 0.7rem;
  border: 1.5px solid #f8bbd0;
  background: white;
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.25s;
  color: #c2185b;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(233, 30, 99, 0.06);
}

.tpl-chip:hover {
  background: #e91e63;
  color: white;
  border-color: #e91e63;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(233, 30, 99, 0.2);
}

.tpl-chip.custom-chip {
  border-color: #ffe082;
  background: #fffde7;
  color: #e65100;
}

.tpl-chip.custom-chip:hover {
  background: #ff8f00;
  color: white;
  border-color: #ff8f00;
  box-shadow: 0 3px 8px rgba(255, 143, 0, 0.2);
}

/* ===== Input Section ===== */
.input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.input-label {
  font-weight: 600;
  color: #555;
  font-size: 0.9rem;
}

.btn-save-tpl {
  padding: 0.25rem 0.6rem;
  border: 1.5px solid #ffe082;
  background: #fffde7;
  border-radius: 12px;
  font-size: 0.75rem;
  cursor: pointer;
  color: #e65100;
  font-weight: 600;
  transition: all 0.25s;
  box-shadow: none;
}

.btn-save-tpl:hover {
  background: #ff8f00;
  color: white;
  border-color: #ff8f00;
  transform: translateY(-1px);
}

.input-textarea {
  width: 100%;
  min-height: 100px;
  padding: 0.75rem;
  border: 2px solid #f3e5f5;
  border-radius: 10px;
  font-size: 1rem;
  font-family: inherit;
  background-color: #fafafa;
  color: #333;
  resize: vertical;
  transition: all 0.3s;
  box-sizing: border-box;
}

.input-textarea:focus {
  outline: none;
  border-color: #e91e63;
  background-color: white;
  box-shadow: 0 0 0 3px rgba(233, 30, 99, 0.08);
}

.config-input {
  width: 100%;
  padding: 0.45rem 0.5rem;
  border: 2px solid #f3e5f5;
  border-radius: 8px;
  font-size: 0.9rem;
  text-align: center;
  color: #333;
  background: #fafafa;
  transition: all 0.3s;
}

.config-input:focus {
  outline: none;
  border-color: #e91e63;
  background: white;
  box-shadow: 0 0 0 3px rgba(233, 30, 99, 0.08);
}

/* ===== Wheel Stage ===== */
.wheel-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.2rem;
  padding: 2rem 1.5rem;
  background: linear-gradient(160deg, #1a1028 0%, #2d1b3d 40%, #1a1028 100%);
  border-radius: 20px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.stage-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 500px;
  height: 500px;
  transform: translate(-50%, -55%);
  background: radial-gradient(circle, rgba(233, 30, 99, 0.15) 0%, rgba(233, 30, 99, 0.05) 40%, transparent 70%);
  pointer-events: none;
  animation: stageGlowPulse 4s ease-in-out infinite;
}

@keyframes stageGlowPulse {
  0%, 100% { opacity: 0.6; transform: translate(-50%, -55%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -55%) scale(1.1); }
}

.wheel-wrapper {
  position: relative;
  width: 100%;
  max-width: 520px;
  aspect-ratio: 1;
  filter: drop-shadow(0 4px 20px rgba(233, 30, 99, 0.25));
  z-index: 1;
}

.wheel-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.wheel-canvas.clickable {
  cursor: pointer;
}

.wheel-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  padding: 1.2rem 1.8rem;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.wheel-hint-icon {
  font-size: 2.2rem;
  animation: hintFloat 2.5s ease-in-out infinite;
}

@keyframes hintFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.wheel-hint-text {
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.95rem;
  font-weight: 600;
}

.wheel-hint-sub {
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.78rem;
}

.spin-btn {
  padding: 0.8rem 2.5rem;
  border: none;
  border-radius: 30px;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  background: linear-gradient(135deg, #e91e63, #ff6090, #e91e63);
  background-size: 200% 200%;
  color: white;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 20px rgba(233, 30, 99, 0.4), 0 0 40px rgba(233, 30, 99, 0.1);
  letter-spacing: 2px;
  position: relative;
  z-index: 1;
}

.spin-btn:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 28px rgba(233, 30, 99, 0.5), 0 0 60px rgba(233, 30, 99, 0.15);
  background-position: 100% 0;
}

.spin-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

.spin-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 10px rgba(233, 30, 99, 0.2);
}

.spin-btn.spinning {
  animation: spinPulse 1s ease-in-out infinite;
}

.spinning-text {
  display: inline-flex;
  align-items: center;
}

.dot-anim {
  display: inline-block;
  width: 1.5em;
  text-align: left;
  animation: dotBlink 1.2s steps(4, end) infinite;
}

@keyframes dotBlink {
  0% { content: ''; }
  25% { content: '.'; }
  50% { content: '..'; }
  75% { content: '...'; }
}

@keyframes spinPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 4px 20px rgba(233, 30, 99, 0.4); }
  50% { transform: scale(1.05); box-shadow: 0 6px 30px rgba(233, 30, 99, 0.6), 0 0 50px rgba(233, 30, 99, 0.2); }
}

/* ===== Result ===== */
.result-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.2rem;
  padding: 2rem;
  background: linear-gradient(135deg, #fce4ec, #fff0f3, #fce4ec);
  border: 2px solid #f8bbd0;
  border-radius: 20px;
  animation: resultPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
}

.result-section::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(233, 30, 99, 0.04) 0%, transparent 50%);
  animation: resultShine 4s ease-in-out infinite;
  pointer-events: none;
}

.result-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}

.result-star {
  position: absolute;
  top: -10px;
  left: 50%;
  font-size: 1.2rem;
  animation: starFloat 2s ease-out forwards;
  animation-delay: var(--d);
  opacity: 0;
}

@keyframes starFloat {
  0% { transform: translate(0, 0) scale(0); opacity: 0; }
  30% { opacity: 1; transform: translate(var(--x), 15px) scale(1.2); }
  100% { opacity: 0; transform: translate(var(--x), 60px) scale(0.6); }
}

@keyframes resultShine {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(5%, 5%) rotate(3deg); }
}

@keyframes resultPop {
  from { opacity: 0; transform: scale(0.85) translateY(15px); }
  60% { transform: scale(1.02) translateY(-3px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.result-title {
  font-size: 1.3rem;
  font-weight: 800;
  color: #c2185b;
  position: relative;
  letter-spacing: 1px;
}

.result-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  justify-content: center;
}

.result-tag {
  padding: 0.7rem 1.6rem;
  background: linear-gradient(135deg, #e91e63, #c2185b);
  color: white;
  border-radius: 12px;
  font-size: 1.15rem;
  font-weight: 700;
  box-shadow: 0 4px 16px rgba(233, 30, 99, 0.3);
  animation: itemBounce 0.5s ease-out backwards;
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.result-tag-rank {
  font-size: 0.7rem;
  background: rgba(255, 255, 255, 0.25);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 800;
}

.result-tag.big {
  font-size: 1.6rem;
  padding: 1rem 2.5rem;
  border-radius: 14px;
  box-shadow: 0 6px 24px rgba(233, 30, 99, 0.35);
}

@keyframes itemBounce {
  0% { transform: translateY(-25px) scale(0.7) rotate(-3deg); opacity: 0; }
  60% { transform: translateY(4px) scale(1.03) rotate(0deg); }
  100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
}

.result-actions {
  position: relative;
  z-index: 1;
}

.btn-again {
  padding: 0.5rem 1.4rem;
  background: white;
  color: #e91e63;
  border: 2px solid #e91e63;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s;
  box-shadow: none;
}

.btn-again:hover {
  background: #e91e63;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(233, 30, 99, 0.25);
}

/* ===== Advanced: Add Row ===== */
.add-item-row {
  display: flex;
  gap: 0.6rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.add-input {
  padding: 0.5rem 0.7rem;
  border: 2px solid #f3e5f5;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #333;
  background: #fafafa;
  transition: all 0.3s;
}

.add-input:focus {
  outline: none;
  border-color: #e91e63;
  background: white;
  box-shadow: 0 0 0 3px rgba(233, 30, 99, 0.08);
}

.name-input { flex: 1; min-width: 120px; }
.small-input { width: 80px; }

.add-field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.add-field label {
  font-size: 0.75rem;
  color: #999;
  font-weight: 600;
}

.btn-add {
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #e91e63, #f06292);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(233, 30, 99, 0.2);
}

.btn-add:hover {
  background: linear-gradient(135deg, #c2185b, #e91e63);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(233, 30, 99, 0.3);
}

/* ===== Prize List ===== */
.prize-list {
  border: 1.5px solid #f3e5f5;
  border-radius: 12px;
  overflow: hidden;
}

.prize-header {
  display: flex;
  padding: 0.7rem 1rem;
  background: linear-gradient(135deg, #fce4ec, #f8bbd0);
  font-weight: 700;
  font-size: 0.82rem;
  color: #ad1457;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.prize-row {
  display: flex;
  padding: 0.65rem 1rem;
  align-items: center;
  border-top: 1px solid #fce4ec;
  transition: all 0.2s;
}

.prize-row:nth-child(even) { background: rgba(233, 30, 99, 0.02); }
.prize-row:hover { background: #fff0f3; }

.ph-name, .pr-name { flex: 2; }
.ph-weight, .pr-weight { flex: 1; text-align: center; }
.ph-prob, .pr-prob { flex: 1; text-align: center; color: #e91e63; font-weight: 700; }
.ph-limit, .pr-limit { flex: 1; text-align: center; color: #888; }
.ph-action, .pr-action { flex: 0.5; text-align: center; }

.pr-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.inline-input {
  width: 50px;
  padding: 0.25rem 0.4rem;
  border: 1.5px solid #f3e5f5;
  border-radius: 6px;
  text-align: center;
  font-size: 0.85rem;
  color: #333;
  background: transparent;
  transition: all 0.2s;
}

.inline-input:focus {
  outline: none;
  border-color: #e91e63;
  background: white;
}

.btn-remove {
  background: none;
  border: 1.5px solid transparent;
  color: #ccc;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
  box-shadow: none;
}

.btn-remove:hover {
  color: #e91e63;
  background: #fce4ec;
  border-color: #f8bbd0;
  transform: none;
  box-shadow: none;
}

/* ===== Template Management ===== */
.tpl-section {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.tpl-section + .tpl-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1.5px dashed #f8bbd0;
}

.tpl-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tpl-section-title {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
  font-weight: 700;
}

.btn-new-tpl {
  padding: 0.4rem 1rem;
  background: linear-gradient(135deg, #e91e63, #f06292);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s;
  box-shadow: 0 2px 8px rgba(233, 30, 99, 0.2);
}

.btn-new-tpl:hover {
  background: linear-gradient(135deg, #c2185b, #e91e63);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(233, 30, 99, 0.3);
}

.tpl-empty {
  text-align: center;
  color: #ccc;
  padding: 2.5rem;
  font-size: 0.95rem;
  background: #fafafa;
  border-radius: 12px;
  border: 1.5px dashed #e0e0e0;
}

.tpl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.8rem;
}

.tpl-card {
  border: 1.5px solid #f3e5f5;
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: all 0.25s;
  background: white;
}

.tpl-card:hover {
  border-color: #e91e63;
  box-shadow: 0 4px 16px rgba(233, 30, 99, 0.1);
  transform: translateY(-2px);
}

.tpl-card.custom {
  border-color: #ffe082;
  background: #fffef5;
}

.tpl-card.custom:hover {
  border-color: #ff8f00;
  box-shadow: 0 4px 16px rgba(255, 143, 0, 0.1);
}

.tpl-card-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.tpl-card-icon { font-size: 1.2rem; }

.tpl-card-name {
  font-weight: 700;
  font-size: 1rem;
  color: #333;
}

.tpl-card-preview {
  font-size: 0.85rem;
  color: #888;
  line-height: 1.4;
}

.tpl-card-meta {
  font-size: 0.75rem;
  color: #bbb;
}

.tpl-card-actions {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.3rem;
}

.tpl-card-btn {
  padding: 0.3rem 0.7rem;
  border: 1.5px solid #e91e63;
  background: transparent;
  color: #e91e63;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: none;
}

.tpl-card-btn:hover {
  background: #e91e63;
  color: white;
  transform: none;
  box-shadow: none;
}

.tpl-card-btn.edit {
  border-color: #2196f3;
  color: #2196f3;
}

.tpl-card-btn.edit:hover {
  background: #2196f3;
  color: white;
}

.tpl-card-btn.delete {
  border-color: #bbb;
  color: #bbb;
}

.tpl-card-btn.delete:hover {
  background: #e74c3c;
  color: white;
  border-color: #e74c3c;
}

.tpl-edit-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tpl-edit-input {
  padding: 0.4rem 0.6rem;
  border: 2px solid #ffe082;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #333;
}

.tpl-edit-input:focus { outline: none; border-color: #ff8f00; }

.tpl-edit-textarea {
  padding: 0.4rem 0.6rem;
  border: 2px solid #ffe082;
  border-radius: 6px;
  font-size: 0.85rem;
  color: #333;
  resize: vertical;
  font-family: inherit;
}

.tpl-edit-textarea:focus { outline: none; border-color: #ff8f00; }

.tpl-edit-actions {
  display: flex;
  gap: 0.4rem;
}

/* ===== Records ===== */
.empty-records {
  text-align: center;
  color: #ccc;
  padding: 3rem;
  font-size: 1rem;
  background: #fafafa;
  border-radius: 12px;
  border: 1.5px dashed #e0e0e0;
}

.records-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #888;
  font-size: 0.9rem;
}

.btn-clear {
  padding: 0.4rem 0.8rem;
  background: #f5f5f5;
  color: #888;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.25s;
  box-shadow: none;
}

.btn-clear:hover {
  background: #e91e63;
  color: white;
  border-color: #e91e63;
  transform: none;
  box-shadow: none;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-height: 400px;
  overflow-y: auto;
}

.record-card {
  padding: 0.8rem 1rem;
  border: 1.5px solid #f3e5f5;
  border-radius: 10px;
  background: white;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: all 0.2s;
  border-left: 3px solid #f8bbd0;
}

.record-card:hover {
  border-left-color: #e91e63;
  box-shadow: 0 2px 10px rgba(233, 30, 99, 0.08);
}

.record-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.record-mode {
  font-weight: 700;
  color: #e91e63;
  font-size: 0.85rem;
}

.record-time {
  font-size: 0.78rem;
  color: #bbb;
  font-family: 'SF Mono', 'Consolas', monospace;
}

.record-results {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.record-result-tag {
  padding: 0.2rem 0.65rem;
  background: linear-gradient(135deg, #e91e63, #f06292);
  color: white;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
}

.record-pool {
  font-size: 0.78rem;
  color: #bbb;
}

/* ===== Confetti ===== */
.confetti-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  z-index: 10;
}

.confetti-particle {
  position: absolute;
  top: -10px;
  border-radius: 2px;
  animation: confettiFall linear forwards;
}

@keyframes confettiFall {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(600px) rotate(720deg); opacity: 0; }
}

/* ===== Modal ===== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-box {
  background: white;
  border-radius: 18px;
  padding: 1.5rem;
  width: 90%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.9) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-title {
  margin: 0 0 1rem;
  font-size: 1.15rem;
  color: #333;
}

.modal-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 0.8rem;
}

.modal-field label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #555;
}

.modal-input {
  padding: 0.6rem;
  border: 2px solid #f3e5f5;
  border-radius: 10px;
  font-size: 0.95rem;
  color: #333;
  transition: all 0.3s;
}

.modal-input:focus {
  outline: none;
  border-color: #e91e63;
  box-shadow: 0 0 0 3px rgba(233, 30, 99, 0.08);
}

.modal-textarea {
  padding: 0.6rem;
  border: 2px solid #f3e5f5;
  border-radius: 10px;
  font-size: 0.95rem;
  color: #333;
  font-family: inherit;
  resize: vertical;
  transition: all 0.3s;
}

.modal-textarea:focus {
  outline: none;
  border-color: #e91e63;
  box-shadow: 0 0 0 3px rgba(233, 30, 99, 0.08);
}

.modal-actions {
  display: flex;
  gap: 0.6rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.modal-btn {
  padding: 0.55rem 1.3rem;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s;
  box-shadow: none;
}

.modal-btn:hover {
  transform: none;
  box-shadow: none;
}

.modal-btn.cancel {
  background: #f5f5f5;
  color: #666;
}

.modal-btn.cancel:hover {
  background: #e0e0e0;
}

.modal-btn.confirm {
  background: linear-gradient(135deg, #e91e63, #f06292);
  color: white;
  box-shadow: 0 2px 8px rgba(233, 30, 99, 0.25);
}

.modal-btn.confirm:hover {
  box-shadow: 0 4px 12px rgba(233, 30, 99, 0.35);
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  h2 { font-size: 1.5em; }

  .mode-tabs { flex-direction: column; gap: 0.3rem; }
  .tab-btn { justify-content: center; }

  .quick-input-bar { flex-direction: column; }
  .settings-col {
    flex-direction: row;
    border-left: none;
    padding-left: 0;
    padding-top: 0.6rem;
    border-top: 1.5px solid #fce4ec;
  }

  .add-item-row {
    flex-direction: column;
    align-items: stretch;
  }

  .add-field {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
  }

  .small-input { width: 100%; }

  .prize-header { font-size: 0.72rem; }
  .prize-row { font-size: 0.85rem; }

  .wheel-wrapper { max-width: 420px; }

  .spin-btn { width: 80%; }

  .result-tag.big {
    font-size: 1.2rem;
    padding: 0.6rem 1.5rem;
  }

  .tpl-grid {
    grid-template-columns: 1fr;
  }

  .section-card { padding: 1rem; }
}

@media (max-width: 480px) {
  .template-bar { flex-direction: column; align-items: flex-start; }
  .wheel-wrapper { max-width: 340px; }
  .wheel-stage { padding: 1.5rem 0.5rem; }
  .spin-btn { width: 90%; font-size: 0.95rem; }
  .settings-col { flex-direction: column; }
}

/* ===== Dark Mode ===== */
:global([data-theme='dark']) .lottery-tool h2 {
  background: linear-gradient(135deg, #f48fb1, #ff80ab);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
:global([data-theme='dark']) .lottery-tool .description { color: #a0a0a0; }

:global([data-theme='dark']) .lottery-tool .mode-tabs {
  background: #1e1e30;
}

:global([data-theme='dark']) .lottery-tool .tab-btn {
  background: transparent;
  color: #888;
}
:global([data-theme='dark']) .lottery-tool .tab-btn.active {
  background: #2a2a3e;
  color: #f48fb1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
:global([data-theme='dark']) .lottery-tool .tab-btn:hover:not(.active) {
  color: #f48fb1;
  background: rgba(244, 143, 177, 0.08);
}
:global([data-theme='dark']) .lottery-tool .tab-btn.active .badge {
  background: rgba(244, 143, 177, 0.2);
  color: #f48fb1;
}

:global([data-theme='dark']) .lottery-tool .section-card {
  background: #1e1e30;
  border-color: #2a2a40;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
}
:global([data-theme='dark']) .lottery-tool .section-card-title {
  color: #f48fb1;
  border-bottom-color: #2a2a40;
}

:global([data-theme='dark']) .lottery-tool .template-label {
  background: #2a2030;
  color: #f48fb1;
}

:global([data-theme='dark']) .lottery-tool .input-label,
:global([data-theme='dark']) .lottery-tool .config-item label {
  color: #ccc;
}

:global([data-theme='dark']) .lottery-tool .tpl-chip {
  background: #2a2030;
  border-color: #3a2a40;
  color: #f48fb1;
}
:global([data-theme='dark']) .lottery-tool .tpl-chip:hover {
  background: #e91e63;
  color: white;
  border-color: #e91e63;
}
:global([data-theme='dark']) .lottery-tool .tpl-chip.custom-chip {
  background: #2a2820;
  border-color: #3a3520;
  color: #ffd54f;
}
:global([data-theme='dark']) .lottery-tool .tpl-chip.custom-chip:hover {
  background: #ff8f00;
  color: white;
}

:global([data-theme='dark']) .lottery-tool .input-textarea {
  background-color: #1a1a2e;
  color: #e0e0e0;
  border-color: #2a2a40;
}
:global([data-theme='dark']) .lottery-tool .input-textarea:focus {
  background-color: #222240;
  border-color: #e91e63;
  box-shadow: 0 0 0 3px rgba(233, 30, 99, 0.15);
}

:global([data-theme='dark']) .lottery-tool .item-count { color: #666; }

:global([data-theme='dark']) .lottery-tool .quick-input-bar {
  background: #1e1e30;
  border-color: #2a2a40;
}
:global([data-theme='dark']) .lottery-tool .settings-col {
  border-left-color: #2a2a40;
}
:global([data-theme='dark']) .lottery-tool .setting-item label { color: #777; }

:global([data-theme='dark']) .lottery-tool .items-preview-count {
  background: rgba(233, 30, 99, 0.15);
  color: #f48fb1;
}
:global([data-theme='dark']) .lottery-tool .preview-tag {
  background: #2a2a3e;
  border-color: #3a3a50;
  color: #ccc;
}
:global([data-theme='dark']) .lottery-tool .preview-more { color: #555; }

:global([data-theme='dark']) .lottery-tool .config-input {
  background: #1a1a2e;
  color: #e0e0e0;
  border-color: #2a2a40;
}
:global([data-theme='dark']) .lottery-tool .config-input:focus {
  border-color: #e91e63;
  background: #222240;
}

:global([data-theme='dark']) .lottery-tool .toggle-btn {
  background: #2a2a3e;
  color: #888;
}
:global([data-theme='dark']) .lottery-tool .toggle-track {
  background: #3a3a50;
}
:global([data-theme='dark']) .lottery-tool .toggle-btn.on {
  background: rgba(233, 30, 99, 0.15);
  color: #f48fb1;
}
:global([data-theme='dark']) .lottery-tool .toggle-btn.on .toggle-track {
  background: #e91e63;
}

:global([data-theme='dark']) .lottery-tool .wheel-stage {
  background: linear-gradient(160deg, #0f0a18 0%, #1a1028 40%, #0f0a18 100%);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

:global([data-theme='dark']) .lottery-tool .spin-btn {
  background: linear-gradient(135deg, #c2185b, #e91e63);
}

:global([data-theme='dark']) .lottery-tool .result-section {
  background: linear-gradient(135deg, #2a1830, #1e1e30, #2a1830);
  border-color: #3a2a40;
}
:global([data-theme='dark']) .lottery-tool .result-title { color: #f48fb1; }
:global([data-theme='dark']) .lottery-tool .result-tag {
  background: linear-gradient(135deg, #c2185b, #ad1457);
}

:global([data-theme='dark']) .lottery-tool .btn-again {
  background: transparent;
  color: #f48fb1;
  border-color: #f48fb1;
}
:global([data-theme='dark']) .lottery-tool .btn-again:hover {
  background: #e91e63;
  color: white;
}

:global([data-theme='dark']) .lottery-tool .add-input {
  background: #1a1a2e;
  color: #e0e0e0;
  border-color: #2a2a40;
}
:global([data-theme='dark']) .lottery-tool .add-input:focus {
  border-color: #e91e63;
  background: #222240;
}
:global([data-theme='dark']) .lottery-tool .add-field label { color: #777; }
:global([data-theme='dark']) .lottery-tool .btn-add {
  background: linear-gradient(135deg, #c2185b, #e91e63);
}

:global([data-theme='dark']) .lottery-tool .prize-list { border-color: #2a2a40; }
:global([data-theme='dark']) .lottery-tool .prize-header {
  background: linear-gradient(135deg, #2a1830, #301830);
  color: #f48fb1;
}
:global([data-theme='dark']) .lottery-tool .prize-row {
  border-top-color: #2a2030;
  color: #ddd;
}
:global([data-theme='dark']) .lottery-tool .prize-row:nth-child(even) { background: rgba(233, 30, 99, 0.03); }
:global([data-theme='dark']) .lottery-tool .prize-row:hover { background: #2a1830; }
:global([data-theme='dark']) .lottery-tool .pr-prob { color: #f48fb1; }
:global([data-theme='dark']) .lottery-tool .pr-limit { color: #777; }
:global([data-theme='dark']) .lottery-tool .inline-input {
  border-color: #2a2a40;
  color: #e0e0e0;
}
:global([data-theme='dark']) .lottery-tool .inline-input:focus {
  border-color: #e91e63;
  background: #222240;
}
:global([data-theme='dark']) .lottery-tool .btn-remove { color: #555; }
:global([data-theme='dark']) .lottery-tool .btn-remove:hover {
  color: #f48fb1;
  background: #2a1830;
}

:global([data-theme='dark']) .lottery-tool .tpl-section-title { color: #e0e0e0; }
:global([data-theme='dark']) .lottery-tool .tpl-section + .tpl-section { border-top-color: #2a2a40; }
:global([data-theme='dark']) .lottery-tool .tpl-card {
  background: #1e1e30;
  border-color: #2a2a40;
}
:global([data-theme='dark']) .lottery-tool .tpl-card:hover {
  border-color: #e91e63;
}
:global([data-theme='dark']) .lottery-tool .tpl-card.custom {
  background: #1e1e28;
  border-color: #3a3520;
}
:global([data-theme='dark']) .lottery-tool .tpl-card-name { color: #e0e0e0; }
:global([data-theme='dark']) .lottery-tool .tpl-card-preview { color: #888; }
:global([data-theme='dark']) .lottery-tool .tpl-card-meta { color: #555; }
:global([data-theme='dark']) .lottery-tool .tpl-empty {
  color: #555;
  background: #1a1a2e;
  border-color: #2a2a40;
}

:global([data-theme='dark']) .lottery-tool .btn-save-tpl {
  background: #2a2820;
  border-color: #3a3520;
  color: #ffd54f;
}
:global([data-theme='dark']) .lottery-tool .btn-save-tpl:hover {
  background: #ff8f00;
  color: white;
}

:global([data-theme='dark']) .lottery-tool .empty-records {
  color: #555;
  background: #1a1a2e;
  border-color: #2a2a40;
}
:global([data-theme='dark']) .lottery-tool .records-header { color: #888; }
:global([data-theme='dark']) .lottery-tool .btn-clear {
  background: #2a2a3e;
  color: #ccc;
  border-color: #3a3a50;
}
:global([data-theme='dark']) .lottery-tool .btn-clear:hover {
  background: #e91e63;
  color: white;
  border-color: #e91e63;
}

:global([data-theme='dark']) .lottery-tool .record-card {
  border-color: #2a2a40;
  background: #1e1e30;
  border-left-color: #3a2a40;
}
:global([data-theme='dark']) .lottery-tool .record-card:hover { border-left-color: #e91e63; }
:global([data-theme='dark']) .lottery-tool .record-mode { color: #f48fb1; }
:global([data-theme='dark']) .lottery-tool .record-time { color: #666; }
:global([data-theme='dark']) .lottery-tool .record-result-tag {
  background: linear-gradient(135deg, #c2185b, #ad1457);
}
:global([data-theme='dark']) .lottery-tool .record-pool { color: #666; }

:global([data-theme='dark']) .lottery-tool .modal-overlay {
  background: rgba(0, 0, 0, 0.65);
}
:global([data-theme='dark']) .lottery-tool .modal-box {
  background: #1e1e30;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}
:global([data-theme='dark']) .lottery-tool .modal-title { color: #e0e0e0; }
:global([data-theme='dark']) .lottery-tool .modal-field label { color: #ccc; }
:global([data-theme='dark']) .lottery-tool .modal-input {
  background: #1a1a2e;
  color: #e0e0e0;
  border-color: #2a2a40;
}
:global([data-theme='dark']) .lottery-tool .modal-input:focus {
  border-color: #e91e63;
  box-shadow: 0 0 0 3px rgba(233, 30, 99, 0.15);
}
:global([data-theme='dark']) .lottery-tool .modal-textarea {
  background: #1a1a2e;
  color: #e0e0e0;
  border-color: #2a2a40;
}
:global([data-theme='dark']) .lottery-tool .modal-textarea:focus {
  border-color: #e91e63;
  box-shadow: 0 0 0 3px rgba(233, 30, 99, 0.15);
}
:global([data-theme='dark']) .lottery-tool .modal-btn.cancel { background: #2a2a3e; color: #ccc; }

:global([data-theme='dark']) .lottery-tool .tpl-edit-input {
  background: #1a1a2e;
  color: #e0e0e0;
  border-color: #3a3520;
}
:global([data-theme='dark']) .lottery-tool .tpl-edit-textarea {
  background: #1a1a2e;
  color: #e0e0e0;
  border-color: #3a3520;
}

:global([data-theme='dark']) .lottery-tool .wheel-hint {
  background: rgba(0, 0, 0, 0.55);
  border-color: rgba(255, 255, 255, 0.06);
}
</style>
