<script setup>
import { ref } from 'vue'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()

const inputCode = ref('')
const codeType = ref('json')
const indentSize = ref(2)
const output = ref('')
const sqlUppercase = ref(true)

// JSON 格式化
const formatJSON = (json) => {
  try {
    const parsed = JSON.parse(json)
    return JSON.stringify(parsed, null, indentSize.value)
  } catch (err) {
    return 'JSON 解析错误：' + err.message
  }
}

// SQL 格式化（增强版：支持缩进、关键字大写、括号对齐、子查询缩进）
const formatSQL = (sql) => {
  const indent = ' '.repeat(indentSize.value)

  // SQL 主要关键字分类
  const majorKeywords = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE']
  const joinKeywords = ['JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'FULL OUTER JOIN', 'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'CROSS JOIN', 'NATURAL JOIN']
  const subKeywords = ['AND', 'OR', 'ON']

  // Tokenize: split SQL into meaningful tokens while preserving strings and parentheses
  const tokenize = (input) => {
    const tokens = []
    let i = 0
    while (i < input.length) {
      // Skip whitespace
      if (/\s/.test(input[i])) {
        i++
        continue
      }
      // String literal (single quotes)
      if (input[i] === "'") {
        let j = i + 1
        while (j < input.length) {
          if (input[j] === "'" && input[j + 1] === "'") { j += 2; continue }
          if (input[j] === "'") { j++; break }
          j++
        }
        tokens.push({ type: 'string', value: input.substring(i, j) })
        i = j
        continue
      }
      // String literal (double quotes - identifiers)
      if (input[i] === '"') {
        let j = i + 1
        while (j < input.length && input[j] !== '"') j++
        j++
        tokens.push({ type: 'string', value: input.substring(i, j) })
        i = j
        continue
      }
      // Parentheses
      if (input[i] === '(') {
        tokens.push({ type: 'openParen', value: '(' })
        i++
        continue
      }
      if (input[i] === ')') {
        tokens.push({ type: 'closeParen', value: ')' })
        i++
        continue
      }
      // Comma
      if (input[i] === ',') {
        tokens.push({ type: 'comma', value: ',' })
        i++
        continue
      }
      // Semicolon
      if (input[i] === ';') {
        tokens.push({ type: 'semicolon', value: ';' })
        i++
        continue
      }
      // Word or operator
      if (/[a-zA-Z_]/.test(input[i])) {
        let j = i
        while (j < input.length && /[a-zA-Z0-9_.]/.test(input[j])) j++
        tokens.push({ type: 'word', value: input.substring(i, j) })
        i = j
        continue
      }
      // Numbers
      if (/[0-9]/.test(input[i])) {
        let j = i
        while (j < input.length && /[0-9.]/.test(input[j])) j++
        tokens.push({ type: 'number', value: input.substring(i, j) })
        i = j
        continue
      }
      // Operators and other characters
      // Multi-char operators
      if (i + 1 < input.length) {
        const two = input.substring(i, i + 2)
        if (['>=', '<=', '<>', '!=', '||', '::'].includes(two)) {
          tokens.push({ type: 'operator', value: two })
          i += 2
          continue
        }
      }
      tokens.push({ type: 'operator', value: input[i] })
      i++
    }
    return tokens
  }

  // Merge multi-word keywords (e.g., "GROUP" + "BY" → "GROUP BY")
  const mergeKeywords = (tokens) => {
    const merged = []
    const multiWord = ['GROUP BY', 'ORDER BY', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN', 'NATURAL JOIN', 'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'FULL OUTER JOIN', 'UNION ALL', 'INSERT INTO', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'IS NOT', 'NOT IN', 'NOT EXISTS', 'NOT LIKE', 'NOT BETWEEN']

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === 'word') {
        let matched = false
        // Try 3-word combos first, then 2-word
        for (const len of [3, 2]) {
          if (i + len - 1 < tokens.length) {
            const combo = tokens.slice(i, i + len).filter(t => t.type === 'word').map(t => t.value.toUpperCase()).join(' ')
            if (multiWord.includes(combo) && tokens.slice(i, i + len).every(t => t.type === 'word')) {
              merged.push({ type: 'word', value: tokens.slice(i, i + len).map(t => t.value).join(' ') })
              i += len - 1
              matched = true
              break
            }
          }
        }
        if (!matched) {
          merged.push(tokens[i])
        }
      } else {
        merged.push(tokens[i])
      }
    }
    return merged
  }

  // Classify a word token
  const classify = (val) => {
    const upper = val.toUpperCase()
    if (majorKeywords.includes(upper)) return 'major'
    if (joinKeywords.includes(upper)) return 'join'
    if (subKeywords.includes(upper)) return 'sub'
    return 'other'
  }

  // Format
  const tokens = mergeKeywords(tokenize(sql))
  let result = ''
  let depth = 0
  let afterSelect = false

  const newline = () => '\n' + indent.repeat(depth)
  const newlineIndented = () => '\n' + indent.repeat(depth + 1)

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const val = token.value
    const upper = val.toUpperCase()

    if (token.type === 'word') {
      const cls = classify(val)
      const outputVal = sqlUppercase.value ? upper : val

      if (cls === 'major') {
        if (upper === 'SELECT') {
          if (result.length > 0) result += newline()
          result += outputVal
          afterSelect = true
        } else {
          afterSelect = false
          result += newline() + outputVal
        }
      } else if (cls === 'join') {
        afterSelect = false
        result += newline() + outputVal
      } else if (cls === 'sub') {
        afterSelect = false
        result += newlineIndented() + outputVal
      } else {
        result += ' ' + (sqlUppercase.value && ['AS', 'IN', 'BETWEEN', 'LIKE', 'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'NULL', 'TRUE', 'FALSE', 'NOT', 'IS', 'ASC', 'DESC', 'DISTINCT', 'ALL', 'ANY', 'SOME', 'INTO', 'TABLE', 'INDEX', 'VIEW', 'TRIGGER', 'FUNCTION', 'PROCEDURE', 'IF', 'BEGIN', 'COMMIT', 'ROLLBACK', 'CAST', 'COALESCE', 'NULLIF', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX'].includes(upper) ? upper : val)
      }
    } else if (token.type === 'openParen') {
      result += ' ('
      depth++
      // Check if this is a subquery (next meaningful token is SELECT)
      const nextWord = tokens.slice(i + 1).find(t => t.type === 'word')
      if (nextWord && nextWord.value.toUpperCase() === 'SELECT') {
        // Subquery: add newline after opening paren
        result += newline()
      }
    } else if (token.type === 'closeParen') {
      depth = Math.max(0, depth - 1)
      result += newline() + ')'
    } else if (token.type === 'comma') {
      if (afterSelect) {
        result += ',' + newlineIndented()
      } else {
        result += ','
      }
    } else if (token.type === 'semicolon') {
      result += ';' + '\n'
    } else {
      result += ' ' + val
    }
  }

  return result.trim()
}

