# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

ZTools 是一个高性能、可扩展的 macOS/Windows 应用启动器和插件平台，采用 Electron + Vue 3 + TypeScript 技术栈，提供类似 Alfred/Raycast 的体验。

**核心特性**：

- 🚀 **快速启动**：拼音搜索、正则匹配、历史记录、固定应用
- 🧩 **插件系统**：支持 UI 插件和无界面插件，数据隔离，统一 API
- 📋 **剪贴板管理**：历史记录、搜索、图片支持、跨平台原生实现
- 🎨 **主题定制**：系统/亮色/暗色模式，6 种主题色
- ⚡ **高性能**：LMDB 数据库（3-5x PouchDB 性能），WebContentsView 架构
- 🌍 **跨平台**：macOS 和 Windows 原生支持

**技术亮点**：

- Electron 38 + WebContentsView（替代 BrowserView）
- LMDB 高性能键值数据库（替代 PouchDB）
- 模块化 IPC 架构（shared/renderer/plugin 三层分离）
- 跨平台原生模块（C++ 实现剪贴板监听、窗口管理、区域截图）
- Fuse.js 模糊搜索引擎（拼音、拼音首字母支持）

## 开发命令

```bash
# 开发
npm run dev          # 启动开发模式（热重载）

# 类型检查
npm run typecheck:node  # 主进程 + preload
npm run typecheck:web   # 渲染进程
npm run typecheck       # 全部

# 构建
npm run build           # 仅编译源码
npm run build:mac       # 打包 macOS 应用
npm run build:unpack    # 打包但不生成安装包（调试用）
```

## 核心架构

### Electron 三层结构

```
Main Process (src/main/)
  ├─ index.ts              # 应用入口
  ├─ windowManager.ts      # 窗口管理、快捷键注册
  ├─ pluginManager.ts      # 插件 BrowserView/BrowserWindow 管理
  ├─ clipboardManager.ts   # 剪贴板监听和历史管理
  ├─ api/                  # 模块化 IPC 通信中心
  │   ├─ index.ts          # API 管理器（统一初始化）
  │   ├─ shared/           # 主程序和插件共享的 API
  │   │   ├─ database.ts   # 数据库 API（支持命名空间隔离）
  │   │   └─ clipboard.ts  # 剪贴板 API
  │   ├─ renderer/         # 主程序渲染进程专用 API
  │   │   ├─ apps.ts       # 应用管理
  │   │   ├─ plugins.ts    # 插件管理
  │   │   ├─ window.ts     # 窗口控制
  │   │   ├─ settings.ts   # 设置管理
  │   │   └─ system.ts     # 系统功能
  │   └─ plugin/           # 插件专用 API
  │       ├─ lifecycle.ts  # 生命周期事件
  │       ├─ ui.ts         # UI 控制
  │       ├─ window.ts     # 插件窗口管理
  │       ├─ dialog.ts     # 对话框
  │       ├─ clipboard.ts  # 剪贴板操作
  │       ├─ input.ts      # 输入模拟
  │       ├─ shell.ts      # Shell 命令
  │       └─ feature.ts    # 插件功能
  └─ core/
      ├─ lmdb/             # LMDB 数据持久化（高性能键值数据库）
      │   ├─ index.ts      # 主数据库类
      │   ├─ lmdbInstance.ts  # 单例实例
      │   ├─ syncApi.ts    # 同步 API
      │   ├─ promiseApi.ts # Promise API
      │   └─ types.ts      # 类型定义
      └─ pluginWindowManager.ts  # 插件独立窗口管理
         ↓ IPC
Preload Script (src/preload/index.ts)
  ├─ contextBridge.exposeInMainWorld('ztools', {...})
  └─ 类型安全的 API 暴露到 window.ztools
         ↓
Renderer Process (src/renderer/)
  ├─ App.vue              # 三种视图模式：Search/Plugin/Settings
  ├─ stores/              # Pinia 状态管理
  │   ├─ appDataStore.ts  # 应用列表、搜索、历史记录、固定列表
  │   └─ windowStore.ts   # 窗口信息、配置
  └─ components/          # Vue 组件
```

### 插件系统设计

**关键机制**：

- 支持两种插件类型：
  - **UI 插件**：使用 **WebContentsView** 加载界面（`plugin.json` 有 `main` 字段）
  - **无界面插件**：同样使用 **WebContentsView** 但加载空白页面（无 `main` 字段）
    - 判断依据：`plugin.json` 中是否有 `main` 字段
    - 加载 `hideWindow.html`（空白页面）
    - 通过 `window.exports[featureCode]` 导出功能，`mode: 'none'` 标识无界面
    - 调用方式：主进程通过 `call-plugin-method` IPC 调用 `enter()` 方法
- 插件通过 `resources/preload.js` 访问受限的主进程 API
  - 使用 `session.registerPreloadScript()` 注入到所有插件
- 支持两种部署模式：
  - **生产插件**：打包的 ZIP 文件 → 解压到 `userData/plugins/`
  - **开发插件**：本地文件夹，支持 HTTP URL（如 `http://localhost:5173`）
- 数据隔离：每个插件的数据库操作自动添加 `PLUGIN/{pluginName}/` 前缀（通过 `getPluginPrefix()` 方法识别调用来源）

**插件启动流程**：

```
用户输入 → appDataStore.search() 匹配
    ↓
launch('plugin:/path/to/plugin:featureCode')
    ↓
pluginManager.createPluginView()
    ↓
1. 从缓存 pluginViews 查找或创建新 BrowserView
2. 设置边界（y=59px, height=541px）
3. 加载插件 URL（本地文件或 HTTP）
4. 发送 on-plugin-enter 事件（携带 launchParam）
```

**插件配置** (`plugin.json`):

