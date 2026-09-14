// 首屏即应用已保存或系统偏好的主题，避免深色用户看到白屏闪烁。
// 放在独立文件而非内联，是为了满足部署时 CSP 的 script-src 'self'。
;(function () {
  try {
    var saved = localStorage.getItem('toolbox_theme')
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    if (saved === 'dark' || (!saved && prefersDark)) {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  } catch (e) {
    // 隐私模式等场景下 localStorage 不可用，忽略即可
  }
})()
