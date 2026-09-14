/**
 * curl 命令 → fetch 代码。
 * 词法部分兼容 bash 的单/双引号、$'...' ANSI-C 引号、反斜杠续行与 cmd.exe 的 ^ 续行，
 * 能直接处理浏览器「Copy as cURL」得到的多行命令。
 */

const HEADER_FLAGS = new Set(['-H', '--header'])
const DATA_FLAGS = new Set(['-d', '--data', '--data-raw', '--data-binary', '--data-ascii'])
const URLENCODE_FLAGS = new Set(['--data-urlencode'])
const FORM_FLAGS = new Set(['-F', '--form', '--form-string'])
const METHOD_FLAGS = new Set(['-X', '--request'])
const USER_FLAGS = new Set(['-u', '--user'])
const USER_AGENT_FLAGS = new Set(['-A', '--user-agent'])
const REFERER_FLAGS = new Set(['-e', '--referer'])
const COOKIE_FLAGS = new Set(['-b', '--cookie'])
const BEARER_FLAGS = new Set(['--oauth2-bearer'])
const URL_FLAGS = new Set(['--url'])
const HEAD_FLAGS = new Set(['-I', '--head'])
const GET_FLAGS = new Set(['-G', '--get'])

// 带参数但对 fetch 没有意义的选项：必须吃掉它的值，否则值会被误认成 URL
const SKIP_VALUE_FLAGS = new Set([
  '-o', '--output', '-w', '--write-out', '-m', '--max-time', '--connect-timeout', '-x', '--proxy',
  '-c', '--cookie-jar', '-T', '--upload-file', '--retry', '--retry-delay', '--retry-max-time',
  '--limit-rate', '-K', '--config', '--cacert', '--capath', '--cert', '-E', '--cert-type', '--key',
  '--key-type', '-r', '--range', '--max-redirs', '-z', '--time-cond', '--interface', '--resolve',
  '--dns-servers', '-Q', '--quote', '--proxy-user', '-U', '--max-filesize', '--stderr', '--trace',
  '--trace-ascii', '-D', '--dump-header', '--ciphers', '--tls-max', '--proto', '--proto-default',
  '--unix-socket', '--abstract-unix-socket', '--local-port', '--aws-sigv4', '--variable', '--ipfs-gateway',
])

const ANSI_ESCAPES = {
  n: '\n',
  t: '\t',
  r: '\r',
  a: '\x07',
  b: '\b',
  f: '\f',
  v: '\v',
  e: '\x1b',
  '\\': '\\',
  "'": "'",
  '"': '"',
}

const isLineBreakAt = (text, index) =>
  text[index] === '\n' ? 1 : text[index] === '\r' && text[index + 1] === '\n' ? 2 : 0

/**
 * 按 shell 规则切分命令行为参数数组。
 */
export const tokenizeCommand = (input) => {
  const text = String(input ?? '')
  const tokens = []
  let current = ''
  let hasToken = false
  let i = 0

  const flush = () => {
    if (hasToken) tokens.push(current)
    current = ''
    hasToken = false
  }

  while (i < text.length) {
    const ch = text[i]

    // 反斜杠 / ^ 续行
    if (ch === '\\' || ch === '^') {
      const breakLength = isLineBreakAt(text, i + 1)
      if (breakLength) {
        i += 1 + breakLength
        continue
      }
    }

    if (/\s/.test(ch)) {
      flush()
      i++
      continue
    }

    if (ch === "'") {
      hasToken = true
      const end = text.indexOf("'", i + 1)
      if (end === -1) {
        current += text.slice(i + 1)
        break
      }
      current += text.slice(i + 1, end)
      i = end + 1
      continue
    }

    if (ch === '$' && text[i + 1] === "'") {
      hasToken = true
      i += 2
      while (i < text.length && text[i] !== "'") {
        if (text[i] === '\\') {
          const next = text[i + 1]
          if (next === 'u' || next === 'x') {
            const length = next === 'u' ? 4 : 2
            const hex = text.slice(i + 2, i + 2 + length)
            if (/^[0-9a-f]+$/i.test(hex)) {
              current += String.fromCharCode(parseInt(hex, 16))
              i += 2 + hex.length
              continue
            }
          }
          if (next !== undefined && ANSI_ESCAPES[next] !== undefined) {
            current += ANSI_ESCAPES[next]
            i += 2
            continue
          }
          current += next ?? ''
          i += 2
          continue
        }
        current += text[i]
        i++
      }
      i++
      continue
    }

    if (ch === '"') {
      hasToken = true
      i++
      while (i < text.length && text[i] !== '"') {
        if (text[i] === '\\' && i + 1 < text.length) {
          const next = text[i + 1]
          const breakLength = isLineBreakAt(text, i + 1)
          if (breakLength) {
            i += 1 + breakLength
            continue
          }
          if ('"\\$`'.includes(next)) {
            current += next
            i += 2
            continue
          }
        }
        current += text[i]
        i++
      }
      i++
      continue
    }

    if (ch === '\\' && i + 1 < text.length) {
      current += text[i + 1]
      hasToken = true
      i += 2
      continue
    }

    current += ch
    hasToken = true
    i++
  }

  flush()
  return tokens
}