// HTML 格式化
const formatHTML = (html) => {
  let result = ''
  let indent = 0
  const indentStr = ' '.repeat(indentSize.value)

  let i = 0
  while (i < html.length) {
    if (html[i] === '<') {
      const end = html.indexOf('>', i)
      const tag = html.substring(i, end + 1)

      if (tag.startsWith('</')) {
        indent = Math.max(0, indent - 1)
        result += indentStr.repeat(indent) + tag + '\n'
      } else if (tag.endsWith('/>') || tag.match(/<(br|hr|img|input|meta|link)/i)) {
        result += indentStr.repeat(indent) + tag + '\n'
      } else {
        result += indentStr.repeat(indent) + tag + '\n'
        if (!tag.startsWith('<!')) {
          indent++
        }
      }

      i = end + 1
    } else {
      const nextTag = html.indexOf('<', i)
      const text = nextTag === -1 ? html.substring(i) : html.substring(i, nextTag)

      if (text.trim()) {
        result += indentStr.repeat(indent) + text.trim() + '\n'
      }

      i = nextTag === -1 ? html.length : nextTag
    }
  }

  return result
}

// XML 格式化
const formatXML = (xml) => {
  return formatHTML(xml)
}

// 比较两个代码块
const code1 = ref('')
const code2 = ref('')
const diffResult = ref('')

const compareCode = () => {
  const lines1 = code1.value.split('\n')
  const lines2 = code2.value.split('\n')

  diffResult.value = ''

  const maxLines = Math.max(lines1.length, lines2.length)
  for (let i = 0; i < maxLines; i++) {
    const line1 = lines1[i] || ''
    const line2 = lines2[i] || ''

    if (line1 === line2) {
      diffResult.value += `  ${line1}\n`
    } else {
      if (line1) diffResult.value += `- ${line1}\n`
      if (line2) diffResult.value += `+ ${line2}\n`
    }
  }
}

