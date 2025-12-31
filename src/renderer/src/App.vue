<template>
  <div class="app-container">
    <div class="search-window">
      <div :class="['search-box-wrapper', { 'with-divider': currentView === ViewMode.Plugin }]">
        <SearchBox
          ref="searchBoxRef"
          v-model="searchQuery"
          v-model:pasted-image="pastedImageData"
          v-model:pasted-files="pastedFilesData"
          v-model:pasted-text="pastedTextData"
          :current-view="currentView"
          @composing="handleComposing"
          @arrow-keydown="handleArrowKeydown"
        />
      </div>

      <!-- 搜索结果组件 -->
      <SearchResults
        v-if="currentView === ViewMode.Search"
        ref="searchResultsRef"
        :search-query="searchQuery"
        :pasted-image="pastedImageData"
        :pasted-files="pastedFilesData"
        :pasted-text="pastedTextData"
        @height-changed="updateWindowHeight"
        @focus-input="handleFocusInput"
        @restore-match="handleRestoreMatch"
      />

      <!-- 插件占位区域 -->
      <div v-if="currentView === ViewMode.Plugin" class="plugin-placeholder">
        <!-- 插件内容由 BrowserView 渲染，这里只是占位 -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import SearchBox from './components/search/SearchBox.vue'
import SearchResults from './components/search/SearchResults.vue'
import { useCommandDataStore } from './stores/commandDataStore'
import { useWindowStore } from './stores/windowStore'

// FileItem 接口（从剪贴板管理器返回的格式）
interface FileItem {
  path: string
  name: string
  isDirectory: boolean
}

enum ViewMode {
  Search = 'search',
  Plugin = 'plugin'
}

const windowStore = useWindowStore()
const commandDataStore = useCommandDataStore()

const searchQuery = ref('')
const isComposing = ref(false)
const currentView = ref<ViewMode>(ViewMode.Search)
const searchBoxRef = ref<{ focus: () => void; selectAll: () => void } | null>(null)
const searchResultsRef = ref<{
  handleKeydown: (e: KeyboardEvent) => void
  resetSelection: () => void
  resetCollapseState: () => void
} | null>(null)
// 粘贴的图片数据
const pastedImageData = ref<string | null>(null)
// 粘贴的文件数据
const pastedFilesData = ref<FileItem[] | null>(null)
// 粘贴的文本数据
const pastedTextData = ref<string | null>(null)

// 监听搜索框输入变化
watch(searchQuery, (newValue) => {
  // 如果在插件模式下,通知主进程,由主进程转发给插件（同时更新缓存）
  if (currentView.value === ViewMode.Plugin && windowStore.currentPlugin) {
    window.ztools.notifySubInputChange(newValue)
  }
  // 不再在输入时清除粘贴内容，允许文字和粘贴内容共存
})

// 监听粘贴图片数据变化
watch(pastedImageData, (newValue) => {
  // 粘贴图片时清空其他粘贴内容（但保留搜索框文本，用于搜索指令）
  if (newValue) {
    pastedFilesData.value = null
    pastedTextData.value = null
  }
})

// 监听粘贴文件数据变化
watch(pastedFilesData, (newValue) => {
  // 粘贴文件时清空其他粘贴内容（但保留搜索框文本，用于搜索指令）
  if (newValue) {
    pastedImageData.value = null
    pastedTextData.value = null
  }
})

// 监听粘贴文本数据变化
watch(pastedTextData, (newValue) => {
  // 粘贴文本时清空其他粘贴内容（但保留搜索框文本，用于搜索指令）
  if (newValue) {
    pastedImageData.value = null
    pastedFilesData.value = null
  }
})

// 动态调整窗口高度
function updateWindowHeight(): Promise<void> {
  return nextTick(() => {
    const container = document.querySelector('.app-container')
    if (container) {
      const height = container.scrollHeight
      window.ztools.resizeWindow(height + 1)
    }
  })
}

// 聚焦输入框（由 SearchResults 组件 emit）
function handleFocusInput(): void {
  searchBoxRef.value?.focus()
}

