import { ipcMain } from 'electron'
import { MAX_WINDOW_HEIGHT, WINDOW_INITIAL_HEIGHT } from '../../common/constants.js'
import windowManager from '../../managers/windowManager.js'

// 窗口材质类型
type WindowMaterial = 'mica' | 'acrylic' | 'none'

/**
 * 窗口管理API - 主程序专用
 */
export class WindowAPI {
  private mainWindow: Electron.BrowserWindow | null = null
  private lockedSize: { width: number; height: number } | null = null

  public init(mainWindow: Electron.BrowserWindow): void {
    this.mainWindow = mainWindow
    this.setupIPC()
    this.setupWindowEvents()
  }

  private setupIPC(): void {
    ipcMain.on('hide-window', () => this.hideWindow())
    ipcMain.on('resize-window', (_event, height: number) => this.resizeWindow(height))
    ipcMain.handle('get-window-position', () => this.getWindowPosition())
    ipcMain.handle('get-window-material', () => this.getWindowMaterial())
    ipcMain.on('set-window-position', (_event, x: number, y: number) =>
      this.setWindowPosition(x, y)
    )
    // 拖动控制：锁定/解锁窗口尺寸
    ipcMain.on('set-window-size-lock', (_event, lock: boolean) => {
      if (!this.mainWindow) return

      if (lock) {
        // 锁定：记录当前尺寸
        const [width, height] = this.mainWindow.getSize()
        this.lockedSize = { width, height }
      } else {
        // 解锁：验证并恢复尺寸
        if (this.lockedSize) {
          const [width, height] = this.mainWindow.getSize()
          if (width !== this.lockedSize.width || height !== this.lockedSize.height) {
            this.mainWindow.setSize(this.lockedSize.width, this.lockedSize.height)
          }
          this.lockedSize = null
        }
      }
    })
    ipcMain.on('set-window-opacity', (_event, opacity: number) => this.setWindowOpacity(opacity))
    ipcMain.handle('set-tray-icon-visible', (_event, visible: boolean) =>
      this.setTrayIconVisible(visible)
    )
    ipcMain.on('open-settings', () => this.openSettings())
  }

  private setupWindowEvents(): void {
    let moveTimeout: NodeJS.Timeout | null = null
    this.mainWindow?.on('move', () => {
      if (moveTimeout) clearTimeout(moveTimeout)
      moveTimeout = setTimeout(() => {
        if (this.mainWindow) {
          const [x, y] = this.mainWindow.getPosition()
          const displayId = windowManager.getCurrentDisplayId()
          if (displayId !== null) {
            windowManager.saveWindowPosition(displayId, x, y)
          }
        }
      }, 500)
    })
  }

  private hideWindow(isRestorePreWindow: boolean = true): void {
    windowManager.hideWindow(isRestorePreWindow)
  }

  public resizeWindow(height: number): void {
    if (this.mainWindow) {
      const [width] = this.mainWindow.getSize()
      // 限制高度范围: 最小初始高度, 最大高度
      const newHeight = Math.max(WINDOW_INITIAL_HEIGHT, Math.min(height, MAX_WINDOW_HEIGHT))

      // 临时启用 resizable 以允许代码调整大小
      this.mainWindow.setResizable(true)
      this.mainWindow.setSize(width, newHeight)
      // 立即禁用 resizable，防止用户手动调整
      this.mainWindow.setResizable(false)

      // 如果当前处于锁定状态，更新锁定的尺寸
      if (this.lockedSize) {
        this.lockedSize = { width, height: newHeight }
        console.log('更新锁定尺寸:', this.lockedSize)
      }
    }
  }

  public getWindowPosition(): { x: number; y: number } {
    if (this.mainWindow) {
      const [x, y] = this.mainWindow.getPosition()
      return { x, y }
    }
    return { x: 0, y: 0 }
  }

  public setWindowPosition(x: number, y: number): void {
    if (this.mainWindow && this.lockedSize) {
      // 拖动时强制保持锁定的尺寸
      this.mainWindow.setBounds({
        x: Math.round(x),
        y: Math.round(y),
        width: this.lockedSize.width,
        height: this.lockedSize.height
      })
    } else if (this.mainWindow) {
      this.mainWindow.setPosition(x, y)
    }
  }

  private setWindowOpacity(opacity: number): void {
    if (this.mainWindow) {
      const clampedOpacity = Math.max(0.3, Math.min(1, opacity))
      this.mainWindow.setOpacity(clampedOpacity)
      console.log('设置窗口不透明度:', clampedOpacity)
    }
  }

  private setTrayIconVisible(visible: boolean): void {
    windowManager.setTrayIconVisible(visible)
    console.log('设置托盘图标可见性:', visible)
  }

  public setWindowMaterial(material: WindowMaterial): { success: boolean } {
    const result = windowManager.setWindowMaterial(material)
    console.log('设置窗口材质:', material, '结果:', result)
    return result
  }

  public async getWindowMaterial(): Promise<WindowMaterial> {
    const material = await windowManager.getWindowMaterial()
    return material
  }

  private openSettings(): void {
    windowManager.showSettings()
    console.log('打开设置插件')
  }
}

export default new WindowAPI()