```json
{
  "name": "Anywhere",
  "version": "1.0.1",
  "description": "文件快速跳转插件",
  "main": "index.html",
  "preload": "preload.js",
  "logo": "logo.png",
  "features": [
    {
      "code": "search",
      "explain": "搜索文件",
      "icon": "search.png",
      "cmds": [
        "文件搜索",
        {
          "type": "regex",
          "match": "/^find (.+)$/",
          "label": "查找文件",
          "minLength": 5
        },
        {
          "type": "over",
          "label": "处理任意文本",
          "minLength": 3,
          "maxLength": 100,
          "exclude": "/^https?://"
        }
      ]
    }
  ]
}
```

**字段说明**：

- `name` **(必需)**：插件唯一标识符（英文）
- `version` **(必需)**：版本号
- `description`：插件描述
- `main`：UI 插件的入口文件（无界面插件不需要此字段）
- `preload`：自定义 preload 脚本（可选，默认使用系统提供的）
- `logo`：插件图标路径（相对于插件根目录）
- `features` **(必需)**：功能列表
  - `code`：功能代码（用于标识不同功能）
  - `explain`：功能说明
  - `icon`：功能图标（优先级高于插件 logo）
  - `cmds`：命令列表（支持三种类型）

**命令类型**：

1. **功能指令**（字符串）：用于搜索匹配，支持拼音搜索
   ```json
   "cmds": ["文件搜索", "搜索"]
   ```
   - 存入 `apps` 数组
   - 通过 Fuse.js 进行模糊搜索
   - 支持名称、拼音、拼音首字母匹配
   - 适合：固定名称的功能、常用命令

2. **正则匹配指令**（regex）：正则表达式匹配用户输入
   ```json
   {
     "type": "regex",
     "match": "/^calc (.+)$/",  // 正则表达式（带斜杠）
     "label": "计算器",          // 显示名称
     "minLength": 5              // 最小输入长度
   }
   ```
   - 存入 `regexApps` 数组
   - 通过正则表达式匹配用户输入
   - 需满足 `minLength` 要求
   - 适合：需要提取参数的命令、格式化输入

3. **任意文本匹配指令**（over）：匹配任意文本（可设置排除规则）
   ```json
   {
     "type": "over",
     "label": "文本处理",
     "minLength": 1,              // 最小长度，默认 1
     "maxLength": 10000,          // 最大长度，默认 10000
     "exclude": "/^https?:\/\//"  // 排除规则（正则表达式）
   }
   ```
   - 存入 `regexApps` 数组
   - 匹配任意文本（满足长度限制且不被排除）
   - 可通过 `exclude` 设置排除规则
   - 适合：处理任意文本、翻译、转换等

**重要规则**：

- 每个 `feature.cmds` 都会生成独立的搜索项
- **功能指令**（字符串类型）：存入 `apps` 数组，通过 Fuse.js 模糊搜索（支持拼音）
- **匹配指令**（regex/over 类型）：存入 `regexApps` 数组，独立匹配逻辑
- 插件名本身也作为一个搜索项（不关联具体 feature，或关联默认 feature）
- 插件卸载时，后端自动清理历史记录和固定列表中的相关项
- 插件缓存在 `pluginViews` 数组中，切换时复用（注意内存管理）

### 状态管理 (Pinia)

#### appDataStore.ts

负责应用和插件的核心数据：

**关键状态**：

- `apps: App[]` - 用于 Fuse.js 模糊搜索的列表（应用 + 功能指令）
- `regexApps: App[]` - 用于匹配指令的列表（regex/over 类型）
- `history: HistoryItem[]` - 使用历史（最多 27 个）
- `pinnedApps: App[]` - 固定应用（最多 18 个）
- `fuse: Fuse<App>` - 搜索引擎实例
- `isInitialized: boolean` - 是否已初始化
- `loading: boolean` - 是否正在加载

**搜索策略**：

```typescript
search(query: string): {
  bestMatches: SearchResult[],  // Fuse.js 模糊搜索（名称、拼音、拼音首字母）
  regexMatches: SearchResult[]  // 匹配指令结果（regex/over 类型）
}
```

**命令类型区分**：

- **功能指令**（`cmdType: 'text'`）：
  - 字符串类型的 cmd，如 `"搜索"`
  - 存入 `apps` 数组
  - 支持 Fuse.js 拼音模糊搜索
  - 生成 `pinyin` 和 `pinyinAbbr` 字段

- **匹配指令**（`cmdType: 'regex' | 'over'`）：
  - 对象类型的 cmd，如 `{ type: 'regex', ... }`
  - 存入 `regexApps` 数组
  - 独立匹配逻辑（不参与 Fuse 搜索）
  - regex 类型：通过正则表达式匹配，需满足 `minLength`
  - over 类型：匹配任意文本，支持 `minLength`、`maxLength`、`exclude` 规则

**数据加载时机**：

- `initializeData()` - 应用启动时调用一次，并行加载历史、固定列表、应用列表
- `loadApps()` - 插件安装/删除时刷新
- `reloadUserData()` - 插件删除时刷新历史和固定列表
- 监听后端事件：
  - `history-changed` → 重新加载历史记录
  - `apps-changed` → 重新加载应用列表
  - `pinned-changed` → 重新加载固定列表

#### windowStore.ts

窗口和 UI 配置：

**关键状态**：

- `currentWindow: WindowInfo | null` - 打开前激活的窗口信息（用于恢复）
- `currentPlugin: PluginInfo | null` - 当前显示的插件信息
- `placeholder: string` - 主搜索框占位符
- `avatar: string` - 头像
- `subInputPlaceholder: string` - 子输入框占位符（插件模式）
- `autoPaste: AutoPasteOption` - 自动粘贴配置（off/1s/3s/5s/10s）
- `hideOnBlur: boolean` - 失去焦点时隐藏窗口
- `theme: string` - 主题模式（system/light/dark）
- `primaryColor: string` - 主题色（blue/purple/green/orange/red/pink）

