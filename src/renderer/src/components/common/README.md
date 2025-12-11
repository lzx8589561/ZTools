# 通用组件

本目录包含项目中可复用的通用组件。

## 组件列表

### CollapsibleList - 可折叠列表

支持折叠/展开的应用列表组件，默认显示一行（9个），点击标题可展开。

**Props**

- `title` - 列表标题（必填）
- `apps` - 应用列表数据（必填）
- `draggable` - 是否支持拖拽排序，默认 `false`
- `expanded` - 是否展开，支持 `v-model:expanded`
- `selectedIndex` - 当前选中索引（用于键盘导航）
- `itemsPerRow` - 每行显示数量，默认 `9`
- `defaultVisibleRows` - 默认显示的行数（折叠时），默认 `1`

**Events**

- `@select` - 选中应用
- `@contextmenu` - 右键菜单
- `@update:apps` - 拖拽排序后更新列表（仅拖拽模式）

**示例**

```vue
<template>
  <!-- 普通列表 -->
  <CollapsibleList title="最近使用" :apps="recentApps" @select="handleSelect" />

  <!-- 可拖拽列表 -->
  <CollapsibleList
    v-model:expanded="isExpanded"
    title="固定应用"
    :apps="pinnedApps"
    :draggable="true"
    @update:apps="updateApps"
  />

  <!-- 默认显示两行 -->
  <CollapsibleList
    title="搜索结果"
    :apps="searchResults"
    :default-visible-rows="2"
    @select="handleSelect"
  />
</template>

<script setup lang="ts">
import CollapsibleList from './common/CollapsibleList.vue'

const recentApps = ref([...])
const pinnedApps = ref([...])
const isExpanded = ref(false)
</script>
```

---

## 添加新组件

1. 在此目录创建 `.vue` 文件，使用 PascalCase 命名
2. 使用 TypeScript + `<script setup>` 语法
3. 优先使用项目根目录 `CONTROL_GUIDE.md` 中定义的通用样式类
4. 在本 README 添加组件说明和用法示例
