import { describe, expect, it } from 'vitest'
import { csvToObjects, escapeCsvField, normalizeHeaders, objectsToCsv, parseDelimited } from './csv'

describe('parseDelimited', () => {
  it('handles quotes, escaped quotes, embedded newlines and CRLF', () => {
    expect(parseDelimited('a,"b,c","say ""hi""","x\ny"\r\n1,2,3,4')).toEqual([
      ['a', 'b,c', 'say "hi"', 'x\ny'],
      ['1', '2', '3', '4'],
    ])
  })

  it('strips a BOM and skips blank lines', () => {
    expect(parseDelimited('\uFEFFname\n\nAlice\n')).toEqual([['name'], ['Alice']])
  })

  it('parses real tabs for TSV', () => {
    expect(parseDelimited('a\tb\n1\t2', '\t')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('reports unclosed quotes with a line number', () => {
    expect(() => parseDelimited('a,b\n1,"oops\n2,3')).toThrow('第 2 行')
  })
})

describe('csvToObjects', () => {
  it('dedupes and fills headers and keeps extra columns', () => {
    expect(normalizeHeaders(['id', '', 'id'], 4)).toEqual(['id', 'col2', 'id_2', 'col4'])
    expect(csvToObjects('id,id\n1,2,3')).toEqual([{ id: '1', id_2: '2', col3: '3' }])
  })

  it('generates column names without a header row', () => {
    expect(csvToObjects('1,2', { hasHeader: false })).toEqual([{ col1: '1', col2: '2' }])
  })
})

describe('objectsToCsv', () => {
  it('unions keys, escapes values and serializes nested data', () => {
    const csv = objectsToCsv([
      { a: 1, b: 'x,y' },
      { c: { d: 1 }, a: null },
      { a: ' pad ', b: 'q"q' },
    ])
    expect(csv).toBe(['a,b,c', '1,"x,y",', ',,"{""d"":1}"', '" pad ","q""q",'].join('\n'))
  })

  it('round-trips through parse', () => {
    const data = [{ name: 'A, B', note: 'line1\nline2', n: '3' }]
    expect(csvToObjects(objectsToCsv(data))).toEqual(data)
    expect(escapeCsvField('a\tb', '\t')).toBe('"a\tb"')
  })
})
