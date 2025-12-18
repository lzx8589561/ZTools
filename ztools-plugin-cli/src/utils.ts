import fs from 'node:fs'
import path from 'node:path'
import type { PackageManager } from './types.js'

/**
 * 检测可用的包管理器
 */
export function detectPackageManager(): PackageManager {
  // 检查 pnpm-lock.yaml
  if (fs.existsSync('pnpm-lock.yaml')) {
    return 'pnpm'
  }
  // 检查 yarn.lock
  if (fs.existsSync('yarn.lock')) {
    return 'yarn'
  }
  // 默认 npm
  return 'npm'
}

/**
 * 复制目录
 */
export function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true })
  const files = fs.readdirSync(src)

  for (const file of files) {
    const srcPath = path.join(src, file)
    const destPath = path.join(dest, file)
    const stat = fs.statSync(srcPath)

    if (stat.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

/**
 * 替换文件中的模板变量
 */
export function replaceTemplateVars(filePath: string, vars: Record<string, string>): void {
  let content = fs.readFileSync(filePath, 'utf-8')

  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    content = content.replace(regex, value)
  }

  fs.writeFileSync(filePath, content, 'utf-8')
}

/**
 * 递归替换目录中所有文件的模板变量
 */
export function replaceTemplateVarsInDir(dir: string, vars: Record<string, string>): void {
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      replaceTemplateVarsInDir(filePath, vars)
    } else if (
      file.endsWith('.json') ||
      file.endsWith('.ts') ||
      file.endsWith('.tsx') ||
      file.endsWith('.vue') ||
      file.endsWith('.md')
    ) {
      replaceTemplateVars(filePath, vars)
    }
  }
}

/**
 * 检查目录是否为空
 */
export function isEmpty(path: string): boolean {
  const files = fs.readdirSync(path)
  return files.length === 0 || (files.length === 1 && files[0] === '.git')
}

/**
 * 清空目录
 */
export function emptyDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    return
  }
  for (const file of fs.readdirSync(dir)) {
    if (file === '.git') {
      continue
    }
    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true })
  }
}
