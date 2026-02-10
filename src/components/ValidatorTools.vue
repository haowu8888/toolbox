<script setup>
import { ref, computed } from 'vue'

const inputValue = ref('')
const validationType = ref('email')
const validationResult = ref(null)

const validators = {
  email: {
    name: '邮箱验证',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    description: '验证邮箱格式是否正确',
  },
  phone: {
    name: '手机号验证',
    pattern: /^1[3-9]\d{9}$/,
    description: '验证中国大陆11位手机号',
  },
  url: {
    name: 'URL 验证',
    pattern: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
    description: '验证URL格式是否正确',
  },
  phone_int: {
    name: '国际电话号码',
    pattern: /^\+?[1-9]\d{1,14}$/,
    description: 'E.164格式的国际电话号码',
  },
  ipv4: {
    name: 'IPv4 地址',
    pattern: /^(\d{1,3}\.){3}\d{1,3}$/,
    description: '验证 IPv4 地址格式',
  },
  idcard: {
    name: '身份证号验证',
    pattern: /^\d{18}$|^\d{17}[\dXx]$/,
    description: '验证18位或17位身份证号',
  },
}

const validate = () => {
  if (!inputValue.value.trim()) {
    validationResult.value = null
    return
  }

  const validator = validators[validationType.value]
  const isValid = validator.pattern.test(inputValue.value.trim())

  validationResult.value = {
    isValid,
    input: inputValue.value.trim(),
    type: validator.name,
  }
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    alert('已复制！')
  } catch (err) {
    alert('复制失败')
  }
}

const clearAll = () => {
  inputValue.value = ''
  validationResult.value = null
}

const examples = computed(() => {
  const exampleMap = {
    email: 'example@email.com',
    phone: '13812345678',
    url: 'https://www.example.com',
    phone_int: '+86 138 1234 5678',
    ipv4: '192.168.1.1',
    idcard: '110101199003076013',
  }
  return exampleMap[validationType.value] || ''
})
</script>

