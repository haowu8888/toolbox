<script setup>
import { ref, computed } from 'vue'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()

const curlInput = ref('')
const output = ref('')
const error = ref('')

const tokenize = (input) => {
  const tokens = []
  let current = ''
  let quote = null
  let escaping = false

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if (escaping) {
      current += char
      escaping = false
      continue
    }

    if (!quote && /\s/.test(char)) {
      if (current) tokens.push(current)
      current = ''
      continue
    }

    if (char === '\\' && quote !== "'") {
      escaping = true
      continue
    }

    if (char === "'" || char === '"') {
      if (quote === char) {
        quote = null
      } else if (!quote) {
        quote = char
      } else {
        current += char
      }
      continue
    }

    current += char
  }

  if (current) tokens.push(current)
  return tokens
}

const parseCurl = (cmd) => {
  const tokens = tokenize(cmd).filter(Boolean)
  if (tokens.length === 0) throw new Error('请输入 curl 命令')
  if (tokens[0] === 'curl') tokens.shift()

  let url = ''
  let method = ''
  const headers = []
  const data = []

  const dataFlags = new Set(['-d', '--data', '--data-raw', '--data-binary', '--data-urlencode'])
  const headerFlags = new Set(['-H', '--header'])

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]

    if (t === '--url') {
      url = tokens[i + 1] || ''
      i++
      continue
    }

    if (t === '-X' || t === '--request') {
      method = (tokens[i + 1] || '').toUpperCase()
      i++
      continue
    }

    if (headerFlags.has(t)) {
      headers.push(tokens[i + 1] || '')
      i++
      continue
    }

    if (dataFlags.has(t)) {
      data.push(tokens[i + 1] || '')
      i++
      continue
    }

    if (!t.startsWith('-') && !url) {
      url = t
    }
  }

  if (!url) throw new Error('未解析到 URL（请确保命令包含 URL）')
  if (!method && data.length > 0) method = 'POST'
  if (!method) method = 'GET'

  const headerObj = {}
  for (const line of headers) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (!key) continue
    headerObj[key] = value
  }

  const body = data.length > 0 ? data.join('&') : ''

  return { url, method, headers: headerObj, body }
}

const buildFetch = ({ url, method, headers, body }) => {
  const lines = []
  lines.push(`fetch(${JSON.stringify(url)}, {`)
  if (method && method !== 'GET') lines.push(`  method: ${JSON.stringify(method)},`)
  if (headers && Object.keys(headers).length > 0) {
    const headerLines = JSON.stringify(headers, null, 2).split('\n')
    lines.push(`  headers: ${headerLines[0]}`)
    for (let i = 1; i < headerLines.length; i++) {
      lines.push(`  ${headerLines[i]}`)
    }
    lines[lines.length - 1] += ','
  }
  if (body) lines.push(`  body: ${JSON.stringify(body)},`)
  lines.push('})')
  lines.push('  .then((res) => res.text())')
  lines.push('  .then(console.log)')
  lines.push('  .catch(console.error)')
  return lines.join('\n')
}

const example = computed(
  () =>
    "curl -X POST 'https://example.com/api' -H 'Content-Type: application/json' -H 'Authorization: Bearer xxx' -d '{\"name\":\"Alice\"}'",
)

const convert = () => {
  error.value = ''
  output.value = ''

  try {
    const parsed = parseCurl(curlInput.value.trim())
    output.value = buildFetch(parsed)
    addHistory('cURL 转 Fetch', parsed.url)
    showToast('转换完成')
  } catch (err) {
    error.value = err.message || '转换失败'
  }
}

const copyToClipboard = async () => {
  if (!output.value) return
  try {
    await navigator.clipboard.writeText(output.value)
    showToast('已复制')
  } catch (err) {
    showToast('复制失败', 'error')
  }
}

const fillExample = () => {
  curlInput.value = example.value
  output.value = ''
  error.value = ''
}

const clearAll = () => {
  curlInput.value = ''
  output.value = ''
  error.value = ''
}
</script>

<template>
  <div class="curl-fetch">
    <h2>🌀 cURL 转 Fetch</h2>
    <p class="description">把常见 curl 命令转换成浏览器 fetch 代码</p>

    <div class="controls">
      <button class="btn btn-secondary" @click="fillExample">填充示例</button>
      <button class="btn btn-primary" @click="convert">转换</button>
      <button class="btn btn-secondary" @click="clearAll">清空</button>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div class="editor-container">
      <div class="editor">
        <div class="editor-label">cURL 输入</div>
        <textarea
          v-model="curlInput"
          class="editor-textarea"
          placeholder="粘贴 curl 命令，例如：curl https://example.com"
        ></textarea>
      </div>

      <div class="editor">
        <div class="editor-label">
          Fetch 输出
          <button class="btn btn-mini" :disabled="!output" @click="copyToClipboard">📋 复制</button>
        </div>
        <textarea v-model="output" readonly class="editor-textarea" placeholder="转换后的 fetch 代码"></textarea>
      </div>
    </div>

    <div class="tips">
      <div class="tip-title">说明</div>
      <ul>
        <li>支持：URL、<code>-X/--request</code>、<code>-H/--header</code>、<code>-d/--data*</code></li>
        <li>如果包含 <code>-d</code> 但未指定方法，会默认 <code>POST</code></li>
        <li>遇到 <code>@file</code> 形式的数据需手动改成 <code>FormData</code> 或读取文件</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.curl-fetch {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

h2 {
  margin: 0;
  color: #2196f3;
  font-size: 1.8em;
}

.description {
  margin: 0;
  color: #888;
  font-size: 0.95rem;
}

.controls {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.error-message {
  padding: 0.75rem;
  background-color: #fee;
  color: #c33;
  border-radius: 6px;
  border-left: 4px solid #c33;
}

.editor-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.editor-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-weight: 700;
  color: #333;
}

.editor-textarea {
  width: 100%;
  min-height: 320px;
  padding: 0.75rem;
  border: 2px solid #bbdefb;
  border-radius: 10px;
  font-family: 'Courier New', monospace;
  resize: vertical;
}

.btn {
  padding: 0.7rem 1.1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #2196f3;
  color: white;
}

.btn-secondary {
  background: #e3f2fd;
  color: #1565c0;
}

.btn-mini {
  padding: 0.35rem 0.6rem;
  font-size: 0.9rem;
}

.tips {
  padding: 0.9rem 1rem;
  border: 1px solid rgba(33, 150, 243, 0.25);
  border-radius: 10px;
  background: rgba(227, 242, 253, 0.55);
}

.tip-title {
  font-weight: 800;
  margin-bottom: 0.35rem;
  color: #1565c0;
}

code {
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: rgba(33, 150, 243, 0.12);
}

@media (max-width: 900px) {
  .editor-container {
    grid-template-columns: 1fr;
  }
}

:global([data-theme='dark']) .description {
  color: #a0a0a0;
}

:global([data-theme='dark']) .editor-label {
  color: #e0e0e0;
}

:global([data-theme='dark']) .editor-textarea {
  background-color: #2a2a3e;
  color: #e0e0e0;
  border-color: #1b5e84;
}

:global([data-theme='dark']) .btn-secondary {
  background-color: #2a2a3e;
  color: #90caf9;
  border: 1px solid rgba(33, 150, 243, 0.35);
}

:global([data-theme='dark']) .tips {
  background: rgba(26, 26, 46, 0.6);
  border-color: rgba(33, 150, 243, 0.35);
}

:global([data-theme='dark']) .tip-title {
  color: #90caf9;
}
</style>
