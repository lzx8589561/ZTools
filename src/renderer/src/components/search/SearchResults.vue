<template>
  <div ref="scrollContainerRef" class="scrollable-content" @click="handleContainerClick">
    <!-- 无搜索时显示历史 -->
    <div
      v-if="!searchQuery.trim() && !pastedImage && !pastedText && !pastedFiles"
      class="content-section"
    >
      <!-- 最近使用 -->
      <CollapsibleList
        v-model:expanded="isRecentExpanded"
        title="最近使用"
        :apps="displayApps"
        :selected-index="getAbsoluteIndexForSection('apps')"
        :empty-text="loading ? '正在加载应用...' : '未找到应用'"
        :default-visible-rows="2"
        :draggable="false"
        @select="handleSelectApp"
        @contextmenu="handleAppContextMenu"
      />

      <!-- 固定栏 -->
      <CollapsibleList
        v-model:expanded="isPinnedExpanded"
        title="固定"
        :apps="pinnedApps"
        :selected-index="getAbsoluteIndexForSection('pinned')"
        :default-visible-rows="2"
        :draggable="true"
        @select="handleSelectApp"
        @contextmenu="(app) => handleAppContextMenu(app, false, true)"
        @update:apps="updatePinnedOrder"
      />

      <!-- 访达 -->
      <CollapsibleList
        v-if="finderActions.length > 0"
        title="访达"
        :apps="finderActions"
        :selected-index="getAbsoluteIndexForSection('finder')"
        :empty-text="''"
        :draggable="false"
        @select="handleFinderAction"
      />
    </div>

    <!-- 有搜索时显示搜索结果 -->
    <div v-else class="search-results">
      <!-- 应用和插件 -->
      <CollapsibleList
        v-if="appAndPluginResults.length > 0"
        v-model:expanded="isSearchResultsExpanded"
        title="最佳匹配"
        :apps="appAndPluginResults"
        :selected-index="searchResultSelectedIndex"
        :empty-text="'未找到应用'"
        :default-visible-rows="2"
        :draggable="false"
        @select="handleSelectApp"
        @contextmenu="(app) => handleAppContextMenu(app, true)"
      />

      <!-- 系统设置 -->
      <CollapsibleList
        v-if="systemSettingResults.length > 0"
        v-model:expanded="isSystemSettingsExpanded"
        title="系统设置"
        :apps="systemSettingResults"
        :selected-index="systemSettingSelectedIndex"
        :default-visible-rows="2"
        :draggable="false"
        @select="handleSelectApp"
        @contextmenu="(app) => handleAppContextMenu(app, true)"
      />

      <!-- 匹配推荐 -->
      <CollapsibleList
        v-model:expanded="isRecommendationsExpanded"
        title="匹配推荐"
        :apps="recommendations"
        :selected-index="recommendationSelectedIndex"
        :empty-text="''"
        :default-visible-rows="2"
        :draggable="false"
        @select="handleRecommendationSelect"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useCommandDataStore } from '../../stores/commandDataStore'
import { useWindowStore } from '../../stores/windowStore'
import CollapsibleList from '../common/CollapsibleList.vue'

// MatchFile 接口（传递给插件的文件格式）
interface MatchFile {
  isFile: boolean
  isDirectory: boolean
  name: string
  path: string
}

// FileItem 接口（从剪贴板管理器返回的格式）
interface FileItem {
  path: string
  name: string
  isDirectory: boolean
}

interface Props {
  searchQuery: string
  pastedImage?: string | null
  pastedFiles?: FileItem[] | null
  pastedText?: string | null
}

const props = defineProps<Props>()

const windowStore = useWindowStore()

const emit = defineEmits<{
  (e: 'height-changed'): void
  (e: 'focus-input'): void
  (e: 'restore-match', state: any): void
}>()

// 使用 store
const commandDataStore = useCommandDataStore()

// 解构响应式状态
const { loading } = storeToRefs(commandDataStore)

// 解构方法
const {
  search,
  searchInCommands,
  searchImageCommands,
  searchTextCommands,
  searchFileCommands,
  getRecentCommands,
  removeFromHistory,
  pinCommand,
  unpinCommand,
  isPinned,
  getPinnedCommands,
  updatePinnedOrder
} = commandDataStore

