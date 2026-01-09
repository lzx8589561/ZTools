import { platform } from '@electron-toolkit/utils'
import { app, BrowserWindow, protocol, session } from 'electron'
import log from 'electron-log'
import path from 'path'
import { Worker } from 'worker_threads'
import api from './api/index'
import appWatcher from './appWatcher'
import detachedWindowManager from './core/detachedWindowManager'
import { loadInternalPlugins } from './core/internalPluginLoader'

import pluginManager from './managers/pluginManager'
import windowManager from './managers/windowManager'

// ========== 关键修复：注册自定义协议为特权协议 ==========
// 必须在 app.ready 之前调用，否则渲染进程会因为安全策略拒绝加载
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'ztools-icon',
    privileges: {
      bypassCSP: true, // 绕过 CSP 限制
      secure: true, // 被视为安全协议（类似 https）
      standard: false, // 非标准协议（自定义协议）
      supportFetchAPI: true, // 支持 Fetch API
      corsEnabled: false, // 禁用 CORS
      stream: false // 不需要流式传输
    }
  }
])

// 定义全局图标内存缓存
const iconMemoryCache = new Map<string, Buffer>()

// 图标提取 Worker 管理
let iconWorker: Worker | null = null
const workerPendingTasks = new Map<
  string,
  { resolve: (buffer: Buffer) => void; reject: (err: any) => void }
>()

function initIconWorker(): void {
  // 确定 Worker 脚本路径
  // 在生产环境中，它位于 app.asar/out/main/iconWorker.js (或 app.asar.unpacked 如果配置了解压)
  // 在开发环境中，它位于 out/main/iconWorker.js
  const workerScript = path.join(__dirname, 'iconWorker.js')

  try {
    iconWorker = new Worker(workerScript)

    iconWorker.on('message', ({ id, buffer, error }) => {
      const task = workerPendingTasks.get(id)
      if (task) {
        if (error) {
          task.reject(new Error(error))
        } else {
          // 将 Node.js Buffer 转换为 Uint8Array
          task.resolve(Buffer.from(buffer))
        }
        workerPendingTasks.delete(id)
      }
    })

    iconWorker.on('error', (err) => {
      console.error('Icon Worker Error:', err)
    })

    iconWorker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Icon Worker stopped with exit code ${code}`)
        // 可以考虑自动重启 Worker
      }
    })
  } catch (error) {
    console.error('Failed to initialize Icon Worker:', error)
  }
}

// 配置 electron-log
log.transports.file.level = 'debug'
log.transports.file.maxSize = 5 * 1024 * 1024 // 5MB
log.transports.file.resolvePathFn = () => {
  return path.join(app.getPath('userData'), 'logs/main.log')
}
log.transports.console.level = 'debug'

// 生产环境接管 console
// if (process.env.NODE_ENV === 'production') {
Object.assign(console, log.functions)
// }

// 开发模式下禁用某些警告
if (process.env.NODE_ENV !== 'production') {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
}

// 添加 Chromium 命令行开关，禁用跨域限制
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors')
app.commandLine.appendSwitch('disable-site-isolation-trials')
app.commandLine.appendSwitch('disable-web-security')

// 导出函数供 API 使用
export function updateShortcut(shortcut: string): boolean {
  return windowManager.registerShortcut(shortcut)
}

export function getCurrentShortcut(): string {
  return windowManager.getCurrentShortcut()
}

/**
 * 在指定 session 中注册 ztools-icon:// 协议 handler
 * 供内置插件使用（外部插件不需要访问应用图标）
 */
export function registerIconProtocolForSession(targetSession: Electron.Session): void {
  // 检查协议是否已注册（避免重复注册导致错误）
  if (targetSession.protocol.isProtocolHandled('ztools-icon')) {
    return
  }

  targetSession.protocol.handle('ztools-icon', async (request) => {
    try {
      const urlPath = request.url.replace('ztools-icon://', '')
      const exePath = decodeURIComponent(urlPath)

      // A. 命中内存缓存：直接返回
      const cached = iconMemoryCache.get(exePath)
      if (cached) {
        return new Response(new Uint8Array(cached), {
          status: 200,
          headers: {
            'content-type': 'image/png',
            'content-length': cached.length.toString(),
            'access-control-allow-origin': '*'
          }
        })
      }

      // B. 未命中：发送给 Worker 提取
      if (!iconWorker) {
        initIconWorker()
      }

      const buffer = await new Promise<Buffer>((resolve, reject) => {
        const taskId = `${Date.now()}-${Math.random()}`
        workerPendingTasks.set(taskId, { resolve, reject })
        iconWorker?.postMessage({ id: taskId, exePath })

        // 超时处理（10秒）
        setTimeout(() => {
          if (workerPendingTasks.has(taskId)) {
            workerPendingTasks.delete(taskId)
            reject(new Error('Icon extraction timeout'))
          }
        }, 10000)
      })

      // 写入内存缓存
      iconMemoryCache.set(exePath, buffer)

      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'content-type': 'image/png',
          'content-length': buffer.length.toString(),
          'access-control-allow-origin': '*'
        }
      })
    } catch (error) {
      console.error('图标提取失败:', error)
      return new Response('Icon Error', { status: 404 })
    }
  })
}

app.whenReady().then(async () => {
  // 注册自定义图标协议到默认 session (ztools-icon://)
  registerIconProtocolForSession(session.defaultSession)

  // ✅ 首先加载内置插件
  await loadInternalPlugins()

  // 隐藏 Dock 图标（仅在没有分离窗口时隐藏）
  if (platform.isMacOS) {
    if (!detachedWindowManager.hasDetachedWindows()) {
      app.dock?.hide()
    }
  }

  // 创建主窗口
  const mainWindow = windowManager.createWindow()

  // 初始化 API 和插件管理器
  if (mainWindow) {
    api.init(mainWindow, pluginManager)
    pluginManager.init(mainWindow)
    // 初始化应用目录监听器
    appWatcher.init(mainWindow)
  }

  // 注册全局快捷键
  windowManager.registerShortcut()

  // 创建系统托盘
  windowManager.createTray()
})

app.on('window-all-closed', () => {
  if (!platform.isMacOS) {
    app.quit()
  }
})

app.on('will-quit', () => {
  windowManager.unregisterAllShortcuts()
  // 停止应用目录监听
  appWatcher.stop()
})

app.on('before-quit', () => {
  windowManager.setQuitting(true)
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager.createWindow()
  }
})

// 开发模式下监听 Ctrl+C 信号
if (process.env.NODE_ENV !== 'production') {
  process.on('SIGINT', () => {
    console.log('收到 SIGINT 信号，退出应用')
    app.quit()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 信号，退出应用')
    app.quit()
    process.exit(0)
  })
}