**方法**：

- `updateWindowInfo()` - 更新窗口信息
- `isFinder()` - 判断当前是否为 Finder
- `updateCurrentPlugin()` - 更新当前插件信息
- `updateSubInputPlaceholder()` - 更新子输入框占位符
- `getAutoPasteTimeLimit()` - 获取自动粘贴时间限制（毫秒）
- `loadSettings()` - 从数据库加载设置

### 数据持久化 (LMDB)

**技术选型**：从 PouchDB 迁移到 LMDB，性能提升显著（读写速度 ⚡⚡⚡，内存占用 📉 极低）

**存储结构**：

```typescript
// 数据库路径: app.getPath('userData')/lmdb
// 三个数据库：main（主数据）、meta（元数据）、attachment（附件）

interface DbDoc {
  _id: string      // 文档 ID（必需）
  _rev?: string    // 文档版本号（LMDB 自动管理）
  data?: any       // 实际数据（主程序使用）
  [key: string]: any  // 自定义字段（插件使用）
}
```

**命名空间约定**：

- `ZTOOLS/` - 主程序数据
  - `ZTOOLS/plugins` - 插件列表
  - `ZTOOLS/app-history` - 应用使用历史
  - `ZTOOLS/pinned-apps` - 固定应用列表
  - `ZTOOLS/settings-general` - 通用设置
- `PLUGIN/{pluginName}/` - 插件专属数据（自动隔离）
  - 插件调用 `db.put({ _id: 'config' })` → 实际存储为 `PLUGIN/my-plugin/config`
  - 前缀自动添加和移除，插件无感知
- `CLIPBOARD/` - 剪贴板历史（未使用，改用附件存储）

**附件存储**：

- 附件 ID 格式：`attachment:{docId}`
- 元数据格式：`attachment-ext:{docId}` → JSON 字符串（包含 type、size 等）
- 图片保存到 `userData/clipboard/images/`
- 支持类型：文本、图片（PNG）、文件列表

**API 模式**：

- 同步 API：`db.put(doc)`、`db.get(id)` - 插件使用（通过 `ipcRenderer.sendSync`）
- Promise API：`db.promises.put(doc)` - 主进程内部使用
- dbStorage API：`dbStorage.setItem(key, value)` - 类似 localStorage 的简化接口

### IPC 通信模式

**模块化架构**（`src/main/api/index.ts` 统一管理）：

**共享 API**（主程序和插件都可用）：
- `db:put/get/remove/bulk-docs/all-docs` - 数据库操作（自动处理命名空间）
- `db:post-attachment/get-attachment` - 附件操作
- `db-storage:set-item/get-item/remove-item` - 简化的存储接口
- `clipboard:*` - 剪贴板操作

**主程序渲染进程专用**：
- `get-apps` - 扫描系统应用（`appScanner.js`）
- `launch` - 启动应用或插件
- `import-plugin` - 导入 ZIP 插件
- `import-dev-plugin` - 添加开发插件
- `delete-plugin` - 删除插件 + 清理历史和固定列表
- `get-plugins` - 获取插件列表
- `ztools:db-put/db-get` - 直接操作 ZTOOLS 命名空间

**插件专用 API**（`src/main/api/plugin/`）：
- `plugin-lifecycle:*` - 生命周期事件（onPluginEnter、onPluginLeave）
- `plugin-ui:*` - UI 控制（setExpendHeight、hideWindow、setSubInput）
- `plugin-window:*` - 窗口管理（创建独立窗口、获取窗口列表）
- `plugin-dialog:*` - 对话框（showMessageBox、showOpenDialog）
- `plugin-clipboard:*` - 剪贴板扩展操作
- `plugin-input:*` - 输入模拟（sendInputEvent）
- `plugin-shell:*` - Shell 命令执行
- `plugin-feature:*` - 插件功能管理

**事件推送**（Main → Renderer）：
- `focus-search` - 显示搜索窗口
- `plugins-changed` - 插件列表变化（安装/删除后）
- `plugin-opened` / `plugin-closed` - 插件生命周期
- `window-info-changed` - 窗口信息更新
- `ipc-launch` - 通过全局快捷键启动插件

### 剪贴板系统

**原生模块**（`src/main/core/native/index.ts`）：

- 跨平台支持：macOS ✅ / Windows ✅
- 监听系统剪贴板变化（自动去重）
- 监听窗口激活事件（记录复制来源）
- 原生模块文件：
  - macOS: `resources/lib/mac/ztools_native.node`
  - Windows: `resources/lib/win/ztools_native.node`

**数据流**：

```
系统剪贴板变化 → 原生模块回调
    ↓
clipboardManager.handleClipboardChange()
    ↓
解析类型（优先级：文件 > 图片 > 文本）
    ↓
生成 ClipboardItem（含 hash、时间戳、来源应用）
    ↓
保存到 LMDB 附件存储 + 清理旧记录
    ↓
通知插件：pluginManager.sendPluginMessage('clipboard-change', item)
```

**图片处理规则**：

- 单张限制：10MB
- 总容量限制：500MB
- 超限时自动清理最旧图片
- 图片存储位置：`userData/clipboard/images/`

### 插件市场系统

**概述**：ZTools 提供内置的插件市场，用户可以在线浏览、安装、升级插件，无需手动下载和解压 ZIP 文件。

**技术架构**：

```
插件托管（蓝奏云）
    ↓
fetchPluginMarket() - 获取插件列表
    ↓
PluginMarket.vue - 展示插件卡片
    ↓
installPluginFromMarket() - 下载并安装插件
    ↓
自动解压到 userData/plugins/
    ↓
刷新插件列表 + 通知渲染进程
```