// 内部状态
const selectedRow = ref(0)
const selectedCol = ref(0)
const isRecentExpanded = ref(false)
const isPinnedExpanded = ref(false)
const isSearchResultsExpanded = ref(false)
const isSystemSettingsExpanded = ref(false)
const isRecommendationsExpanded = ref(false)
const scrollContainerRef = ref<HTMLElement>()

// 搜索结果
const internalSearchResults = computed(() => {
  // 如果有粘贴内容，先获取匹配类型的指令
  let matchedCommands: any[] | null = null

  if (props.pastedImage) {
    matchedCommands = searchImageCommands()
    console.log('searchImageCommands', matchedCommands)
  } else if (props.pastedText) {
    matchedCommands = searchTextCommands(props.pastedText)
    console.log('searchTextCommands', matchedCommands)
  } else if (props.pastedFiles) {
    matchedCommands = searchFileCommands(props.pastedFiles)
    console.log('searchFileCommands', matchedCommands)
  }

  // 如果有匹配的指令列表（有粘贴内容）
  if (matchedCommands) {
    // 如果有搜索关键词，使用统一的搜索函数，但限制在匹配的指令中
    if (props.searchQuery.trim()) {
      const result = searchInCommands(matchedCommands, props.searchQuery)
      console.log('在匹配指令中搜索', props.searchQuery, '结果:', result)
      return result
    }
    // 没有搜索关键词，直接返回匹配的指令
    return matchedCommands
  }

  // 否则正常搜索（无粘贴内容）
  const result = search(props.searchQuery)
  return result.bestMatches
})

// 分离系统设置结果
const systemSettingResults = computed(() => {
  // 粘贴图片、文本或文件时不显示系统设置
  if (props.pastedImage || props.pastedText || props.pastedFiles) return []
  if (!props.searchQuery.trim()) return []
  return internalSearchResults.value.filter(
    (item: any) => item.type === 'direct' && item.subType === 'system-setting'
  )
})

// 应用和插件结果（排除系统设置）
const appAndPluginResults = computed(() => {
  // 粘贴图片、文本或文件时显示所有支持对应类型的指令
  if (props.pastedImage || props.pastedText || props.pastedFiles) {
    return internalSearchResults.value
  }
  if (!props.searchQuery.trim()) return []
  return internalSearchResults.value.filter(
    (item: any) => !(item.type === 'direct' && item.subType === 'system-setting')
  )
})

// 推荐列表
const recommendations = computed(() => {
  // 粘贴图片、文本或文件时不显示推荐
  if (props.pastedImage || props.pastedText || props.pastedFiles) return []
  if (props.searchQuery.trim() === '') {
    return []
  }

  const searchResult = search(props.searchQuery)
  const regexResults = searchResult.regexMatches

  // 正则匹配结果 + 百度搜索（内置，放最后）
  return [
    ...regexResults,
    {
      name: '百度搜索',
      path: `baidu-search:${props.searchQuery}`,
      icon: '🔍',
      type: 'builtin' as const
    }
  ]
})

// 访达功能列表
const finderActions = computed(() => {
  // 只要是 Finder 就显示功能列表，点击时再获取路径
  if (!windowStore.isFinder()) {
    return []
  }
  return [
    {
      name: '复制路径',
      path: 'finder-action:copy-path',
      icon: '📋',
      type: 'builtin' as const
    },
    {
      name: '在终端打开',
      path: 'finder-action:open-terminal',
      icon: '⌨️',
      type: 'builtin' as const
    }
  ]
})

// 显示的应用列表
const displayApps = computed(() => {
  // 粘贴图片、文本或文件时不显示历史记录
  if (props.pastedImage || props.pastedText || props.pastedFiles) return []

  if (props.searchQuery.trim() === '') {
    return getRecentCommands()
  } else {
    return internalSearchResults.value
  }
})

// 固定应用列表
const pinnedApps = computed(() => {
  return getPinnedCommands()
})

// 可见的最近使用应用（用于键盘导航）
const visibleRecentApps = computed(() => {
  const defaultVisibleCount = 9 * 2 // itemsPerRow * defaultVisibleRows（对应 CollapsibleList 的配置）
  if (isRecentExpanded.value || displayApps.value.length <= defaultVisibleCount) {
    return displayApps.value
  }
  return displayApps.value.slice(0, defaultVisibleCount)
})

// 可见的固定应用（用于键盘导航）
const visiblePinnedApps = computed(() => {
  const defaultVisibleCount = 9 * 2 // itemsPerRow * defaultVisibleRows
  if (isPinnedExpanded.value || pinnedApps.value.length <= defaultVisibleCount) {
    return pinnedApps.value
  }
  return pinnedApps.value.slice(0, defaultVisibleCount)
})

