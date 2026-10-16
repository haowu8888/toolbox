import { describe, expect, it } from 'vitest'
import { extensionForMime, mimeFromDataUrl, toImageDataUrl } from './imageDataUrl'

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

describe('toImageDataUrl', () => {
  it('keeps data urls and strips whitespace from the payload', () => {
    const { dataUrl, mime } = toImageDataUrl(
      `  data:image/png;base64,${PNG_BASE64.slice(0, 20)}\n${PNG_BASE64.slice(20)} `,
    )
    expect(mime).toBe('image/png')
    expect(dataUrl).toBe(`data:image/png;base64,${PNG_BASE64}`)
  })

  it('detects the format of raw base64 from magic bytes', () => {
    expect(toImageDataUrl(PNG_BASE64).mime).toBe('image/png')
    expect(toImageDataUrl('/9j/4AAQSkZJRg==').mime).toBe('image/jpeg')
    expect(toImageDataUrl('R0lGODlhAQABAAAAACw=').mime).toBe('image/gif')
  })

  it('rejects garbage and unknown formats with a helpful message', () => {
    expect(() => toImageDataUrl('hello world!')).toThrow('data:image')
    expect(() => toImageDataUrl('QUJDRA==')).toThrow('无法识别')
    expect(() => toImageDataUrl('')).toThrow()
  })
})

describe('mime helpers', () => {
  it('maps mime types to file extensions', () => {
    expect(extensionForMime('image/jpeg')).toBe('jpg')
    expect(extensionForMime('image/svg+xml')).toBe('svg')
    expect(extensionForMime('unknown')).toBe('png')
    expect(mimeFromDataUrl('data:image/webp;base64,xx')).toBe('image/webp')
  })
})
