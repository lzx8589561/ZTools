import { execFile } from 'child_process'
import { promisify } from 'util'

const execFilePromise = promisify(execFile)

/**
 * 检查当前进程是否以管理员权限运行（仅 Windows）
 */
export async function isRunningAsAdmin(): Promise<boolean> {
  if (process.platform !== 'win32') {
    return false
  }

  try {
    // 使用 net session 命令检查管理员权限
    // 管理员权限下会成功，否则会失败
    await execFilePromise('net', ['session'], { timeout: 5000 })
    return true
  } catch {
    return false
  }
}

/**
 * 以管理员权限执行命令（仅 Windows）
 *
 * @param command 要执行的命令路径
 * @param args 命令参数
 * @param wait 是否等待进程完成（默认 false，适用于 updater 等需要在主应用退出后运行的程序）
 * @throws 如果执行失败则抛出错误
 */
export async function execWithElevation(
  command: string,
  args: string[],
  wait: boolean = false
): Promise<void> {
  if (process.platform !== 'win32') {
    // 非 Windows 平台直接执行
    await execFilePromise(command, args, { timeout: 30000 })
    return
  }

  try {
    if (await isRunningAsAdmin()) {
      // 已经是管理员权限，直接执行
      if (wait) {
        await execFilePromise(command, args, { timeout: 30000 })
      } else {
        // 不等待，使用 spawn detached
        const { spawn } = await import('child_process')
        const subprocess = spawn(command, args, {
          detached: true,
          stdio: 'ignore'
        })
        subprocess.unref()
      }
    } else {
      // 需要提权，通过 PowerShell 的 Start-Process -Verb RunAs 执行
      const psArgs = args
        .map((arg) => {
          // 转义单引号（PowerShell 中单引号内的单引号需要双写）
          const escaped = arg.replace(/'/g, "''")
          return `'${escaped}'`
        })
        .join(',')

      const psCommand = wait
        ? `& { $p = Start-Process -FilePath '${command}' -ArgumentList @(${psArgs}) -Verb RunAs -WindowStyle Hidden -PassThru -Wait; exit $p.ExitCode }`
        : `Start-Process -FilePath '${command}' -ArgumentList @(${psArgs}) -Verb RunAs -WindowStyle Hidden`

      await execFilePromise(
        'powershell.exe',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psCommand],
        { timeout: 30000 }
      )
    }
  } catch (error) {
    throw new Error(
      `Windows 提权执行失败：${error instanceof Error ? error.message : String(error)}`
    )
  }
}