const toBase64 = (text) => {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

const isUrlLike = (value) => /^[a-z][a-z0-9+.-]*:\/\//i.test(value)

const encodeUrlencodedData = (raw) => {
  // curl --data-urlencode：name=content 只编码 content；=content 编码 content；content 整体编码
  const eqIndex = raw.indexOf('=')
  if (eqIndex === -1) {
    if (raw.includes('@')) return null
    return encodeURIComponent(raw)
  }
  const name = raw.slice(0, eqIndex)
  const content = raw.slice(eqIndex + 1)
  if (name.includes('@')) return null
  return name ? `${name}=${encodeURIComponent(content)}` : encodeURIComponent(content)
}

const splitLongOption = (token) => {
  if (token.startsWith('--') && token.includes('=')) {
    const index = token.indexOf('=')
    return [token.slice(0, index), token.slice(index + 1)]
  }
  return [token, undefined]
}

/**
 * 解析 curl 命令，返回 { url, method, headers, body, form, notes }。
 */
export const parseCurl = (command) => {
  const rawTokens = tokenizeCommand(command)
  if (rawTokens.length === 0) throw new Error('请输入 curl 命令')
  const tokens = rawTokens[0] === 'curl' ? rawTokens.slice(1) : rawTokens

  const positionals = []
  const headerLines = []
  const dataParts = []
  const formFields = []
  const notes = []
  let url = ''
  let method = ''
  let auth = ''
  let forceGet = false

  for (let i = 0; i < tokens.length; i++) {
    const [flag, inlineValue] = splitLongOption(tokens[i])
    const takeValue = () => {
      if (inlineValue !== undefined) return inlineValue
      i++
      return tokens[i] ?? ''
    }

    if (!flag.startsWith('-') || flag === '-') {
      positionals.push(flag)
      continue
    }

    if (URL_FLAGS.has(flag)) {
      url = takeValue()
    } else if (METHOD_FLAGS.has(flag)) {
      method = takeValue().toUpperCase()
    } else if (HEAD_FLAGS.has(flag)) {
      method = 'HEAD'
    } else if (GET_FLAGS.has(flag)) {
      forceGet = true
    } else if (HEADER_FLAGS.has(flag)) {
      headerLines.push(takeValue())
    } else if (DATA_FLAGS.has(flag)) {
      const value = takeValue()
      if (value.startsWith('@') && flag !== '--data-raw') {
        notes.push(`${flag} ${value} 读取的是本地文件，浏览器里需改为读取 File 对象或直接填入内容`)
      }
      dataParts.push(value)
    } else if (URLENCODE_FLAGS.has(flag)) {
      const value = takeValue()
      const encoded = encodeUrlencodedData(value)
      if (encoded === null) {
        notes.push(`--data-urlencode ${value} 引用了本地文件，需手动改写`)
        dataParts.push(value)
      } else {
        dataParts.push(encoded)
      }
    } else if (FORM_FLAGS.has(flag)) {
      const value = takeValue()
      const eqIndex = value.indexOf('=')
      const name = eqIndex === -1 ? value : value.slice(0, eqIndex)
      const content = eqIndex === -1 ? '' : value.slice(eqIndex + 1)
      const isFile = flag !== '--form-string' && (content.startsWith('@') || content.startsWith('<'))
      formFields.push({ name, value: isFile ? content.slice(1) : content, isFile })
    } else if (USER_FLAGS.has(flag)) {
      const value = takeValue()
      auth = `Basic ${toBase64(value.includes(':') ? value : `${value}:`)}`
      if (!value.includes(':')) notes.push('-u 未包含密码，Authorization 中的密码为空，请自行补充')
    } else if (BEARER_FLAGS.has(flag)) {
      auth = `Bearer ${takeValue()}`
    } else if (USER_AGENT_FLAGS.has(flag)) {
      headerLines.push(`User-Agent: ${takeValue()}`)
    } else if (REFERER_FLAGS.has(flag)) {
      headerLines.push(`Referer: ${takeValue()}`)
    } else if (COOKIE_FLAGS.has(flag)) {
      const value = takeValue()
      if (value.includes('=')) headerLines.push(`Cookie: ${value}`)
      else notes.push(`-b ${value} 是 cookie 文件，浏览器中无法读取，已忽略`)
    } else if (SKIP_VALUE_FLAGS.has(flag)) {
      takeValue()
    }
    // 其余开关型选项（-s、-k、-L、--compressed、-v …）对 fetch 无影响，直接忽略
  }

  if (!url) url = positionals.find(isUrlLike) || positionals[0] || ''
  if (!url) throw new Error('未解析到 URL（请确保命令包含 URL）')

  const headers = {}
  for (const line of headerLines) {
    const index = line.indexOf(':')
    if (index === -1) continue
    const key = line.slice(0, index).trim()
    const value = line.slice(index + 1).trim()
    if (!key) continue
    const existing = Object.keys(headers).find((name) => name.toLowerCase() === key.toLowerCase())
    if (existing) delete headers[existing]
    headers[key] = value
  }
  if (auth) headers.Authorization = auth

  let body = dataParts.length > 0 ? dataParts.join('&') : ''

  if (forceGet && body) {
    url += (url.includes('?') ? '&' : '?') + body
    body = ''
    method = method || 'GET'
  }

  if (formFields.length > 0) {
    // 浏览器会自动生成 multipart boundary，手写的 Content-Type 反而会导致请求失败
    for (const name of Object.keys(headers)) {
      if (name.toLowerCase() === 'content-type') delete headers[name]
    }
    if (formFields.some((field) => field.isFile)) {
      notes.push('表单里的 @file 字段需替换为浏览器中的 File 对象（例如 input.files[0]）')
    }
  }

  if (!method) method = body || formFields.length > 0 ? 'POST' : 'GET'

  return { url, method, headers, body, form: formFields, notes }
}

const indentBlock = (text, indent) =>
  text
    .split('\n')
    .map((line, index) => (index === 0 ? line : indent + line))
    .join('\n')

const tryPrettyJson = (body) => {
  try {
    const parsed = JSON.parse(body)
    if (parsed && typeof parsed === 'object') return JSON.stringify(parsed, null, 2)
  } catch {
    // 不是 JSON，按普通字符串输出
  }
  return null
}

/**
 * 把 parseCurl 的结果渲染为可直接粘贴运行的 fetch 代码。
 */
export const buildFetch = ({ url, method, headers = {}, body = '', form = [], notes = [] }) => {
  const lines = []
  for (const note of notes) lines.push(`// 注意：${note}`)

  const headerEntries = Object.entries(headers)
  const acceptsJson = headerEntries.some(
    ([key, value]) => key.toLowerCase() === 'accept' && value.toLowerCase().includes('json'),
  )
  const prettyJson = body ? tryPrettyJson(body) : null

  if (form.length > 0) {
    lines.push('const formData = new FormData()')
    for (const field of form) {
      if (field.isFile) {
        lines.push(`// formData.append(${JSON.stringify(field.name)}, fileInput.files[0]) // 原命令: @${field.value}`)
      } else {
        lines.push(`formData.append(${JSON.stringify(field.name)}, ${JSON.stringify(field.value)})`)
      }
    }
    lines.push('')
  }

  lines.push(`fetch(${JSON.stringify(url)}, {`)
  if (method && method !== 'GET') lines.push(`  method: ${JSON.stringify(method)},`)
  if (headerEntries.length > 0) {
    lines.push(`  headers: ${indentBlock(JSON.stringify(headers, null, 2), '  ')},`)
  }
  if (form.length > 0) {
    lines.push('  body: formData,')
  } else if (prettyJson) {
    lines.push(`  body: JSON.stringify(${indentBlock(prettyJson, '  ')}),`)
  } else if (body) {
    lines.push(`  body: ${JSON.stringify(body)},`)
  }
  lines.push('})')
  lines.push(`  .then((res) => res.${acceptsJson || prettyJson ? 'json' : 'text'}())`)
  lines.push('  .then(console.log)')
  lines.push('  .catch(console.error)')
  return lines.join('\n')
}

export const convertCurlToFetch = (command) => buildFetch(parseCurl(command))
