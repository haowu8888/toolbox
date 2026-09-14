import { describe, expect, it } from 'vitest'
import { buildFetch, convertCurlToFetch, parseCurl, tokenizeCommand } from './curl'

describe('tokenizeCommand', () => {
  it('splits on whitespace and honours single/double quotes', () => {
    expect(tokenizeCommand(`curl -H 'A: b c' -d "x=\\"y\\"" https://e.com`)).toEqual([
      'curl',
      '-H',
      'A: b c',
      '-d',
      'x="y"',
      'https://e.com',
    ])
  })

  it('joins backslash and caret line continuations', () => {
    expect(tokenizeCommand("curl \\\n  -X POST \\\r\n  https://e.com")).toEqual(['curl', '-X', 'POST', 'https://e.com'])
    expect(tokenizeCommand('curl ^\n  -I https://e.com')).toEqual(['curl', '-I', 'https://e.com'])
  })

  it('decodes ANSI-C $\'...\' quoting used by browser "Copy as cURL"', () => {
    expect(tokenizeCommand(`curl $'cookie: a\\u003db; c\\x3dd' -H $'x:\\ty'`)).toEqual([
      'curl',
      'cookie: a=b; c=d',
      '-H',
      'x:\ty',
    ])
  })

  it('keeps empty quoted strings as tokens', () => {
    expect(tokenizeCommand(`curl -d '' https://e.com`)).toEqual(['curl', '-d', '', 'https://e.com'])
  })
})

describe('parseCurl', () => {
  it('parses method, headers and data from the classic example', () => {
    const parsed = parseCurl(
      "curl -X POST 'https://example.com/api' -H 'Content-Type: application/json' -H 'Authorization: Bearer xxx' -d '{\"name\":\"Alice\"}'",
    )
    expect(parsed).toMatchObject({
      url: 'https://example.com/api',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer xxx' },
      body: '{"name":"Alice"}',
    })
  })

  it('defaults to POST when data is present and GET otherwise', () => {
    expect(parseCurl('curl https://e.com -d a=1').method).toBe('POST')
    expect(parseCurl('curl https://e.com').method).toBe('GET')
    expect(parseCurl('curl -I https://e.com').method).toBe('HEAD')
  })

  it('does not mistake values of unrelated options for the URL', () => {
    const parsed = parseCurl('curl -o out.json --connect-timeout 5 -sSL https://e.com/data')
    expect(parsed.url).toBe('https://e.com/data')
    expect(parsed.headers).toEqual({})
  })

  it('prefers the url-like positional argument', () => {
    expect(parseCurl('curl -m 3 https://e.com').url).toBe('https://e.com')
    expect(parseCurl('curl -u admin:secret https://e.com').url).toBe('https://e.com')
  })

  it('turns -u into a Basic Authorization header', () => {
    const parsed = parseCurl('curl -u admin:secret https://e.com')
    expect(parsed.headers.Authorization).toBe('Basic YWRtaW46c2VjcmV0')
  })

  it('maps user-agent, referer, cookie and bearer options to headers', () => {
    const parsed = parseCurl(`curl -A 'my-agent' -e https://ref.com -b 'a=1; b=2' --oauth2-bearer tok https://e.com`)
    expect(parsed.headers).toEqual({
      'User-Agent': 'my-agent',
      Referer: 'https://ref.com',
      Cookie: 'a=1; b=2',
      Authorization: 'Bearer tok',
    })
  })

  it('supports --option=value syntax and header override', () => {
    const parsed = parseCurl(`curl --request=PUT --header='accept: text/plain' -H 'Accept: application/json' https://e.com`)
    expect(parsed.method).toBe('PUT')
    expect(parsed.headers).toEqual({ Accept: 'application/json' })
  })

  it('url-encodes --data-urlencode content and joins multiple data parts', () => {
    const parsed = parseCurl(`curl --data-urlencode 'q=hello world' -d 'page=2' https://e.com/search`)
    expect(parsed.body).toBe('q=hello%20world&page=2')
    expect(parsed.method).toBe('POST')
  })

  it('appends data to the query string with -G', () => {
    const parsed = parseCurl('curl -G -d a=1 -d b=2 https://e.com/api?x=0')
    expect(parsed.url).toBe('https://e.com/api?x=0&a=1&b=2')
    expect(parsed.method).toBe('GET')
    expect(parsed.body).toBe('')
  })

  it('collects multipart form fields and drops a hand-written content type', () => {
    const parsed = parseCurl(`curl -H 'Content-Type: multipart/form-data' -F name=Alice -F file=@photo.png https://e.com/upload`)
    expect(parsed.form).toEqual([
      { name: 'name', value: 'Alice', isFile: false },
      { name: 'file', value: 'photo.png', isFile: true },
    ])
    expect(parsed.headers).toEqual({})
    expect(parsed.method).toBe('POST')
    expect(parsed.notes.some((note) => note.includes('File'))).toBe(true)
  })

  it('throws readable errors for empty input or missing URL', () => {
    expect(() => parseCurl('')).toThrow('请输入 curl 命令')
    expect(() => parseCurl('curl -X POST')).toThrow(/URL/)
  })
})

describe('buildFetch', () => {
  it('renders headers, pretty JSON body and json() when the body is JSON', () => {
    const code = convertCurlToFetch(
      "curl -X POST 'https://example.com/api' -H 'Content-Type: application/json' -d '{\"a\":1}'",
    )
    expect(code).toContain('fetch("https://example.com/api", {')
    expect(code).toContain('method: "POST"')
    expect(code).toContain('"Content-Type": "application/json"')
    expect(code).toContain('body: JSON.stringify({\n    "a": 1\n  }),')
    expect(code).toContain('.then((res) => res.json())')
  })

  it('renders plain string bodies with text()', () => {
    const code = buildFetch({ url: 'https://e.com', method: 'POST', headers: {}, body: 'a=1&b=2' })
    expect(code).toContain('body: "a=1&b=2",')
    expect(code).toContain('.then((res) => res.text())')
  })

  it('renders FormData snippets and notes', () => {
    const code = convertCurlToFetch('curl -F name=Alice -F file=@photo.png https://e.com/upload')
    expect(code).toContain('const formData = new FormData()')
    expect(code).toContain('formData.append("name", "Alice")')
    expect(code).toContain('fileInput.files[0]')
    expect(code).toContain('body: formData,')
    expect(code.startsWith('// 注意：')).toBe(true)
  })

  it('omits method for GET requests', () => {
    const code = convertCurlToFetch('curl https://e.com')
    expect(code).not.toContain('method:')
    expect(code).toContain('fetch("https://e.com", {')
  })
})
