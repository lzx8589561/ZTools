import { Command } from './types'

export type { AppScanner, Command } from './types'

// 平台检测并导出对应的扫描函数
export async function scanApplications(): Promise<Command[]> {
  const platform = process.platform

  if (platform === 'darwin') {
    // macOS
    const { scanApplications: macScan } = await import('./macScanner')
    return macScan()
  } else if (platform === 'win32') {
    // Windows
    const { scanApplications: winScan } = await import('./windowsScanner')
    return winScan()
  } else {
    console.warn(`不支持的平台: ${platform}`)
    return []
  }
}
