<script setup>
import { ref } from 'vue'
import CryptoJS from 'crypto-js'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()

const toolType = ref('image-base64')
const imageInput = ref('')
const imagePreview = ref('')
const base64Input = ref('')
const fileInput = ref(null)
const hashResult = ref('')

// 图片转 Base64
const handleImageSelect = (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    showToast('请选择图片文件', 'error')
    return
  }

  const reader = new FileReader()
  reader.onload = (event) => {
    imagePreview.value = event.target?.result || ''
    imageInput.value = event.target?.result || ''
  }
  reader.readAsDataURL(file)
}

// Base64 转图片
const displayBase64Image = () => {
  if (!base64Input.value.trim().startsWith('data:image')) {
    showToast('请输入有效的 Base64 图片数据（应以 data:image 开头）', 'error')
    return
  }
  imagePreview.value = base64Input.value
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    showToast('已复制')
    addHistory('文件工具', text.length > 100 ? text.substring(0, 100) + '...' : text)
  } catch (err) {
    showToast('复制失败', 'error')
  }
}

const downloadBase64Image = () => {
  if (!imageInput.value) {
    showToast('请先选择或输入图片', 'info')
    return
  }

  const link = document.createElement('a')
  link.href = imageInput.value
  link.download = 'image.png'
  link.click()
}

const downloadImageAsBase64 = () => {
  if (!imagePreview.value) {
    showToast('请先转换图片', 'info')
    return
  }

  const element = document.createElement('a')
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(imageInput.value))
  element.setAttribute('download', 'image-base64.txt')
  element.style.display = 'none'
  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
}

// 文件哈希计算
const handleFileSelect = (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    const arrayBuffer = event.target?.result
    if (!arrayBuffer) return
    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer)
    const md5 = CryptoJS.MD5(wordArray).toString()
    const sha256 = CryptoJS.SHA256(wordArray).toString()
    hashResult.value = `
文件: ${file.name}
类型: ${file.type || '未知'}
大小: ${(file.size / 1024).toFixed(2)} KB

MD5:    ${md5}
SHA-256: ${sha256}
    `.trim()
    addHistory('文件哈希', `${file.name} MD5: ${md5}`)
  }
  reader.readAsArrayBuffer(file)
}