**关键实现**（`src/main/api/renderer/plugins.ts`）：

1. **获取插件市场列表**：
   ```typescript
   private async fetchPluginMarket(): Promise<any> {
     // 蓝奏云文件夹: https://ilt.lanzouu.com/b0pn75v9g
     // 密码: 5w87
     const fileList = await getLanzouFolderFileList(folderUrl, password)
     // 解析插件信息 JSON 文件
     // 返回插件列表（包含 name, version, downloadUrl 等）
   }
   ```

2. **从市场安装插件**：
   ```typescript
   private async installPluginFromMarket(plugin: any): Promise<any> {
     // 1. 获取蓝奏云真实下载链接
     const realDownloadUrl = await getLanzouDownloadLink(plugin.downloadUrl)

     // 2. 下载 ZIP 文件到临时目录
     await downloadFile(realDownloadUrl, tempZipPath)

     // 3. 解压到 userData/plugins/{pluginName}/
     const zip = new AdmZip(tempZipPath)
     zip.extractAllTo(targetDir, true)

     // 4. 验证 plugin.json 是否存在
     // 5. 加载插件并通知渲染进程
   }
   ```

3. **插件升级流程**（`PluginMarket.vue`）：
   ```typescript
   async function handleUpgradePlugin(plugin: Plugin) {
     // 1. 版本比较（compareVersions）
     if (localVersion >= marketVersion) return

     // 2. 确认升级
     // 3. 卸载旧版本：deletePlugin(plugin.path)
     // 4. 安装新版本：installPluginFromMarket(plugin)
     // 5. 刷新列表
   }
   ```

**前端展示**（`src/renderer/src/components/PluginMarket.vue`）：

- 网格布局展示插件卡片（2 列）
- 插件状态：
  - 未安装：显示下载按钮
  - 已安装（无更新）：显示"打开"按钮
  - 已安装（有更新）：显示"升级"按钮（橙色）
- 点击插件名称查看详情（PluginDetail.vue）

**工具函数**（`src/main/utils/`）：

- `lanzou.ts` - 蓝奏云 API 封装
  - `getLanzouFolderFileList()` - 获取文件夹列表
  - `getLanzouDownloadLink()` - 解析真实下载链接
- `download.ts` - 文件下载工具
  - `downloadFile()` - HTTP 下载到本地文件

### 应用内更新系统

**概述**：ZTools 支持应用内一键更新，无需用户手动下载安装包，提供类似 Chrome/VSCode 的自动更新体验。

**技术架构**：

```
更新源（蓝奏云）
    ↓
checkUpdate() - 检查更新版本
    ↓
显示更新提示（版本号、更新日志）
    ↓
startUpdate() - 下载更新包
    ↓
解压 app.asar + app.asar.unpacked
    ↓
启动独立 updater 程序
    ↓
应用退出
    ↓
updater 替换 app.asar 文件
    ↓
updater 重启应用
```

**关键实现**（`src/main/api/updater.ts`）：

1. **检查更新**：
   ```typescript
   private async checkUpdate(): Promise<any> {
     // 1. 获取蓝奏云文件夹列表（https://ilt.lanzouu.com/b0pn8htad，密码: 1f8i）
     const fileList = await getLanzouFolderFileList(updateCheckUrl, updateCheckPwd)

     // 2. 查找最新版本文件（格式：ztools_update_1.0.1.txt）
     const versionRegex = /ztools_update_(\d+(\.\d+)*)\.txt/

     // 3. 比较版本号（compareVersions）
     if (latestVersion <= currentVersion) {
       return { hasUpdate: false }
     }

     // 4. 下载并解析更新信息 JSON
     const updateInfo = JSON.parse(content)
     // 包含字段：version, downloadUrl, downloadUrlWin64, downloadUrlMacArm, changelog

     return { hasUpdate: true, updateInfo }
   }
   ```

2. **执行更新**：
   ```typescript
   private async startUpdate(updateInfo: any): Promise<any> {
     // 1. 根据平台选择下载链接
     let downloadUrl = updateInfo.downloadUrl
     if (isWin && updateInfo.downloadUrlWin64) {
       downloadUrl = updateInfo.downloadUrlWin64
     } else if (isMac && isArm64 && updateInfo.downloadUrlMacArm) {
       downloadUrl = updateInfo.downloadUrlMacArm
     }

     // 2. 获取真实下载链接
     const realDownloadUrl = await getLanzouDownloadLink(downloadUrl)

     // 3. 下载更新包到临时目录
     const tempZipPath = path.join(app.getPath('userData'), 'ztools-update-pkg', ...)
     await downloadFile(realDownloadUrl, tempZipPath)

     // 4. 解压更新包
     const zip = new AdmZip(tempZipPath)
     zip.extractAllToAsync(extractPath, ...)

     // 5. 重命名 app.asar.tmp -> app.asar
     // （打包时为了避免被识别为 asar 导致解压问题）

     // 6. 准备 updater 参数
     const args = [
       '--asar-src', asarSrc,           // 新的 app.asar 路径
       '--asar-dst', asarDst,           // 应用的 app.asar 路径
       '--app', appPath,                // 应用可执行文件路径
       '--unpacked-src', unpackedSrc,   // 新的 app.asar.unpacked 路径
       '--unpacked-dst', unpackedDst    // 应用的 app.asar.unpacked 路径
     ]

     // 7. 启动 updater（detached 模式）
     const subprocess = spawn(updaterPath, args, { detached: true, stdio: 'ignore' })
     subprocess.unref()

     // 8. 退出应用
     app.quit()
   }
   ```

**Updater 程序**：

- 独立的可执行文件（非 Node.js，避免依赖主应用）
- macOS: `ztools-updater`（位于 `Contents/MacOS/`）
- Windows: `ztools-updater.exe`（位于应用根目录）
- 职责：
  1. 等待主应用完全退出
  2. 复制新的 `app.asar` 和 `app.asar.unpacked` 到应用目录
  3. 重启应用
  4. 清理临时文件

