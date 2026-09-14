/**
 * 浏览器端文件下载工具。
 * 统一处理 <a download> 的创建、触发与 Blob URL 释放。
 */

export const downloadUrl = (url, filename) => {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  try {
    downloadUrl(url, filename)
  } finally {
    // Firefox 在 click 后立即 revoke 可能取消下载，延迟释放更稳妥
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

export const downloadText = (text, filename, mimeType = 'text/plain;charset=utf-8') =>
  downloadBlob(new Blob([text], { type: mimeType }), filename)

export const downloadJson = (data, filename) =>
  downloadText(
    typeof data === 'string' ? data : JSON.stringify(data, null, 2),
    filename,
    'application/json;charset=utf-8',
  )

export const downloadDataUrl = (dataUrl, filename) => downloadUrl(dataUrl, filename)

export const timestampedFilename = (base, ext) => {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `${base}-${stamp}.${ext}`
}
