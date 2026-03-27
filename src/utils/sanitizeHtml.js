import DOMPurify from 'dompurify'

export const sanitizeHtml = (dirtyHtml) => {
  return DOMPurify.sanitize(dirtyHtml, {
    USE_PROFILES: { html: true },
  })
}

