<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useToast } from '../composables/useToast'

const { showToast } = useToast()

// Original image state
const originalFile = ref(null)
const originalUrl = ref('')
const originalWidth = ref(0)
const originalHeight = ref(0)

// Compressed image state
const compressedUrl = ref('')
const compressedSize = ref(0)
const compressedWidth = ref(0)
const compressedHeight = ref(0)

// Settings
const quality = ref(80)
const outputFormat = ref('image/jpeg')
const scale = ref(100)
const maxWidth = ref('')
const maxHeight = ref('')

// UI state
const isDragOver = ref(false)
const isCompressing = ref(false)

const formatOptions = [
  { label: 'JPEG', value: 'image/jpeg' },
  { label: 'PNG', value: 'image/png' },
  { label: 'WebP', value: 'image/webp' }
]

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const reductionPercent = computed(() => {
  if (!originalFile.value || !compressedSize.value) return 0
  const diff = originalFile.value.size - compressedSize.value
  return ((diff / originalFile.value.size) * 100).toFixed(1)
})

const handleFile = (file) => {
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  if (!validTypes.includes(file.type)) {
    showToast('请上传 PNG、JPG 或 WebP 格式的图片', 'error')
    return
  }

  // Clean up previous URLs
  if (originalUrl.value) URL.revokeObjectURL(originalUrl.value)
  if (compressedUrl.value) URL.revokeObjectURL(compressedUrl.value)

  originalFile.value = file
  originalUrl.value = URL.createObjectURL(file)
  compressedUrl.value = ''
  compressedSize.value = 0

  // Get original dimensions
  const img = new Image()
  img.onload = () => {
    originalWidth.value = img.width
    originalHeight.value = img.height
  }
  img.src = originalUrl.value
}

const onFileChange = (e) => {
  const file = e.target.files[0]
  if (file) handleFile(file)
}

const onDrop = (e) => {
  isDragOver.value = false
  const file = e.dataTransfer.files[0]
  if (file) handleFile(file)
}

const onDragOver = () => {
  isDragOver.value = true
}

const onDragLeave = () => {
  isDragOver.value = false
}

const compress = () => {
  if (!originalUrl.value) {
    showToast('请先上传图片', 'error')
    return
  }

  isCompressing.value = true

  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    let w = img.width * (scale.value / 100)
    let h = img.height * (scale.value / 100)

    const mw = maxWidth.value ? Number(maxWidth.value) : 0
    const mh = maxHeight.value ? Number(maxHeight.value) : 0

    if (mw && w > mw) {
      h = h * (mw / w)
      w = mw
    }
    if (mh && h > mh) {
      w = w * (mh / h)
      h = mh
    }

    w = Math.round(w)
    h = Math.round(h)

    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, w, h)

    const mimeType = outputFormat.value
    const q = mimeType === 'image/png' ? undefined : quality.value / 100

    canvas.toBlob(
      (blob) => {
        if (compressedUrl.value) URL.revokeObjectURL(compressedUrl.value)
        compressedUrl.value = URL.createObjectURL(blob)
        compressedSize.value = blob.size
        compressedWidth.value = w
        compressedHeight.value = h
        isCompressing.value = false
        showToast('压缩完成', 'success')
      },
      mimeType,
      q
    )
  }
  img.onerror = () => {
    isCompressing.value = false
    showToast('图片加载失败', 'error')
  }
  img.src = originalUrl.value
}

const download = () => {
  if (!compressedUrl.value) return
  const ext = outputFormat.value.split('/')[1]
  const baseName = originalFile.value
    ? originalFile.value.name.replace(/\.[^.]+$/, '')
    : 'image'
  const link = document.createElement('a')
  link.href = compressedUrl.value
  link.download = `${baseName}_compressed.${ext}`
  link.click()
  showToast('下载成功', 'success')
}

const reset = () => {
  if (originalUrl.value) URL.revokeObjectURL(originalUrl.value)
  if (compressedUrl.value) URL.revokeObjectURL(compressedUrl.value)
  originalFile.value = null
  originalUrl.value = ''
  originalWidth.value = 0
  originalHeight.value = 0
  compressedUrl.value = ''
  compressedSize.value = 0
  compressedWidth.value = 0
  compressedHeight.value = 0
  quality.value = 80
  outputFormat.value = 'image/jpeg'
  scale.value = 100
  maxWidth.value = ''
  maxHeight.value = ''
}

onUnmounted(() => {
  if (originalUrl.value) URL.revokeObjectURL(originalUrl.value)
  if (compressedUrl.value) URL.revokeObjectURL(compressedUrl.value)
})
</script>

