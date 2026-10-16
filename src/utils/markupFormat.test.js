import { describe, expect, it } from 'vitest'
import { formatMarkup, minifyMarkup } from './markupFormat'

describe('formatMarkup', () => {
  it('indents nested elements and keeps short text inline', () => {
    expect(formatMarkup('<div><p>Hello  world</p><span></span></div>')).toBe(
      ['<div>', '  <p>Hello world</p>', '  <span></span>', '</div>'].join('\n'),
    )
  })

  it('handles void elements, self-closing tags and declarations', () => {
    expect(
      formatMarkup(
        '<!DOCTYPE html><head><meta charset="utf-8"><link rel="x"></head><body><br><img src="a"/><custom-el/></body>',
      ),
    ).toBe(
      [
        '<!DOCTYPE html>',
        '<head>',
        '  <meta charset="utf-8">',
        '  <link rel="x">',
        '</head>',
        '<body>',
        '  <br>',
        '  <img src="a"/>',
        '  <custom-el/>',
        '</body>',
      ].join('\n'),
    )
  })

  it('does not cut tags at ">" inside attributes or comments', () => {
    expect(formatMarkup('<div title="a > b"><!-- x > y --><b>t</b></div>')).toBe(
      ['<div title="a > b">', '  <!-- x > y -->', '  <b>t</b>', '</div>'].join('\n'),
    )
  })

  it('keeps script content intact and re-indents it', () => {
    const out = formatMarkup(
      '<body><script>\n    if (a < b) {\n      go()\n    }\n</script></body>',
    )
    expect(out).toBe(
      [
        '<body>',
        '  <script>',
        '    if (a < b) {',
        '      go()',
        '    }',
        '  </script>',
        '</body>',
      ].join('\n'),
    )
  })

  it('preserves pre content exactly', () => {
    const out = formatMarkup('<div><pre>  a\n    b  </pre></div>')
    expect(out).toContain('<pre>  a\n    b  </pre>')
  })

  it('supports xml mode and never loops on unclosed tags', () => {
    expect(formatMarkup('<root><item id="1"/><![CDATA[x<y]]></root>', { html: false })).toBe(
      ['<root>', '  <item id="1"/>', '  <![CDATA[x<y]]>', '</root>'].join('\n'),
    )
    expect(formatMarkup('<div><span')).toBe('<div>\n  <span')
    expect(formatMarkup('a < b')).toBe('a < b')
  })
})

describe('minifyMarkup', () => {
  it('drops whitespace between tags and comments but keeps pre', () => {
    expect(
      minifyMarkup('<div>\n  <!-- c -->\n  <p> hi  there </p>\n  <pre> x  y </pre>\n</div>'),
    ).toBe('<div><p> hi there </p><pre> x  y </pre></div>')
  })
})