// 将一维数组转换为二维数组(每行9个)
function arrayToGrid(arr: any[], cols = 9): any[][] {
  const grid: any[][] = []
  for (let i = 0; i < arr.length; i += cols) {
    grid.push(arr.slice(i, i + cols))
  }
  return grid
}

// 可见的应用和插件结果（用于键盘导航）
// 注意：CollapsibleList 内部会根据展开状态自动处理显示数量，这里我们需要同步
const visibleAppAndPluginResults = computed(() => {
  const defaultVisibleCount = 9 * 2 // itemsPerRow * defaultVisibleRows
  const canExpand = appAndPluginResults.value.length > defaultVisibleCount

  let result
  if (!canExpand || isSearchResultsExpanded.value) {
    result = appAndPluginResults.value
  } else {
    result = appAndPluginResults.value.slice(0, defaultVisibleCount)
  }

  return result
})

// 可见的系统设置结果（用于键盘导航）
const visibleSystemSettingResults = computed(() => {
  const defaultVisibleCount = 9 * 2
  if (isSystemSettingsExpanded.value || systemSettingResults.value.length <= defaultVisibleCount) {
    return systemSettingResults.value
  }
  return systemSettingResults.value.slice(0, defaultVisibleCount)
})

// 可见的推荐列表（用于键盘导航）
const visibleRecommendations = computed(() => {
  const defaultVisibleCount = 9 * 2
  if (isRecommendationsExpanded.value || recommendations.value.length <= defaultVisibleCount) {
    return recommendations.value
  }
  return recommendations.value.slice(0, defaultVisibleCount)
})

// 构建导航网格
const navigationGrid = computed(() => {
  const sections: any[] = []

  if (props.searchQuery.trim() || props.pastedImage || props.pastedText || props.pastedFiles) {
    // 有搜索或粘贴图片/文本/文件时：应用和插件 + 系统设置 + 推荐
    if (visibleAppAndPluginResults.value.length > 0) {
      const searchGrid = arrayToGrid(visibleAppAndPluginResults.value)
      searchGrid.forEach((row) => {
        sections.push({ type: 'search', items: row })
      })
    }

    if (visibleSystemSettingResults.value.length > 0) {
      const settingGrid = arrayToGrid(visibleSystemSettingResults.value)
      settingGrid.forEach((row) => {
        sections.push({ type: 'system-setting', items: row })
      })
    }

    if (visibleRecommendations.value.length > 0) {
      const recommendGrid = arrayToGrid(visibleRecommendations.value)
      recommendGrid.forEach((row) => {
        sections.push({ type: 'recommendation', items: row })
      })
    }
  } else {
    // 无搜索时：最近使用 + 固定栏 + 访达
    const appsGrid = arrayToGrid(visibleRecentApps.value)
    appsGrid.forEach((row) => {
      sections.push({ type: 'apps', items: row })
    })

    if (visiblePinnedApps.value.length > 0) {
      const pinnedGrid = arrayToGrid(visiblePinnedApps.value)
      pinnedGrid.forEach((row) => {
        sections.push({ type: 'pinned', items: row })
      })
    }

    if (finderActions.value.length > 0) {
      const finderGrid = arrayToGrid(finderActions.value)
      finderGrid.forEach((row) => {
        sections.push({ type: 'finder', items: row })
      })
    }
  }

  return sections
})

// 计算指定类型在列表中的绝对索引（支持多行情况）
function getAbsoluteIndexForSection(sectionType: string): number {
  const grid = navigationGrid.value
  if (grid.length === 0 || selectedRow.value >= grid.length) {
    return -1
  }

  const currentRow = grid[selectedRow.value]
  if (currentRow.type !== sectionType) {
    return -1
  }

  // 找到该类型的起始行
  let startRow = 0
  for (let i = 0; i < grid.length; i++) {
    if (grid[i].type === sectionType) {
      startRow = i
      break
    }
  }

  // 计算相对于起始行的索引
  return (selectedRow.value - startRow) * 9 + selectedCol.value
}

// 计算搜索结果中的选中索引
const searchResultSelectedIndex = computed(() => {
  return getAbsoluteIndexForSection('search')
})

// 计算系统设置的选中索引
const systemSettingSelectedIndex = computed(() => {
  if (!props.searchQuery.trim()) return -1
  return getAbsoluteIndexForSection('system-setting')
})

