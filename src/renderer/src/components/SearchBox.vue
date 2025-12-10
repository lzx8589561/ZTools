<template>
  <div class="search-box">
    <!-- 隐藏的测量元素,用于计算文本宽度 -->
    <div class="search-input-container">
      <span ref="measureRef" class="measure-text"></span>
      <input ref="inputRef" type="text" :value="modelValue" :placeholder="placeholderText" class="search-input"
        @input="onInput" @compositionstart="onCompositionStart" @compositionend="onCompositionEnd"
        @keydown="onKeydown" />
    </div>
    <!-- 操作栏 -->
    <div class="search-actions">
      <!-- 更新提示（有下载好的更新时显示） -->
      <div v-if="windowStore.updateDownloadInfo.hasDownloaded && !windowStore.currentPlugin" class="update-notification"
        @click="handleUpdateClick">
        <span class="update-text">新版本已下载，点击升级</span>
        <UpdateIcon />
      </div>
      <!-- 头像按钮（无更新或插件模式时显示） -->
      <img v-else :src="avatarUrl" height="36" width="36" class="search-btn" @click="handleSettingsClick" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useWindowStore } from '../stores/windowStore';
import UpdateIcon from './UpdateIcon.vue';

const props = defineProps<{
  modelValue: string
  currentView?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'keydown', event: KeyboardEvent): void
  (e: 'composing', isComposing: boolean): void
  (e: 'settings-click'): void
}>()

const windowStore = useWindowStore()

const placeholderText = computed(() => {
  // 如果在插件模式下,使用子输入框的 placeholder
  if (windowStore.currentPlugin) {
    return windowStore.subInputPlaceholder
  }
  // 否则使用全局 placeholder
  return windowStore.placeholder
})
const avatarUrl = computed(() => {
  // 优先显示插件图标
  if (windowStore.currentPlugin?.logo) {
    return windowStore.currentPlugin.logo
  }
  // 否则显示用户头像
  return windowStore.avatar
})
const inputRef = ref<HTMLInputElement>()
const measureRef = ref<HTMLSpanElement>()
const isComposing = ref(false) // 是否正在输入法组合
const composingText = ref('') // 正在组合的文本

watch(
  () => composingText.value,
  (newValue) => {
    console.log('composingText 更改了', newValue)
    measureRef.value!.textContent = newValue || placeholderText.value
    updateInputWidth()
  }
)

function onCompositionStart(): void {
  isComposing.value = true
  emit('composing', true)
}

function onCompositionEnd(event: Event): void {
  isComposing.value = false
  emit('composing', false)
  // 组合结束后触发一次输入事件
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
}

function onInput(event: Event): void {
  console.log('onInput', event)
  // 如果正在输入法组合中,不触发更新
  if (isComposing.value) {
    composingText.value = (event.target as HTMLInputElement).value
    return
  }
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
}

function onKeydown(event: KeyboardEvent): void {
  // 如果正在输入法组合中,不触发键盘事件
  if (isComposing.value && event.key === 'Enter') {
    return
  }
  emit('keydown', event)
}

function updateInputWidth(): void {
  nextTick(() => {
    if (measureRef.value) {
      const width = measureRef.value.offsetWidth
      // 使用原生设置宽度
      inputRef.value!.style.width = `${width}px`
      console.log('inputWidth.value', width)
    }
  })
}

// 监听 modelValue 变化
watch(
  () => props.modelValue,
  () => {
    measureRef.value!.textContent = props.modelValue || placeholderText.value
    updateInputWidth()
  }
)

// 监听 currentPlugin 变化
watch(
  () => windowStore.currentPlugin,
  () => {
    measureRef.value!.textContent = props.modelValue || placeholderText.value
    updateInputWidth()
  }
)

onMounted(() => {
  inputRef.value?.focus()

  // 监听菜单命令
  window.ztools.onContextMenuCommand(async (command) => {
    if (command === 'open-devtools') {
      window.ztools.openPluginDevTools()
    } else if (command === 'kill-plugin') {
      try {
        // 调用新接口：终止插件并返回搜索页面
        const result = await window.ztools.killPluginAndReturn(windowStore.currentPlugin!.path)
        if (!result.success) {
          alert(`终止插件失败: ${result.error}`)
        }
      } catch (error: any) {
        console.error('终止插件失败:', error)
        alert(`终止插件失败: ${error.message || '未知错误'}`)
      }
    }
  })
})

async function handleSettingsClick(): Promise<void> {
  console.log('点击设置按钮:', {
    currentView: props.currentView,
    currentPlugin: windowStore.currentPlugin
  })

  // 只有在插件视图真正显示时才显示插件菜单
  if (props.currentView === 'plugin' && windowStore.currentPlugin) {
    console.log('显示插件菜单')
    const menuItems = [
      { id: 'open-devtools', label: '打开开发者工具' },
      { id: 'kill-plugin', label: '结束运行' }
    ]

    await window.ztools.showContextMenu(menuItems)
  } else {
    // 否则打开设置页面
    console.log('触发设置点击事件')
    emit('settings-click')
  }
}

async function handleUpdateClick(): Promise<void> {
  try {
    // 确认升级
    const confirmed = confirm(
      `确定要升级到版本 ${windowStore.updateDownloadInfo.version} 吗？\n\n应用将重启以完成升级。`
    )
    if (!confirmed) {
      return
    }

    // 执行升级
    const result = await window.ztools.updater.installDownloadedUpdate()
    if (!result.success) {
      alert(`升级失败: ${result.error}`)
    }
  } catch (error: any) {
    console.error('升级失败:', error)
    alert(`升级失败: ${error.message || '未知错误'}`)
  }
}

defineExpose({
  focus: () => inputRef.value?.focus()
})
</script>

<style scoped>
.search-box {
  padding: 5px 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  -webkit-app-region: drag;
  /* 整个区域默认可拖动 */
  position: relative;
}

.measure-text {
  position: absolute;
  white-space: pre;
  font-size: 24px;
  font-family: inherit;
  pointer-events: none;
  opacity: 0;
}

.search-input {
  min-width: 120px;
  max-width: 720px;
  /* flex-shrink: 0; */
  /* 不允许缩小 */
  height: 48px;
  line-height: 48px;
  font-size: 24px;
  border: none;
  outline: none;
  background: transparent;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-color);
  -webkit-app-region: no-drag;
  -webkit-app-region: no-drag;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.search-input::placeholder {
  color: #7a7a7a;
  font-size: 24px;
  font-weight: 300;
}

/* 暗色模式下的 placeholder 颜色 */
@media (prefers-color-scheme: dark) {
  .search-input::placeholder {
    color: #aaaaaa;
  }
}

.search-input-container {
  flex: 1;
}

.search-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.update-notification {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.1);
  transition: all 0.2s;
  -webkit-app-region: no-drag;
}

.update-notification:hover {
  background: rgba(16, 185, 129, 0.2);
  transform: scale(1.02);
}

.update-notification:active {
  transform: scale(0.98);
}

.update-text {
  font-size: 13px;
  color: #10b981;
  font-weight: 500;
  white-space: nowrap;
}

.search-btn {
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  -webkit-app-region: no-drag;
  /* 按钮不可拖动 */
}

.search-btn:hover {
  opacity: 0.8;
  transform: scale(1.05);
}

.search-btn:active {
  transform: scale(0.95);
}
</style>
