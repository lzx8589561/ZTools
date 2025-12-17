import { app, BrowserWindow, ipcMain, WebContentsView } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 分离窗口信息
 */
interface DetachedWindowInfo {
  window: BrowserWindow
  view: WebContentsView
  pluginPath: string
  pluginName: string
  pluginLogo?: string
  isAlwaysOnTop: boolean
}

/**
 * 分离窗口管理器 - 专门管理从主窗口分离出来的插件窗口
 */
class DetachedWindowManager {
  private detachedWindowMap: Map<string, DetachedWindowInfo> = new Map()

  /**
   * 创建分离的插件窗口（带自定义标题栏）
   */
  public createDetachedWindow(
    pluginPath: string,
    pluginName: string,
    pluginView: WebContentsView,
    options: {
      width: number
      height: number
      title: string
      logo?: string
      searchQuery?: string // 搜索框当前值
      searchPlaceholder?: string // 搜索框占位符
    }
  ): BrowserWindow | null {
    try {
      const windowId = uuidv4()

      // 标题栏高度
      const titlebarHeight = 52

      // 创建窗口（macOS 和 Windows 都使用无边框，macOS 保留交通灯）
      const isMac = process.platform === 'darwin'
      const win = new BrowserWindow({
        width: options.width,
        height: options.height + titlebarHeight,
        title: options.title,
        frame: false, // 两个平台都无边框
        titleBarStyle: isMac ? 'hiddenInset' : undefined, // macOS 保留交通灯按钮
        ...(isMac && {
          trafficLightPosition: { x: 15, y: 18 } // macOS 交通灯垂直居中
        }),
        resizable: true,
        minWidth: 400,
        minHeight: 300,
        webPreferences: {
          preload: path.join(__dirname, '../preload/index.js'),
          backgroundThrottling: false, // 窗口最小化时是否继续动画和定时器
          contextIsolation: true, // 启用上下文隔离
          nodeIntegration: false, // 渲染进程禁止直接使用 Node
          spellcheck: false, // 禁用拼写检查
          webSecurity: false
        }
      })

      // 窗口直接加载标题栏 HTML
      const titlebarUrl =
        process.env.NODE_ENV === 'development'
          ? 'http://localhost:5174/detached-titlebar.html'
          : `file://${path.join(__dirname, '../../out/renderer/detached-titlebar.html')}`

      win.loadURL(titlebarUrl)

      // 标题栏加载完成后发送插件信息，并添加插件视图
      win.webContents.on('did-finish-load', () => {
        console.log('标题栏加载完成，发送插件信息', pluginName, options)
        win.webContents.send('init-titlebar', {
          pluginName,
          pluginLogo: options.logo,
          platform: process.platform,
          title: options.title, // 窗口标题
          searchQuery: options.searchQuery || '', // 搜索框初始值
          searchPlaceholder: options.searchPlaceholder || '搜索...' // 搜索框占位符
        })

        // 添加插件视图（在标题栏下方）
        const bounds = win.getContentBounds()
        pluginView.setBounds({
          x: 0,
          y: titlebarHeight,
          width: bounds.width,
          height: bounds.height - titlebarHeight
        })
        win.contentView.addChildView(pluginView)
      })

      // 监听窗口大小变化
      win.on('resize', () => {
        if (!win.isDestroyed()) {
          const newBounds = win.getContentBounds()
          // 只需要更新插件视图大小（标题栏由窗口自动处理）
          pluginView.setBounds({
            x: 0,
            y: titlebarHeight,
            width: newBounds.width,
            height: newBounds.height - titlebarHeight
          })
        }
      })

      // 保存窗口信息
      this.detachedWindowMap.set(windowId, {
        window: win,
        view: pluginView,
        pluginPath,
        pluginName,
        pluginLogo: options.logo,
        isAlwaysOnTop: false
      })

      // 监听窗口关闭
      win.on('closed', () => {
        this.detachedWindowMap.delete(windowId)
        // 销毁插件视图的 webContents
        if (!pluginView.webContents.isDestroyed()) {
          pluginView.webContents.close()
        }
        console.log(`分离窗口已关闭: ${pluginName}`)
        // 更新 Dock 图标显示状态
        this.updateDockVisibility()
      })

      // 设置 IPC 通信（标题栏控制窗口）
      this.setupTitlebarIPC(windowId)

      // 显示窗口
      win.show()

      // 让插件视图获取焦点
      pluginView.webContents.focus()

      // 更新 Dock 图标显示状态
      this.updateDockVisibility()

      console.log(`创建分离窗口成功: ${pluginName}`)
      return win
    } catch (error) {
      console.error('创建分离窗口失败:', error)
      return null
    }
  }

