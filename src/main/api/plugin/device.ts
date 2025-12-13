import { app, ipcMain } from 'electron'
import { createHash } from 'crypto'
import { execSync } from 'child_process'
import { hostname } from 'os'

/**
 * 设备与应用信息 API - 插件专用
 * 提供获取设备标识符和应用版本等信息的功能
 */
export class PluginDeviceAPI {
  private deviceId: string | null = null

  public init(): void {
    this.setupIPC()
  }

  private setupIPC(): void {
    // 获取设备 ID（同步方法，供插件使用）
    ipcMain.on('get-native-id', (event) => {
      try {
        const id = this.getDeviceId()
        event.returnValue = id
      } catch (error) {
        console.error('get-native-id error:', error)
        event.returnValue = null
      }
    })

    // 获取应用版本（同步方法，供插件使用）
    ipcMain.on('get-app-version', (event) => {
      try {
        const version = app.getVersion()
        event.returnValue = version
      } catch (error) {
        console.error('get-app-version error:', error)
        event.returnValue = null
      }
    })
  }

  /**
   * 获取设备 ID
   * 返回 32 位的唯一标识符字符串
   * 基于硬件 UUID 生成，确保卸载重装后 ID 一致
   */
  private getDeviceId(): string {
    // 如果已经生成过，直接返回（内存缓存）
    if (this.deviceId) {
      return this.deviceId
    }

    try {
      const hardwareUUID = this.getHardwareUUID()
      // 使用 MD5 哈希生成 32 位十六进制字符串
      this.deviceId = createHash('md5').update(hardwareUUID).digest('hex')
      return this.deviceId
    } catch (error) {
      console.error('获取设备 ID 失败:', error)
      // 如果获取硬件信息失败，使用备用方案（基于用户名和主机名）
      const fallbackString = `${process.env.USER || 'unknown'}-${hostname()}`
      this.deviceId = createHash('md5').update(fallbackString).digest('hex')
      return this.deviceId
    }
  }

  /**
   * 获取硬件 UUID
   * 跨平台支持：macOS、Windows、Linux
   */
  private getHardwareUUID(): string {
    const platform = process.platform

    try {
      if (platform === 'darwin') {
        // macOS: 使用 IOPlatformUUID
        const output = execSync(
          "ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID | awk '{print $3}' | tr -d '\"'",
          { encoding: 'utf8' }
        )
        return output.trim()
      } else if (platform === 'win32') {
        // Windows: 使用主板 UUID
        const output = execSync('wmic csproduct get UUID', { encoding: 'utf8' })
        // 输出格式：UUID\nxxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        const lines = output.split('\n').map((line) => line.trim())
        const uuid = lines.find((line) => line && line !== 'UUID')
        if (uuid) {
          return uuid
        }
        throw new Error('未找到 UUID')
      } else if (platform === 'linux') {
        // Linux: 尝试读取 /etc/machine-id 或 /var/lib/dbus/machine-id
        try {
          const output = execSync('cat /etc/machine-id', { encoding: 'utf8' })
          return output.trim()
        } catch {
          const output = execSync('cat /var/lib/dbus/machine-id', { encoding: 'utf8' })
          return output.trim()
        }
      }

      throw new Error(`不支持的平台: ${platform}`)
    } catch (error) {
      console.error('获取硬件 UUID 失败:', error)
      throw error
    }
  }
}

export default new PluginDeviceAPI()