// 恢复上次匹配状态
function handleRestoreMatch(state: any): void {
  console.log('恢复上次匹配状态:', state)
  // 恢复输入框状态
  searchQuery.value = state.searchQuery || ''
  pastedImageData.value = state.pastedImage || null
  pastedFilesData.value = state.pastedFiles || null
  pastedTextData.value = state.pastedText || null
  // 聚焦输入框
  nextTick(() => {
    searchBoxRef.value?.focus()
  })
}

// 处理输入法组合状态
function handleComposing(composing: boolean): void {
  isComposing.value = composing
}

// 将浏览器 KeyboardEvent 转换为 Electron KeyboardInputEvent 格式
function convertToElectronKeyboardEvent(
  direction: 'left' | 'right' | 'up' | 'down',
  type: 'keyDown' | 'keyUp' = 'keyDown'
): {
  type: 'keyDown' | 'keyUp'
  keyCode: string
} {
  // 映射方向键的 keyCode
  const keyCodeMap: Record<string, string> = {
    left: 'Left',
    right: 'Right',
    up: 'Up',
    down: 'Down'
  }

  return {
    type,
    keyCode: keyCodeMap[direction]
  }
}

// 处理方向键事件
async function handleArrowKeydown(
  event: KeyboardEvent,
  direction: 'left' | 'right' | 'up' | 'down'
): Promise<void> {
  // 只在插件模式下转发方向键事件
  if (currentView.value !== ViewMode.Plugin || !windowStore.currentPlugin) {
    return
  }

  // 只有上下方向键阻止默认行为，左右方向键允许在搜索框中移动光标
  if (direction === 'up' || direction === 'down') {
    event.preventDefault()
    event.stopPropagation()
  }

  // 转换为 Electron 格式
  const keyDownEvent = convertToElectronKeyboardEvent(direction, 'keyDown')
  const keyUpEvent = convertToElectronKeyboardEvent(direction, 'keyUp')

  // 发送给主进程：先发送 keyDown，再发送 keyUp
  try {
    await window.ztools.sendInputEvent(keyDownEvent)
    // 短暂延迟后发送 keyUp，模拟真实的按键行为
    await new Promise((resolve) => setTimeout(resolve, 10))
    await window.ztools.sendInputEvent(keyUpEvent)
  } catch (error) {
    console.error('发送方向键事件失败:', error)
  }
}

// 分离当前插件到独立窗口
async function detachCurrentPlugin(): Promise<void> {
  try {
    const result = await window.ztools.detachPlugin()
    if (!result.success) {
      console.error('分离插件失败:', result.error)
    }
  } catch (error: any) {
    console.error('分离插件失败:', error)
  }
}

// 应用亚克力背景色叠加效果
function applyAcrylicOverlay(): void {
  // 移除旧的样式
  const existingStyle = document.getElementById('acrylic-overlay-style')
  if (existingStyle) {
    existingStyle.remove()
  }

  // 获取当前窗口材质
  const material = document.documentElement.getAttribute('data-material')

  // 只在亚克力材质时添加样式
  if (material === 'acrylic') {
    const style = document.createElement('style')
    style.id = 'acrylic-overlay-style'
    style.textContent = `
      body::after {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: -1;
      }

      /* 明亮模式 */
      @media (prefers-color-scheme: light) {
        body::after {
          background: rgb(255 255 255 / ${windowStore.acrylicLightOpacity}%);
        }
      }

      /* 暗黑模式 */
      @media (prefers-color-scheme: dark) {
        body::after {
          background: rgb(0 0 0 / ${windowStore.acrylicDarkOpacity}%);
        }
      }
    `
    document.head.appendChild(style)
  }
}

// 监听视图变化，调整窗口高度
watch(currentView, (newView) => {
  if (newView === ViewMode.Plugin) {
    return
  }

  updateWindowHeight()
})

