<script setup>
import { ref } from 'vue'
import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})

const inputMarkdown = ref('')
const view = ref('split')

const htmlOutput = () => {
  if (!inputMarkdown.value.trim()) {
    return ''
  }
  try {
    return markdown.render(inputMarkdown.value)
  } catch (err) {
    return `<p style="color: red;">错误：${err.message}</p>`
  }
}

const downloadMarkdown = () => {
  if (!inputMarkdown.value) {
    alert('请输入 Markdown 内容')
    return
  }
  const blob = new Blob([inputMarkdown.value], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'document.md'
  link.click()
  URL.revokeObjectURL(url)
}

const downloadHtml = () => {
  const html = htmlOutput()
  if (!html) {
    alert('请输入 Markdown 内容')
    return
  }

  const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown 转换</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      color: #222;
    }
    code {
      background-color: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Courier New', monospace;
    }
    pre {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
    pre code {
      padding: 0;
      background: none;
    }
    blockquote {
      border-left: 4px solid #ddd;
      margin: 0;
      padding-left: 16px;
      color: #666;
    }
    a {
      color: #0066cc;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`

  const blob = new Blob([fullHtml], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'document.html'
  link.click()
  URL.revokeObjectURL(url)
}

const copyHtmlToClipboard = async () => {
  const html = htmlOutput()
  if (!html) {
    alert('请输入 Markdown 内容')
    return
  }
  try {
    await navigator.clipboard.writeText(html)
    alert('已复制 HTML 代码！')
  } catch (err) {
    alert('复制失败')
  }
}

const clearAll = () => {
  inputMarkdown.value = ''
}

const insertTemplate = (template) => {
  inputMarkdown.value += template
}
</script>

<template>
  <div class="markdown-tools">
    <h2>Markdown 处理</h2>
    <p class="description">实时预览和转换 Markdown</p>

    <div class="controls">
      <div class="view-options">
        <button
          :class="['view-btn', { active: view === 'split' }]"
          @click="view = 'split'"
        >
          📖 分屏
        </button>
        <button
          :class="['view-btn', { active: view === 'preview' }]"
          @click="view = 'preview'"
        >
          👁️ 预览
        </button>
        <button
          :class="['view-btn', { active: view === 'code' }]"
          @click="view = 'code'"
        >
          💻 代码
        </button>
      </div>

      <div class="button-group">
        <button @click="downloadMarkdown" class="btn btn-secondary">
          ⬇️ MD 文件
        </button>
        <button @click="downloadHtml" class="btn btn-secondary">
          ⬇️ HTML 文件
        </button>
        <button @click="copyHtmlToClipboard" class="btn btn-secondary">
          📋 复制 HTML
        </button>
        <button @click="clearAll" class="btn btn-secondary">清空</button>
      </div>
    </div>

    <div class="editor-section">
      <div v-if="view === 'split' || view === 'code'" class="editor-pane">
        <div class="pane-header">Markdown 输入</div>
        <textarea
          v-model="inputMarkdown"
          placeholder="输入 Markdown 内容，实时预览效果..."
          class="editor-textarea"
        ></textarea>
        <div class="quick-insert">
          <span class="quick-insert-label">快速插入：</span>
          <button @click="insertTemplate('# '), style='font-size: 0.8em'" class="quick-btn">H1</button>
          <button @click="insertTemplate('## '), style='font-size: 0.8em'" class="quick-btn">H2</button>
          <button @click="insertTemplate('**粗体**'), style='font-size: 0.8em'" class="quick-btn">B</button>
          <button @click="insertTemplate('*斜体*'), style='font-size: 0.8em'" class="quick-btn">I</button>
          <button @click="insertTemplate('[链接](url) '), style='font-size: 0.8em'" class="quick-btn">Link</button>
          <button @click="insertTemplate('- 列表项\n'), style='font-size: 0.8em'" class="quick-btn">List</button>
        </div>
      </div>

      <div v-if="view === 'split' || view === 'preview'" class="preview-pane">
        <div class="pane-header">预览</div>
        <div class="markdown-preview" v-html="htmlOutput()"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.markdown-tools {
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

.controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.view-options {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.view-btn {
  padding: 0.6rem 1rem;
  border: 2px solid #e0bee7;
  background-color: white;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  color: #9c27b0;
  transition: all 0.3s;
}

.view-btn:hover {
  border-color: #9c27b0;
}

.view-btn.active {
  background-color: #9c27b0;
  color: white;
  border-color: #9c27b0;
}

.button-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
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

.btn-secondary:hover {
  background-color: #e0e0e0;
}

.editor-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  min-height: 400px;
}

.editor-pane,
.preview-pane {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pane-header {
  font-weight: 600;
  font-size: 0.95rem;
  color: #555;
  padding: 0 0.5rem;
}

.editor-textarea {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #e0bee7;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  background-color: #f9f5fb;
  color: #333;
  resize: vertical;
  transition: border-color 0.3s;
}

.editor-textarea:focus {
  outline: none;
  border-color: #9c27b0;
  background-color: white;
  box-shadow: 0 0 0 3px rgba(156, 39, 176, 0.1);
}

.quick-insert {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: #f5f5f5;
  border-radius: 6px;
  flex-wrap: wrap;
  font-size: 0.85rem;
}

.quick-insert-label {
  font-weight: 600;
  color: #555;
}

.quick-btn {
  padding: 0.4rem 0.8rem;
  border: 1px solid #9c27b0;
  background-color: white;
  color: #9c27b0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.2s;
}

.quick-btn:hover {
  background-color: #9c27b0;
  color: white;
}

.markdown-preview {
  flex: 1;
  padding: 1rem;
  border: 2px solid #e0bee7;
  border-radius: 8px;
  background-color: white;
  overflow-y: auto;
  font-size: 1rem;
  line-height: 1.6;
}

/* Markdown 样式 */
:deep(.markdown-preview) h1 {
  font-size: 2em;
  margin: 0.67em 0;
  border-bottom: 2px solid #e0bee7;
  padding-bottom: 0.3em;
  color: #9c27b0;
}

:deep(.markdown-preview) h2 {
  font-size: 1.5em;
  margin: 0.75em 0;
  color: #9c27b0;
}

:deep(.markdown-preview) h3 {
  font-size: 1.25em;
  margin: 0.83em 0;
  color: #9c27b0;
}

:deep(.markdown-preview) h4,
:deep(.markdown-preview) h5,
:deep(.markdown-preview) h6 {
  color: #9c27b0;
}

:deep(.markdown-preview) p {
  margin: 1em 0;
}

:deep(.markdown-preview) code {
  background-color: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  color: #d32f2f;
}

:deep(.markdown-preview) pre {
  background-color: #f5f5f5;
  padding: 1em;
  border-radius: 6px;
  overflow-x: auto;
  margin: 1em 0;
}

:deep(.markdown-preview) pre code {
  background: none;
  padding: 0;
  color: #333;
}

:deep(.markdown-preview) blockquote {
  border-left: 4px solid #9c27b0;
  margin: 1em 0;
  padding-left: 1em;
  color: #666;
}

:deep(.markdown-preview) a {
  color: #9c27b0;
  text-decoration: none;
}

:deep(.markdown-preview) a:hover {
  text-decoration: underline;
}

:deep(.markdown-preview) ul,
:deep(.markdown-preview) ol {
  margin: 1em 0;
  padding-left: 2em;
}

:deep(.markdown-preview) li {
  margin: 0.5em 0;
}

:deep(.markdown-preview) table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

:deep(.markdown-preview) th,
:deep(.markdown-preview) td {
  border: 1px solid #ddd;
  padding: 0.75em;
  text-align: left;
}

:deep(.markdown-preview) th {
  background-color: #f5f5f5;
  font-weight: bold;
}

:deep(.markdown-preview) hr {
  border: none;
  border-top: 2px solid #e0bee7;
  margin: 2em 0;
}

:deep(.markdown-preview) img {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
}

@media (max-width: 768px) {
  .editor-section {
    grid-template-columns: 1fr;
  }

  .quick-insert {
    font-size: 0.75rem;
  }

  .quick-btn {
    padding: 0.3rem 0.6rem;
    font-size: 0.7rem;
  }
}

:global([data-theme='dark'] h2) {
  color: #ce93d8;
}

:global([data-theme='dark'] .description) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .view-btn) {
  border-color: #664a7a;
  background-color: #2a2a3e;
  color: #c792e0;
}

:global([data-theme='dark'] .view-btn.active) {
  background-color: #9c27b0;
  color: white;
  border-color: #9c27b0;
}

:global([data-theme='dark'] .btn-secondary) {
  background-color: #404050;
  color: #e0e0e0;
}

:global([data-theme='dark'] .btn-secondary:hover) {
  background-color: #505060;
}

:global([data-theme='dark'] .pane-header) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .editor-textarea) {
  background-color: #2a2a3e;
  color: #e0e0e0;
  border-color: #664a7a;
}

:global([data-theme='dark'] .editor-textarea:focus) {
  background-color: #333;
  border-color: #c792e0;
  box-shadow: 0 0 0 3px rgba(199, 146, 224, 0.1);
}

:global([data-theme='dark'] .quick-insert) {
  background-color: #333;
}

:global([data-theme='dark'] .quick-insert-label) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .quick-btn) {
  border-color: #c792e0;
  background-color: #2a2a3e;
  color: #c792e0;
}

:global([data-theme='dark'] .quick-btn:hover) {
  background-color: #9c27b0;
  color: white;
}

:global([data-theme='dark'] .markdown-preview) {
  background-color: #2a2a3e;
  border-color: #664a7a;
  color: #e0e0e0;
}

:global([data-theme='dark'] .markdown-preview h1),
:global([data-theme='dark'] .markdown-preview h2),
:global([data-theme='dark'] .markdown-preview h3),
:global([data-theme='dark'] .markdown-preview h4),
:global([data-theme='dark'] .markdown-preview h5),
:global([data-theme='dark'] .markdown-preview h6) {
  color: #c792e0;
}

:global([data-theme='dark'] .markdown-preview h1) {
  border-bottom-color: #664a7a;
}

:global([data-theme='dark'] .markdown-preview code) {
  background-color: #333;
  color: #ff6b6b;
}

:global([data-theme='dark'] .markdown-preview pre) {
  background-color: #333;
  color: #e0e0e0;
}

:global([data-theme='dark'] .markdown-preview pre code) {
  color: #e0e0e0;
}

:global([data-theme='dark'] .markdown-preview blockquote) {
  color: #a0a0a0;
  border-left-color: #c792e0;
}

:global([data-theme='dark'] .markdown-preview table) {
  border-color: #444;
}

:global([data-theme='dark'] .markdown-preview th),
:global([data-theme='dark'] .markdown-preview td) {
  border-color: #444;
}

:global([data-theme='dark'] .markdown-preview th) {
  background-color: #333;
}

:global([data-theme='dark'] .markdown-preview hr) {
  border-top-color: #664a7a;
}

:global([data-theme='dark'] .markdown-preview a) {
  color: #c792e0;
}
</style>
