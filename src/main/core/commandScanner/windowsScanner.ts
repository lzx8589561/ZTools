import { shell } from 'electron'
import fsPromises from 'fs/promises'
import path from 'path'
import { getWindowsStartMenuPaths } from '../../utils/systemPaths'
import { Command } from './types'

// ========== 配置 ==========

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
  /^uninstall |^卸载|卸载$|website|网站|帮助|help|readme|read me|文档|manual|license|documentation/i

// 要跳过的目标可执行文件名（卸载程序、安装程序等）
// 卸载程序：uninst.exe, uninstall.exe, uninstaller.exe, UninstallXXX.exe, unins000.exe, unwise.exe, _uninst.exe 等
// 安装程序：setup.exe, install.exe, installer.exe, InstallXXX.exe, instmsi.exe, instmsiw.exe 等
// 注意：
//   - 过滤所有以 "uninstall"/"install" 开头的（包括 Installer.exe, UninstallSpineTrial.exe 等）
//   - 过滤 "uninst" 开头的（但 "unins" + 数字除外，需要精确匹配）
//   - 保留配置工具（如 "GameSetup.exe"，不以 setup/install 开头）
const SKIP_TARGET_PATTERN =
  /^uninstall|^uninst|^unins\d+$|^unwise|^_uninst|^setup$|^install|^instmsi|卸载程序|安装程序/i

// Windows 系统目录（不应该扫描这些目录中的应用）
const SYSTEM_DIRECTORIES = [
  'c:\\windows\\',
  'c:\\windows\\system32\\',
  'c:\\windows\\syswow64\\'
]

// ========== 辅助函数 ==========

// 检查是否应该跳过该快捷方式
// 优先基于目标文件的真实路径判断，而不是快捷方式名称
function shouldSkipShortcut(name: string, targetPath?: string): boolean {
  // 如果有目标路径，优先检查目标文件
  if (targetPath) {
    const lowerTargetPath = targetPath.toLowerCase()

    // 1. 检查是否在系统目录中（Windows、System32、WindowsApps 等）
    if (SYSTEM_DIRECTORIES.some((sysDir) => lowerTargetPath.startsWith(sysDir))) {
      return true
    }

    // 2. 检查目标文件扩展名（文档、网页等非可执行文件）
    if (SKIP_EXTENSIONS.some((ext) => lowerTargetPath.endsWith(ext))) {
      return true
    }

    // 3. 检查目标文件的文件名（uninst.exe, uninstall.exe, setup.exe 等）
    const targetFileName = path.basename(targetPath, path.extname(targetPath))
    if (SKIP_TARGET_PATTERN.test(targetFileName)) {
      return true
    }

    // 目标路径检查通过，不过滤
    return false
  }

  // 如果没有目标路径（解析失败），降级检查快捷方式名称
  if (SKIP_NAME_PATTERN.test(name)) {
    return true
  }

  return false
}

// 生成图标 URL
function getIconUrl(appPath: string): string {
  // 将绝对路径编码为 URL
  return `ztools-icon://${encodeURIComponent(appPath)}`
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

      // 尝试解析快捷方式目标（必须先解析才能获取真实路径）
      let shortcutDetails: Electron.ShortcutDetails | null = null
      try {
        shortcutDetails = shell.readShortcutLink(fullPath)
      } catch {
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

      // 过滤检查：基于目标文件的真实路径判断（优先），或快捷方式名称（降级）
      if (shouldSkipShortcut(appName, targetPath)) {
        continue
      }

      // 生成图标 URL
      const icon = getIconUrl(iconPath)

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

    const apps: Command[] = []

    // 获取 Windows 开始菜单路径
    const startMenuPaths = getWindowsStartMenuPaths()

    // 扫描所有开始菜单目录
    for (const menuPath of startMenuPaths) {
      await scanDirectory(menuPath, apps)
    }

    // 去重：按路径的小写形式去重（Windows 不区分大小写）
    const uniqueApps = new Map<string, Command>()
    apps.forEach((app) => {
      const lowerPath = app.path.toLowerCase()
      if (!uniqueApps.has(lowerPath)) {
        uniqueApps.set(lowerPath, app)
      }
    })
    const deduplicatedApps = Array.from(uniqueApps.values())

    const endTime = performance.now()
    console.log(
      `扫描完成: ${apps.length} 个应用 -> 去重后 ${deduplicatedApps.length} 个, 耗时 ${(endTime - startTime).toFixed(0)}ms`
    )

    return deduplicatedApps
  } catch (error) {
    console.error('扫描应用失败:', error)
    return []
  }
}
