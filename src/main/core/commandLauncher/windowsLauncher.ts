import { exec } from 'child_process'
import { shell } from 'electron'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function launchApp(appPath: string): Promise<void> {
  // 检查是否是系统设置 URI
  if (appPath.startsWith('ms-settings:')) {
    try {
      await shell.openExternal(appPath)
      console.log(`成功打开系统设置: ${appPath}`)
      return
    } catch (error) {
      console.error('打开系统设置失败:', error)
      throw error
    }
  }

  // 检查是否是带参数的系统命令（rundll32、control.exe、msdt.exe 等）
  if (
    appPath.startsWith('rundll32 ') ||
    appPath.startsWith('control.exe ') ||
    appPath.startsWith('msdt.exe ')
  ) {
    try {
      await execAsync(appPath)
      console.log(`成功执行系统命令: ${appPath}`)
      return
    } catch (error) {
      console.error('执行系统命令失败:', error)
      throw error
    }
  }

  // 检查是否是系统命令（.cpl, .msc, .exe 等）
  const ext = appPath.toLowerCase().split('.').pop()

  // .cpl 文件 - 使用 control.exe 启动
  if (ext === 'cpl') {
    try {
      await execAsync(`control.exe ${appPath}`)
      console.log(`成功打开控制面板项: ${appPath}`)
      return
    } catch (error) {
      console.error('打开控制面板项失败:', error)
      throw error
    }
  }

  // .msc 文件 - 使用 mmc.exe 启动
  if (ext === 'msc') {
    try {
      await execAsync(`mmc.exe ${appPath}`)
      console.log(`成功打开管理工具: ${appPath}`)
      return
    } catch (error) {
      console.error('打开管理工具失败:', error)
      throw error
    }
  }

  // 系统可执行文件（不包含路径分隔符，说明在 PATH 中）
  if (ext === 'exe' && !appPath.includes('\\')) {
    try {
      // 使用 start 命令启动（会从 PATH 环境变量中查找）
      await execAsync(`start "" "${appPath}"`)
      console.log(`成功启动系统命令: ${appPath}`)
      return
    } catch (error) {
      console.error('启动系统命令失败:', error)
      throw error
    }
  }

  // 先尝试使用 shell.openPath()（适用于大多数情况，包括 .lnk 快捷方式）
  return new Promise((resolve, reject) => {
    shell
      .openPath(appPath)
      .then((error) => {
        if (error) {
          console.error('shell.openPath 失败:', error)

          // .lnk 文件如果失败，直接报错（不应该失败）
          if (appPath.toLowerCase().endsWith('.lnk')) {
            reject(new Error(`快捷方式启动失败: ${error}`))
            return
          }

          // 对于 .exe 文件，尝试使用 shell.openExternal()
          if (appPath.toLowerCase().endsWith('.exe')) {
            console.log('尝试使用 openExternal 启动...')
            shell
              .openExternal(appPath)
              .then(() => {
                console.log(`成功启动应用（openExternal）: ${appPath}`)
                resolve()
              })
              .catch((extError) => {
                console.error('openExternal 启动也失败:', extError)
                reject(new Error(`启动失败: ${error}`))
              })
          } else {
            reject(new Error(`启动失败: ${error}`))
          }
        } else {
          console.log(`成功启动应用: ${appPath}`)
          resolve()
        }
      })
      .catch((error) => {
        console.error('启动应用失败:', error)
        reject(error)
      })
  })
}
