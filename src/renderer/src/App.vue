<template>
  <div class="app-container">
    <div class="search-window">
      <div :class="['search-box-wrapper', { 'with-divider': currentView === ViewMode.Plugin }]">
        <SearchBox
          ref="searchBoxRef"
          v-model="searchQuery"
          :current-view="currentView"
          @composing="handleComposing"
          @settings-click="handleSettingsClick"
        />
      </div>

      <!-- 搜索结果组件 -->
      <SearchResults
        v-if="currentView === ViewMode.Search"
        ref="searchResultsRef"
        :search-query="searchQuery"
        @height-changed="updateWindowHeight"
      />

      <!-- 插件占位区域 -->
      <div v-if="currentView === ViewMode.Plugin" class="plugin-placeholder">
        <!-- 插件内容由 BrowserView 渲染，这里只是占位 -->
      </div>

      <!-- 配置组件 -->
      <Settings v-if="currentView === ViewMode.Settings" @close="currentView = ViewMode.Search" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import SearchBox from './components/SearchBox.vue'
import SearchResults from './components/SearchResults.vue'
import Settings from './components/Settings.vue'
import { useAppDataStore } from './stores/appDataStore'
import { useWindowStore } from './stores/windowStore'

enum ViewMode {
  Search = 'search',
  Settings = 'settings',
  Plugin = 'plugin'
}

const windowStore = useWindowStore()
const appDataStore = useAppDataStore()

const searchQuery = ref('')
const isComposing = ref(false)
const currentView = ref<ViewMode>(ViewMode.Search)
const searchBoxRef = ref<{ focus: () => void } | null>(null)
const searchResultsRef = ref<{
  handleKeydown: (e: KeyboardEvent) => void
  resetSelection: () => void
} | null>(null)

// 监听搜索框输入变化
watch(searchQuery, (newValue) => {
  // 如果在插件模式下,通知主进程,由主进程转发给插件
  if (currentView.value === ViewMode.Plugin && windowStore.currentPlugin) {
    window.ztools.notifySubInputChange(newValue)
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

// 处理输入法组合状态
function handleComposing(composing: boolean): void {
  isComposing.value = composing
}

// 处理设置按钮点击
function handleSettingsClick(): void {
  console.log('收到设置点击事件，当前视图:', currentView.value)
  if (currentView.value === ViewMode.Settings) {
    currentView.value = ViewMode.Search
  } else {
    currentView.value = ViewMode.Settings
  }
  console.log('切换后视图:', currentView.value)
}

// 监听显示设置页面的变化,调整窗口高度
watch(currentView, () => {
  if (currentView.value === ViewMode.Plugin) {
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

  // Escape 键特殊处理
  if (event.key === 'Escape') {
    event.preventDefault()

    // 根据当前视图模式处理
    if (currentView.value === ViewMode.Settings) {
      // 设置页面 -> 返回搜索
      currentView.value = ViewMode.Search
      return
    }

    if (currentView.value === ViewMode.Plugin) {
      // 插件页面 ESC 键处理
      if (searchQuery.value.trim()) {
        // 如果输入框有内容，先清空输入框
        searchQuery.value = ''
      } else {
        // 输入框为空，退出插件返回搜索
        currentView.value = ViewMode.Search
        window.ztools.hidePlugin()
      }
      return
    }

    // 搜索页面
    if (searchQuery.value.trim()) {
      searchQuery.value = ''
    } else {
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
    appDataStore.initializeData() // 初始化应用历史记录和固定列表
  ])

  // 初始调整窗口高度
  updateWindowHeight()

  // 监听窗口显示事件,聚焦搜索框
  window.ztools.onFocusSearch(async () => {
    if (currentView.value === ViewMode.Plugin) {
      return
    }
    searchQuery.value = ''
    searchResultsRef.value?.resetSelection()

    // 隐藏插件视图
    window.ztools.hidePlugin()

    // 聚焦输入框
    nextTick(() => {
      searchBoxRef.value?.focus()
    })

    // 检查是否需要自动粘贴
    const timeLimit = windowStore.getAutoPasteTimeLimit()
    if (timeLimit > 0) {
      try {
        const copiedText = await window.ztools.getLastCopiedText(timeLimit)
        if (copiedText) {
          // 自动粘贴到搜索框
          searchQuery.value = copiedText
          console.log('自动粘贴:', copiedText)
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
    // 聚焦搜索框
    nextTick(() => {
      searchBoxRef.value?.focus()
    })
  })

  // 监听插件打开事件
  window.ztools.onPluginOpened((plugin) => {
    console.log('插件已打开:', plugin)
    windowStore.updateCurrentPlugin(plugin)
  })

  // 监听插件关闭事件
  window.ztools.onPluginClosed(() => {
    console.log('插件已关闭')
    windowStore.updateCurrentPlugin(null)
  })

  // 监听子输入框 placeholder 更新事件
  console.log(
    'onUpdateSubInputPlaceholder 方法存在?',
    typeof window.ztools.onUpdateSubInputPlaceholder
  )
  window.ztools.onUpdateSubInputPlaceholder?.(
    (data: { pluginPath: string; placeholder: string }) => {
      console.log('收到更新子输入框 placeholder 事件:', data)
      windowStore.updateSubInputPlaceholder(data.pluginPath, data.placeholder)
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
    searchQuery.value = ''
  })

  // 监听显示设置页面事件
  window.ztools.onShowSettings(() => {
    console.log('显示设置页面')
    currentView.value = ViewMode.Settings
    searchQuery.value = ''
    // 调整窗口高度
    updateWindowHeight()
  })

  // 监听应用启动事件（应用启动后）
  window.ztools.onAppLaunched(() => {
    console.log('应用已启动')
    searchQuery.value = ''
    currentView.value = ViewMode.Search
  })

  // 监听全局快捷键触发的启动事件
  window.ztools.onIpcLaunch((options) => {
    console.log('收到 IPC 启动事件:', options)
    window.ztools.launch(options)
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

  // 监听插件变化事件（安装或删除插件后刷新应用列表）
  window.ztools.onPluginsChanged(async () => {
    console.log('插件列表已变化，重新加载应用列表和用户数据')
    // 并行刷新应用列表、历史记录和固定列表
    await Promise.all([appDataStore.loadApps(), appDataStore.reloadUserData()])
  })

  // 监听应用目录变化事件（用户安装或删除应用后自动刷新）
  window.ztools.onAppsChanged(async () => {
    console.log('应用目录发生变化，重新加载应用列表')
    // 重新加载应用列表
    await appDataStore.loadApps()
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
}

.search-window {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
}

.search-box-wrapper {
  flex-shrink: 0;
}

.search-box-wrapper.with-divider {
  border-bottom: 1px solid var(--divider-color);
}

.plugin-placeholder {
  flex: 1;
  /* min-height: 500px; */
  background: var(--hover-bg);
}
</style>