const format = () => {
  if (!inputCode.value.trim()) {
    output.value = ''
    return
  }

  try {
    if (codeType.value === 'json') {
      output.value = formatJSON(inputCode.value)
    } else if (codeType.value === 'sql') {
      output.value = formatSQL(inputCode.value)
    } else if (codeType.value === 'html') {
      output.value = formatHTML(inputCode.value)
    } else if (codeType.value === 'xml') {
      output.value = formatXML(inputCode.value)
    }
    addHistory('代码格式化', output.value)
  } catch (err) {
    output.value = '格式化错误：' + err.message
  }
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    showToast('已复制')
  } catch (err) {
    showToast('复制失败', 'error')
  }
}

const minify = () => {
  try {
    if (codeType.value === 'json') {
      const parsed = JSON.parse(inputCode.value)
      output.value = JSON.stringify(parsed)
    } else {
      output.value = inputCode.value.replace(/\s+/g, ' ').trim()
    }
    addHistory('代码压缩', output.value)
  } catch (err) {
    output.value = '压缩失败：' + err.message
  }
}

const clearAll = () => {
  inputCode.value = ''
  output.value = ''
  code1.value = ''
  code2.value = ''
  diffResult.value = ''
}
</script>

<template>
  <div class="code-tools">
    <h2>💻 代码工具</h2>
    <p class="description">格式化、对比、优化代码</p>

    <div class="tabs">
      <button
        v-for="tab in ['format', 'compare']"
        :key="tab"
        :class="['tab-btn', { active: codeType.includes(tab) || (tab === 'format' && codeType !== 'compare') }]"
        @click="codeType = tab === 'compare' ? 'json' : tab"
      >
        {{ tab === 'format' ? '✨ 格式化' : '🔍 对比' }}
      </button>
    </div>

    <!-- 格式化模式 -->
    <div v-if="codeType !== 'compare'" class="tool-section">
      <div class="controls">
        <select v-model="codeType" class="select-field">
          <option value="json">JSON</option>
          <option value="sql">SQL</option>
          <option value="html">HTML</option>
          <option value="xml">XML</option>
        </select>
        <label>
          缩进:
          <input v-model.number="indentSize" type="number" min="1" max="8" class="input-field" />
        </label>
        <button @click="format" class="btn btn-primary">✨ 格式化</button>
        <button @click="minify" class="btn btn-secondary">📦 压缩</button>
        <label v-if="codeType === 'sql'" class="checkbox-label">
          <input type="checkbox" v-model="sqlUppercase" />
          关键字大写
        </label>
      </div>

      <div class="editor-pair">
        <div class="editor">
          <div class="editor-label">输入</div>
          <textarea
            v-model="inputCode"
            placeholder="粘贴你的代码..."
            class="code-textarea"
          ></textarea>
        </div>
        <div class="editor">
          <div class="editor-label">输出</div>
          <textarea
            v-model="output"
            readonly
            placeholder="格式化后的结果"
            class="code-textarea"
          ></textarea>
          <button v-if="output" @click="copyToClipboard(output)" class="btn btn-copy">📋 复制</button>
        </div>
      </div>
    </div>

    <!-- 对比模式 -->
    <div v-else class="tool-section">
      <div class="editor-pair-compare">
        <div class="editor">
          <div class="editor-label">代码 1</div>
          <textarea
            v-model="code1"
            placeholder="输入第一个代码..."
            class="code-textarea"
          ></textarea>
        </div>
        <div class="editor">
          <div class="editor-label">代码 2</div>
          <textarea
            v-model="code2"
            placeholder="输入第二个代码..."
            class="code-textarea"
          ></textarea>
        </div>
      </div>
      <button @click="compareCode" class="btn btn-primary">🔍 对比</button>

      <div v-if="diffResult" class="diff-result">
        <div class="diff-header">对比结果</div>
        <pre class="diff-content">{{ diffResult }}</pre>
        <button @click="copyToClipboard(diffResult)" class="btn btn-copy">📋 复制</button>
      </div>
    </div>

    <button @click="clearAll" class="btn btn-secondary">清空</button>
  </div>
</template>

