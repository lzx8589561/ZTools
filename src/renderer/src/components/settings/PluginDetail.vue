<template>
  <DetailPanel title="插件详情" @back="emit('back')">
    <!-- 插件基本信息 -->
    <div class="detail-content">
      <div class="detail-header">
        <!-- 左侧：图标 + 信息 -->
        <div class="detail-left">
          <img
            v-if="plugin.logo"
            :src="plugin.logo"
            class="detail-icon"
            alt="插件图标"
            draggable="false"
          />
          <div v-else class="detail-icon placeholder">🧩</div>
          <div class="detail-info">
            <div class="detail-title">
              <span class="detail-name">{{ plugin.name }}</span>
              <span class="detail-version">v{{ plugin.version }}</span>
            </div>
            <div class="detail-desc">{{ plugin.description || '暂无描述' }}</div>
          </div>
        </div>

        <!-- 右侧：按钮 -->
        <div class="detail-actions">
          <template v-if="plugin.installed">
            <button
              v-if="canUpgrade"
              class="btn btn-md btn-warning"
              :disabled="isLoading"
              @click="emit('upgrade')"
            >
              <div v-if="isLoading" class="btn-loading">
                <div class="spinner"></div>
              </div>
              <span v-else>升级到 v{{ plugin.version }}</span>
            </button>
            <button v-else class="btn btn-md" @click="emit('open')">打开</button>
          </template>
          <button
            v-else
            class="btn btn-icon"
            title="下载"
            :disabled="isLoading"
            @click="emit('download')"
          >
            <div v-if="isLoading" class="spinner"></div>
            <svg
              v-else
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M7 10L12 15L17 10"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M12 15V3"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Tab 栏 -->
    <div class="tab-container">
      <div class="tab-header">
        <button
          v-for="tab in availableTabs"
          :key="tab.id"
          class="tab-button"
          :class="{ active: activeTab === tab.id }"
          @click="switchTab(tab.id)"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="tab-content">
        <!-- 详情 Tab -->
        <div v-if="activeTab === 'detail'" class="tab-panel">
          <div v-if="readmeLoading" class="loading-container">
            <div class="spinner"></div>
            <span>加载中...</span>
          </div>
          <div v-else-if="readmeError" class="error-container">
            <span>{{ readmeError }}</span>
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-else-if="readmeContent" class="markdown-content" v-html="renderedMarkdown"></div>
          <div v-else class="empty-message">该插件暂无详情说明</div>
        </div>

        <!-- 指令列表 Tab -->
        <div v-if="activeTab === 'commands'" class="tab-panel">
          <div v-if="plugin.features && plugin.features.length > 0" class="feature-list">
            <FeatureCard v-for="feature in plugin.features" :key="feature.code" :feature="feature">
              <CommandTag
                v-for="cmd in feature.cmds"
                :key="cmdKey(cmd)"
                :command="normalizeCommand(cmd)"
              />
            </FeatureCard>
          </div>
          <div v-else class="empty-message">暂无指令</div>
        </div>

        <!-- 数据 Tab（仅已安装插件可见） -->
        <div v-if="activeTab === 'data'" class="tab-panel">
          <div v-if="dataLoading" class="loading-container">
            <div class="spinner"></div>
            <span>加载中...</span>
          </div>
          <div v-else-if="dataError" class="error-container">
            <span>{{ dataError }}</span>
          </div>
          <div v-else-if="pluginData && pluginData.length > 0" class="data-list">
            <div
              v-for="item in pluginData"
              :key="item.id"
              class="card data-item"
              @click="viewDataDetail(item)"
            >
              <span class="data-key">{{ item.id }}</span>
            </div>
          </div>
          <div v-else class="empty-message">该插件暂无存储数据</div>
        </div>
      </div>
    </div>
  </DetailPanel>
</template>

