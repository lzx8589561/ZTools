<template>
  <div class="all-commands-container">
    <!-- 左侧：来源列表 -->
    <div class="sources-panel">
      <div class="panel-header">
        <h3>指令来源</h3>
      </div>
      <div class="sources-list">
        <!-- 系统应用 -->
        <div
          :class="['source-item', { active: selectedSource?.subType === 'app' }]"
          @click="selectSource({ subType: 'app', name: '系统应用' })"
        >
          <span class="source-icon">💻</span>
          <span class="source-name">系统应用</span>
          <span class="source-badge">{{ appCount }}</span>
        </div>

        <!-- 系统设置 -->
        <div
          v-if="settingCount > 0"
          :class="['source-item', { active: selectedSource?.subType === 'system-setting' }]"
          @click="selectSource({ subType: 'system-setting', name: '系统设置' })"
        >
          <span class="source-icon">⚙️</span>
          <span class="source-name">系统设置</span>
          <span class="source-badge">{{ settingCount }}</span>
        </div>

        <!-- 插件分组标题 -->
        <div v-if="plugins.length > 0" class="section-divider">
          <span>插件</span>
        </div>

        <!-- 插件列表 -->
        <div
          v-for="plugin in plugins"
          :key="plugin.path"
          :class="['source-item', { active: selectedSource?.path === plugin.path }]"
          @click="selectSource(plugin)"
        >
          <img v-if="plugin.logo" :src="plugin.logo" class="source-icon plugin-icon" />
          <span v-else class="source-icon">🧩</span>
          <span class="source-name">{{ plugin.name }}</span>
          <span class="source-badge">{{ getPluginCommandCount(plugin) }}</span>
        </div>
      </div>
    </div>

    <!-- 右侧：指令详情 -->
    <div class="commands-panel">
      <!-- 头部 -->
      <div class="panel-header">
        <!-- Tab 切换 -->
        <div v-if="hasCommands" class="tab-group">
          <button
            :class="['tab-btn', { active: activeTab === 'text' }]"
            @click="activeTab = 'text'"
          >
            功能指令
            <span class="tab-count">{{ textFeaturesCount }}</span>
          </button>
          <button
            :class="['tab-btn', { active: activeTab === 'match' }]"
            @click="activeTab = 'match'"
          >
            匹配指令
            <span class="tab-count">{{ matchFeaturesCount }}</span>
          </button>
        </div>
      </div>

      <!-- 指令列表 -->
      <div class="commands-content">
        <!-- 未选择来源 -->
        <div v-if="!selectedSource" class="empty-state">
          <span class="empty-icon">📋</span>
          <p>从左侧选择一个来源查看指令</p>
        </div>

        <!-- 功能指令 Tab -->
        <div v-else-if="activeTab === 'text'" class="command-list">
          <div v-if="textFeaturesCount === 0" class="empty-state">
            <span class="empty-icon">🔍</span>
            <p>暂无功能指令</p>
          </div>

          <!-- 系统应用/设置：单个显示 -->
          <template
            v-if="selectedSource?.subType === 'app' || selectedSource?.subType === 'system-setting'"
          >
            <div v-for="(cmd, index) in systemCommands" :key="index" class="card command-card">
              <div class="command-icon">
                <span v-if="cmd.icon && cmd.icon.length <= 2" class="icon-emoji">{{
                  cmd.icon
                }}</span>
                <img
                  v-else-if="cmd.icon && !hasIconError(cmd)"
                  :src="cmd.icon"
                  :class="{ 'system-setting-icon': cmd.subType === 'system-setting' }"
                  @error="() => onIconError(cmd)"
                />
                <div v-else class="icon-placeholder">
                  {{ cmd.name.charAt(0).toUpperCase() }}
                </div>
              </div>
              <div class="command-details">
                <div class="command-title">{{ cmd.name }}</div>
                <div class="command-meta">
                  <template v-if="cmd.subType === 'app'">
                    <span class="meta-path">{{ cmd.path }}</span>
                  </template>
                  <template v-else-if="cmd.subType === 'system-setting'">
                    <span v-if="cmd.category" class="meta-tag">{{ cmd.category }}</span>
                    <span class="meta-path">{{ cmd.settingUri || cmd.path }}</span>
                  </template>
                </div>
              </div>
            </div>
          </template>

          <!-- 插件：按 feature 分组显示 -->
          <template v-else>
            <div v-for="feature in groupedFeatures" :key="feature.code" class="card feature-card">
              <template v-if="feature.textCmds.length > 0">
                <div class="feature-title">
                  {{ feature.explain || feature.name }}
                </div>
                <div class="feature-commands">
                  <span v-for="(cmd, idx) in feature.textCmds" :key="idx" class="command-tag">
                    {{ cmd.text }}
                  </span>
                </div>
              </template>
            </div>
          </template>
        </div>

        <!-- 匹配指令 Tab -->
        <div v-else-if="activeTab === 'match'" class="command-list">
          <div v-if="matchFeaturesCount === 0" class="empty-state">
            <span class="empty-icon">🔍</span>
            <p>暂无匹配指令</p>
          </div>

          <!-- 插件：按 feature 分组显示 -->
          <div v-for="feature in groupedFeatures" :key="feature.code" class="card feature-card">
            <template v-if="feature.matchCmds.length > 0">
              <div class="feature-title">
                {{ feature.explain || feature.name }}
              </div>
              <div class="feature-commands">
                <span
                  v-for="(cmd, idx) in feature.matchCmds"
                  :key="idx"
                  :class="['command-tag', `tag-${cmd.type}`]"
                >
                  <template v-if="cmd.type === 'regex'">
                    <code class="tag-code">{{ cmd.match.match }}</code>
                  </template>
                  <template v-else-if="cmd.type === 'over'">
                    <span class="tag-text"
                      >长度 {{ cmd.match.minLength }}-{{ cmd.match.maxLength || 10000 }}</span
                    >
                  </template>
                  <span class="tag-badge">{{ cmd.type === 'regex' ? '正则' : '任意' }}</span>
                </span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCommandDataStore } from '../../stores/commandDataStore'