<template>
  <div class="validator-tools">
    <h2>✔️ 数据验证器</h2>
    <p class="description">验证邮箱、电话、URL、身份证等格式</p>

    <div class="validator-select">
      <label>选择验证类型：</label>
      <select v-model="validationType" @change="clearAll" class="select-field">
        <option v-for="(validator, key) in validators" :key="key" :value="key">
          {{ validator.name }} - {{ validator.description }}
        </option>
      </select>
    </div>

    <div class="input-section">
      <textarea
        v-model="inputValue"
        @input="validate"
        :placeholder="`示例: ${examples}`"
        class="input-textarea"
      ></textarea>
      <div class="input-actions">
        <div class="example-hint">
          示例: <code>{{ examples }}</code>
        </div>
        <button @click="clearAll" class="btn btn-secondary">清空</button>
      </div>
    </div>

    <div v-if="validationResult" :class="['result-box', { valid: validationResult.isValid, invalid: !validationResult.isValid }]">
      <div class="result-header">
        <span v-if="validationResult.isValid" class="result-icon">✅</span>
        <span v-else class="result-icon">❌</span>
        <span class="result-status">
          {{ validationResult.isValid ? '验证通过' : '验证失败' }}
        </span>
      </div>
      <div class="result-content">
        <div class="result-info">
          <span class="label">验证类型：</span>
          <span class="value">{{ validationResult.type }}</span>
        </div>
        <div class="result-info">
          <span class="label">输入内容：</span>
          <code class="value">{{ validationResult.input }}</code>
          <button @click="copyToClipboard(validationResult.input)" class="btn-copy">📋</button>
        </div>
      </div>
    </div>

    <div v-else-if="inputValue" class="validating">
      正在验证...
    </div>

    <!-- 验证规则说明 -->
    <div class="rules-section">
      <div class="section-title">验证规则说明</div>
      <div class="rules-grid">
        <div v-for="(validator, key) in validators" :key="key" class="rule-item">
          <div class="rule-type">{{ validator.name }}</div>
          <div class="rule-desc">{{ validator.description }}</div>
          <div class="rule-pattern">{{ validator.pattern }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.validator-tools {
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

.validator-select {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.validator-select label {
  font-weight: 600;
  color: #333;
}

.select-field {
  padding: 0.75rem;
  border: 2px solid #b3e5fc;
  border-radius: 8px;
  font-size: 0.95rem;
  background-color: white;
  color: #333;
  transition: border-color 0.3s;
  cursor: pointer;
}

:global([data-theme='dark'] .select-field) {
  background: #2a3a4a;
  border-color: #3a4a5a;
  color: #e0e0e0;
}

.select-field:focus {
  outline: none;
  border-color: #42b883;
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.1);
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
  border: 2px solid #c8e6c9;
  border-radius: 8px;
  font-size: 1rem;
  font-family: 'Courier New', monospace;
  background-color: #f1f8f6;
  color: #333;
  resize: vertical;
  transition: border-color 0.3s;
}

:global([data-theme='dark'] .input-textarea) {
  background-color: #1a2a2a;
  border-color: #3a5a5a;
  color: #e0e0e0;
}

.input-textarea:focus {
  outline: none;
  border-color: #42b883;
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.1);
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.example-hint {
  font-size: 0.9rem;
  color: #666;
}

:global([data-theme='dark'] .example-hint) {
  color: #a0c0e0;
}

.example-hint code {
  background: #f5f5f5;
  padding: 0.3rem 0.6rem;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  color: #42b883;
}

:global([data-theme='dark'] .example-hint code) {
  background: #2a3a4a;
  color: #5ec89f;
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

.btn-secondary {
  background-color: #f0f0f0;
  color: #333;
}

:global([data-theme='dark'] .btn-secondary) {
  background-color: #2a3a4a;
  color: #e0e0e0;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

:global([data-theme='dark'] .btn-secondary:hover) {
  background-color: #3a4a5a;
}

.result-box {
  border-radius: 8px;
  padding: 1.5rem;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.result-box.valid {
  background: linear-gradient(135deg, #e8f5e9, #f1f8f6);
  border: 2px solid #4caf50;
  color: #2e7d32;
}

:global([data-theme='dark'] .result-box.valid) {
  background: linear-gradient(135deg, #1a3a2a, #1a2a2a);
  border-color: #5ec89f;
  color: #5ec89f;
}

.result-box.invalid {
  background: linear-gradient(135deg, #ffebee, #ffe5e5);
  border: 2px solid #f44336;
  color: #c62828;
}

:global([data-theme='dark'] .result-box.invalid) {
  background: linear-gradient(135deg, #3a1a1a, #2a1a1a);
  border-color: #ff8fa3;
  color: #ff8fa3;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  font-weight: 600;
  font-size: 1.1rem;
}

.result-icon {
  font-size: 1.5rem;
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.result-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.label {
  font-weight: 600;
}

.value {
  font-family: 'Courier New', monospace;
  padding: 0.3rem 0.6rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
  flex: 1;
  min-width: 150px;
  word-break: break-all;
}

:global([data-theme='dark'] .value) {
  background: rgba(0, 0, 0, 0.3);
}

.btn-copy {
  padding: 0.4rem 0.8rem;
  border: 1px solid currentColor;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.btn-copy:hover {
  background: rgba(0, 0, 0, 0.1);
}

:global([data-theme='dark'] .btn-copy:hover) {
  background: rgba(255, 255, 255, 0.1);
}

.validating {
  text-align: center;
  color: #666;
  padding: 2rem;
  font-style: italic;
}

:global([data-theme='dark'] .validating) {
  color: #a0c0e0;
}

.rules-section {
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 1.5rem;
}

:global([data-theme='dark'] .rules-section) {
  background: #2a3a4a;
  border-color: #3a4a5a;
}

.section-title {
  font-weight: 700;
  font-size: 1.1rem;
  color: #333;
  margin-bottom: 1.2rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e0e0e0;
}

:global([data-theme='dark'] .section-title) {
  color: #e0e0e0;
  border-bottom-color: #3a4a5a;
}

.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.rule-item {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.3s;
}

:global([data-theme='dark'] .rule-item) {
  background: #1a1a2e;
  border-color: #3a3a3a;
}

.rule-item:hover {
  border-color: #42b883;
  box-shadow: 0 2px 8px rgba(66, 184, 131, 0.1);
}

.rule-type {
  font-weight: 600;
  color: #42b883;
  margin-bottom: 0.5rem;
}

:global([data-theme='dark'] .rule-type) {
  color: #5ec89f;
}

.rule-desc {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.75rem;
}

:global([data-theme='dark'] .rule-desc) {
  color: #a0c0e0;
}

.rule-pattern {
  font-size: 0.85rem;
  font-family: 'Courier New', monospace;
  background: #f5f5f5;
  padding: 0.5rem;
  border-radius: 4px;
  color: #666;
  word-break: break-all;
  max-height: 60px;
  overflow-y: auto;
}

:global([data-theme='dark'] .rule-pattern) {
  background: #2a3a4a;
  color: #a0c0e0;
}

@media (max-width: 768px) {
  .rules-grid {
    grid-template-columns: 1fr;
  }

  .input-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .btn {
    width: 100%;
  }
}

/* Dark mode overrides */
:global([data-theme='dark'] h2) {
  color: #5ec89f;
}

:global([data-theme='dark'] .description) {
  color: #a0c0e0;
}

:global([data-theme='dark'] .validator-select label) {
  color: #e0e0e0;
}
</style>