<script setup lang="ts">
import { marked } from 'marked'
import { computed, onMounted, ref } from 'vue'
import DetailPanel from '../common/DetailPanel.vue'
import CommandTag from './common/CommandTag.vue'
import FeatureCard from './common/FeatureCard.vue'

interface PluginFeature {
  code: string
  name?: string
  explain?: string
  icon?: string
  cmds?: any[]
}

interface PluginItem {
  name: string
  version?: string
  description?: string
  logo?: string
  features?: PluginFeature[]
  installed?: boolean
  localVersion?: string
  path?: string
}

interface PluginDataItem {
  id: string
  data: any
  rev?: string
  updatedAt?: string
}

const props = defineProps<{
  plugin: PluginItem
  isLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'open'): void
  (e: 'download'): void
  (e: 'upgrade'): void
}>()

// Tab 状态
type TabId = 'detail' | 'commands' | 'data'
const activeTab = ref<TabId>('detail')

// README 状态
const readmeContent = ref<string>('')
const readmeLoading = ref(false)
const readmeError = ref<string>('')

// 插件数据状态
const pluginData = ref<PluginDataItem[]>([])
const dataLoading = ref(false)
const dataError = ref<string>('')

// 配置 marked
marked.setOptions({
  breaks: true, // 支持 GitHub 风格的换行
  gfm: true // 启用 GitHub Flavored Markdown
})

// 渲染 Markdown
const renderedMarkdown = computed(() => {
  if (!readmeContent.value) return ''
  return marked(readmeContent.value)
})

// 可用的 Tab（数据 Tab 仅在已安装时显示）
const availableTabs = computed(() => {
  const tabs = [
    { id: 'detail' as TabId, label: '详情' },
    { id: 'commands' as TabId, label: '指令列表' }
  ]

  if (props.plugin.installed) {
    tabs.push({ id: 'data' as TabId, label: '数据' })
  }

  return tabs
})

// 切换 Tab
function switchTab(tabId: TabId): void {
  activeTab.value = tabId

  // 切换到数据 Tab 时加载数据
  if (tabId === 'data' && !pluginData.value.length && !dataLoading.value) {
    loadPluginData()
  }
}

// 加载 README
async function loadReadme(): Promise<void> {
  if (!props.plugin.path) {
    readmeError.value = '插件路径不存在'
    return
  }

  readmeLoading.value = true
  readmeError.value = ''

  try {
    const result = await window.ztools.getPluginReadme(props.plugin.path)
    if (result.success && result.content) {
      readmeContent.value = result.content
    } else {
      readmeError.value = result.error || '读取失败'
    }
  } catch (error) {
    console.error('加载 README 失败:', error)
    readmeError.value = '读取失败'
  } finally {
    readmeLoading.value = false
  }
}

// 加载插件数据
async function loadPluginData(): Promise<void> {
  if (!props.plugin.name) {
    dataError.value = '插件名称不存在'
    return
  }

  dataLoading.value = true
  dataError.value = ''

  try {
    const result = await window.ztools.getPluginDbData(props.plugin.name)
    if (result.success) {
      pluginData.value = result.data || []
    } else {
      dataError.value = result.error || '获取失败'
    }
  } catch (error) {
    console.error('加载插件数据失败:', error)
    dataError.value = '获取失败'
  } finally {
    dataLoading.value = false
  }
}

// 版本比较函数
function compareVersions(v1: string, v2: string): number {
  if (!v1 || !v2) return 0
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)
  const len = Math.max(parts1.length, parts2.length)

  for (let i = 0; i < len; i++) {
    const num1 = parts1[i] || 0
    const num2 = parts2[i] || 0
    if (num1 < num2) return -1
    if (num1 > num2) return 1
  }
  return 0
}

// 判断是否可以升级
const canUpgrade = computed(() => {
  if (!props.plugin.installed || !props.plugin.localVersion || !props.plugin.version) return false
  return compareVersions(props.plugin.localVersion, props.plugin.version) < 0
})

function cmdKey(cmd: any): string {
  if (cmd && typeof cmd === 'object') {
    return cmd.label || cmd.text || cmd.name || ''
  }
  return String(cmd)
}

