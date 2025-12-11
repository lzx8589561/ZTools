import Fuse from 'fuse.js'
import { defineStore } from 'pinia'
import { pinyin } from 'pinyin-pro'
import { nextTick, ref } from 'vue'

// 正则匹配指令
interface RegexCmd {
  type: 'regex'
  minLength: number
  match: string
  label: string
}

// Over 匹配指令
interface OverCmd {
  type: 'over'
  label: string
  exclude?: string // 排除的正则表达式字符串
  minLength?: number // 最少字符数
  maxLength?: number // 最多字符数，默认 10000
}

// 匹配指令联合类型
type MatchCmd = RegexCmd | OverCmd

// 指令类型枚举
export type CommandType =
  | 'direct' // 直接启动（app + system-setting）
  | 'plugin' // 插件功能
  | 'builtin' // 内置功能

// 子类型（用于区分 direct 类型的具体来源）
export type CommandSubType =
  | 'app' // 系统应用
  | 'system-setting' // 系统设置

// Command 接口（原 App 接口）
export interface Command {
  name: string
  path: string // 纯路径（应用路径 或 插件根目录路径）
  icon?: string
  pinyin?: string
  pinyinAbbr?: string
  type: CommandType // 指令类型
  subType?: CommandSubType // 子类型（用于区分 direct 类型）
  featureCode?: string // 插件功能代码（用于启动时指定功能）
  pluginExplain?: string // 插件功能说明
  matchCmd?: MatchCmd // 匹配指令配置（regex 或 over）
  cmdType?: 'text' | 'regex' | 'over' // cmd类型：text=字符串，regex=正则表达式，over=任意文本匹配
  matches?: MatchInfo[] // 搜索匹配信息（用于高亮显示）
  // 系统设置字段（新增）
  settingUri?: string // ms-settings URI
  category?: string // 分类（用于分组显示）
}

interface MatchInfo {
  indices: Array<[number, number]>
  value: string
  key: string
}

export interface SearchResult extends Command {
  matches?: MatchInfo[]
}

interface HistoryItem extends Command {
  lastUsed: number // 时间戳
  useCount: number // 使用次数
}

const HISTORY_DOC_ID = 'command-history'
const PINNED_DOC_ID = 'pinned-commands'

