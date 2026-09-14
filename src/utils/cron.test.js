import { describe, expect, it } from 'vitest'
import { CRON_FIELDS, getNextCronRuns, isCronMatch, parseCron, parseCronField } from './cron'

const minuteField = CRON_FIELDS[0]
const monthField = CRON_FIELDS[3]
const weekField = CRON_FIELDS[4]

describe('parseCronField', () => {
  it('expands wildcards, lists, ranges and steps', () => {
    expect([...parseCronField('*', CRON_FIELDS[1]).values]).toHaveLength(24)
    expect([...parseCronField('1,3,5', minuteField).values]).toEqual([1, 3, 5])
    expect([...parseCronField('10-12', minuteField).values]).toEqual([10, 11, 12])
    expect([...parseCronField('*/20', minuteField).values]).toEqual([0, 20, 40])
    expect([...parseCronField('5/20', minuteField).values]).toEqual([5, 25, 45])
    expect([...parseCronField('0-10/5', minuteField).values]).toEqual([0, 5, 10])
  })

  it('understands names and sunday aliases', () => {
    expect([...parseCronField('JAN,dec', monthField).values]).toEqual([1, 12])
    expect([...parseCronField('MON-FRI', weekField).values]).toEqual([1, 2, 3, 4, 5])
    expect([...parseCronField('7', weekField).values]).toEqual([0])
    expect(parseCronField('?', weekField).any).toBe(true)
  })

  it('reports invalid input', () => {
    expect(parseCronField('60', minuteField).error).toMatch(/超出范围/)
    expect(parseCronField('5-2', minuteField).error).toMatch(/起始值大于结束值/)
    expect(parseCronField('abc', minuteField).error).toMatch(/无法识别/)
    expect(parseCronField('*/0', minuteField).error).toMatch(/步进值/)
    expect(parseCronField('', minuteField).error).toMatch(/不能为空/)
  })
})

describe('parseCron', () => {
  it('rejects wrong field counts', () => {
    expect(parseCron('* * *').ok).toBe(false)
    expect(parseCron('* * *').error).toMatch(/5 个字段/)
    expect(parseCron('').error).toMatch(/请输入/)
  })

  it('describes common presets in Chinese', () => {
    expect(parseCron('* * * * *').description).toBe('每分钟 执行')
    expect(parseCron('*/5 * * * *').description).toBe('每 5 分钟 执行')
    expect(parseCron('0 * * * *').description).toBe('每小时整点 执行')
    expect(parseCron('0 0 * * *').description).toBe('每天 00:00 执行')
    expect(parseCron('0 9 * * 1-5').description).toBe('每周一到周五 09:00 执行')
    expect(parseCron('0 0 1 * *').description).toBe('每月 1 日 00:00 执行')
    expect(parseCron('30 9,18 * * *').description).toBe('每天 09:30、18:30 执行')
    expect(parseCron('0 0 1 1 *').description).toBe('1 月 1 日 00:00 执行')
    expect(parseCron('0 0 1 * 1').description).toBe('每月 1 日 或 周一 00:00 执行')
  })
})

describe('getNextCronRuns', () => {
  const from = new Date(2024, 0, 15, 10, 7, 30) // Monday

  it('finds the next minutes for a wildcard expression', () => {
    const runs = getNextCronRuns(parseCron('* * * * *'), { count: 3, from })
    expect(runs.map((d) => d.getMinutes())).toEqual([8, 9, 10])
    expect(runs[0].getSeconds()).toBe(0)
  })

  it('jumps across days, weeks and months', () => {
    const daily = getNextCronRuns(parseCron('0 0 * * *'), { count: 2, from })
    expect(daily[0].toDateString()).toBe(new Date(2024, 0, 16).toDateString())
    expect(daily[1].toDateString()).toBe(new Date(2024, 0, 17).toDateString())

    const weekly = getNextCronRuns(parseCron('0 9 * * 1'), { count: 1, from })
    expect(weekly[0].getTime()).toBe(new Date(2024, 0, 22, 9, 0).getTime())

    const yearly = getNextCronRuns(parseCron('0 0 1 1 *'), { count: 1, from })
    expect(yearly[0].getTime()).toBe(new Date(2025, 0, 1, 0, 0).getTime())
  })

  it('uses OR semantics when both day fields are restricted', () => {
    const runs = getNextCronRuns(parseCron('0 0 20 * 3'), { count: 2, from })
    expect(runs[0].toDateString()).toBe(new Date(2024, 0, 17).toDateString()) // Wednesday
    expect(runs[1].toDateString()).toBe(new Date(2024, 0, 20).toDateString()) // 20th
  })

  it('returns an empty list when nothing matches in range', () => {
    const runs = getNextCronRuns(parseCron('0 0 31 2 *'), { count: 1, from, maxDays: 400 })
    expect(runs).toEqual([])
  })

  it('checks direct matches', () => {
    expect(isCronMatch(parseCron('7 10 * * MON'), from)).toBe(true)
    expect(isCronMatch(parseCron('8 10 * * *'), from)).toBe(false)
  })
})
