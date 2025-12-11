import { exec } from 'child_process'

export function launchApp(appPath: string): Promise<void> {
  // TODO: 考虑改用 shell.openPath() 以保持与 Windows 实现一致，需要 Mac 环境测试
  return new Promise((resolve, reject) => {
    exec(`open "${appPath}"`, (error) => {
      if (error) {
        console.error('启动应用失败:', error)
        reject(error)
      } else {
        console.log(`成功启动应用: ${appPath}`)
        resolve()
      }
    })
  })
}