  /**
   * 设置标题栏 IPC 通信
   */
  private setupTitlebarIPC(windowId: string): void {
    const windowInfo = this.detachedWindowMap.get(windowId)
    if (!windowInfo) return

    const { window: win, view: pluginView } = windowInfo

    // 使用闭包保存 windowInfo，避免后续查找
    const handleTitlebarAction = (_event: Electron.IpcMainEvent, action: string): void => {
      // 验证事件来自这个窗口
      if (_event.sender.id !== win.webContents.id) return
      if (win.isDestroyed()) return

      switch (action) {
        case 'minimize':
          win.minimize()
          break
        case 'maximize':
          if (win.isMaximized()) {
            win.unmaximize()
          } else {
            win.maximize()
          }
          break
        case 'close':
          win.close()
          break
        case 'toggle-pin':
          windowInfo.isAlwaysOnTop = !windowInfo.isAlwaysOnTop
          win.setAlwaysOnTop(windowInfo.isAlwaysOnTop)
          win.webContents.send('pin-state-changed', windowInfo.isAlwaysOnTop)
          break
        case 'open-devtools':
          if (!pluginView.webContents.isDestroyed()) {
            pluginView.webContents.openDevTools({ mode: 'detach' })
          }
          break
      }
    }

    const handleSearchInput = (_event: Electron.IpcMainEvent, value: string): void => {
      // 验证事件来自这个窗口
      if (_event.sender.id !== win.webContents.id) return
      if (!pluginView.webContents.isDestroyed()) {
        // 发送对象格式，和主窗口保持一致
        pluginView.webContents.send('sub-input-change', { text: value })
      }
    }

    const handleTitlebarDblClick = (_event: Electron.IpcMainEvent): void => {
      // 验证事件来自这个窗口
      if (_event.sender.id !== win.webContents.id) return
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
    }

    const handleSendArrowKey = (_event: Electron.IpcMainEvent, keyEvent: any): void => {
      // 验证事件来自这个窗口
      if (_event.sender.id !== win.webContents.id) return
      if (!pluginView.webContents.isDestroyed()) {
        // 发送方向键到插件
        pluginView.webContents.sendInputEvent(keyEvent)
      }
    }

    // 监听标题栏发送的窗口控制命令
    ipcMain.on('titlebar-action', handleTitlebarAction)

    // 监听搜索框输入
    ipcMain.on('search-input', handleSearchInput)

    // 监听双击标题栏（macOS 行为：最大化/还原）
    if (process.platform === 'darwin') {
      ipcMain.on('titlebar-dblclick', handleTitlebarDblClick)
    }

    // 监听方向键事件
    ipcMain.on('send-arrow-key', handleSendArrowKey)

    // 窗口关闭时移除监听器
    win.once('closed', () => {
      ipcMain.off('titlebar-action', handleTitlebarAction)
      ipcMain.off('search-input', handleSearchInput)
      ipcMain.off('send-arrow-key', handleSendArrowKey)
      if (process.platform === 'darwin') {
        ipcMain.off('titlebar-dblclick', handleTitlebarDblClick)
      }
    })
  }

  /**
   * 关闭指定插件的所有分离窗口
   */
  public closeByPlugin(pluginPath: string): void {
    const windowIdsToClose: string[] = []

    for (const [windowId, windowInfo] of this.detachedWindowMap.entries()) {
      if (windowInfo.pluginPath === pluginPath) {
        windowIdsToClose.push(windowId)
      }
    }

    for (const windowId of windowIdsToClose) {
      const windowInfo = this.detachedWindowMap.get(windowId)
      if (windowInfo && !windowInfo.window.isDestroyed()) {
        windowInfo.window.close()
      }
    }

    console.log(`已关闭插件 ${pluginPath} 的 ${windowIdsToClose.length} 个分离窗口`)
  }

  /**
   * 关闭所有分离窗口
   */
  public closeAll(): void {
    for (const windowInfo of this.detachedWindowMap.values()) {
      if (!windowInfo.window.isDestroyed()) {
        windowInfo.window.close()
      }
    }
    this.detachedWindowMap.clear()
    // 更新 Dock 图标显示状态
    this.updateDockVisibility()
  }

  /**
   * 获取所有分离窗口
   */
  public getAllWindows(): DetachedWindowInfo[] {
    return Array.from(this.detachedWindowMap.values())
  }

  /**
   * 检查是否有分离窗口
   */
  public hasDetachedWindows(): boolean {
    return this.detachedWindowMap.size > 0
  }

  /**
   * 根据插件 webContents ID 查找对应的分离窗口
   */
  public getWindowByPluginWebContents(webContentsId: number): BrowserWindow | null {
    for (const windowInfo of this.detachedWindowMap.values()) {
      if (windowInfo.view.webContents.id === webContentsId) {
        return windowInfo.window
      }
    }
    return null
  }

  /**
   * 更新 macOS Dock 图标显示状态
   * 如果有分离窗口，显示 Dock 图标；否则隐藏
   */
  private updateDockVisibility(): void {
    if (process.platform === 'darwin') {
      if (this.hasDetachedWindows()) {
        app.dock?.show()
      } else {
        app.dock?.hide()
      }
    }
  }
}

export default new DetachedWindowManager()