<style scoped>
.code-tools {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  margin: 0;
  color: #9c27b0;
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

:global([data-theme='dark'] .tab-btn) {
  background-color: #2a2a3a;
  border-color: #4a3a5a;
  color: #a0c0e0;
}

.tab-btn.active {
  background-color: #9c27b0;
  color: white;
  border-color: #9c27b0;
  box-shadow: 0 4px 12px rgba(156, 39, 176, 0.3);
}

.tool-section {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f9f5fb;
  border-radius: 8px;
}

:global([data-theme='dark'] .controls) {
  background: #2a2a3a;
  color: #e0e0e0;
}

.select-field,
.input-field {
  padding: 0.5rem;
  border: 2px solid #e0bee7;
  border-radius: 6px;
  font-size: 0.95rem;
  background-color: white;
  color: #333;
  cursor: pointer;
}

:global([data-theme='dark'] .select-field),
:global([data-theme='dark'] .input-field) {
  background-color: #1a1a2e;
  border-color: #4a3a5a;
  color: #e0e0e0;
}

.editor-pair,
.editor-pair-compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.editor-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #555;
}

:global([data-theme='dark'] .editor-label) {
  color: #a0c0e0;
}

.code-textarea {
  flex: 1;
  min-height: 300px;
  padding: 0.75rem;
  border: 2px solid #e0bee7;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  background-color: white;
  color: #333;
  resize: vertical;
  transition: border-color 0.3s;
}

:global([data-theme='dark'] .code-textarea) {
  background-color: #1a1a2e;
  border-color: #4a3a5a;
  color: #e0e0e0;
}

.code-textarea:focus {
  outline: none;
  border-color: #9c27b0;
  box-shadow: 0 0 0 3px rgba(156, 39, 176, 0.1);
}

.code-textarea[readonly] {
  background-color: #f5f5f5;
}

:global([data-theme='dark'] .code-textarea[readonly]) {
  background-color: #2a2a3a;
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
  background-color: #9c27b0;
  color: white;
}

.btn-primary:hover {
  background-color: #8b1fa0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(156, 39, 176, 0.3);
}

.btn-secondary {
  background-color: #f0f0f0;
  color: #333;
}

:global([data-theme='dark'] .btn-secondary) {
  background-color: #2a2a3a;
  color: #e0e0e0;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

:global([data-theme='dark'] .btn-secondary:hover) {
  background-color: #3a3a4a;
}

.btn-copy {
  padding: 0.4rem 0.8rem;
  border: 1px solid #9c27b0;
  background-color: white;
  color: #9c27b0;
  border-radius: 4px;
  font-size: 0.85rem;
  transition: all 0.2s;
}

:global([data-theme='dark'] .btn-copy) {
  background-color: #1a1a2e;
}

.btn-copy:hover {
  background-color: #9c27b0;
  color: white;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: #555;
  cursor: pointer;
  white-space: nowrap;
}

.checkbox-label input[type="checkbox"] {
  accent-color: #9c27b0;
  width: 16px;
  height: 16px;
  cursor: pointer;
}

:global([data-theme='dark']) .checkbox-label {
  color: #a0c0e0;
}

.diff-result {
  background: #f5f5f5;
  border: 2px solid #e0bee7;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
}

:global([data-theme='dark'] .diff-result) {
  background: #2a2a3a;
  border-color: #4a3a5a;
}

.diff-header {
  font-weight: 600;
  color: #555;
  margin-bottom: 0.75rem;
}

:global([data-theme='dark'] .diff-header) {
  color: #a0c0e0;
}

.diff-content {
  margin: 0;
  padding: 0.75rem;
  background: white;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  max-height: 300px;
  overflow-y: auto;
  color: #333;
  line-height: 1.4;
}

:global([data-theme='dark'] .diff-content) {
  background: #1a1a2e;
  color: #e0e0e0;
}

@media (max-width: 768px) {
  .editor-pair,
  .editor-pair-compare {
    grid-template-columns: 1fr;
  }

  .controls {
    flex-direction: column;
    align-items: stretch;
  }

  .select-field,
  .input-field {
    width: 100%;
  }

  .btn {
    flex: 1;
  }
}

/* Dark mode overrides */
:global([data-theme='dark'] h2) {
  color: #ce93d8;
}

:global([data-theme='dark'] .description) {
  color: #a0c0e0;
}
</style>