const clearAll = () => {
  imageInput.value = ''
  imagePreview.value = ''
  base64Input.value = ''
  hashResult.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="file-tools">
    <h2>📁 文件处理工具</h2>
    <p class="description">图片 Base64 转换、文件哈希计算</p>

    <div class="tabs">
      <button
        v-for="tab in ['image-base64', 'base64-image', 'file-hash']"
        :key="tab"
        :class="['tab-btn', { active: toolType === tab }]"
        @click="toolType = tab; clearAll()"
      >
        {{ tab === 'image-base64' ? '🖼️ 图转 Base64' : tab === 'base64-image' ? '🖼️ Base64 转图' : '🔐 文件哈希' }}
      </button>
    </div>

    <!-- 图片转 Base64 -->
    <div v-if="toolType === 'image-base64'" class="tool-section">
      <div class="upload-section">
        <label class="upload-btn">
          <input
            type="file"
            accept="image/*"
            aria-label="选择图片文件"
            data-testid="image-file-input"
            @change="handleImageSelect"
            style="display: none"
          />
          📁 选择图片
        </label>
        <p class="hint">支持 PNG、JPG、GIF 等格式</p>
      </div>

      <div v-if="imagePreview" class="preview-section">
        <div class="image-preview">
          <img :src="imagePreview" alt="Preview" class="preview-img" />
        </div>

        <div class="base64-section">
          <div class="base64-label">Base64 数据：</div>
          <textarea
            v-model="imageInput"
            readonly
            class="base64-textarea"
          ></textarea>
          <div class="button-group">
            <button @click="copyToClipboard(imageInput)" class="btn btn-primary">📋 复制</button>
            <button @click="downloadImageAsBase64" class="btn btn-primary">💾 下载文本</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Base64 转图片 -->
    <div v-else-if="toolType === 'base64-image'" class="tool-section">
      <textarea
        v-model="base64Input"
        placeholder="粘贴 Base64 图片数据（应以 data:image 开头）..."
        class="input-textarea"
      ></textarea>
      <button @click="displayBase64Image" class="btn btn-primary">🖼️ 显示图片</button>

      <div v-if="imagePreview" class="preview-section">
        <div class="image-preview">
          <img :src="imagePreview" alt="Preview" class="preview-img" />
        </div>
        <button @click="downloadBase64Image" class="btn btn-primary">💾 下载图片</button>
      </div>
    </div>

    <!-- 文件哈希 -->
    <div v-else class="tool-section">
      <div class="upload-section">
        <label class="upload-btn">
          <input
            ref="fileInput"
            type="file"
            aria-label="选择文件计算哈希"
            data-testid="hash-file-input"
            @change="handleFileSelect"
            style="display: none"
          />
          📁 选择文件
        </label>
        <p class="hint">可计算任何类型文件的哈希值</p>
      </div>

      <div v-if="hashResult" class="result-section">
        <pre class="result-text">{{ hashResult }}</pre>
        <button @click="copyToClipboard(hashResult)" class="btn btn-primary">📋 复制</button>
      </div>
    </div>

    <button @click="clearAll" class="btn btn-secondary">清空</button>
  </div>
</template>

<style scoped>
.file-tools {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  margin: 0;
  color: #42b883;
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
  border: 2px solid #c8e6c9;
  background-color: white;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  color: #666;
}

:global([data-theme='dark'] .tab-btn) {
  background-color: #2a2a2a;
  border-color: #3a5a3a;
  color: #a0c0e0;
}

.tab-btn.active {
  background-color: #42b883;
  color: white;
  border-color: #42b883;
  box-shadow: 0 4px 12px rgba(66, 184, 131, 0.3);
}

.tool-section {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.upload-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  padding: 2rem;
  background: linear-gradient(135deg, #e8f5e9, #f1f8f6);
  border: 2px dashed #4caf50;
  border-radius: 10px;
  text-align: center;
}

:global([data-theme='dark'] .upload-section) {
  background: linear-gradient(135deg, #1a2a1a, #1a2a2a);
  border-color: #5ec89f;
}

.upload-btn {
  padding: 0.8rem 1.6rem;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-btn:hover {
  background: #35a575;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 184, 131, 0.3);
}

.hint {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

:global([data-theme='dark'] .hint) {
  color: #a0c0e0;
}

.preview-section {
  background: #f9f9f9;
  border: 2px solid #c8e6c9;
  border-radius: 10px;
  padding: 1.5rem;
  margin-top: 1.5rem;
}

:global([data-theme='dark'] .preview-section) {
  background: #2a2a2a;
  border-color: #3a5a3a;
}

.image-preview {
  margin-bottom: 1.5rem;
  text-align: center;
}

.preview-img {
  max-width: 100%;
  max-height: 400px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

:global([data-theme='dark'] .preview-img) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.base64-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.base64-label {
  font-weight: 600;
  color: #333;
}

:global([data-theme='dark'] .base64-label) {
  color: #e0e0e0;
}

.base64-textarea {
  width: 100%;
  min-height: 150px;
  padding: 0.75rem;
  border: 2px solid #c8e6c9;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  background: white;
  color: #333;
  resize: vertical;
}

:global([data-theme='dark'] .base64-textarea) {
  background: #1a1a2a;
  border-color: #3a5a3a;
  color: #e0e0e0;
}

.input-textarea {
  width: 100%;
  min-height: 150px;
  padding: 0.75rem;
  border: 2px solid #c8e6c9;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  background: white;
  color: #333;
  resize: vertical;
  transition: border-color 0.3s;
}

:global([data-theme='dark'] .input-textarea) {
  background: #1a1a2a;
  border-color: #3a5a3a;
  color: #e0e0e0;
}

.input-textarea:focus {
  outline: none;
  border-color: #42b883;
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.1);
}

.result-section {
  background: #f9f9f9;
  border: 2px solid #c8e6c9;
  border-radius: 10px;
  padding: 1.5rem;
  margin-top: 1.5rem;
}

:global([data-theme='dark'] .result-section) {
  background: #2a2a2a;
  border-color: #3a5a3a;
}

.result-text {
  margin: 0;
  padding: 1rem;
  background: white;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: #333;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
}

:global([data-theme='dark'] .result-text) {
  background: #1a1a2a;
  color: #e0e0e0;
}

.button-group {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: #42b883;
  color: white;
  flex: 1;
}

.btn-primary:hover {
  background: #35a575;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 184, 131, 0.3);
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

:global([data-theme='dark'] .btn-secondary) {
  background: #2a2a2a;
  color: #e0e0e0;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

:global([data-theme='dark'] .btn-secondary:hover) {
  background: #3a3a3a;
}

@media (max-width: 768px) {
  .button-group {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }

  .preview-img {
    max-height: 300px;
  }
}

/* Dark mode overrides */
:global([data-theme='dark'] h2) {
  color: #5ec89f;
}

:global([data-theme='dark'] .description) {
  color: #a0c0e0;
}
</style>
