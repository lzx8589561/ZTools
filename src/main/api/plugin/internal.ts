import { IpcMainInvokeEvent, ipcMain } from 'electron'
import detachedWindowManager from '../../core/detachedWindowManager.js'
import commandsAPI from '../renderer/commands.js'
import pluginsAPI from '../renderer/plugins.js'
import settingsAPI from '../renderer/settings.js'
import systemAPI from '../renderer/system.js'
import windowAPI from '../renderer/window.js'
import databaseAPI from '../shared/database'
import updaterAPI from '../updater.js'

/**
 * 权限错误类
 */
class PermissionDeniedError extends Error {
  constructor(apiName: string) {
    super(`API "${apiName}" 仅限内置插件调用`)
    this.name = 'PermissionDeniedError'
  }
}

/**
 * 检查是否为内置插件调用
 * @param pluginManager 插件管理器实例
 * @param event IPC 事件对象
 * @returns 是否允许调用（内置插件或主渲染进程）
 */
export function requireInternalPlugin(pluginManager: any, event: IpcMainInvokeEvent): boolean {
  const pluginInfo = pluginManager.getPluginInfoByWebContents(event.sender)

  if (!pluginInfo) {
    // 不是插件调用（可能是主渲染进程），允许通过
    return true
  }

  // 检查是否为内置插件
  return pluginInfo.isInternal
}

/**
 * 内置插件专用 API 类
 * 提供与主渲染进程相同的 API，但仅限内置插件调用
 * 采用转发策略：将内置插件的 API 调用转发到已有的 renderer API
 */
export class InternalPluginAPI {
  private pluginManager: any = null
  private mainWindow: Electron.BrowserWindow | null = null

  public init(mainWindow: Electron.BrowserWindow, pluginManager: any): void {
    this.mainWindow = mainWindow
    this.pluginManager = pluginManager
    this.setupIPC()
  }

