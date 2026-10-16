import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { categoryGroups, toolComponentMap, toolMap, tools } from './registry'

const REQUIRED_FIELDS = ['id', 'name', 'icon', 'color', 'description']

describe('tool registry', () => {
  it('has unique ids with complete metadata', () => {
    const ids = tools.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const tool of tools) {
      for (const field of REQUIRED_FIELDS) expect(tool[field], `${tool.id}.${field}`).toBeTruthy()
      expect(Array.isArray(tool.keywords), `${tool.id}.keywords`).toBe(true)
    }
    expect(toolMap.size).toBe(tools.length)
  })

  it('registers a lazy component for every tool and nothing else', () => {
    expect(Object.keys(toolComponentMap).sort()).toEqual(tools.map((t) => t.id).sort())
  })

  it('puts every tool into exactly one category', () => {
    const grouped = categoryGroups.flatMap((g) => g.ids)
    expect(new Set(grouped).size).toBe(grouped.length)
    expect([...grouped].sort()).toEqual(tools.map((t) => t.id).sort())
  })
})

describe('component styles', () => {
  const dir = fileURLToPath(new URL('../components/', import.meta.url))
  const sources = readdirSync(dir)
    .filter((name) => name.endsWith('.vue'))
    .map((name) => [name, readFileSync(dir + name, 'utf8')])

  // :global([data-theme='dark']) .x 会编译成作用在 <html> 上的裸规则；
  // :global([data-theme='dark'] .x) 则泄漏到所有工具。应写成 :root[data-theme='dark'] .x
  it('does not use :global() selectors', () => {
    const offenders = sources
      .filter(([, src]) => /<style[\s\S]*:global\(/.test(src))
      .map(([name]) => name)
    expect(offenders).toEqual([])
  })

  it('does not import plain global stylesheets', () => {
    const offenders = sources
      .filter(([, src]) => /^import\s+['"][^'"]+\.css['"]/m.test(src))
      .map(([name]) => name)
    expect(offenders).toEqual([])
  })
})
