/**
 * 配置管理工具
 */
export const useConfig = (key = 'toolbox_config') => {
  const getConfig = () => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : {}
    } catch (err) {
      console.error(`Error reading config:`, err)
      return {}
    }
  }

  const saveConfig = (config) => {
    try {
      localStorage.setItem(key, JSON.stringify(config))
    } catch (err) {
      console.error(`Error saving config:`, err)
    }
  }

  const exportConfig = () => {
    const config = getConfig()
    const allData = {
      config,
      history: JSON.parse(localStorage.getItem('toolbox_history') || '[]'),
      favorites: JSON.parse(localStorage.getItem('toolbox_favorites') || '[]'),
      theme: localStorage.getItem('toolbox_theme') || 'light',
      exportDate: new Date().toISOString(),
      version: '1.0',
    }
    return allData
  }

  const downloadConfig = (filename = 'toolbox-config.json') => {
    const data = exportConfig()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const importConfig = (file) => {
    return new Promise((resolve, reject) => {
      // 限制文件大小（最大 5MB）
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error('配置文件过大，最大支持 5MB'))
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          if (data.version !== '1.0') {
            reject(new Error('配置文件版本不兼容'))
            return
          }

          // 校验数据类型
          if (data.history && !Array.isArray(data.history)) {
            reject(new Error('配置文件格式错误：history 应为数组'))
            return
          }
          if (data.favorites && !Array.isArray(data.favorites)) {
            reject(new Error('配置文件格式错误：favorites 应为数组'))
            return
          }
          if (data.history && data.history.length > 500) {
            data.history = data.history.slice(0, 500)
          }
          if (data.favorites && data.favorites.length > 500) {
            data.favorites = data.favorites.slice(0, 500)
          }

          // 导入所有数据
          localStorage.setItem('toolbox_config', JSON.stringify(data.config || {}))
          localStorage.setItem('toolbox_history', JSON.stringify(data.history || []))
          localStorage.setItem('toolbox_favorites', JSON.stringify(data.favorites || []))
          localStorage.setItem('toolbox_theme', data.theme === 'dark' ? 'dark' : 'light')

          resolve(data)
        } catch (err) {
          reject(new Error('配置文件格式错误：' + err.message))
        }
      }
      reader.onerror = () => reject(new Error('读取文件失败'))
      reader.readAsText(file)
    })
  }

  const clearAllData = () => {
    localStorage.removeItem(key)
    localStorage.removeItem('toolbox_history')
    localStorage.removeItem('toolbox_favorites')
    localStorage.removeItem('toolbox_theme')
  }

  const getDataStats = () => {
    const config = getConfig()
    const history = JSON.parse(localStorage.getItem('toolbox_history') || '[]')
    const favorites = JSON.parse(localStorage.getItem('toolbox_favorites') || '[]')

    return {
      configSize: JSON.stringify(config).length,
      historyCount: history.length,
      favoritesCount: favorites.length,
      totalSize: JSON.stringify({
        config,
        history,
        favorites,
      }).length,
    }
  }

  return {
    getConfig,
    saveConfig,
    exportConfig,
    downloadConfig,
    importConfig,
    clearAllData,
    getDataStats,
  }
}