// 计算推荐列表中的选中索引
const recommendationSelectedIndex = computed(() => {
  if (!props.searchQuery.trim()) return -1
  return getAbsoluteIndexForSection('recommendation')
})

// 获取当前选中的元素
const selectedItem = computed(() => {
  const grid = navigationGrid.value
  if (grid.length === 0 || selectedRow.value >= grid.length) {
    return null
  }
  const row = grid[selectedRow.value]
  if (!row || selectedCol.value >= row.items.length) {
    return null
  }
  return row.items[selectedCol.value]
})

// 监听搜索内容变化,重置选中状态
watch(
  [
    () => props.searchQuery,
    () => props.pastedImage,
    () => props.pastedText,
    () => props.pastedFiles
  ],
  () => {
    selectedRow.value = 0
    selectedCol.value = 0
    nextTick(() => {
      emit('height-changed')
    })
  }
)

// 监听展开状态变化，调整窗口高度
watch(
  [
    isRecentExpanded,
    isPinnedExpanded,
    isSearchResultsExpanded,
    isSystemSettingsExpanded,
    isRecommendationsExpanded
  ],
  () => {
    nextTick(() => {
      emit('height-changed')
    })
  }
)

// 滚动到选中的项
function scrollToSelectedItem(): void {
  const container = scrollContainerRef.value
  if (!container) {
    return
  }

  nextTick(() => {
    // 查找所有选中的项
    const selectedElements = container.querySelectorAll('.app-item.selected')
    if (!selectedElements || selectedElements.length === 0) {
      return
    }

    // 获取第一个选中的项（应该只有一个）
    const selectedElement = selectedElements[0] as HTMLElement
    if (!selectedElement) {
      return
    }

    const containerRect = container.getBoundingClientRect()
    const targetRect = selectedElement.getBoundingClientRect()

    // 检查是否在可见区域内
    const isAbove = targetRect.top < containerRect.top
    const isBelow = targetRect.bottom > containerRect.bottom

    if (isAbove) {
      // 项目在上方，滚动到顶部对齐
      const scrollTop = container.scrollTop + (targetRect.top - containerRect.top) - 10 // 留一点边距
      container.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: 'smooth'
      })
    } else if (isBelow) {
      // 项目在下方，滚动到底部对齐
      const scrollTop = container.scrollTop + (targetRect.bottom - containerRect.bottom) + 10 // 留一点边距
      container.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      })
    }
  })
}

// 监听选中项变化，自动滚动
watch([selectedRow, selectedCol], () => {
  scrollToSelectedItem()
})

// 监听固定列表变化，调整窗口高度（特别是从空到非空或从非空到空时）
watch(
  () => pinnedApps.value.length,
  () => {
    nextTick(() => {
      emit('height-changed')
    })
  }
)

// 监听历史记录列表变化，调整窗口高度
watch(
  () => displayApps.value.length,
  () => {
    nextTick(() => {
      emit('height-changed')
    })
  }
)

// 监听 grid 变化，修正选中位置（主要是为了处理折叠/展开时的边界情况）
watch(navigationGrid, (newGrid) => {
  if (newGrid.length === 0) {
    // 如果没有内容，不需要重置为 0，因为可能只是暂时为空或者正在加载
    // 但如果越界了，肯定要修
    return
  }

  if (selectedRow.value >= newGrid.length) {
    selectedRow.value = Math.max(0, newGrid.length - 1)
  }

  const currentRow = newGrid[selectedRow.value]
  if (currentRow && selectedCol.value >= currentRow.items.length) {
    selectedCol.value = Math.max(0, currentRow.items.length - 1)
  }
})

