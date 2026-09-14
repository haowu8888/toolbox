/**
 * 标准 5 字段 Cron 解析（分 时 日 月 周）。
 *
 * 支持：*  ?  数字  列表(a,b)  范围(a-b)  步进(*\/n, a/n, a-b/n)
 *       月份/星期英文缩写（JAN-DEC, SUN-SAT），星期 7 等价于 0（周日）
 * 语义：日与周同时受限时为「或」关系（与 Vixie cron 一致）。
 */

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const WEEKDAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
export const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

export const CRON_FIELDS = Object.freeze([
  { key: 'minute', label: '分', min: 0, max: 59 },
  { key: 'hour', label: '时', min: 0, max: 23 },
  { key: 'dayOfMonth', label: '日', min: 1, max: 31 },
  { key: 'month', label: '月', min: 1, max: 12, names: MONTH_NAMES, nameOffset: 1 },
  { key: 'dayOfWeek', label: '周', min: 0, max: 7, names: WEEKDAY_NAMES, nameOffset: 0 },
])

export const CRON_PRESETS = Object.freeze([
  { label: '每分钟', value: '* * * * *' },
  { label: '每 5 分钟', value: '*/5 * * * *' },
  { label: '每小时', value: '0 * * * *' },
  { label: '每天零点', value: '0 0 * * *' },
  { label: '每天 9 点', value: '0 9 * * *' },
  { label: '工作日 9 点', value: '0 9 * * 1-5' },
  { label: '每周一', value: '0 0 * * 1' },
  { label: '每月 1 号', value: '0 0 1 * *' },
  { label: '每季度初', value: '0 0 1 1,4,7,10 *' },
  { label: '每年元旦', value: '0 0 1 1 *' },
])

const parseNumber = (token, field) => {
  const raw = token.trim().toUpperCase()
  if (!raw) return NaN
  if (/^\d+$/.test(raw)) return Number(raw)
  if (field.names) {
    const index = field.names.indexOf(raw)
    if (index !== -1) return index + field.nameOffset
  }
  return NaN
}

const fieldError = (field, message) => `字段「${field.label}」${message}`

/**
 * 解析单个字段，返回 { values: Set<number>, items: [...], raw, any, error }
 */
export const parseCronField = (raw, field) => {
  const text = String(raw ?? '').trim()
  const result = { raw: text, values: new Set(), items: [], any: false, error: '' }

  if (!text) {
    result.error = fieldError(field, '不能为空')
    return result
  }

  const rangeLabel = `${field.min}-${field.key === 'dayOfWeek' ? 6 : field.max}`
  const parts = text.split(',')

  for (const part of parts) {
    const piece = part.trim()
    if (!piece) {
      result.error = fieldError(field, '存在空的列表项')
      return result
    }

    let base = piece
    let step = 1
    const slashIndex = piece.indexOf('/')
    if (slashIndex !== -1) {
      base = piece.slice(0, slashIndex)
      const stepText = piece.slice(slashIndex + 1)
      if (!/^\d+$/.test(stepText) || Number(stepText) < 1) {
        result.error = fieldError(field, `的步进值「${stepText}」无效`)
        return result
      }
      step = Number(stepText)
    }

    let start
    let end
    let type

    if (base === '*' || base === '?') {
      start = field.min
      end = field.max
      type = slashIndex !== -1 ? 'step' : 'any'
    } else if (base.includes('-')) {
      const [startText, endText, extra] = base.split('-')
      if (extra !== undefined) {
        result.error = fieldError(field, `的范围「${base}」格式无效`)
        return result
      }
      start = parseNumber(startText, field)
      end = parseNumber(endText, field)
      type = slashIndex !== -1 ? 'step' : 'range'
    } else {
      start = parseNumber(base, field)
      end = slashIndex !== -1 ? field.max : start
      type = slashIndex !== -1 ? 'step' : 'single'
    }

    if (Number.isNaN(start) || Number.isNaN(end)) {
      result.error = fieldError(field, `的值「${piece}」无法识别`)
      return result
    }
    if (start < field.min || end > field.max) {
      result.error = fieldError(field, `的值「${piece}」超出范围（${rangeLabel}）`)
      return result
    }
    if (start > end) {
      result.error = fieldError(field, `的范围「${piece}」起始值大于结束值`)
      return result
    }

    if (type === 'any' && parts.length === 1) result.any = true

    for (let value = start; value <= end; value += step) {
      result.values.add(field.key === 'dayOfWeek' && value === 7 ? 0 : value)
    }
    result.items.push({ type, start, end, step, value: start })
  }

  if (field.key === 'dayOfWeek') {
    // 7 与 0 同义，统一成 0
    result.items = result.items.map((item) =>
      item.type === 'single' && item.value === 7 ? { ...item, start: 0, end: 0, value: 0 } : item,
    )
  }

  return result
}

const describeItems = (parsed, formatValue, unit) =>
  parsed.items
    .map((item) => {
      switch (item.type) {
        case 'any':
          return `每${unit}`
        case 'single':
          return formatValue(item.value)
        case 'range':
          return `${formatValue(item.start)}到${formatValue(item.end)}`
        case 'step':
          if (item.start === parsed.fieldMin && item.end === parsed.fieldMax) return `每 ${item.step} ${unit}`
          return `${formatValue(item.start)}到${formatValue(item.end)}每 ${item.step} ${unit}`
        default:
          return ''
      }
    })
    .join('、')

const isSingle = (parsed) => parsed.items.length === 1 && parsed.items[0].type === 'single'
const isFullStep = (parsed) =>
  parsed.items.length === 1 &&
  parsed.items[0].type === 'step' &&
  parsed.items[0].start === parsed.fieldMin &&
  parsed.items[0].end === parsed.fieldMax

