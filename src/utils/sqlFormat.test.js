import { describe, expect, it } from 'vitest'
import { formatSql, minifySql } from './sqlFormat'

describe('formatSql', () => {
  it('formats clauses, select lists and conditions', () => {
    expect(formatSql('select a, b from t where x = 1 and y = 2 order by a')).toBe(
      ['SELECT a,', '  b', 'FROM t', 'WHERE x = 1', '  AND y = 2', 'ORDER BY a'].join('\n'),
    )
  })

  it('keeps function calls tight and does not break their arguments', () => {
    expect(formatSql('select count(*), coalesce(a, b) as c from t')).toBe(
      ['SELECT COUNT(*),', '  COALESCE(a, b) AS c', 'FROM t'].join('\n'),
    )
  })

  it('preserves qualified stars, parameters and casts', () => {
    const out = formatSql(
      'select t.*, a::int from t where id = @id and n = :name and v = $1 and w = ?',
    )
    for (const fragment of ['t.*', 'a::int', '@id', ':name', '$1', '= ?'])
      expect(out).toContain(fragment)
  })

  it('keeps comments and never lets a line comment swallow code', () => {
    const out = formatSql('select a -- note\nfrom t /* c */ where b = 1')
    expect(out).toBe(['SELECT a -- note', 'FROM t /* c */', 'WHERE b = 1'].join('\n'))
  })

  it('does not split BETWEEN ... AND', () => {
    expect(formatSql('select * from t where a between 1 and 2 and b = 3')).toBe(
      ['SELECT *', 'FROM t', 'WHERE a BETWEEN 1 AND 2', '  AND b = 3'].join('\n'),
    )
  })

  it('indents subqueries', () => {
    expect(formatSql('select * from (select id from u) x where id in (select id from v)')).toBe(
      [
        'SELECT *',
        'FROM (',
        '  SELECT id',
        '  FROM u',
        ') x',
        'WHERE id IN (',
        '  SELECT id',
        '  FROM v',
        ')',
      ].join('\n'),
    )
  })

  it('leaves string literals and quoted identifiers untouched', () => {
    const out = formatSql("select 'a  -- b''c', \"Col  Name\", `x y`, [z w] from t")
    expect(out).toContain("'a  -- b''c'")
    expect(out).toContain('"Col  Name"')
    expect(out).toContain('`x y`')
    expect(out).toContain('[z w]')
  })

  it('handles unary minus, joins, inline parens and lowercase mode', () => {
    expect(formatSql('select -1 from a left join b on a.id = b.id where (x = 1 or y = 2)')).toBe(
      ['SELECT -1', 'FROM a', 'LEFT JOIN b', '  ON a.id = b.id', 'WHERE (x = 1 OR y = 2)'].join(
        '\n',
      ),
    )
    expect(formatSql('select a from t', { uppercase: false })).toBe('select a\nfrom t')
  })

  it('separates statements', () => {
    expect(formatSql('select 1; select 2;')).toBe('SELECT 1;\n\nSELECT 2;')
  })
})

describe('minifySql', () => {
  it('collapses whitespace but keeps strings and drops comments', () => {
    expect(minifySql("select  a,\n  b -- c\nfrom t where s = 'x  y' and f(1, 2) in (1)")).toBe(
      "select a, b from t where s = 'x  y' and f(1, 2) in (1)",
    )
  })
})