// 处理应用右键菜单
async function handleAppContextMenu(
  app: any,
  fromSearch = false,
  fromPinned = false
): Promise<void> {
  const menuItems: any[] = []

  // 只在历史记录中显示"从使用记录删除"
  if (!fromSearch && !fromPinned) {
    menuItems.push({
      id: `remove-from-history:${JSON.stringify({ path: app.path, featureCode: app.featureCode })}`,
      label: '从使用记录删除'
    })
  }

  // 如果是应用（不是插件和系统设置），显示"打开文件位置"
  if (
    app.type !== 'system-setting' &&
    app.type !== 'plugin' &&
    app.path &&
    !app.path.startsWith('baidu-search:')
  ) {
    menuItems.push({
      id: `reveal-in-finder:${JSON.stringify({ path: app.path })}`,
      label: '打开文件位置'
    })
  }

  // 根据是否已固定显示不同选项
  if (isPinned(app.path, app.featureCode)) {
    menuItems.push({
      id: `unpin-app:${JSON.stringify({ path: app.path, featureCode: app.featureCode })}`,
      label: '取消固定'
    })
  } else {
    menuItems.push({
      id: `pin-app:${JSON.stringify({
        name: app.name,
        path: app.path,
        icon: app.icon,
        pinyin: app.pinyin,
        pinyinAbbr: app.pinyinAbbr,
        type: app.type,
        featureCode: app.featureCode,
        pluginExplain: app.pluginExplain
      })}`,
      label: '固定到顶部'
    })
  }

  await window.ztools.showContextMenu(menuItems)
}

// 选择应用
async function handleSelectApp(app: any): Promise<void> {
  console.log('选择应用:', app)
  try {
    // 如果是"上次匹配"指令，执行恢复逻辑
    if (app.path === 'special:last-match') {
      const state = await window.ztools.restoreLastMatch()
      if (state) {
        emit('restore-match', state)
      }
      return
    }

    // 构造 payload 和 type
    let payload: any = props.searchQuery
    let type = app.cmdType || 'text' // 默认使用 cmd 的类型

    if (app.cmdType === 'img' && props.pastedImage) {
      // 图片类型：传递 base64 字符串
      payload = props.pastedImage
    } else if (app.cmdType === 'over' && props.pastedText) {
      // 文本类型：传递粘贴的文本
      payload = props.pastedText
    } else if (app.cmdType === 'files' && props.pastedFiles) {
      // 文件类型：将 FileItem[] 转换为 MatchFile[]
      payload = props.pastedFiles.map((file) => ({
        isFile: !file.isDirectory,
        isDirectory: file.isDirectory,
        name: file.name,
        path: file.path
      })) as MatchFile[]
    }

    // 启动应用或插件（后端会自动处理视图切换和添加历史记录）
    await window.ztools.launch({
      path: app.path,
      type: app.type || 'app',
      featureCode: app.featureCode,
      name: app.name, // 传递 cmd 名称用于历史记录显示
      cmdType: app.cmdType || 'text', // 传递 cmdType 用于判断是否添加历史
      param: {
        payload,
        type, // 传递 cmd 的实际类型
        // 传递完整的输入状态（用于匹配指令的状态保存）
        inputState: {
          searchQuery: props.searchQuery,
          pastedImage: props.pastedImage,
          // 将 pastedFiles 转换为纯对象数组，避免 Proxy 导致的序列化错误
          pastedFiles: props.pastedFiles
            ? props.pastedFiles.map((file) => ({
                isFile: !file.isDirectory,
                isDirectory: file.isDirectory,
                name: file.name,
                path: file.path
              }))
            : null,
          pastedText: props.pastedText
        }
      }
    })
  } catch (error) {
    console.error('启动失败:', error)
  }
}

// 访达功能选择
async function handleFinderAction(item: any): Promise<void> {
  try {
    // 先获取 Finder 路径
    const path = await window.ztools.getFinderPath()

    if (!path) {
      console.error('无法获取 Finder 路径')
      return
    }

    // 根据不同的 action 执行相应操作
    if (item.path === 'finder-action:copy-path') {
      await window.ztools.copyToClipboard(path)
      window.ztools.hideWindow()
    } else if (item.path === 'finder-action:open-terminal') {
      await window.ztools.openTerminal(path)
      window.ztools.hideWindow()
    }
  } catch (error) {
    console.error('执行 Finder 操作失败:', error)
  }
}

// 选择推荐项
async function handleRecommendationSelect(item: any): Promise<void> {
  if (item.path.startsWith('baidu-search:')) {
    // 百度搜索
    const query = encodeURIComponent(props.searchQuery)
    const url = `https://www.baidu.com/s?wd=${query}`
    await window.ztools.openExternal(url)
    window.ztools.hideWindow()
  } else if (item.type === 'plugin') {
    // 插件类型（正则匹配的结果）
    await handleSelectApp(item)
  }
}