const appDataStore = useCommandDataStore()

interface Source {
  type?: string
  subType?: string
  name: string
  path?: string
  logo?: string
}

const plugins = ref<any[]>([])
const selectedSource = ref<Source | null>(null)
const activeTab = ref<'text' | 'match'>('text')

// 记录图标加载失败的指令
const iconErrors = ref<Set<string>>(new Set())

// 所有指令
const allCommands = computed(() => appDataStore.commands)
const allRegexCommands = computed(() => appDataStore.regexCommands)

// 统计
const appCount = computed(
  () => allCommands.value.filter((c) => c.type === 'direct' && c.subType === 'app').length
)

const settingCount = computed(
  () =>
    allCommands.value.filter((c) => c.type === 'direct' && c.subType === 'system-setting').length
)

// 当前选中来源的指令（系统应用/设置）
const systemCommands = computed(() => {
  if (!selectedSource.value) return []

  const source = selectedSource.value

  if (source.subType === 'app') {
    return allCommands.value.filter((c) => c.type === 'direct' && c.subType === 'app')
  }

  if (source.subType === 'system-setting') {
    return allCommands.value.filter((c) => c.type === 'direct' && c.subType === 'system-setting')
  }

  return []
})

// 按 feature 分组的插件功能
const groupedFeatures = computed(() => {
  if (!selectedSource.value || !selectedSource.value.path) return []

  const source = selectedSource.value
  const featureMap = new Map<
    string,
    {
      code: string
      name: string
      explain: string
      icon: string
      textCmds: any[]
      matchCmds: any[]
    }
  >()

  // 收集功能指令
  allCommands.value
    .filter((c) => c.type === 'plugin' && c.path === source.path && c.featureCode)
    .forEach((cmd) => {
      const key = cmd.featureCode || ''
      if (!featureMap.has(key)) {
        featureMap.set(key, {
          code: cmd.featureCode || '',
          name: cmd.name,
          explain: cmd.pluginExplain || '',
          icon: cmd.icon || '',
          textCmds: [],
          matchCmds: []
        })
      }
      const feature = featureMap.get(key)!
      if (cmd.cmdType === 'text') {
        // 对于功能指令，name 就是指令文本
        feature.textCmds.push({
          text: cmd.name,
          name: cmd.name
        })
      }
    })

  // 收集匹配指令
  allRegexCommands.value
    .filter((c) => c.path === source.path)
    .forEach((cmd) => {
      const key = cmd.featureCode || ''
      if (!featureMap.has(key)) {
        featureMap.set(key, {
          code: cmd.featureCode || '',
          name: cmd.name,
          explain: cmd.pluginExplain || '',
          icon: cmd.icon || '',
          textCmds: [],
          matchCmds: []
        })
      }
      const feature = featureMap.get(key)!
      feature.matchCmds.push({
        type: cmd.cmdType,
        match: cmd.matchCmd || { type: '', match: '' },
        name: cmd.name
      })
    })

  return Array.from(featureMap.values())
})

