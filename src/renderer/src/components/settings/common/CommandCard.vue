<template>
  <div class="card command-card">
    <div class="command-icon">
      <span v-if="command.icon && command.icon.length <= 2" class="icon-emoji">
        {{ command.icon }}
      </span>
      <!-- 特殊图标使用渐变背景 -->
      <div
        v-else-if="command.icon && !hasError && command.needsIconFilter"
        class="adaptive-icon"
        :style="{ '--icon-url': `url(${command.icon})` }"
      ></div>
      <!-- 普通图标 -->
      <img
        v-else-if="command.icon && !hasError"
        :src="command.icon"
        draggable="false"
        @error="handleIconError"
      />
      <div v-else class="icon-placeholder">
        {{ command.name.charAt(0).toUpperCase() }}
      </div>
    </div>
    <div class="command-details">
      <div class="command-title">{{ command.name }}</div>
      <div class="command-meta">
        <slot name="meta">
          <template v-if="command.subType === 'app'">
            <span class="meta-path">{{ command.path }}</span>
          </template>
          <template v-else-if="command.subType === 'system-setting'">
            <span v-if="command.category" class="meta-tag">{{ command.category }}</span>
            <span class="meta-path">{{ command.settingUri || command.path }}</span>
          </template>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Command {
  name: string
  icon?: string
  path?: string
  subType?: string
  category?: string
  settingUri?: string
  needsIconFilter?: boolean
}

defineProps<{
  command: Command
}>()

const hasError = ref(false)

function handleIconError(): void {
  hasError.value = true
}
</script>

<style scoped>
.command-card {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  cursor: default;
  transition: all 0.2s;
}

.command-card:hover {
  background: var(--hover-bg);
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

.command-icon img,
.command-icon .adaptive-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 6px;
}

.icon-emoji {
  font-size: 24px;
  line-height: 1;
}

.icon-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--control-bg);
  color: var(--text-secondary);
  font-size: 16px;
  font-weight: 600;
  border-radius: 6px;
}

.command-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.command-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  line-height: 1.4;
}

.command-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.meta-tag {
  padding: 2px 8px;
  background: var(--control-bg);
  border-radius: 4px;
  font-weight: 500;
}

.meta-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