// 键盘导航
async function handleKeydown(event: KeyboardEvent): Promise<void> {
  const grid = navigationGrid.value
  if (!grid || grid.length === 0) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (selectedRow.value < grid.length - 1) {
        selectedRow.value++
        const currentRowItems = grid[selectedRow.value].items
        selectedCol.value = Math.min(selectedCol.value, currentRowItems.length - 1)
      }
      break
    case 'ArrowUp':
      event.preventDefault()
      if (selectedRow.value > 0) {
        selectedRow.value--
        const currentRowItems = grid[selectedRow.value].items
        selectedCol.value = Math.min(selectedCol.value, currentRowItems.length - 1)
      }
      break
    case 'ArrowRight':
      event.preventDefault()
      if (grid.length > 0 && selectedRow.value < grid.length) {
        const currentRowItems = grid[selectedRow.value].items
        if (selectedCol.value < currentRowItems.length - 1) {
          // 当前行还有下一个项目
          selectedCol.value++
        } else if (selectedRow.value < grid.length - 1) {
          // 当前行最后一个，跳到下一行第一个
          selectedRow.value++
          selectedCol.value = 0
        }
      }
      break
    case 'ArrowLeft':
      event.preventDefault()
      if (selectedCol.value > 0) {
        // 当前行还有前一个项目
        selectedCol.value--
      } else if (selectedRow.value > 0) {
        // 当前行第一个，跳到上一行最后一个
        selectedRow.value--
        const prevRowItems = grid[selectedRow.value].items
        selectedCol.value = prevRowItems.length - 1
      }
      break
    case 'Enter': {
      event.preventDefault()
      const item = selectedItem.value
      if (item) {
        const currentRow = grid[selectedRow.value]
        if (currentRow.type === 'finder') {
          handleFinderAction(item)
        } else if (currentRow.type === 'recommendation') {
          handleRecommendationSelect(item)
        } else {
          handleSelectApp(item)
        }
      }
      break
    }
  }
}

// 处理上下文菜单命令
async function handleContextMenuCommand(command: string): Promise<void> {
  if (command.startsWith('remove-from-history:')) {
    const jsonStr = command.replace('remove-from-history:', '')
    try {
      const { path, featureCode } = JSON.parse(jsonStr)
      await removeFromHistory(path, featureCode)
      nextTick(() => {
        emit('height-changed')
      })
    } catch (error) {
      console.error('从历史记录删除失败:', error)
    }
  } else if (command.startsWith('pin-app:')) {
    const appJson = command.replace('pin-app:', '')
    try {
      const app = JSON.parse(appJson)
      await pinCommand(app)
      nextTick(() => {
        emit('height-changed')
      })
    } catch (error) {
      console.error('固定应用失败:', error)
    }
  } else if (command.startsWith('unpin-app:')) {
    const jsonStr = command.replace('unpin-app:', '')
    try {
      const { path, featureCode } = JSON.parse(jsonStr)
      await unpinCommand(path, featureCode)
      nextTick(() => {
        emit('height-changed')
      })
    } catch (error) {
      console.error('取消固定失败:', error)
    }
  } else if (command.startsWith('reveal-in-finder:')) {
    const jsonStr = command.replace('reveal-in-finder:', '')
    try {
      const { path: filePath } = JSON.parse(jsonStr)
      await window.ztools.revealInFinder(filePath)
    } catch (error) {
      console.error('打开文件位置失败:', error)
    }
  }
}

// 重置选中状态
function resetSelection(): void {
  selectedRow.value = 0
  selectedCol.value = 0
}

// 点击容器聚焦输入框
function handleContainerClick(event: MouseEvent): void {
  // 如果点击的是指令卡片或其子元素，不聚焦输入框
  const target = event.target as HTMLElement
  if (target.closest('.app-item')) {
    return
  }
  // 点击空白区域时聚焦输入框
  emit('focus-input')
}

// 初始化
onMounted(() => {
  // 监听上下文菜单命令
  window.ztools.onContextMenuCommand(handleContextMenuCommand)
})

// 导出方法供父组件调用
defineExpose({
  navigationGrid,
  handleKeydown,
  resetSelection
})
</script>

<style scoped>
.scrollable-content {
  max-height: 541px; /* 600 - 59 (搜索框高度) */
  overflow-y: auto;
  overflow-x: hidden;
  user-select: none; /* 禁止选取文本 */
}

.content-section {
  flex: 1;
}

.search-results {
  display: flex;
  flex-direction: column;
}

.result-section {
  display: flex;
  flex-direction: column;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  padding: 5px 10px;
  margin-bottom: 4px; /* 与结果项间距保持一致 */
}
</style>