const hasCommands = computed(() => {
  return (
    systemCommands.value.length > 0 ||
    groupedFeatures.value.some((f) => f.textCmds.length > 0 || f.matchCmds.length > 0)
  )
})

const textFeaturesCount = computed(() => {
  if (
    selectedSource.value?.subType === 'app' ||
    selectedSource.value?.subType === 'system-setting'
  ) {
    return systemCommands.value.length
  }
  // 统计有功能指令的功能数量
  return groupedFeatures.value.filter((f) => f.textCmds.length > 0).length
})

const matchFeaturesCount = computed(() => {
  // 统计有匹配指令的功能数量
  return groupedFeatures.value.filter((f) => f.matchCmds.length > 0).length
})

// 图标加载失败处理
function onIconError(cmd: any): void {
  const key = `${cmd.path}-${cmd.featureCode || ''}-${cmd.name}`
  iconErrors.value.add(key)
  console.warn('图标加载失败:', cmd.name)
}

// 检查图标是否加载失败
function hasIconError(cmd: any): boolean {
  const key = `${cmd.path}-${cmd.featureCode || ''}-${cmd.name}`
  return iconErrors.value.has(key)
}

// 获取插件功能数量（所有唯一的 featureCode）
function getPluginCommandCount(plugin: any): number {
  const allFeatureCodes = new Set<string>()

  // 收集功能指令的 featureCode
  allCommands.value
    .filter((c) => c.type === 'plugin' && c.path === plugin.path && c.featureCode)
    .forEach((c) => {
      if (c.featureCode) {
        allFeatureCodes.add(c.featureCode)
      }
    })

  // 收集匹配指令的 featureCode
  allRegexCommands.value
    .filter((c) => c.path === plugin.path && c.featureCode)
    .forEach((c) => {
      if (c.featureCode) {
        allFeatureCodes.add(c.featureCode)
      }
    })

  // 返回唯一功能数量（同一个 feature 不会被计数两次）
  return allFeatureCodes.size
}

// 选择来源
function selectSource(source: Source): void {
  selectedSource.value = source
  activeTab.value = 'text'
}

// 初始化
onMounted(async () => {
  plugins.value = await window.ztools.getPlugins()
  // 默认选中系统应用
  if (appCount.value > 0) {
    selectSource({ subType: 'app', name: '系统应用' })
  }
})
</script>

<style scoped>
.all-commands-container {
  display: flex;
  height: 100%;
  background: var(--bg-color);
}

/* === 左侧面板 === */
.sources-panel {
  width: 220px;
  border-right: 1px solid var(--divider-color);
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
}

.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--divider-color);
  background: var(--bg-color);
  height: 56px;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.panel-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-color);
}

.sources-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.source-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-color);
}

.source-item:hover {
  background: var(--hover-bg);
}

.source-item.active {
  background: var(--active-bg);
  color: var(--primary-color);
  font-weight: 500;
}

