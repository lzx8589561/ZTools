import { ipcMain, nativeTheme, Notification } from 'electron'

/**
 * 插件UI控制API - 插件专用
 */
export class PluginUIAPI {
  private mainWindow: Electron.BrowserWindow | null = null
  private pluginManager: any = null

  public init(mainWindow: Electron.BrowserWindow, pluginManager: any): void {
    this.mainWindow = mainWindow
    this.pluginManager = pluginManager
    this.setupIPC()
  }

  private setupIPC(): void {
    // 显示系统通知
    ipcMain.handle('show-notification', (event, body: string) => this.showNotification(event, body))

    // 设置插件高度
    ipcMain.handle('set-expend-height', (_event, height: number) => this.setExpendHeight(height))

    // 子输入框相关
    ipcMain.handle('set-sub-input', (_event, placeholder?: string, isFocus?: boolean) =>
      this.setSubInput(placeholder, isFocus)
    )
    ipcMain.on('notify-sub-input-change', (_event, text: string) => this.notifySubInputChange(text))
    ipcMain.handle('set-sub-input-value', (_event, text: string) => this.setSubInputValue(text))
    ipcMain.on('sub-input-focus', (event) => {
      event.returnValue = this.subInputFocus()
    })

    // 隐藏插件
    ipcMain.on('hide-plugin', () => this.hidePlugin())

    // 获取是否深色主题
    ipcMain.on('is-dark-colors', (event) => {
      event.returnValue = nativeTheme.shouldUseDarkColors
    })
  }

  private showNotification(event: Electron.IpcMainInvokeEvent, body: string): void {
    if (Notification.isSupported()) {
      const options: Electron.NotificationConstructorOptions = {
        title: 'zTools',
        body: body
      }

      const pluginInfo = this.pluginManager.getPluginInfoByWebContents(event.sender)
      if (pluginInfo) {
        options.title = pluginInfo.name
        if (pluginInfo.logo) {
          options.icon = pluginInfo.logo.replace('file:///', '')
        }
      }

      new Notification(options).show()
    }
  }

  private setExpendHeight(height: number): void {
    if (this.pluginManager) {
      this.pluginManager.setExpendHeight(height)
    }
  }

  private setSubInput(placeholder?: string, isFocus?: boolean): boolean {
    try {
      const pluginPath = this.pluginManager?.getCurrentPluginPath()
      if (!pluginPath) {
        console.warn('没有活动的插件,无法设置子输入框')
        return false
      }

      this.mainWindow?.webContents.send('update-sub-input-placeholder', {
        pluginPath,
        placeholder: placeholder || '搜索'
      })

      this.pluginManager.setSubInputPlaceholder(placeholder || '搜索')
      console.log('设置子输入框 placeholder:', { pluginPath, placeholder, isFocus })

      // 如果 isFocus 为 true，聚焦子输入框
      if (isFocus) {
        this.subInputFocus()
      }

      return true
    } catch (error: unknown) {
      console.error('设置子输入框失败:', error)
      return false
    }
  }

  private notifySubInputChange(text: string): void {
    if (this.pluginManager) {
      this.pluginManager.sendPluginMessage('sub-input-change', { text })
    }
  }

  private setSubInputValue(text: string): boolean {
    try {
      // 发送事件到主窗口渲染进程，设置输入框的值
      this.mainWindow?.webContents.send('set-sub-input-value', text)
      console.log('设置子输入框值:', text)
      return true
    } catch (error: unknown) {
      console.error('设置子输入框值失败:', error)
      return false
    }
  }

  private subInputFocus(): boolean {
    try {
      this.mainWindow?.webContents.focus()
      console.log('主窗口获取焦点', this.mainWindow)

      // 发送事件到主窗口渲染进程，聚焦输入框
      this.mainWindow?.webContents.send('focus-sub-input')
      console.log('请求聚焦子输入框')

      return true
    } catch (error: unknown) {
      console.error('聚焦子输入框失败:', error)
      return false
    }
  }

  private hidePlugin(): void {
    if (this.pluginManager) {
      this.pluginManager.hidePluginView()
    }
  }
}

export default new PluginUIAPI()
