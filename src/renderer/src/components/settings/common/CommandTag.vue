<template>
  <span :class="['command-tag', tagClass]">
    <!-- 如果传入了 command 数据，自动渲染 -->
    <template v-if="command">
      <!-- 功能指令（文本） -->
      <template v-if="!command.type || command.type === 'text'">
        {{ command.text || command.label || command.name }}
      </template>

      <!-- 正则匹配 -->
      <template v-else-if="command.type === 'regex'">
        <span class="tag-badge">{{ command.match?.match }}</span>
        <Icon name="regex" :size="12" class="tag-icon" />
      </template>

      <!-- 任意文本 -->
      <template v-else-if="command.type === 'over'">
        <span class="tag-badge">{{ command.name }}</span>
        <span v-if="command.match" class="tag-badge">
          {{ command.match.minLength || 1 }}-{{ command.match.maxLength || 10000 }}
        </span>
        <Icon name="text" :size="12" class="tag-icon" />
      </template>

      <!-- 图片 -->
      <template v-else-if="command.type === 'img'">
        <span class="tag-badge">{{ command.name }}</span>
        <Icon name="image" :size="12" class="tag-icon" />
      </template>

      <!-- 文件/文件夹 -->
      <template v-else-if="command.type === 'files'">
        <span class="tag-badge">{{ command.name }}</span>
        <span v-if="command.match?.extensions" class="tag-badge">
          {{ command.match.extensions.slice(0, 3).join(', ') }}
          {{ command.match.extensions.length > 3 ? '...' : '' }}
        </span>
        <Icon
          :name="command.match?.fileType === 'directory' ? 'folder' : 'file'"
          :size="12"
          class="tag-icon"
        />
      </template>

      <!-- 窗口 -->
      <template v-else-if="command.type === 'window'">
        <span class="tag-badge">{{ command.name }}</span>
        <Icon name="window" :size="12" class="tag-icon" />
      </template>

      <!-- 其他类型 -->
      <template v-else>
        <span class="tag-badge">{{ command.name }}</span>
        <span class="tag-badge">{{ command.type }}</span>
      </template>
    </template>

    <!-- 如果没有 command，使用插槽 -->
    <slot v-else></slot>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Icon from '../../common/Icon.vue'

interface Command {
  text?: string
  label?: string
  name?: string
  type?: 'text' | 'regex' | 'over' | 'img' | 'files' | 'window' | string
  match?: {
    match?: string
    minLength?: number
    maxLength?: number
    extensions?: string[]
    fileType?: 'file' | 'directory'
  }
}

interface Props {
  command?: Command
  type?: 'text' | 'regex' | 'over'
}

const props = defineProps<Props>()

const tagClass = computed(() => {
  // 优先使用 command.type
  if (props.command?.type && props.command.type !== 'text') {
    return `tag-${props.command.type}`
  }
  // 否则使用 props.type
  return props.type ? `tag-${props.type}` : ''
})
</script>

<style scoped>
.command-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(14, 165, 233, 0.15);
  border: 1px solid rgba(14, 165, 233, 0.35);
  border-radius: 4px;
  font-size: 12px;
  color: #0ea5e9;
  font-weight: 500;
  transition: all 0.2s;
  cursor: default;
  user-select: none;
}

.command-tag:hover {
  background: #0ea5e9;
  color: white;
  border-color: #0ea5e9;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

/* 暗色模式下的功能指令标签 */
@media (prefers-color-scheme: dark) {
  .command-tag {
    background: rgba(56, 189, 248, 0.15);
    border: 1px solid rgba(56, 189, 248, 0.3);
    color: #7dd3fc;
  }

  .command-tag:hover {
    background: #38bdf8;
    color: #1f2937;
    border-color: #38bdf8;
  }
}

/* 统一的标签徽章 */
:deep(.tag-badge) {
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.command-tag:hover :deep(.tag-badge) {
  background: rgba(255, 255, 255, 0.35);
}

/* 标签图标 */
.tag-icon {
  flex-shrink: 0;
  opacity: 0.9;
}

/* 暗色模式下的标签徽章 */
@media (prefers-color-scheme: dark) {
  :deep(.tag-badge) {
    background: rgba(255, 255, 255, 0.15);
  }

  .command-tag:hover :deep(.tag-badge) {
    background: rgba(255, 255, 255, 0.25);
  }
}

/* 匹配指令样式 - regex */
.tag-regex {
  background: rgba(168, 85, 247, 0.15);
  border-color: rgba(168, 85, 247, 0.35);
  color: #a855f7;
}

.tag-regex:hover {
  background: #a855f7;
  border-color: #a855f7;
  color: white;
}

/* 匹配指令样式 - over */
.tag-over {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.35);
  color: #22c55e;
}

.tag-over:hover {
  background: #22c55e;
  border-color: #22c55e;
  color: white;
}

/* 暗色模式 */
@media (prefers-color-scheme: dark) {
  .tag-regex {
    background: rgba(192, 132, 252, 0.15);
    border-color: rgba(192, 132, 252, 0.3);
    color: #c084fc;
  }

  .tag-regex:hover {
    background: #c084fc;
    color: #1f2937;
    border-color: #c084fc;
  }

  .tag-over {
    background: rgba(74, 222, 128, 0.15);
    border-color: rgba(74, 222, 128, 0.3);
    color: #4ade80;
  }

  .tag-over:hover {
    background: #4ade80;
    color: #1f2937;
    border-color: #4ade80;
  }
}
</style>