.source-icon {
  width: 20px;
  height: 20px;
  margin-right: 10px;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.plugin-icon {
  border-radius: 4px;
  object-fit: contain;
}

.source-name {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-badge {
  padding: 2px 6px;
  font-size: 11px;
  background: var(--control-bg);
  color: var(--text-secondary);
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.source-item.active .source-badge {
  background: var(--primary-light-bg);
  color: var(--primary-color);
}

.section-divider {
  margin: 12px 0 8px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* === 右侧面板 === */
.commands-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.commands-panel .panel-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--divider-color);
  background: var(--bg-color);
  height: 56px;
  box-sizing: border-box;
}

/* Tab 切换组 */
.tab-group {
  display: flex;
  gap: 6px;
  background: var(--control-bg);
  padding: 3px;
  border-radius: 8px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 13px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.tab-btn:hover {
  background: var(--hover-bg);
  color: var(--text-color);
}

.tab-btn.active {
  background: var(--bg-color);
  color: var(--primary-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tab-count {
  font-size: 11px;
  padding: 2px 6px;
  background: var(--control-bg);
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.tab-btn.active .tab-count {
  background: var(--primary-light-bg);
  color: var(--primary-color);
}

/* === 指令列表 === */
.commands-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.command-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.command-card {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  cursor: default;
  transition: all 0.2s;
}

.command-card:hover {
  background: var(--hover-bg);
  transform: translateX(2px);
}

/* Feature 卡片 */
.feature-card {
  display: flex;
  flex-direction: column;
  padding: 12px 14px;
  cursor: default;
  transition: all 0.2s;
  gap: 8px;
}

.feature-card:hover {
  background: var(--hover-bg);
}

.feature-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
  line-height: 1.4;
}

.feature-commands {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.command-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--primary-light-bg);
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 12px;
  color: var(--primary-color);
  font-weight: 500;
  transition: all 0.2s;
  cursor: default;
  user-select: none;
}

.command-tag:hover {
  background: var(--primary-color);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(var(--primary-rgb), 0.25);
}

/* 正则匹配指令 */
.command-tag.tag-regex {
  background: var(--warning-light-bg);
  color: var(--warning-color);
}

.command-tag.tag-regex:hover {
  background: var(--warning-color);
  color: white;
}

/* 任意文本匹配指令 */
.command-tag.tag-over {
  background: var(--purple-light-bg);
  color: var(--purple-color);
}

.command-tag.tag-over:hover {
  background: var(--purple-color);
  color: white;
}

/* 正则表达式代码 */
.tag-code {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 11px;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.command-tag:hover .tag-code {
  background: rgba(255, 255, 255, 0.3);
}

/* 文本说明 */
.tag-text {
  font-size: 11px;
  opacity: 0.9;
}

/* 类型徽章 */
.tag-badge {
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.command-tag:hover .tag-badge {
  background: rgba(255, 255, 255, 0.25);
}

.command-icon {
  width: 36px;
  height: 36px;
  margin-right: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.command-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 6px;
}

/* 系统设置图标在亮色模式下反转颜色 */
.command-icon img.system-setting-icon {
  filter: var(--system-icon-filter);
}

.icon-emoji {
  font-size: 24px;
}

.icon-placeholder {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: var(--primary-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  font-weight: 600;
}

.command-details {
  flex: 1;
  min-width: 0;
}

.command-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 4px;
}

.command-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.meta-tag {
  padding: 3px 8px;
  font-size: 11px;
  font-family: 'Consolas', 'Monaco', monospace;
  background: var(--control-bg);
  color: var(--primary-color);
  border-radius: 4px;
  font-weight: 500;
}

.meta-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.meta-path {
  font-size: 11px;
  font-family: 'Consolas', 'Monaco', monospace;
  color: var(--text-secondary);
  opacity: 0.6;
  word-break: break-all;
  line-height: 1.4;
}

.match-rule {
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.match-rule code {
  font-family: 'Consolas', 'Monaco', monospace;
  padding: 3px 8px;
  background: var(--control-bg);
  border-radius: 4px;
  font-size: 11px;
  color: var(--text-color);
  font-weight: 500;
}

.length-info {
  font-size: 11px;
  color: var(--text-secondary);
}

.type-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.badge-text {
  background: var(--primary-light-bg);
  color: var(--primary-color);
}

.badge-regex {
  background: var(--warning-light-bg);
  color: var(--warning-color);
}

.badge-over {
  background: var(--purple-light-bg);
  color: var(--purple-color);
}

/* === 空状态 === */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}
</style>
