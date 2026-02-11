<script setup>
import { ref, watch } from 'vue'
import QRCode from 'qrcode'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()

const activeMode = ref('generate')
const inputValue = ref('')
const qrCodeUrl = ref('')
const error = ref('')

// 生成二维码
watch(inputValue, async (newValue) => {
  if (!newValue.trim()) {
    qrCodeUrl.value = ''
    error.value = ''
    return
  }

  try {
    error.value = ''
    qrCodeUrl.value = await QRCode.toDataURL(newValue, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
    })
  } catch (err) {
    error.value = '生成二维码失败：' + err.message
    qrCodeUrl.value = ''
  }
}, { immediate: true })

const downloadQRCode = () => {
  if (!qrCodeUrl.value) return
  const link = document.createElement('a')
  link.href = qrCodeUrl.value
  link.download = 'qrcode.png'
  link.click()
  addHistory('二维码生成', inputValue.value)
}

const clearInput = () => {
  inputValue.value = ''
}

// 识别二维码
const scanResult = ref('')
const scanPreview = ref('')
const scanSupported = ref(typeof window !== 'undefined' && 'BarcodeDetector' in window)

const handleScanFile = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  await scanImage(file)
}

const handleDrop = async (event) => {
  event.preventDefault()
  const file = event.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    await scanImage(file)
  }
}

const handleDragOver = (event) => {
  event.preventDefault()
}

const scanImage = async (file) => {
  scanResult.value = ''
  const url = URL.createObjectURL(file)
  scanPreview.value = url

  if (!scanSupported.value) {
    showToast('当前浏览器不支持二维码识别', 'error')
    return
  }

  try {
    const img = new Image()
    img.src = url
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })

    const detector = new BarcodeDetector({ formats: ['qr_code'] })
    const results = await detector.detect(img)

    if (results.length > 0) {
      scanResult.value = results[0].rawValue
      addHistory('二维码识别', scanResult.value)
      showToast('识别成功')
    } else {
      showToast('未检测到二维码', 'info')
    }
  } catch (err) {
    showToast('识别失败：' + err.message, 'error')
  }
}

const copyScanResult = async () => {
  try {
    await navigator.clipboard.writeText(scanResult.value)
    showToast('已复制')
  } catch (err) {
    showToast('复制失败', 'error')
  }
}

const clearScan = () => {
  scanResult.value = ''
  scanPreview.value = ''
}
</script>

<template>
  <div class="qr-generator">
    <h2>二维码工具</h2>

    <div class="mode-tabs">
      <button :class="['mode-btn', { active: activeMode === 'generate' }]" @click="activeMode = 'generate'">📱 生成二维码</button>
      <button :class="['mode-btn', { active: activeMode === 'scan' }]" @click="activeMode = 'scan'">📷 识别二维码</button>
    </div>

    <!-- 生成模式 -->
    <div v-show="activeMode === 'generate'">
      <div class="input-section">
        <textarea
          v-model="inputValue"
          placeholder="输入文本、链接或其他内容，将自动生成二维码"
          class="input-textarea"
        ></textarea>
        <div class="button-group">
          <button @click="clearInput" class="btn btn-secondary">清空</button>
        </div>
      </div>

      <div v-if="error" class="error-message">{{ error }}</div>

      <div v-if="qrCodeUrl" class="output-section">
        <div class="qr-display">
          <img :src="qrCodeUrl" alt="QR Code" class="qr-image" />
        </div>
        <button @click="downloadQRCode" class="btn btn-primary">下载二维码</button>
      </div>

      <div v-else-if="!error && inputValue" class="generating">
        生成中...
      </div>
    </div>

    <!-- 识别模式 -->
    <div v-show="activeMode === 'scan'">
      <div v-if="!scanSupported" class="warning-message">
        当前浏览器不支持 BarcodeDetector API，请使用最新版 Chrome 或 Edge 浏览器
      </div>

      <div
        class="drop-zone"
        @drop="handleDrop"
        @dragover="handleDragOver"
      >
        <div class="drop-content">
          <span class="drop-icon">📷</span>
          <p>拖拽图片到这里，或点击上传</p>
          <label class="btn btn-primary upload-label">
            选择图片
            <input type="file" accept="image/*" @change="handleScanFile" style="display: none" />
          </label>
        </div>
      </div>

      <div v-if="scanPreview" class="scan-preview">
        <img :src="scanPreview" alt="上传的图片" class="preview-image" />
      </div>

      <div v-if="scanResult" class="scan-result">
        <h3>识别结果</h3>
        <div class="result-content">
          <code class="result-text">{{ scanResult }}</code>
          <button @click="copyScanResult" class="btn btn-primary">📋 复制</button>
        </div>
      </div>

      <div v-if="scanPreview" class="button-group" style="margin-top: 1rem;">
        <button @click="clearScan" class="btn btn-secondary">清空</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.qr-generator {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  margin: 0;
  color: #42b883;
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input-textarea {
  width: 100%;
  min-height: 120px;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
}

.input-textarea:focus {
  outline: none;
  border-color: #42b883;
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.1);
}

