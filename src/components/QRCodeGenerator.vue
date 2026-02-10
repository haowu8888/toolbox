<script setup>
import { ref, watch } from 'vue'
import QRCode from 'qrcode'

const inputValue = ref('')
const qrCodeUrl = ref('')
const error = ref('')

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
}

const clearInput = () => {
  inputValue.value = ''
}
</script>

<template>
  <div class="qr-generator">
    <h2>二维码生成器</h2>
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
</style>