**平台差异**：

- **macOS**：
  - app.asar 位置：`Contents/Resources/app.asar`
  - updater 位置：`Contents/MacOS/ztools-updater`
  - 应用路径：`Contents/MacOS/zTools`

- **Windows**：
  - app.asar 位置：`resources/app.asar`
  - updater 位置：应用根目录 `ztools-updater.exe`
  - 应用路径：`zTools.exe`

**更新信息文件格式**（`ztools_update_x.x.x.txt`）：

```json
{
  "version": "1.0.9",
  "downloadUrl": "https://ilt.lanzouu.com/...",      // 通用下载链接
  "downloadUrlWin64": "https://ilt.lanzouu.com/...", // Windows x64 专用
  "downloadUrlMacArm": "https://ilt.lanzouu.com/...",// macOS Apple Silicon 专用
  "changelog": [
    "修复 Bug A",
    "新增功能 B",
    "优化性能 C"
  ]
}
```

**前端展示**（`src/renderer/src/components/Settings.vue`）：

- 显示当前版本号
- "检查更新"按钮
- 发现更新时显示：
  - 新版本号
  - 更新日志
  - "立即更新"按钮
- 更新进度提示（下载中、安装中）

## 关键代码路径

### 修改插件系统

- `src/main/pluginManager.ts` - BrowserView/BrowserWindow 创建和管理
- `src/main/api/renderer/plugins.ts` - 插件安装/删除逻辑
- `src/main/api/plugin/` - 插件可用的所有 API 实现
- `resources/preload.js` - 插件可用的 API（注入到插件上下文）

### 修改 UI 组件和样式

- `src/renderer/src/style.css` - 全局样式和通用控件类（按钮、输入框、开关、卡片等）
- `src/renderer/src/components/` - Vue 组件（应优先使用通用控件类）
- 参考"UI 组件开发（控件样式系统）"章节了解可用的控件类

### 修改搜索逻辑

- `src/renderer/src/stores/appDataStore.ts` - 搜索引擎和数据加载
- `src/renderer/src/components/SearchResults.vue` - 搜索结果展示和键盘导航

### 修改数据持久化

- `src/main/core/lmdb/index.ts` - LMDB Database 类（主入口）
- `src/main/core/lmdb/lmdbInstance.ts` - 单例实例
- `src/main/core/lmdb/syncApi.ts` - 同步 API 实现
- `src/main/core/lmdb/promiseApi.ts` - Promise API 实现
- `src/main/api/shared/database.ts` - IPC 数据库 API（命名空间隔离）

### 修改剪贴板功能

- `src/main/clipboardManager.ts` - 剪贴板监听和历史管理
- `src/main/core/native/index.ts` - 跨平台原生模块接口
- `resources/lib/mac/ztools_native.node` - macOS 原生模块（C++ 编写）
- `resources/lib/win/ztools_native.node` - Windows 原生模块（C++ 编写）

### 修改 IPC 通信

- `src/main/api/index.ts` - API 管理器（统一初始化所有模块）
- `src/main/api/shared/` - 共享 API 模块
- `src/main/api/renderer/` - 主程序 API 模块
- `src/main/api/plugin/` - 插件 API 模块

### 修改插件市场功能

- `src/main/api/renderer/plugins.ts` - 插件市场 API 实现
  - `fetchPluginMarket()` - 获取插件市场列表
  - `installPluginFromMarket()` - 从市场安装插件
- `src/renderer/src/components/PluginMarket.vue` - 插件市场 UI 界面
  - 插件列表展示（网格布局）
  - 插件状态管理（未安装/已安装/可升级）
  - 插件升级流程（`handleUpgradePlugin()`）
- `src/renderer/src/components/PluginDetail.vue` - 插件详情弹窗
- `src/main/utils/lanzou.ts` - 蓝奏云 API 工具
  - `getLanzouFolderFileList()` - 获取蓝奏云文件夹列表
  - `getLanzouDownloadLink()` - 解析真实下载链接
- `src/main/utils/download.ts` - 文件下载工具
  - `downloadFile()` - HTTP 下载到本地文件

### 修改应用内更新功能

- `src/main/api/updater.ts` - 应用更新 API 实现
  - `checkUpdate()` - 检查更新
  - `startUpdate()` - 执行更新流程
- `src/renderer/src/components/Settings.vue` - 设置界面（包含更新检查）
- `src/updater/` - 独立更新程序源码（如果有）
  - `mac-arm64/ztools-updater` - macOS 更新程序
  - `win-x64/ztools-updater.exe` - Windows 更新程序
- `resources/` - 打包后的更新程序位置
  - macOS: 复制到 `Contents/MacOS/ztools-updater`
  - Windows: 复制到应用根目录 `ztools-updater.exe`

## 常见任务指南

### 添加新的 IPC 接口

#### 主程序渲染进程 API（推荐）

在 `src/main/api/{shared|renderer}/xxx.ts` 中添加 handler：

```typescript
// 例如：在 src/main/api/renderer/apps.ts 中添加新功能
import { ipcMain } from 'electron'

export class AppsAPI {
  private mainWindow: Electron.BrowserWindow | null = null

  public init(mainWindow: Electron.BrowserWindow, pluginManager: any): void {
    this.mainWindow = mainWindow
    this.setupIPC()
  }

  private setupIPC(): void {
    ipcMain.handle('my-new-feature', async (_event, param) => {
      // 实现逻辑
      return { success: true, data: result }
    })
  }
}
```

在 `src/preload/index.ts` 中暴露给主程序渲染进程：

```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('ztools', {
  // ... 其他 API
  myNewFeature: (param) => ipcRenderer.invoke('my-new-feature', param)
})
```