  private setupIPC(): void {
    // ==================== 数据库 API (ZTOOLS/ 命名空间) ====================
    ipcMain.handle('internal:db-put', async (event, key: string, value: any) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:db-put')
      }
      return await databaseAPI.dbPut(key, value)
    })

    ipcMain.handle('internal:db-get', async (event, key: string) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:db-get')
      }
      return await databaseAPI.dbGet(key)
    })

    // ==================== 应用启动 API ====================
    ipcMain.handle('internal:launch', async (event, options: any) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:launch')
      }
      console.log('启动应用', options)
      return await (commandsAPI as any).launch(options)
    })

    // ==================== 指令管理 API ====================
    ipcMain.handle('internal:get-commands', async (event) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:get-commands')
      }
      return await (commandsAPI as any).getCommands()
    })

    // ==================== 插件管理 API ====================
    ipcMain.handle('internal:get-plugins', async (event) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:get-plugins')
      }
      return await (pluginsAPI as any).getPlugins()
    })

    ipcMain.handle('internal:import-plugin', async (event) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:import-plugin')
      }
      return await (pluginsAPI as any).importPlugin()
    })

    ipcMain.handle('internal:import-dev-plugin', async (event) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:import-dev-plugin')
      }
      return await (pluginsAPI as any).importDevPlugin()
    })

    ipcMain.handle('internal:delete-plugin', async (event, pluginPath: string) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:delete-plugin')
      }
      return await (pluginsAPI as any).deletePlugin(pluginPath)
    })

    ipcMain.handle('internal:reload-plugin', async (event, pluginPath: string) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:reload-plugin')
      }
      return await (pluginsAPI as any).reloadPlugin(pluginPath)
    })

    ipcMain.handle('internal:get-running-plugins', async (event) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:get-running-plugins')
      }
      return await (pluginsAPI as any).getRunningPlugins()
    })

    ipcMain.handle('internal:kill-plugin', async (event, pluginPath: string) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:kill-plugin')
      }
      return await (pluginsAPI as any).killPlugin(pluginPath)
    })

    ipcMain.handle('internal:fetch-plugin-market', async (event) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:fetch-plugin-market')
      }
      return await (pluginsAPI as any).fetchPluginMarket()
    })

    ipcMain.handle('internal:install-plugin-from-market', async (event, plugin: any) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:install-plugin-from-market')
      }
      return await (pluginsAPI as any).installPluginFromMarket(plugin)
    })

    ipcMain.handle('internal:get-plugin-readme', async (event, pluginPath: string) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:get-plugin-readme')
      }
      return await (pluginsAPI as any).getPluginReadme(pluginPath)
    })

    ipcMain.handle('internal:get-plugin-doc-keys', async (event, pluginName: string) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:get-plugin-doc-keys')
      }
      return await databaseAPI.getPluginDocKeys(pluginName)
    })

    ipcMain.handle('internal:get-plugin-doc', async (event, pluginName: string, docKey: string) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:get-plugin-doc')
      }
      return await databaseAPI.getPluginDoc(pluginName, docKey)
    })

    ipcMain.handle('internal:get-plugin-data-stats', async (event) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:get-plugin-data-stats')
      }
      return await databaseAPI.getPluginDataStats()
    })

    ipcMain.handle('internal:clear-plugin-data', async (event, pluginName: string) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:clear-plugin-data')
      }
      return await databaseAPI.clearPluginData(pluginName)
    })

    // ==================== 全局快捷键 API ====================
    ipcMain.handle(
      'internal:register-global-shortcut',
      async (event, shortcut: string, target: string) => {
        if (!requireInternalPlugin(this.pluginManager, event)) {
          throw new PermissionDeniedError('internal:register-global-shortcut')
        }
        return await (settingsAPI as any).registerGlobalShortcut(shortcut, target)
      }
    )

    ipcMain.handle('internal:unregister-global-shortcut', async (event, shortcut: string) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:unregister-global-shortcut')
      }
      return await (settingsAPI as any).unregisterGlobalShortcut(shortcut)
    })

    ipcMain.handle('internal:start-hotkey-recording', async (event) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:start-hotkey-recording')
      }
      return await (settingsAPI as any).startHotkeyRecording()
    })

    ipcMain.handle('internal:update-shortcut', async (event, shortcut: string) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:update-shortcut')
      }
      return await (settingsAPI as any).updateShortcut(shortcut)
    })

    // ==================== 系统设置 API ====================
    ipcMain.handle('internal:set-window-opacity', async (event, opacity: number) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:set-window-opacity')
      }
      return await (windowAPI as any).setWindowOpacity(opacity)
    })

    ipcMain.handle('internal:select-avatar', async (event) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:select-avatar')
      }
      return await (systemAPI as any).selectAvatar()
    })

    ipcMain.handle('internal:set-theme', async (event, theme: string) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:set-theme')
      }
      return await (settingsAPI as any).setTheme(theme)
    })

    ipcMain.handle('internal:set-tray-icon-visible', async (event, visible: boolean) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:set-tray-icon-visible')
      }
      return await (windowAPI as any).setTrayIconVisible(visible)
    })

    ipcMain.handle(
      'internal:set-window-material',
      async (event, material: 'mica' | 'acrylic' | 'none') => {
        if (!requireInternalPlugin(this.pluginManager, event)) {
          throw new PermissionDeniedError('internal:set-window-material')
        }
        return await (windowAPI as any).setWindowMaterial(material)
      }
    )

    ipcMain.handle('internal:get-window-material', async (event) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:get-window-material')
      }
      return await (windowAPI as any).getWindowMaterial()
    })

    ipcMain.handle('internal:set-launch-at-login', async (event, enabled: boolean) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:set-launch-at-login')
      }
      return await (settingsAPI as any).setLaunchAtLogin(enabled)
    })

    ipcMain.handle('internal:get-launch-at-login', async (event) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:get-launch-at-login')
      }
      return await (settingsAPI as any).getLaunchAtLogin()
    })

    // 通知主渲染进程更新搜索框提示文字
    ipcMain.handle('internal:update-placeholder', async (event, placeholder: string) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:update-placeholder')
      }
      // 广播到主渲染进程
      this.mainWindow?.webContents.send('update-placeholder', placeholder)
      return { success: true }
    })

    // 通知主渲染进程更新头像
    ipcMain.handle('internal:update-avatar', async (event, avatar: string) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:update-avatar')
      }
      // 广播到主渲染进程
      this.mainWindow?.webContents.send('update-avatar', avatar)
      return { success: true }
    })

    // 通知主渲染进程更新自动粘贴配置
    ipcMain.handle('internal:update-auto-paste', async (event, autoPaste: string) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:update-auto-paste')
      }
      // 广播到主渲染进程
      this.mainWindow?.webContents.send('update-auto-paste', autoPaste)
      return { success: true }
    })

    // 通知主渲染进程更新自动清空配置
    ipcMain.handle('internal:update-auto-clear', async (event, autoClear: string) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:update-auto-clear')
      }
      // 广播到主渲染进程
      this.mainWindow?.webContents.send('update-auto-clear', autoClear)
      return { success: true }
    })

    // 通知主渲染进程更新主题色
    ipcMain.handle(
      'internal:update-primary-color',
      async (event, primaryColor: string, customColor?: string) => {
        if (!requireInternalPlugin(this.pluginManager, event)) {
          throw new PermissionDeniedError('internal:update-primary-color')
        }
        // 广播到主渲染进程
        this.mainWindow?.webContents.send('update-primary-color', { primaryColor, customColor })
        return { success: true }
      }
    )

    // 通知主渲染进程更新亚克力透明度
    ipcMain.handle(
      'internal:update-acrylic-opacity',
      async (event, lightOpacity: number, darkOpacity: number) => {
        if (!requireInternalPlugin(this.pluginManager, event)) {
          throw new PermissionDeniedError('internal:update-acrylic-opacity')
        }
        // 广播到主渲染进程
        this.mainWindow?.webContents.send('update-acrylic-opacity', { lightOpacity, darkOpacity })

        // 广播到所有分离窗口
        detachedWindowManager.broadcastToAllWindows('update-acrylic-opacity', { lightOpacity, darkOpacity })

        return { success: true }
      }
    )

    ipcMain.on('internal:get-platform', (event) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        event.returnValue = null
        return
      }
      event.returnValue = process.platform
    })

    // ==================== 应用更新 API ====================
    ipcMain.handle('internal:updater-check-update', async (event) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:updater-check-update')
      }
      return await (updaterAPI as any).checkUpdate()
    })

    ipcMain.handle('internal:updater-start-update', async (event, updateInfo: any) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:updater-start-update')
      }
      return await (updaterAPI as any).startUpdate(updateInfo)
    })

    // ==================== 其他 API ====================
    ipcMain.handle('internal:reveal-in-finder', async (event, path: string) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:reveal-in-finder')
      }
      return await (systemAPI as any).revealInFinder(path)
    })

    // ==================== 图片分析 API ====================
    // 直接转发到共享的 analyze-image handler（已在 imageAnalysis.ts 中注册）
    ipcMain.handle('internal:analyze-image', async (event, imagePath: string) => {
      if (!requireInternalPlugin(this.pluginManager, event)) {
        throw new PermissionDeniedError('internal:analyze-image')
      }
      // 直接调用主进程的 analyze-image handler
      // 通过触发器获取已注册的 handler 并调用
      const handler = (ipcMain as any)._invokeHandlers.get('analyze-image')
      if (handler) {
        return await handler(event, imagePath)
      }
      throw new Error('analyze-image handler not found')
    })
  }
}

export default new InternalPluginAPI()
