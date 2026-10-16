import DOMPurify from 'dompurify'

/**
 * @param {string} dirtyHtml
 * @param {{ allowTargetBlank?: boolean }} options allowTargetBlank 允许 target="_blank"（会强制补上 rel="noopener noreferrer"）
 */
export const sanitizeHtml = (dirtyHtml, { allowTargetBlank = false } = {}) => {
  const clean = DOMPurify.sanitize(dirtyHtml, {
    USE_PROFILES: { html: true },
    ...(allowTargetBlank ? { ADD_ATTR: ['target'] } : {}),
  })
  if (!allowTargetBlank) return clean
  // 防止反向标签页劫持：凡是新窗口打开的链接都带上 noopener
  return clean.replace(/<a\s([^>]*?)target="_blank"([^>]*)>/g, (match, before, after) =>
    /\brel=/.test(match) ? match : `<a ${before}target="_blank" rel="noopener noreferrer"${after}>`,
  )
}