const pad2 = (n) => String(n).padStart(2, '0')

/**
 * 生成中文执行说明。
 */
export const describeCron = (fields) => {
  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields

  let time
  if (minute.any && hour.any) {
    time = '每分钟'
  } else if (hour.any) {
    if (isFullStep(minute)) time = `每 ${minute.items[0].step} 分钟`
    else if (isSingle(minute))
      time = minute.items[0].value === 0 ? '每小时整点' : `每小时的第 ${minute.items[0].value} 分`
    else time = `每小时的第 ${describeItems(minute, (v) => String(v), '分钟')} 分`
  } else if (minute.any) {
    time = `${describeItems(hour, (v) => `${v} 点`, '小时')}内每分钟`
  } else if (isSingle(minute) && hour.items.every((item) => item.type === 'single')) {
    time = hour.items.map((item) => `${pad2(item.value)}:${pad2(minute.items[0].value)}`).join('、')
  } else if (isFullStep(minute)) {
    time = `${describeItems(hour, (v) => `${v} 点`, '小时')}每 ${minute.items[0].step} 分钟`
  } else {
    time = `${describeItems(hour, (v) => `${v} 点`, '小时')}的第 ${describeItems(minute, (v) => String(v), '分钟')} 分`
  }

  const monthText = month.any ? '' : `${describeItems(month, (v) => `${v} 月`, '月')}`
  const domText = dayOfMonth.any ? '' : describeItems(dayOfMonth, (v) => `${v} 日`, '天')
  const dowText = dayOfWeek.any
    ? ''
    : describeItems(dayOfWeek, (v) => `周${WEEKDAY_LABELS[v % 7]}`, '天')

  let day
  if (!domText && !dowText) day = monthText ? `${monthText}每天` : '每天'
  else if (domText && !dowText) day = `${monthText || '每月'} ${domText}`.trim()
  else if (!domText && dowText) day = `${monthText ? `${monthText}的` : '每'}${dowText}`
  else day = `${monthText || '每月'} ${domText} 或 ${dowText}`.trim()

  const skipDay = day === '每天' && time.startsWith('每')
  return `${skipDay ? '' : `${day} `}${time} 执行`.replace(/\s+/g, ' ').trim()
}

/**
 * 解析完整表达式。
 * 返回 { ok, error, expression, fields, description }
 */
export const parseCron = (expression) => {
  const text = String(expression ?? '').trim()
  const base = { ok: false, error: '', expression: text, fields: [], description: '' }

  if (!text) {
    return { ...base, error: '请输入 Cron 表达式' }
  }

  const parts = text.split(/\s+/)
  if (parts.length !== 5) {
    return {
      ...base,
      error: `Cron 表达式必须包含 5 个字段（分 时 日 月 周），当前为 ${parts.length} 个`,
    }
  }

  const fields = []
  for (let i = 0; i < CRON_FIELDS.length; i++) {
    const field = CRON_FIELDS[i]
    const parsed = parseCronField(parts[i], field)
    if (parsed.error) return { ...base, error: parsed.error, fields }
    fields.push({
      ...parsed,
      key: field.key,
      label: field.label,
      fieldMin: field.min,
      fieldMax: field.key === 'dayOfWeek' ? 6 : field.max,
    })
  }

  return { ok: true, error: '', expression: text, fields, description: describeCron(fields) }
}

const createMatcher = (fields) => {
  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields
  const dayRestricted = !dayOfMonth.any
  const weekRestricted = !dayOfWeek.any

  const matchesDay = (date) => {
    const domMatch = dayOfMonth.values.has(date.getDate())
    const dowMatch = dayOfWeek.values.has(date.getDay())
    if (dayRestricted && weekRestricted) return domMatch || dowMatch
    if (dayRestricted) return domMatch
    if (weekRestricted) return dowMatch
    return true
  }

  return {
    matchesMonth: (date) => month.values.has(date.getMonth() + 1),
    matchesDay,
    matchesHour: (date) => hour.values.has(date.getHours()),
    matchesMinute: (date) => minute.values.has(date.getMinutes()),
  }
}

/**
 * 计算接下来 count 次执行时间（本地时区），最多向后搜索 maxDays 天。
 */
export const getNextCronRuns = (parsed, { count = 5, from = new Date(), maxDays = 366 * 5 } = {}) => {
  if (!parsed?.ok) return []
  const matcher = createMatcher(parsed.fields)
  const results = []
  const cursor = new Date(from.getTime())
  cursor.setSeconds(0, 0)
  cursor.setMinutes(cursor.getMinutes() + 1)
  const deadline = from.getTime() + maxDays * 86_400_000

  while (results.length < count && cursor.getTime() < deadline) {
    if (!matcher.matchesMonth(cursor)) {
      cursor.setMonth(cursor.getMonth() + 1, 1)
      cursor.setHours(0, 0, 0, 0)
      continue
    }
    if (!matcher.matchesDay(cursor)) {
      cursor.setDate(cursor.getDate() + 1)
      cursor.setHours(0, 0, 0, 0)
      continue
    }
    if (!matcher.matchesHour(cursor)) {
      cursor.setHours(cursor.getHours() + 1, 0, 0, 0)
      continue
    }
    if (!matcher.matchesMinute(cursor)) {
      cursor.setMinutes(cursor.getMinutes() + 1)
      continue
    }
    results.push(new Date(cursor.getTime()))
    cursor.setMinutes(cursor.getMinutes() + 1)
  }

  return results
}

export const isCronMatch = (parsed, date) => {
  if (!parsed?.ok) return false
  const matcher = createMatcher(parsed.fields)
  return (
    matcher.matchesMonth(date) &&
    matcher.matchesDay(date) &&
    matcher.matchesHour(date) &&
    matcher.matchesMinute(date)
  )
}
