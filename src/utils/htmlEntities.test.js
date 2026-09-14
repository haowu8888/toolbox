import { describe, expect, it } from 'vitest'
import { decodeHtmlEntities, encodeBasicEntities, encodeHtmlEntities } from './htmlEntities'

describe('encodeHtmlEntities', () => {
  it('escapes the basic characters', () => {
    expect(encodeBasicEntities(`<a href="x">&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;')
    expect(encodeHtmlEntities('中文', { mode: 'basic' })).toBe('中文')
  })

  it('converts non-ascii by code point in full mode', () => {
    expect(encodeHtmlEntities('a©🙂', { mode: 'full' })).toBe('a&#169;&#128578;')
    expect(encodeHtmlEntities('🙂', { mode: 'full', numeric: 'hex' })).toBe('&#x1F642;')
  })

  it('prefers named entities when asked', () => {
    expect(encodeHtmlEntities('© 中', { mode: 'named' })).toBe('&copy; &#20013;')
    expect(encodeHtmlEntities('a b', { mode: 'named' })).toBe('a&nbsp;b')
  })
})

describe('decodeHtmlEntities', () => {
  it('decodes named, decimal and hex entities', () => {
    expect(decodeHtmlEntities('&lt;p&gt;&amp;&quot;&#39;')).toBe(`<p>&"'`)
    expect(decodeHtmlEntities('&#128578;&#x1F642;&copy;')).toBe('🙂🙂©')
    expect(decodeHtmlEntities('a&nbsp;b')).toBe('a b')
  })

  it('keeps unknown entities and uses the fallback when provided', () => {
    expect(decodeHtmlEntities('&unknownthing;')).toBe('&unknownthing;')
    expect(decodeHtmlEntities('&unknownthing;', { fallback: () => 'X' })).toBe('X')
    expect(decodeHtmlEntities('&unknownthing;', { fallback: (m) => m })).toBe('&unknownthing;')
  })

  it('replaces invalid code points', () => {
    expect(decodeHtmlEntities('&#0;&#xD800;')).toBe('��')
  })

  it('round-trips full encoding', () => {
    const source = '<b>你好 🙂 &amp;</b>'
    expect(decodeHtmlEntities(encodeHtmlEntities(source, { mode: 'full' }))).toBe(source)
  })
})