//键盘操作
function handleKeydown(event: KeyboardEvent): void {
  // 如果正在输入法组合中,忽略所有键盘事件
  if (isComposing.value) {
    return
  }

  // Cmd/Ctrl + D: 分离插件到独立窗口
  if ((event.key === 'd' || event.key === 'D') && (event.metaKey || event.ctrlKey)) {
    console.log('检测到 Cmd+D 快捷键，当前视图:', currentView.value)
    event.preventDefault()
    if (currentView.value === ViewMode.Plugin && windowStore.currentPlugin) {
      console.log('正在分离插件...')
      detachCurrentPlugin()
    }
    return
  }

  // Escape 键特殊处理
  if (event.key === 'Escape') {
    event.preventDefault()

    if (currentView.value === ViewMode.Plugin) {
      // 插件页面 ESC 键处理 - 分步清除
      if (searchQuery.value.trim()) {
        // 第一步：清除输入框
        searchQuery.value = ''
      } else if (pastedImageData.value || pastedFilesData.value || pastedTextData.value) {
        // 第二步：清除粘贴内容
        pastedImageData.value = null
        pastedFilesData.value = null
        pastedTextData.value = null
      } else {
        // 第三步：退出插件返回搜索
        currentView.value = ViewMode.Search
        window.ztools.hidePlugin()
      }
      return
    }

    // 搜索页面 - 分步清除
    if (searchQuery.value.trim()) {
      // 第一步：清除输入框
      searchQuery.value = ''
    } else if (pastedImageData.value || pastedFilesData.value || pastedTextData.value) {
      // 第二步：清除粘贴内容
      pastedImageData.value = null
      pastedFilesData.value = null
      pastedTextData.value = null
    } else {
      // 第三步：关闭窗口
      window.ztools.hideWindow()
    }
    return
  }

  // 如果不在搜索页面,不处理键盘导航
  if (currentView.value !== ViewMode.Search) {
    return
  }

  // 其他键盘事件委托给 SearchResults 组件处理
  searchResultsRef.value?.handleKeydown(event)
}