.button-group {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background-color: #42b883;
  color: white;
}

.btn-primary:hover {
  background-color: #359970;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 184, 131, 0.3);
}

.btn-secondary {
  background-color: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

.error-message {
  padding: 0.75rem;
  background-color: #fee;
  color: #c33;
  border-radius: 6px;
  border-left: 4px solid #c33;
}

.output-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.qr-display {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.qr-image {
  display: block;
  max-width: 100%;
  height: auto;
}

.generating {
  text-align: center;
  color: #666;
  font-style: italic;
}

@media (prefers-color-scheme: light) {
  .input-textarea {
    background-color: white;
    color: #213547;
    border-color: #d0d0d0;
  }

  .input-textarea:focus {
    border-color: #42b883;
  }

  .btn-secondary {
    background-color: #e8e8e8;
    color: #213547;
  }

  .btn-secondary:hover {
    background-color: #d8d8d8;
  }

  .error-message {
    background-color: #ffe6e6;
  }
}

:global([data-theme='dark'] h2) {
  color: #5ec89f;
}

:global([data-theme='dark'] .input-textarea) {
  background-color: #2a2a3e;
  color: #e0e0e0;
  border-color: #444;
}

:global([data-theme='dark'] .input-textarea:focus) {
  border-color: #5ec89f;
  box-shadow: 0 0 0 3px rgba(94, 200, 159, 0.1);
}

:global([data-theme='dark'] .btn-secondary) {
  background-color: #404050;
  color: #e0e0e0;
}

:global([data-theme='dark'] .btn-secondary:hover) {
  background-color: #505060;
}

:global([data-theme='dark'] .error-message) {
  background-color: #4a2a2a;
  color: #ff6b6b;
  border-left-color: #ff6b6b;
}

:global([data-theme='dark'] .generating) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .qr-display) {
  background: #333;
}

/* === Scan Mode Styles === */
.mode-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.mode-btn {
  padding: 0.6rem 1.2rem;
  border: 2px solid #ddd;
  background: white;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  color: #555;
}

.mode-btn:hover {
  border-color: #42b883;
  color: #42b883;
}

.mode-btn.active {
  background: #42b883;
  color: white;
  border-color: #42b883;
  box-shadow: 0 4px 12px rgba(66, 184, 131, 0.3);
}

.warning-message {
  padding: 0.75rem;
  background-color: #fff8e1;
  color: #f57f17;
  border-radius: 6px;
  border-left: 4px solid #f57f17;
}

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
  border-color: #42b883;
  background: #f0faf5;
}

.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.drop-content p {
  margin: 0;
  color: #666;
}

.drop-icon {
  font-size: 2.5rem;
}

.upload-label {
  display: inline-block;
  cursor: pointer;
}

.scan-preview {
  text-align: center;
}

.preview-image {
  max-width: 300px;
  max-height: 300px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.scan-result {
  padding: 1rem;
  background: #f0faf5;
  border: 2px solid #42b883;
  border-radius: 8px;
}

.scan-result h3 {
  margin: 0 0 0.75rem 0;
  color: #42b883;
}

.result-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.result-text {
  flex: 1;
  padding: 0.5rem 0.75rem;
  background: white;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  word-break: break-all;
}

/* Dark mode for scan elements */
:global([data-theme='dark'] .mode-btn) {
  background: #2a2a3e;
  border-color: #444;
  color: #a0a0a0;
}

:global([data-theme='dark'] .mode-btn:hover) {
  border-color: #5ec89f;
  color: #5ec89f;
}

:global([data-theme='dark'] .mode-btn.active) {
  background: #42b883;
  color: white;
  border-color: #42b883;
}

:global([data-theme='dark'] .warning-message) {
  background-color: #4a3a1a;
  color: #ffd54f;
  border-left-color: #ffd54f;
}

:global([data-theme='dark'] .drop-zone) {
  border-color: #555;
  background: #2a2a3e;
}

:global([data-theme='dark'] .drop-zone:hover) {
  border-color: #5ec89f;
  background: #2a3e35;
}

:global([data-theme='dark'] .drop-content p) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .scan-result) {
  background: #2a3e35;
  border-color: #5ec89f;
}

:global([data-theme='dark'] .scan-result h3) {
  color: #5ec89f;
}

:global([data-theme='dark'] .result-text) {
  background: #2a2a3e;
  color: #e0e0e0;
}
</style>