<template>
  <div class="image-compressor">
    <h2>图片压缩工具</h2>

    <!-- Upload Area -->
    <div
      class="drop-zone"
      :class="{ 'drag-over': isDragOver }"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
      @click="$refs.fileInput.click()"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style="display: none"
        @change="onFileChange"
      />
      <div class="drop-zone-content">
        <span class="drop-icon">🖼️</span>
        <p class="drop-text">拖拽图片到此处，或点击上传</p>
        <p class="drop-hint">支持 PNG、JPG、WebP 格式</p>
      </div>
    </div>

    <!-- Original File Info -->
    <div v-if="originalFile" class="file-info">
      <div class="info-item">
        <span class="info-label">文件名</span>
        <span class="info-value">{{ originalFile.name }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">原始大小</span>
        <span class="info-value">{{ formatFileSize(originalFile.size) }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">原始尺寸</span>
        <span class="info-value">{{ originalWidth }} x {{ originalHeight }} px</span>
      </div>
    </div>

    <!-- Settings -->
    <div v-if="originalFile" class="settings-section">
      <h3>压缩设置</h3>
      <div class="settings-grid">
        <div class="setting-item">
          <label>输出格式</label>
          <select v-model="outputFormat" class="setting-select">
            <option v-for="opt in formatOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div class="setting-item">
          <label>质量 <span class="setting-value">{{ quality }}%</span></label>
          <input
            type="range"
            v-model.number="quality"
            min="1"
            max="100"
            class="setting-slider"
          />
        </div>

        <div class="setting-item">
          <label>缩放比例 <span class="setting-value">{{ scale }}%</span></label>
          <input
            type="range"
            v-model.number="scale"
            min="10"
            max="100"
            class="setting-slider"
          />
        </div>

        <div class="setting-item">
          <label>最大宽度 (px)</label>
          <input
            type="number"
            v-model="maxWidth"
            placeholder="不限制"
            class="setting-input"
            min="1"
          />
        </div>

        <div class="setting-item">
          <label>最大高度 (px)</label>
          <input
            type="number"
            v-model="maxHeight"
            placeholder="不限制"
            class="setting-input"
            min="1"
          />
        </div>
      </div>

      <div class="button-group">
        <button class="btn btn-primary" @click="compress" :disabled="isCompressing">
          {{ isCompressing ? '压缩中...' : '开始压缩' }}
        </button>
        <button class="btn btn-secondary" @click="reset">重置</button>
      </div>
    </div>

    <!-- Preview & Result -->
    <div v-if="compressedUrl" class="result-section">
      <h3>压缩结果</h3>

      <div class="result-stats">
        <div class="stat-item">
          <span class="stat-label">压缩后大小</span>
          <span class="stat-value">{{ formatFileSize(compressedSize) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">压缩后尺寸</span>
          <span class="stat-value">{{ compressedWidth }} x {{ compressedHeight }} px</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">体积变化</span>
          <span
            class="stat-value"
            :class="{ 'stat-positive': reductionPercent > 0, 'stat-negative': reductionPercent < 0 }"
          >
            {{ reductionPercent > 0 ? '-' : '+' }}{{ Math.abs(reductionPercent) }}%
          </span>
        </div>
      </div>

      <div class="preview-container">
        <div class="preview-box">
          <h4>原图</h4>
          <img :src="originalUrl" alt="原图" class="preview-image" />
        </div>
        <div class="preview-box">
          <h4>压缩后</h4>
          <img :src="compressedUrl" alt="压缩后" class="preview-image" />
        </div>
      </div>

      <button class="btn btn-primary btn-download" @click="download">下载压缩图片</button>
    </div>
  </div>
</template>

<style scoped>
.image-compressor {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  margin: 0;
  color: #8bc34a;
}

h3 {
  margin: 0 0 1rem 0;
  color: #7cb342;
  font-size: 1.1rem;
}

h4 {
  margin: 0 0 0.5rem 0;
  color: #555;
  font-size: 0.95rem;
}

/* Drop Zone */
.drop-zone {
  border: 2px dashed #ccc;
  border-radius: 12px;
  padding: 2.5rem 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #fafafa;
}

.drop-zone:hover {
  border-color: #8bc34a;
  background: #f5f9f0;
}

.drop-zone.drag-over {
  border-color: #8bc34a;
  background: #eef5e5;
  box-shadow: 0 0 0 4px rgba(139, 195, 74, 0.15);
}

.drop-zone-content {
  pointer-events: none;
}

.drop-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.drop-text {
  font-size: 1.05rem;
  color: #555;
  margin: 0 0 0.25rem 0;
}

.drop-hint {
  font-size: 0.85rem;
  color: #999;
  margin: 0;
}

/* File Info */
.file-info {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 8px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;
  min-width: 140px;
}

.info-label {
  font-size: 0.8rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 0.95rem;
  color: #333;
  font-weight: 500;
  word-break: break-all;
}

/* Settings */
.settings-section {
  padding: 1.25rem;
  background: #f9f9f9;
  border-radius: 10px;
  border: 1px solid #eee;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.setting-item label {
  font-size: 0.9rem;
  color: #555;
  font-weight: 500;
}

.setting-value {
  color: #8bc34a;
  font-weight: 600;
}

.setting-select,
.setting-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
  color: #333;
}

.setting-select:focus,
.setting-input:focus {
  outline: none;
  border-color: #8bc34a;
  box-shadow: 0 0 0 3px rgba(139, 195, 74, 0.15);
}

.setting-slider {
  width: 100%;
  accent-color: #8bc34a;
  cursor: pointer;
}

/* Buttons */
.button-group {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn {
  padding: 0.6rem 1.4rem;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #8bc34a;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #7cb342;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 195, 74, 0.35);
}

.btn-secondary {
  background-color: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

/* Result Section */
.result-section {
  padding: 1.25rem;
  background: #f9f9f9;
  border-radius: 10px;
  border: 1px solid #eee;
}

.result-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.stat-item {
  flex: 1;
  min-width: 120px;
  padding: 0.75rem 1rem;
  background: white;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.stat-label {
  display: block;
  font-size: 0.8rem;
  color: #888;
  margin-bottom: 0.25rem;
}

.stat-value {
  display: block;
  font-size: 1.05rem;
  font-weight: 600;
  color: #333;
}

.stat-positive {
  color: #4caf50;
}

.stat-negative {
  color: #f44336;
}

/* Preview */
.preview-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.preview-box {
  background: white;
  padding: 0.75rem;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.preview-image {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 4px;
  object-fit: contain;
  max-height: 300px;
}

.btn-download {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
}

/* Responsive */
@media (max-width: 768px) {
  .preview-container {
    grid-template-columns: 1fr;
  }

  .settings-grid {
    grid-template-columns: 1fr;
  }

  .result-stats {
    flex-direction: column;
  }
}

/* Dark Mode */
:global([data-theme='dark'] .image-compressor h2) {
  color: #aed581;
}

:global([data-theme='dark'] .image-compressor h3) {
  color: #aed581;
}

:global([data-theme='dark'] .image-compressor h4) {
  color: #b0b0b0;
}

:global([data-theme='dark'] .drop-zone) {
  border-color: #555;
  background: #2a2a3e;
}

:global([data-theme='dark'] .drop-zone:hover) {
  border-color: #8bc34a;
  background: #2f3a28;
}

:global([data-theme='dark'] .drop-zone.drag-over) {
  border-color: #8bc34a;
  background: #354530;
  box-shadow: 0 0 0 4px rgba(139, 195, 74, 0.2);
}

:global([data-theme='dark'] .drop-text) {
  color: #ccc;
}

:global([data-theme='dark'] .drop-hint) {
  color: #888;
}

:global([data-theme='dark'] .file-info) {
  background: #2a2a3e;
}

:global([data-theme='dark'] .info-label) {
  color: #999;
}

:global([data-theme='dark'] .info-value) {
  color: #e0e0e0;
}

:global([data-theme='dark'] .settings-section) {
  background: #2a2a3e;
  border-color: #444;
}

:global([data-theme='dark'] .setting-item label) {
  color: #ccc;
}

:global([data-theme='dark'] .setting-select),
:global([data-theme='dark'] .setting-input) {
  background: #1e1e30;
  color: #e0e0e0;
  border-color: #555;
}

:global([data-theme='dark'] .setting-select:focus),
:global([data-theme='dark'] .setting-input:focus) {
  border-color: #8bc34a;
  box-shadow: 0 0 0 3px rgba(139, 195, 74, 0.2);
}

:global([data-theme='dark'] .btn-secondary) {
  background-color: #404050;
  color: #e0e0e0;
}

:global([data-theme='dark'] .btn-secondary:hover) {
  background-color: #505060;
}

:global([data-theme='dark'] .result-section) {
  background: #2a2a3e;
  border-color: #444;
}

:global([data-theme='dark'] .stat-item) {
  background: #1e1e30;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

:global([data-theme='dark'] .stat-label) {
  color: #999;
}

:global([data-theme='dark'] .stat-value) {
  color: #e0e0e0;
}

:global([data-theme='dark'] .preview-box) {
  background: #1e1e30;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
</style>