// 标准化 command 数据格式，适配 CommandTag 组件
function normalizeCommand(cmd: any): any {
  // 如果是对象（匹配指令）
  if (cmd && typeof cmd === 'object') {
    return {
      name: cmd.label || cmd.name,
      text: cmd.label,
      type: cmd.type,
      match: cmd.match
    }
  }
  // 如果是字符串（功能指令）
  return {
    text: String(cmd),
    type: 'text'
  }
}

// 查看数据详情
function viewDataDetail(item: PluginDataItem): void {
  alert(`数据 ID: ${item.id}\n\n${JSON.stringify(item.data, null, 2)}`)
}

// 组件挂载时加载 README
onMounted(() => {
  if (props.plugin.installed && props.plugin.path) {
    loadReadme()
  }
})
</script>

<style scoped>
.detail-content {
  padding: 16px;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.detail-left {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.detail-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.detail-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.detail-actions .btn {
  min-width: 60px;
}

/* 按钮 loading 状态 */
.btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-right-color: currentColor;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

/* 升级按钮中的 spinner */
.btn-warning .spinner {
  border-top-color: var(--text-on-primary);
  border-right-color: var(--text-on-primary);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.detail-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  object-fit: cover;
}

.detail-icon.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--active-bg);
  font-size: 28px;
}

.detail-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.detail-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-color);
}

.detail-version {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 4px 8px;
  background: var(--active-bg);
  border-radius: 6px;
}

.detail-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  word-break: break-word;
}

/* Tab 容器 */
.tab-container {
  margin-top: 20px;
  margin-left: 10px;
  margin-right: 10px;
}

.tab-header {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--divider-color);
  margin-bottom: 16px;
}

.tab-button {
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  bottom: -1px;
}

.tab-button:hover {
  color: var(--text-color);
  background: var(--hover-bg);
}

.tab-button.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.tab-content {
  min-height: 200px;
}

.tab-panel {
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Loading 和 Error 状态 */
.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 12px;
  color: var(--text-secondary);
}

.error-container {
  color: var(--error-color);
}

.empty-message {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
  font-size: 14px;
}

/* Markdown 内容样式 - 使用全局变量 */
.markdown-content {
  padding: 12px;
  font-size: 14px;
  line-height: 1.6;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3) {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

.markdown-content :deep(h1) {
  font-size: 1.8em;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.3em;
}

.markdown-content :deep(h2) {
  font-size: 1.5em;
}

.markdown-content :deep(h3) {
  font-size: 1.2em;
}

.markdown-content :deep(p) {
  margin: 0.8em 0;
}

.markdown-content :deep(a) {
  color: var(--primary-color);
}

.markdown-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 1em 0;
}

.markdown-content :deep(code) {
  padding: 2px 6px;
  background: var(--card-bg);
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9em;
}

.markdown-content :deep(pre) {
  padding: 12px;
  background: var(--card-bg);
  border-radius: 6px;
  overflow-x: auto;
  margin: 1em 0;
}

.markdown-content :deep(pre code) {
  padding: 0;
  background: transparent;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  padding-left: 1.5em;
  margin: 0.8em 0;
}

.markdown-content :deep(blockquote) {
  margin: 1em 0;
  padding: 0.5em 1em;
  border-left: 3px solid var(--primary-color);
  background: var(--card-bg);
  color: var(--text-secondary);
}

.markdown-content :deep(table) {
  border-collapse: collapse;
  margin: 1em 0;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
}

.markdown-content :deep(th) {
  background: var(--card-bg);
  font-weight: 600;
}

/* 指令列表样式 */
.feature-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 数据列表样式 */
.data-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.data-item {
  cursor: pointer;
  transition: all 0.2s;
}

.data-item:hover {
  background: var(--hover-bg);
  transform: translateX(2px);
}

.data-key {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
  font-family: monospace;
}
</style>
