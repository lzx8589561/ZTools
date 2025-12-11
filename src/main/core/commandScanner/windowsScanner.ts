import { shell } from 'electron'
import fs from 'fs'
import fsPromises from 'fs/promises'
import os from 'os'
import path from 'path'
import { Command } from './types'

// ========== 配置 ==========

// 图标缓存目录
const iconDir = path.join(os.tmpdir(), 'ProcessIcon')

// 要跳过的文件夹名称
const SKIP_FOLDERS = [
  'sdk',
  'doc',
  'docs',
  'samples',
  'sample',
  'examples',
  'example',
  'demos',
  'demo',
  'documentation'
]

// 要跳过的目标文件扩展名（文档、网页等）
const SKIP_EXTENSIONS = [
  '.url', // 网页快捷方式
  '.html', // 网页文件
  '.htm',
  '.pdf', // PDF文档
  '.txt', // 文本文档
  '.chm', // 帮助文件
  '.doc', // Word文档
  '.docx',
  '.xls', // Excel文档
  '.xlsx',
  '.ppt', // PowerPoint文档
  '.pptx',
  '.md', // Markdown文档
  '.msc' // 管理单元
]

// 要跳过的快捷方式名称关键词（不区分大小写）
const SKIP_NAME_PATTERN =
  /website|网站|帮助|help|readme|read me|文档|manual|license|documentation|uninstall|unin|卸载/i

// ========== 辅助函数 ==========

// 检查是否应该跳过该快捷方式
function shouldSkipShortcut(name: string, targetPath?: string): boolean {
  // 检查名称关键词
  if (SKIP_NAME_PATTERN.test(name)) {
    return true
  }

  // 检查目标文件扩展名
  if (targetPath && SKIP_EXTENSIONS.some((ext) => targetPath.toLowerCase().endsWith(ext))) {
    return true
  }

  return false
}

// 确保图标目录存在
async function ensureIconDir(): Promise<void> {
  try {
    await fsPromises.mkdir(iconDir, { recursive: true })
  } catch (error) {
    console.error('创建图标目录失败:', error)
  }
}

// 提取并保存应用图标
async function extractIcon(appPath: string, appName: string): Promise<string> {
  // 将不安全的文件名字符替换为下划线，保持可读性
  const safeFileName = appName.replace(/[<>:"/\\|?*]/g, '_')
  const iconPath = path.join(iconDir, `${safeFileName}.png`)

  try {
    // 检查图标是否已存在
    const exists = fs.existsSync(iconPath)
    if (exists) {
      return iconPath
    }

    // 使用 extract-file-icon 提取图标
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fileIcon = require('extract-file-icon')
    const buffer = fileIcon(appPath, 32)

    // 保存图标
    await fsPromises.writeFile(iconPath, buffer, 'base64')
    return iconPath
  } catch (error) {
    console.error(`提取图标失败 ${appName}:`, error)
    return iconPath // 返回路径，即使提取失败
  }
}

// 递归扫描目录中的快捷方式
async function scanDirectory(dirPath: string, apps: Command[]): Promise<void> {
  try {
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      // 处理子目录
      if (entry.isDirectory()) {
        // 跳过 SDK、示例、文档等开发相关文件夹
        if (SKIP_FOLDERS.includes(entry.name.toLowerCase())) {
          continue
        }
        // 递归扫描子目录
        await scanDirectory(fullPath, apps)
        continue
      }

      // 只处理 .lnk 快捷方式文件
      if (!entry.isFile() || !entry.name.endsWith('.lnk')) {
        continue
      }

      // 处理快捷方式
      const appName = path.basename(entry.name, '.lnk')

      // 快速过滤：检查名称关键词（卸载程序、帮助文档等）
      if (shouldSkipShortcut(appName)) {
        continue
      }

      // 尝试解析快捷方式目标
      let shortcutDetails: Electron.ShortcutDetails | null = null
      try {
        shortcutDetails = shell.readShortcutLink(fullPath)
      } catch (error: any) {
        // 解析失败，使用快捷方式本身
      }

      // 获取目标路径和应用路径
      const targetPath = shortcutDetails?.target?.trim() || ''
      // 如果目标路径存在且文件存在，使用目标路径；否则使用 .lnk 文件本身
      let appPath = fullPath
      let iconPath = fullPath // 图标提取路径，默认为快捷方式

      if (targetPath) {
        const fs = await import('fs')
        if (fs.existsSync(targetPath)) {
          appPath = targetPath
          iconPath = targetPath // 目标存在时，从目标提取图标
        } else {
          // 目标不存在时，尝试从快捷方式的图标路径提取
          iconPath = shortcutDetails?.icon || fullPath
        }
      }

      // 二次过滤：检查目标文件扩展名
      if (shouldSkipShortcut(appName, targetPath)) {
        continue
      }

      // 提取图标
      let icon = ''
      try {
        icon = await extractIcon(iconPath, appName)
      } catch (error) {
        console.error(`提取图标失败 ${appName}:`, error)
      }

      // 创建应用对象
      const app: Command = {
        name: appName,
        path: appPath,
        icon
      }

      apps.push(app)
    }
  } catch (error) {
    console.error(`扫描目录失败 ${dirPath}:`, error)
  }
}

export async function scanApplications(): Promise<Command[]> {
  try {
    const startTime = performance.now()

    // 确保图标目录存在
    await ensureIconDir()

    const apps: Command[] = []

    // Windows 开始菜单路径
    const programDataStartMenu = 'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs'
    const userStartMenu = path.join(
      os.homedir(),
      'AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs'
    )

    // 扫描系统级开始菜单
    await scanDirectory(programDataStartMenu, apps)

    // 扫描用户级开始菜单
    await scanDirectory(userStartMenu, apps)

    const endTime = performance.now()
    console.log(`扫描完成: ${apps.length} 个应用, 耗时 ${(endTime - startTime).toFixed(0)}ms`)

    return apps
  } catch (error) {
    console.error('扫描应用失败:', error)
    return []
  }
}