在 `src/renderer/src/env.d.ts` 中添加类型定义：

```typescript
interface Window {
  ztools: {
    // ... 其他 API
    myNewFeature: (param: string) => Promise<{ success: boolean; data?: any }>
  }
}
```

#### 插件 API（专用）

在 `src/main/api/plugin/xxx.ts` 中添加插件专用功能：

```typescript
// 例如：在 src/main/api/plugin/ui.ts 中添加新功能
import { ipcMain } from 'electron'

export class PluginUIAPI {
  private pluginManager: any = null

  public init(mainWindow: Electron.BrowserWindow, pluginManager: any): void {
    this.pluginManager = pluginManager
    this.setupIPC()
  }

  private setupIPC(): void {
    ipcMain.handle('plugin:my-feature', async (event, param) => {
      // 获取调用插件的信息
      const pluginInfo = this.pluginManager.getPluginInfoByWebContents(event.sender)

      // 实现插件专用逻辑
      return { success: true, data: result }
    })
  }
}
```

在 `resources/preload.js` 中暴露给插件（**注意：不经过 Vite 构建**）：

```javascript
// resources/preload.js
const electron = require('electron')

// 暴露到 window.ztools
window.ztools = {
  // ... 其他 API
  myFeature: (param) => {
    return electron.ipcRenderer.invoke('plugin:my-feature', param)
  }
}
```

**重要提示**：

- `resources/preload.js` 修改后需要**重启应用**才能生效
- 插件 API 的 IPC 通道名建议加 `plugin:` 前缀，便于区分
- 插件 API 应该考虑数据隔离和安全性
- 不需要修改 `plugin-types.d.ts`，插件自己会定义类型

#### 创建新模块（功能较复杂时）

1. 创建 `src/main/api/{category}/newModule.ts`：

```typescript
import { ipcMain } from 'electron'

export class NewModuleAPI {
  private mainWindow: Electron.BrowserWindow | null = null

  public init(mainWindow: Electron.BrowserWindow): void {
    this.mainWindow = mainWindow
    this.setupIPC()
  }

  private setupIPC(): void {
    // 注册 IPC handlers
  }
}

export default new NewModuleAPI()
```

2. 在 `src/main/api/index.ts` 中导入并初始化：

```typescript
import newModuleAPI from './category/newModule.js'

class APIManager {
  public init(mainWindow: BrowserWindow, pluginManager: any): void {
    // ... 其他模块初始化
    newModuleAPI.init(mainWindow)
  }
}
```

### 添加新的 Pinia Store

1. 创建 `src/renderer/src/stores/xxxStore.ts`
2. 使用 `defineStore` 定义状态和方法
3. 在 `App.vue` 或组件中导入使用

### 修改插件 API

插件可用的 API 定义在 `resources/preload.js`（**不经过 Vite 构建**）：

- 修改后需要重启应用才能生效
- 无界面插件开发指南已整合到本文档的"开发无界面插件"章节

### UI 组件开发（控件样式系统）

项目在 `src/renderer/src/style.css` 中定义了一套完整的通用控件样式类，遵循以下设计原则：

1. **默认低调**：所有控件默认使用中性色（`--control-bg` 和 `--control-border`）
2. **悬浮高亮**：鼠标悬浮时显示对应的主题色反馈
3. **类型区分**：根据操作类型使用不同的颜色语义
4. **一致性**：所有控件遵循相同的视觉语言和交互模式

#### 可用的控件类

**1. 按钮 `.btn`**

```vue
<!-- 基础用法 -->
<button class="btn">默认按钮</button>

<!-- 尺寸变体 -->
<button class="btn btn-sm">小按钮</button>    <!-- padding: 4px 12px, font-size: 12px -->
<button class="btn btn-md">中按钮</button>    <!-- padding: 6px 14px, font-size: 13px -->
<button class="btn btn-lg">大按钮</button>    <!-- padding: 10px 20px, font-size: 15px -->

<!-- 类型变体（悬浮时显示对应颜色）-->
<button class="btn btn-primary">主要操作</button>   <!-- 蓝色/主题色 -->
<button class="btn btn-danger">删除操作</button>    <!-- 红色 -->
<button class="btn btn-warning">警告操作</button>   <!-- 黄色 -->
<button class="btn btn-success">成功操作</button>   <!-- 绿色 -->
<button class="btn btn-purple">特殊操作</button>    <!-- 紫色 -->

<!-- 实心按钮（默认就显示主题色背景）-->
<button class="btn btn-solid">确认</button>

<!-- 组合使用 -->
<button class="btn btn-sm btn-danger">删除</button>
<button class="btn btn-lg btn-solid">确认</button>
```

**图标按钮变体**：

项目提供两种图标按钮样式，适用于不同场景：

**`.btn-icon`** - 32x32 有边框图标按钮
```vue
<button class="btn btn-icon" title="重置">
  <svg width="20" height="20">...</svg>
</button>
```
- 尺寸：32x32px
- 样式：有边框、有背景色
- 用途：通用设置、详情页等需要明显按钮的场景
- 图标建议尺寸：18-20px

**`.icon-btn`** - 28x28 透明背景图标按钮
```vue
<button class="icon-btn open-btn" title="打开">
  <svg width="14" height="14">...</svg>
</button>
```
- 尺寸：28x28px
- 样式：无边框、透明背景（悬浮时显示背景）
- 用途：列表操作、插件市场等紧凑场景
- 图标建议尺寸：14px
- 需要自定义颜色样式（如 `.open-btn`、`.download-btn`）

**2. 输入框 `.input`**

```vue
<input type="text" class="input" placeholder="请输入..." />
```

状态：
- 默认：中性色背景和边框
- 悬浮：`--hover-bg` 背景
- 聚焦：`--primary-color` 边框 + `--primary-light-bg` 背景

