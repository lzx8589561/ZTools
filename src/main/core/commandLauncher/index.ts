// 平台检测并导出对应的启动函数
export async function launchApp(appPath: string): Promise<void> {
  const platform = process.platform

  if (platform === 'darwin') {
    // macOS
    const { launchApp: macLaunch } = await import('./macLauncher')
    return macLaunch(appPath)
  } else if (platform === 'win32') {
    // Windows
    const { launchApp: winLaunch } = await import('./windowsLauncher')
    return winLaunch(appPath)
  } else {
    console.warn(`不支持的平台: ${platform}`)
    throw new Error(`Unsupported platform: ${platform}`)
  }
}