export const useCommandDataStore = defineStore('commandData', () => {
  // 历史记录
  const history = ref<HistoryItem[]>([])
  // 固定指令
  const pinnedCommands = ref<Command[]>([])
  // 指令列表（用于搜索）
  const commands = ref<Command[]>([]) // 用于 Fuse 模糊搜索的指令列表
  const regexCommands = ref<Command[]>([]) // 只用正则匹配的指令列表
  const loading = ref(false)
  const fuse = ref<Fuse<Command> | null>(null)
  // 是否已初始化
  const isInitialized = ref(false)
  // 标记是否是本地触发的更新（用于避免重复加载）
  let isLocalPinnedUpdate = false

  // 从数据库加载所有数据（仅在初始化时调用一次）
  async function initializeData(): Promise<void> {
    if (isInitialized.value) {
      return
    }

    try {
      // 并行加载历史记录、固定列表和指令列表
      await Promise.all([loadHistoryData(), loadPinnedData(), loadCommands()])

      // 监听后端历史记录变化事件
      window.ztools.onHistoryChanged(() => {
        console.log('收到历史记录变化通知，重新加载')
        loadHistoryData()
      })

      // 监听指令列表变化事件（应用文件夹变化时触发）
      window.ztools.onAppsChanged(() => {
        console.log('收到指令列表变化通知，重新加载')
        loadCommands()
      })

      // 监听固定列表变化事件
      window.ztools.onPinnedChanged(() => {
        // 如果是本地触发的更新，忽略此事件，避免重复加载
        if (isLocalPinnedUpdate) {
          console.log('忽略自己触发的固定列表变化通知')
          isLocalPinnedUpdate = false
          return
        }
        console.log('收到固定列表变化通知，重新加载')
        loadPinnedData()
      })

      isInitialized.value = true
      console.log('指令数据初始化完成')
    } catch (error) {
      console.error('初始化指令数据失败:', error)
      history.value = []
      pinnedCommands.value = []
      commands.value = []
      regexCommands.value = []
      isInitialized.value = true
    }
  }

  // 加载历史记录数据
  async function loadHistoryData(): Promise<void> {
    try {
      const [data, plugins] = await Promise.all([
        window.ztools.dbGet(HISTORY_DOC_ID),
        window.ztools.getPlugins()
      ])

      if (data && Array.isArray(data)) {
        // 获取所有已安装插件的路径 Set
        const installedPluginPaths = new Set(plugins.map((p: any) => p.path))

        // 过滤掉已卸载的插件
        const filteredData = data.filter((item: any) => {
          if (item.type === 'plugin') {
            return installedPluginPaths.has(item.path)
          }
          return true
        })

        history.value = []
        nextTick(() => {
          history.value = filteredData
        })
      } else {
        history.value = []
      }
    } catch (error) {
      console.error('加载历史记录失败:', error)
      history.value = []
    }
  }

  // 加载固定列表数据
  async function loadPinnedData(): Promise<void> {
    try {
      const [data, plugins] = await Promise.all([
        window.ztools.dbGet(PINNED_DOC_ID),
        window.ztools.getPlugins()
      ])

      if (data && Array.isArray(data)) {
        // 获取所有已安装插件的路径 Set
        const installedPluginPaths = new Set(plugins.map((p: any) => p.path))

        // 过滤掉已卸载的插件
        const filteredData = data.filter((item: any) => {
          if (item.type === 'plugin') {
            return installedPluginPaths.has(item.path)
          }
          return true
        })

        pinnedCommands.value = filteredData
      } else {
        pinnedCommands.value = []
      }
    } catch (error) {
      console.error('加载固定列表失败:', error)
      pinnedCommands.value = []
    }
  }

  // 重新加载历史记录和固定列表（用于插件卸载后刷新）
  async function reloadUserData(): Promise<void> {
    await Promise.all([loadHistoryData(), loadPinnedData()])
    console.log('已刷新历史记录和固定列表')
  }

  // 加载指令列表
  async function loadCommands(): Promise<void> {
    loading.value = true
    try {
      const rawApps = await window.ztools.getApps()
      const plugins = await window.ztools.getPlugins()

      // 处理本地应用指令
      const appItems = rawApps.map((app) => ({
        ...app,
        type: 'direct' as const,
        subType: 'app' as const,
        pinyin: pinyin(app.name, { toneType: 'none', type: 'string' })
          .replace(/\s+/g, '')
          .toLowerCase(),
        pinyinAbbr: pinyin(app.name, { pattern: 'first', toneType: 'none', type: 'string' })
          .replace(/\s+/g, '')
          .toLowerCase()
      }))

      // 处理插件：每个 cmd 转换为一个独立指令
      const pluginItems: Command[] = [] // 普通插件指令
      const regexItems: Command[] = [] // 正则匹配指令

      for (const plugin of plugins) {
        if (plugin.features && Array.isArray(plugin.features) && plugin.features.length > 0) {
          // 1. 插件名称本身作为一个指令（不关联具体 feature）
          let defaultFeatureCode: string | undefined = undefined
          // 如果插件没有指定 main，则默认启动第一个非匹配指令的功能
          if (!plugin.main && plugin.features) {
            for (const feature of plugin.features) {
              if (feature.cmds && Array.isArray(feature.cmds)) {
                // 查找是否存在字符串类型的指令（即普通文本指令）
                const hasTextCmd = feature.cmds.some((cmd: any) => typeof cmd === 'string')
                if (hasTextCmd) {
                  defaultFeatureCode = feature.code
                  break
                }
              }
            }
          }

          pluginItems.push({
            name: plugin.name,
            path: plugin.path,
            icon: plugin.logo,
            type: 'plugin',
            featureCode: defaultFeatureCode,
            pinyin: pinyin(plugin.name, { toneType: 'none', type: 'string' })
              .replace(/\s+/g, '')
              .toLowerCase(),
            pinyinAbbr: pinyin(plugin.name, { pattern: 'first', toneType: 'none', type: 'string' })
              .replace(/\s+/g, '')
              .toLowerCase()
          })

          // 2. 每个 feature 的每个 cmd 都作为独立的指令
          for (const feature of plugin.features) {
            if (feature.cmds && Array.isArray(feature.cmds)) {
              // 优先使用 feature 的 icon，如果没有则使用 plugin 的 logo
              const featureIcon = feature.icon || plugin.logo

              for (const cmd of feature.cmds) {
                // cmd 可能是字符串、正则配置对象或 over 配置对象
                const isMatchCmd =
                  typeof cmd === 'object' && (cmd.type === 'regex' || cmd.type === 'over')
                const cmdName = isMatchCmd ? cmd.label : cmd

                if (isMatchCmd) {
                  // 匹配指令项（regex 或 over）：不需要拼音搜索
                  regexItems.push({
                    name: cmdName,
                    path: plugin.path,
                    icon: featureIcon,
                    type: 'plugin',
                    featureCode: feature.code,
                    pluginExplain: feature.explain,
                    matchCmd: cmd,
                    cmdType: cmd.type // 标记为 regex 或 over 类型
                  })
                } else {
                  // 功能指令
                  pluginItems.push({
                    name: cmdName,
                    path: plugin.path,
                    icon: featureIcon,
                    type: 'plugin',
                    featureCode: feature.code,
                    pluginExplain: feature.explain,
                    cmdType: 'text', // 标记为文本类型
                    pinyin: pinyin(cmdName, { toneType: 'none', type: 'string' })
                      .replace(/\s+/g, '')
                      .toLowerCase(),
                    pinyinAbbr: pinyin(cmdName, {
                      pattern: 'first',
                      toneType: 'none',
                      type: 'string'
                    })
                      .replace(/\s+/g, '')
                      .toLowerCase()
                  })
                }
              }
            }
          }
        }
      }

      // 3. 加载系统设置（仅 Windows 平台）
      let settingCommands: Command[] = []
      try {
        const isWindows = await window.ztools.isWindows()
        if (isWindows) {
          const settings = await window.ztools.getSystemSettings()
          settingCommands = settings.map((s: any) => ({
            name: s.name,
            path: s.uri,
            icon: s.icon,
            type: 'direct' as const,
            subType: 'system-setting' as const,
            settingUri: s.uri,
            category: s.category,
            pinyin: pinyin(s.name, { toneType: 'none', type: 'string' })
              .replace(/\s+/g, '')
              .toLowerCase(),
            pinyinAbbr: pinyin(s.name, { pattern: 'first', toneType: 'none', type: 'string' })
              .replace(/\s+/g, '')
              .toLowerCase()
          }))
        }
      } catch (error) {
        console.error('加载系统设置失败:', error)
      }

      // 合并所有指令
      commands.value = [...appItems, ...pluginItems, ...settingCommands]
      regexCommands.value = regexItems

      console.log(
        `加载了 ${appItems.length} 个应用指令, ${pluginItems.length} 个插件指令, ${settingCommands.length} 个系统设置指令, ${regexItems.length} 个匹配指令`
      )

      // 初始化 Fuse.js 搜索引擎
      fuse.value = new Fuse(commands.value, {
        keys: [
          { name: 'name', weight: 2 }, // 名称权重最高
          { name: 'pinyin', weight: 1.5 }, // 拼音
          { name: 'pinyinAbbr', weight: 1 } // 拼音首字母
        ],
        threshold: 0, // 严格模式
        ignoreLocation: true,
        includeScore: true,
        includeMatches: true // 包含匹配信息
      })
    } catch (error) {
      console.error('加载指令失败:', error)
    } finally {
      loading.value = false
    }
  }

  // 搜索
  function search(query: string): { bestMatches: SearchResult[]; regexMatches: SearchResult[] } {
    if (!query || !fuse.value) {
      return {
        bestMatches: commands.value.filter((cmd) => cmd.type === 'direct' && cmd.subType === 'app'), // 无搜索时只显示应用
        regexMatches: []
      }
    }

    // 1. Fuse.js 模糊搜索
    const fuseResults = fuse.value.search(query)
    const bestMatches = fuseResults.map((r) => ({
      ...r.item,
      matches: r.matches as MatchInfo[]
    }))

    // 2. 匹配指令匹配（从 regexCommands 中查找，包括 regex 和 over 类型）
    const regexMatches: SearchResult[] = []
    for (const cmd of regexCommands.value) {
      if (cmd.matchCmd) {
        if (cmd.matchCmd.type === 'regex') {
          // Regex 类型匹配
          // 检查用户输入长度是否满足最小要求
          if (query.length < cmd.matchCmd.minLength) {
            continue
          }

          try {
            // 提取正则表达式（去掉两边的斜杠和标志）
            const regexStr = cmd.matchCmd.match.replace(/^\/|\/[gimuy]*$/g, '')
            const regex = new RegExp(regexStr)

            // 测试用户输入是否匹配
            if (regex.test(query)) {
              regexMatches.push(cmd)
            }
          } catch (error) {
            console.error(`正则表达式 ${cmd.matchCmd.match} 解析失败:`, error)
          }
        } else if (cmd.matchCmd.type === 'over') {
          // Over 类型匹配
          const minLength = cmd.matchCmd.minLength ?? 1
          const maxLength = cmd.matchCmd.maxLength ?? 10000

          // 检查长度是否满足要求
          if (query.length < minLength || query.length > maxLength) {
            continue
          }

          // 检查是否被排除
          if (cmd.matchCmd.exclude) {
            try {
              const excludeRegexStr = cmd.matchCmd.exclude.replace(/^\/|\/[gimuy]*$/g, '')
              const excludeRegex = new RegExp(excludeRegexStr)

              // 如果匹配到排除规则，跳过
              if (excludeRegex.test(query)) {
                continue
              }
            } catch (error) {
              console.error(`排除正则表达式 ${cmd.matchCmd.exclude} 解析失败:`, error)
            }
          }

          // 通过所有检查，添加到匹配结果
          regexMatches.push(cmd)
        }
      }
    }

    // 分别返回模糊匹配和正则匹配结果
    return { bestMatches, regexMatches }
  }

  // ==================== 历史记录相关 ====================

  // 保存历史记录到数据库
  async function saveHistory(): Promise<void> {
    try {
      const cleanData = history.value.map((item) => ({
        name: item.name,
        path: item.path,
        icon: item.icon,
        type: item.type,
        featureCode: item.featureCode, // 保存 featureCode
        pluginExplain: item.pluginExplain, // 保存插件说明
        lastUsed: item.lastUsed,
        useCount: item.useCount
      }))

      await window.ztools.dbPut(HISTORY_DOC_ID, cleanData)
    } catch (error) {
      console.error('保存指令历史记录失败:', error)
    }
  }

  // 获取最近使用（自动同步最新数据）
  function getRecentCommands(limit?: number): Command[] {
    // 同步历史记录数据，确保使用最新的路径和图标
    const syncedHistory = history.value.map((historyItem) => {
      // 尝试从当前列表中找到
      const currentCommand = commands.value.find(
        (app) =>
          app.name === historyItem.name &&
          app.type === historyItem.type &&
          app.subType === historyItem.subType &&
          app.featureCode === historyItem.featureCode
      )

      // 如果找到了最新数据，使用最新的；否则使用历史记录
      return currentCommand || historyItem
    })

    if (limit) {
      return syncedHistory.slice(0, limit)
    }
    return syncedHistory
  }

  // 从历史记录中删除指定指令
  async function removeFromHistory(commandPath: string, featureCode?: string): Promise<void> {
    await window.ztools.removeFromHistory(commandPath, featureCode)
    // 后端会发送 history-changed 事件，触发重新加载
  }

  // 清空历史记录
  async function clearHistory(): Promise<void> {
    history.value = []
    await saveHistory()
  }

  // ==================== 固定应用相关 ====================

  // 保存固定列表到数据库
  async function savePinned(): Promise<void> {
    try {
      const cleanData = pinnedCommands.value.map((cmd) => ({
        name: cmd.name,
        path: cmd.path,
        icon: cmd.icon,
        type: cmd.type,
        featureCode: cmd.featureCode, // 保存 featureCode
        pluginExplain: cmd.pluginExplain // 保存插件说明
      }))

      await window.ztools.dbPut(PINNED_DOC_ID, cleanData)
    } catch (error) {
      console.error('保存固定列表失败:', error)
    }
  }

  // 检查指令是否已固定
  function isPinned(commandPath: string, featureCode?: string): boolean {
    return pinnedCommands.value.some((cmd) => {
      // 对于插件，需要同时匹配 path 和 featureCode
      if (cmd.type === 'plugin' && featureCode !== undefined) {
        return cmd.path === commandPath && cmd.featureCode === featureCode
      }
      return cmd.path === commandPath
    })
  }

  // 固定指令
  async function pinCommand(command: Command): Promise<void> {
    // 将 Vue 响应式对象转换为纯对象，避免 IPC 传递时的克隆错误
    const plainCommand = JSON.parse(JSON.stringify(command))
    await window.ztools.pinApp(plainCommand)
    // 后端会发送 pinned-changed 事件，触发重新加载
  }

  // 取消固定
  async function unpinCommand(commandPath: string, featureCode?: string): Promise<void> {
    await window.ztools.unpinApp(commandPath, featureCode)
    // 后端会发送 pinned-changed 事件，触发重新加载
  }

  // 获取固定列表（自动同步最新数据）
  function getPinnedCommands(): Command[] {
    // 同步固定列表的数据，确保使用最新的路径和图标
    return pinnedCommands.value.map((pinnedItem) => {
      // 尝试从当前列表中找到
      const currentCommand = commands.value.find(
        (cmd) =>
          cmd.name === pinnedItem.name &&
          cmd.type === pinnedItem.type &&
          cmd.subType === pinnedItem.subType &&
          cmd.featureCode === pinnedItem.featureCode
      )

      // 如果找到了最新数据，使用最新的；否则使用固定列表中的
      return currentCommand || pinnedItem
    })
  }

  // 更新固定列表顺序
  async function updatePinnedOrder(newOrder: Command[]): Promise<void> {
    // 乐观更新：立即更新本地状态，避免等待后端导致的延迟和闪动
    pinnedCommands.value = newOrder

    // 标记这是本地触发的更新
    isLocalPinnedUpdate = true

    // 异步保存到后端，不等待完成
    // 将 Vue 响应式对象数组转换为纯对象数组，避免 IPC 传递时的克隆错误
    const plainOrder = JSON.parse(JSON.stringify(newOrder))
    window.ztools.updatePinnedOrder(plainOrder).catch((error) => {
      console.error('保存固定列表顺序失败:', error)
      // 如果保存失败，重置标志并重新从后端加载数据
      isLocalPinnedUpdate = false
      loadPinnedData()
    })
    // 注意：不需要等待 pinned-changed 事件，因为本地已经更新了
  }

  // 清空固定列表
  async function clearPinned(): Promise<void> {
    pinnedCommands.value = []
    await savePinned()
  }

  return {
    // 状态
    history,
    pinnedCommands,
    commands,
    regexCommands,
    loading,
    isInitialized,

    // 初始化
    initializeData,

    // 指令和搜索相关
    loadCommands,
    search,
    reloadUserData,

    // 指令历史记录方法（添加由后端处理）
    getRecentCommands,
    removeFromHistory,
    clearHistory,

    // 固定指令方法
    isPinned,
    pinCommand,
    unpinCommand,
    getPinnedCommands,
    updatePinnedOrder,
    clearPinned
  }
})