**3. 下拉框 `.select`**

```vue
<select class="select">
  <option value="1">选项1</option>
  <option value="2">选项2</option>
</select>
```

特性：自动适配亮色/暗色主题，悬浮和聚焦时显示主题色

**4. 开关 `.toggle`**

```vue
<label class="toggle">
  <input type="checkbox" v-model="enabled" />
  <span class="toggle-slider"></span>
</label>
```

特性：悬浮时 handle 会放大 1.15 倍，激活时显示主题色，平滑动画过渡

**5. 卡片 `.card`**

```vue
<div class="card">卡片内容</div>
<div class="card clickable">可点击的卡片</div>
```

修饰符：`.clickable` - 添加指针光标和点击效果

#### 开发步骤

**1. 优先使用通用类**

直接使用已定义的类，无需编写自定义样式：

```vue
<template>
  <button class="btn btn-primary">提交</button>
  <input type="text" class="input" placeholder="用户名" />
  <label class="toggle">
    <input type="checkbox" v-model="autoSave" />
    <span class="toggle-slider"></span>
  </label>
</template>
```

**2. 需要自定义时**

在组件内添加 scoped 样式：

```vue
<template>
  <button class="btn my-special-btn">特殊按钮</button>
</template>

<style scoped>
.my-special-btn {
  /* 在通用样式基础上添加自定义样式 */
  min-width: 120px;
}
</style>
```

**3. 扩展通用类**

如果新样式有通用性，添加到 `src/renderer/src/style.css`：

```css
/* 在 style.css 中添加 */
.btn-icon {
  padding: 8px;
  min-width: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

#### CSS 变量参考

**控件相关**：
- `--control-bg` - 控件默认背景色
- `--control-border` - 控件默认边框色
- `--hover-bg` - 悬浮时的背景色
- `--primary-light-bg` - 主题色浅背景（聚焦/激活状态）

**主题色**：
- `--primary-color` - 当前主题色（可动态切换）
- `--primary-hover` - 主题色悬浮态（自动计算）
- `--danger-color` / `--warning-color` / `--success-color` / `--purple-color`

**浅背景色**（用于按钮悬浮）：
- `--primary-light-bg` / `--danger-light-bg` / `--warning-light-bg` / `--success-light-bg` / `--purple-light-bg`

**文本和其他**：
- `--text-color` - 主要文本颜色
- `--text-secondary` - 次要文本颜色
- `--text-on-primary` - 主题色上的文本颜色（白色）
- `--card-bg` - 卡片背景色
- `--divider-color` - 分割线颜色

**重要提醒**：
- 不要在组件中重复定义控件样式，应该使用通用类
- 保持一致性，所有新增控件应遵循相同的视觉和交互模式
- 所有控件自动适配亮色/暗色主题
- 确保控件有清晰的悬浮、聚焦、禁用状态

### 开发无界面插件

无界面插件使用 **WebContentsView 加载空白页面** 方案实现，与 UI 插件共享相同的架构和 API。

#### 适用场景

- 后台定时任务（例如：番茄钟、提醒器）
- 数据处理和转换（例如：剪贴板增强、文本转换）
- 系统监控（例如：网络状态、电池监控）
- 纯命令行工具（例如：计算器、单位转换）

#### 快速开始

1. 创建 `plugin.json`（**不包含** `main` 字段）：

```json
{
  "name": "my-headless-plugin",
  "description": "我的后台插件",
  "features": [
    {
      "code": "main",
      "explain": "主功能",
      "cmds": ["触发词"]
    }
  ]
}
```

2. 创建入口脚本（支持 `index.js` 或 `dist/index.html` 等）：

```javascript
// 导出功能对象到 window.exports
window.exports = {
  main: {
    mode: 'none', // 'none' 表示无界面插件
    args: {
      // enter 方法会被主进程调用
      enter: async (action) => {
        console.log('无界面插件被调用:', action)

        // 执行后台任务
        window.ztools.showNotification('任务已完成')

        // 可以返回结果给主进程
        return { success: true, data: '处理完成' }
      }
    }
  }
}
```

#### 技术实现细节

- 判断 `plugin.json` 中没有 `main` 字段
- 创建 WebContentsView（和 UI 插件一样）
- 加载空白 HTML 页面（`file:///hideWindow.html`）
- 通过 `session.registerPreloadScript()` 注入 `resources/preload.js`
- 主进程通过 IPC `call-plugin-method` 调用插件的 `enter()` 方法
- 支持 Promise 返回结果（30秒超时）

#### 用户交互方式

由于没有 UI 界面，无界面插件通过以下方式与用户交互：

1. **系统通知**：使用 `window.ztools.showNotification()` 反馈结果
2. **剪贴板**：将结果写入剪贴板
3. **模拟按键**：使用 `sendInputEvent()` 模拟操作
4. **返回值**：通过 `return` 语句返回结果给主进程

#### 完整示例

```javascript
// 倒计时定时器插件
window.exports = {
  timer: {
    mode: 'none',
    args: {
      enter: async (action) => {
        const match = action.payload?.match(/(\d+)/)
        if (!match) {
          window.ztools.showNotification('❌ 请输入正确的时间格式，例如：timer 5')
          return { success: false, error: '参数错误' }
        }

        const minutes = parseInt(match[1])
        window.ztools.showNotification(`⏰ 定时器已启动：${minutes} 分钟`)

        setTimeout(() => {
          window.ztools.showNotification('⏰ 时间到！')
        }, minutes * 60 * 1000)

        // 可选：保存到数据库
        const timers = (await window.ztools.db.get('active-timers')) || []
        timers.push({ minutes, startTime: Date.now() })
        await window.ztools.db.put({ _id: 'active-timers', data: timers })

        return { success: true, minutes }
      }
    }
  }
}
```