// 初始化
onMounted(async () => {
  // 从 store 加载设置和应用数据
  await Promise.all([
    windowStore.loadSettings(),
    commandDataStore.initializeData() // 初始化应用历史记录和固定列表
  ])

  // 初始调整窗口高度
  updateWindowHeight()

  // 监听窗口显示事件,聚焦搜索框
  window.ztools.onFocusSearch(async () => {
    if (currentView.value === ViewMode.Plugin) {
      return
    }

    // 根据自动清空配置决定是否清空搜索框（会自动记录时间）
    const shouldClear = windowStore.shouldClearSearch()

    if (shouldClear) {
      searchQuery.value = ''
      pastedImageData.value = null // 清除粘贴的图片
      pastedFilesData.value = null // 清除粘贴的文件
      pastedTextData.value = null // 清除粘贴的文本
    }

    searchResultsRef.value?.resetSelection()
    // 重置所有列表的折叠状态
    searchResultsRef.value?.resetCollapseState()

    // 隐藏插件视图
    window.ztools.hidePlugin()

    // 聚焦输入框
    nextTick(() => {
      searchBoxRef.value?.focus()
      // 如果没有清空搜索框，选中所有文本，方便用户直接输入覆盖
      if (!shouldClear && searchQuery.value) {
        searchBoxRef.value?.selectAll()
      }
    })

    // 检查是否需要自动粘贴
    const timeLimit = windowStore.getAutoPasteTimeLimit()
    if (timeLimit > 0) {
      try {
        const copiedContent = await window.ztools.getLastCopiedContent(timeLimit)
        if (copiedContent) {
          if (copiedContent.type === 'image') {
            // 自动粘贴图片
            pastedImageData.value = copiedContent.data as string
            console.log('自动粘贴图片')
          } else if (copiedContent.type === 'text') {
            // 自动粘贴文本到粘贴文本区域
            pastedTextData.value = copiedContent.data as string
            console.log('自动粘贴文本:', copiedContent.data)
          } else if (copiedContent.type === 'file') {
            // 自动粘贴文件
            pastedFilesData.value = copiedContent.data as FileItem[]
            console.log('自动粘贴文件:', copiedContent.data)
          }
        }
      } catch (error) {
        console.error('自动粘贴失败:', error)
      }
    }

    updateWindowHeight()
  })

  // 监听窗口信息变化事件
  window.ztools.onWindowInfoChanged(
    (windowInfo: { appName: string; bundleId: string; timestamp: number }) => {
      // 更新 store 中的窗口信息
      windowStore.updateWindowInfo(windowInfo)
    }
  )

  // 监听插件按 ESC 返回搜索页面事件
  console.log('监听返回搜索页面事件')
  window.ztools.onBackToSearch(() => {
    console.log('收到返回搜索页面事件')
    // 切换到搜索视图
    currentView.value = ViewMode.Search
    // 清空搜索框
    searchQuery.value = ''
    // 清空当前插件信息
    windowStore.updateCurrentPlugin(null)
    windowStore.setPluginLoading(false)
    // 等待 DOM 更新后调整窗口高度并聚焦搜索框
    nextTick(() => {
      updateWindowHeight()
      searchBoxRef.value?.focus()
    })
  })

  // 监听插件打开事件
  window.ztools.onPluginOpened((plugin) => {
    console.log('插件已打开:', plugin)
    windowStore.updateCurrentPlugin(plugin)
    windowStore.setPluginLoading(true)
    // 清除所有粘贴内容
    pastedImageData.value = null
    pastedFilesData.value = null
    pastedTextData.value = null
  })

  // 监听插件加载完成事件
  window.ztools.onPluginLoaded((plugin) => {
    console.log('插件页面加载完成:', plugin)
    windowStore.setPluginLoading(false)
  })

  // 监听插件关闭事件
  window.ztools.onPluginClosed(() => {
    console.log('插件已关闭')
    windowStore.updateCurrentPlugin(null)
    windowStore.setPluginLoading(false)
  })

  // 监听子输入框 placeholder 更新事件
  console.log(
    'onUpdateSubInputPlaceholder 方法存在?',
    typeof window.ztools.onUpdateSubInputPlaceholder
  )
  window.ztools.onUpdateSubInputPlaceholder?.(
    (data: { pluginPath: string; placeholder: string }) => {
      console.log('收到更新子输入框 placeholder 事件:', data)
      windowStore.updateSubInputPlaceholder(data.placeholder)
    }
  )

  // 监听设置子输入框值事件
  window.ztools.onSetSubInputValue((text: string) => {
    console.log('收到设置子输入框值事件:', text)
    searchQuery.value = text
  })

  // 监听聚焦子输入框事件
  window.ztools.onFocusSubInput(() => {
    console.log('收到聚焦子输入框事件')
    nextTick(() => {
      searchBoxRef.value?.focus()
    })
  })

  // 监听显示插件占位区域事件（插件启动前）
  window.ztools.onShowPluginPlaceholder(() => {
    console.log('显示插件占位区域')
    currentView.value = ViewMode.Plugin
    // 清空搜索框和所有粘贴内容
    searchQuery.value = ''
    pastedImageData.value = null
    pastedFilesData.value = null
    pastedTextData.value = null
  })

  // 监听搜索框提示文字更新事件
  window.ztools.onUpdatePlaceholder((placeholder: string) => {
    console.log('更新搜索框提示文字:', placeholder)
    windowStore.updatePlaceholder(placeholder)
  })

  // 监听头像更新事件
  window.ztools.onUpdateAvatar((avatar: string) => {
    console.log('更新头像:', avatar)
    windowStore.updateAvatar(avatar)
  })

  // 监听自动粘贴配置更新事件
  window.ztools.onUpdateAutoPaste((autoPaste: string) => {
    console.log('更新自动粘贴配置:', autoPaste)
    windowStore.updateAutoPaste(autoPaste as any)
  })

  // 监听自动清空配置更新事件
  window.ztools.onUpdateAutoClear((autoClear: string) => {
    console.log('更新自动清空配置:', autoClear)
    windowStore.updateAutoClear(autoClear as any)
  })

  // 监听主题色更新事件
  window.ztools.onUpdatePrimaryColor((data: { primaryColor: string; customColor?: string }) => {
    console.log('更新主题色:', data)
    // 更新 store（会自动处理 DOM class 和 CSS 变量）
    windowStore.updatePrimaryColor(data.primaryColor as any)
    if (data.customColor) {
      windowStore.updateCustomColor(data.customColor)
    }
  })

  // 初始化时获取当前窗口材质
  if (window.ztools.getWindowMaterial) {
    window.ztools.getWindowMaterial().then((material) => {
      console.log('主渲染进程初始化材质:', material)
      document.documentElement.setAttribute('data-material', material)
      // 应用亚克力背景色叠加效果
      applyAcrylicOverlay()
    })
  }

  // 监听窗口材质更新事件
  window.ztools.onUpdateWindowMaterial?.((material: 'mica' | 'acrylic' | 'none') => {
    console.log('更新窗口材质:', material)
    document.documentElement.setAttribute('data-material', material)
    // 应用亚克力背景色叠加效果
    applyAcrylicOverlay()
  })

  // 监听亚克力透明度更新事件
  window.ztools.onUpdateAcrylicOpacity?.((data: { lightOpacity: number; darkOpacity: number }) => {
    console.log('更新亚克力透明度:', data)
    windowStore.updateAcrylicLightOpacity(data.lightOpacity)
    windowStore.updateAcrylicDarkOpacity(data.darkOpacity)
    // 应用亚克力背景色叠加效果
    applyAcrylicOverlay()
  })

  // 监听应用启动事件（应用启动后）
  window.ztools.onAppLaunched(() => {
    console.log('应用已启动')
    // 清空搜索框和所有粘贴内容
    searchQuery.value = ''
    pastedImageData.value = null
    pastedFilesData.value = null
    pastedTextData.value = null
    currentView.value = ViewMode.Search
  })

  // 监听全局快捷键触发的启动事件
  window.ztools.onIpcLaunch((options) => {
    console.log('收到 IPC 启动事件:', options)
    // 转换旧的 'app' 类型为新的 'direct' 类型
    const launchOptions = {
      ...options,
      type: options.type === 'app' ? ('direct' as const) : options.type
    }
    window.ztools.launch(launchOptions)
  })

  // 监听插件重定向搜索事件
  window.ztools.onRedirectSearch((data) => {
    console.log('收到重定向搜索事件:', data)
    // 切换到搜索视图
    currentView.value = ViewMode.Search
    // 设置搜索内容
    searchQuery.value = data.cmdName
    // 聚焦搜索框
    nextTick(() => {
      searchBoxRef.value?.focus()
    })
  })

  // 监听插件变化事件（安装或删除插件后刷新指令列表）
  window.ztools.onPluginsChanged(async () => {
    console.log('插件列表已变化，重新加载指令列表和用户数据')
    // 并行刷新指令列表、历史记录和固定列表
    await Promise.all([commandDataStore.loadCommands(), commandDataStore.reloadUserData()])
  })

  // 监听应用目录变化事件（用户安装或删除应用后自动刷新）
  window.ztools.onAppsChanged(async () => {
    console.log('应用目录发生变化，重新加载指令列表')
    // 重新加载指令列表
    await commandDataStore.loadCommands()
  })

  // 监听更新下载完成事件
  window.ztools.onUpdateDownloaded((data) => {
    console.log('更新已下载:', data)
    windowStore.setUpdateDownloadInfo({
      hasDownloaded: true,
      version: data.version,
      changelog: data.changelog
    })
  })

  // 监听更新下载开始事件
  window.ztools.onUpdateDownloadStart((data) => {
    console.log('开始下载更新:', data)
  })

  // 监听更新下载失败事件
  window.ztools.onUpdateDownloadFailed((data) => {
    console.error('更新下载失败:', data)
  })

  // 检查是否有已下载的更新
  windowStore.checkDownloadedUpdate()

  // 全局键盘事件监听
  window.addEventListener('keydown', handleKeydown)
})

// 清理
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.app-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
  outline: none;
  overflow: hidden; /* 隐藏所有滚动条 */
  border-radius: 8px; /* Windows 11 圆角 */
}

.search-window {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
  overflow: hidden; /* 隐藏所有滚动条 */
  border-radius: 8px; /* Windows 11 圆角 */
}

.search-box-wrapper {
  flex-shrink: 0;
}

.plugin-placeholder {
  flex: 1;
  /* min-height: 500px; */
  background: transparent; /* 透明背景，让下方的 BrowserView 和 Mica 材质显示 */
  -webkit-app-region: no-drag; /* 禁止拖动窗口 */
  user-select: none; /* 禁止选取文本 */
}
</style>
