import type Electron from 'electron'

export class SystemSettingsAPI {
  public init(_mainWindow: Electron.BrowserWindow): void {
    // 暂时不需要使用 mainWindow
  }

  public async getSystemSettings(): Promise<any[]> {
    if (process.platform === 'win32') {
      const { WINDOWS_SETTINGS } = await import('../../core/systemSettings/windowsSettings.js')
      return WINDOWS_SETTINGS
    }
    return []
  }

  public isWindows(): boolean {
    return process.platform === 'win32'
  }
}

export const systemSettingsAPI = new SystemSettingsAPI()