#### 生命周期

1. **加载**：用户首次触发插件时，系统创建 WebContentsView 并加载空白页面
2. **运行**：插件脚本执行，导出 `window.exports` 对象
3. **触发**：用户输入匹配时，主进程通过 IPC 调用 `enter()` 方法
4. **常驻**：WebContentsView 保持在缓存中，随时响应后续调用
5. **卸载**：应用关闭或手动终止插件时销毁视图

#### 性能考虑

- 每个无界面插件占用一个 WebContentsView（约 50-100MB 内存）
- 建议将频繁使用的功能写成无界面插件
- 偶尔使用的功能可以做成 UI 插件，用完即关

## 注意事项

### 类型安全

- 主进程和 preload 的类型检查是分开的（`npm run typecheck:node`）
- 渲染进程类型检查（`npm run typecheck:web`）
- `env.d.ts` 需要与 `preload/index.ts` 保持同步
- **禁止使用 `any` 类型**，优先使用具体类型或泛型

### UI 开发规范

- **优先使用通用控件类**（`.btn`、`.input`、`.select`、`.toggle`、`.card`、`.btn-icon`、`.icon-btn`）
- **图标按钮选择**：详情页/设置页用 `.btn-icon`（32x32），列表/紧凑场景用 `.icon-btn`（28x28）
- 不要在组件中重复定义控件样式
- 保持视觉和交互的一致性
- 所有控件自动适配亮色/暗色主题
- 使用简洁的语法（可选链操作符 `?.` 而非繁琐的 `if` 判断）

### 插件缓存管理

- UI 插件的 WebContentsView 都缓存在 `pluginViews` 数组
- 无界面插件同样使用 WebContentsView 缓存
- 长时间运行可能导致内存占用高（每个插件约 50-100MB）
- 考虑添加 LRU 清理策略或手动清理接口

### 跨平台支持

**已支持平台**：macOS、Windows

**原生模块架构**（`src/main/core/native/index.ts`）：

- 根据平台自动加载对应的原生模块：
  - macOS: `resources/lib/mac/ztools_native.node`
  - Windows: `resources/lib/win/ztools_native.node`
- 提供跨平台的统一接口：
  - `ClipboardMonitor` - 剪贴板监听（macOS ✅ / Windows ✅）
  - `WindowMonitor` - 窗口切换监听（macOS ✅ / Windows ✅）
  - `WindowManager` - 窗口管理和模拟粘贴（macOS ✅ / Windows ✅）
  - `ScreenCapture` - 区域截图（macOS ❌ / Windows ✅）

**应用扫描**（`src/main/core/appScanner/`）：

- macOS: 扫描 `.app` 文件（通过 plist 获取元数据）
- Windows: 扫描 `.lnk` 快捷方式和开始菜单

**平台特定限制**：

- **macOS**：
  - 区域截图功能暂不支持
  - 窗口标识符：`bundleId` (string)

- **Windows**：
  - 窗口标识符：`processId` (number)
  - 区域截图已支持

- **Linux**：暂不支持（需要实现 `linuxScanner.ts` 和对应的原生模块）

### 数据库操作

- 所有数据库调用都应该包含错误处理
- 插件数据自动隔离（通过 `PLUGIN/{pluginName}/` 前缀）
- 插件删除时需要同步清理历史记录和固定列表（已实现，参考 `clear-plugin-data` IPC）
- 图片和剪贴板数据有容量限制，需要定期清理
- LMDB 文档和附件都有大小限制（文档 1MB，附件 10MB）
- 插件调用数据库 API 时，系统会自动识别调用来源并添加前缀（通过 `getPluginPrefix()` 方法）

### 搜索性能

- `getApps()` 每次都扫描系统应用，考虑缓存 + 增量更新
- Fuse.js 搜索阈值设置为 0
- 正则匹配需要检查 `minLength`，避免短查询性能问题

## 架构设计原则

1. **职责分离**：主进程负责系统交互，渲染进程负责 UI，preload 负责安全隔离
2. **数据单向流动**：Store → Component，通过事件或 action 修改 Store
3. **插件隔离**：
   - UI 通过 WebContentsView 隔离
   - 数据通过命名空间前缀隔离（`PLUGIN/{pluginName}/`）
   - API 通过 preload 脚本限制访问权限
4. **性能优先**：
   - 搜索结果缓存在 Store
   - 插件 WebContentsView 复用
   - LMDB 提供高性能键值存储（比 PouchDB 快 3-5 倍）
5. **容错设计**：IPC 调用、数据库操作、插件加载都应该有错误处理

## 重要技术决策

### 为什么从 PouchDB 迁移到 LMDB？

- **性能**：LMDB 读写速度比 PouchDB 快 3-5 倍，内存占用降低 60%
- **简单性**：不需要云同步功能，本地键值存储足够
- **稳定性**：LMDB 是经过验证的嵌入式数据库（被 OpenLDAP 等项目使用）
- **API 兼容性**：保留了 UTools 风格的 API，插件迁移成本低

### 为什么支持无界面插件？

- **资源效率**：不需要 UI 的功能（如定时器、剪贴板监听）不应该占用渲染资源
- **开发体验**：复用完整的插件 API，开发者无需学习新接口
- **灵活性**：插件可以轻松在 UI 和无界面之间切换

### 为什么模块化 API？

- **可维护性**：按功能分类比单一文件更清晰（原来超过 1000 行）
- **权限隔离**：清晰区分主程序和插件可用的 API
- **扩展性**：新增功能只需添加新模块，不影响现有代码

### 为什么使用 WebContentsView？

- **统一架构**：UI 插件和无界面插件使用相同的容器机制
- **资源管理**：更好的生命周期控制和内存管理
- **官方推荐**：Electron 38+ 推荐使用 WebContentsView 替代 BrowserView
