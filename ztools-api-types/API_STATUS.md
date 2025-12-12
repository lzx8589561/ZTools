# ZTools API 实现状态

> 本文档由脚本自动生成，同步自 utools-api-types@7.2.0

## ✅ 已完全实现

### 平台检测

- `isMacOs()` / `isMacOS()`
- `isWindows()`
- `isLinux()`
- `isDarkColors()`

### 插件生命周期

- `onPluginEnter(callback)`
- `onPluginReady(callback)`
- `outPlugin(isKill?)`

### UI 控制

- `showNotification(body)`
- `setExpendHeight(height)`
- `setSubInput(onChange?, placeholder?, isFocus?)`
- `setSubInputValue(text)`
- `subInputFocus()`

### 窗口操作

- `hideMainWindow(isRestorePreWindow?)`
- `createBrowserWindow(url, options?, callback?)`

### 数据库 API

- `db.*` - 完整的同步/异步 API
- `dbStorage.*` - 类 localStorage API

### 动态 Feature API

- `getFeatures(codes?)`
- `setFeature(feature)`
- `removeFeature(code)`

### 剪贴板 API

- `clipboard.*` - 完整的剪贴板管理 API
- `copyText(text)`, `copyImage(image)`, `copyFile(filePath)`

### 系统对话框

- `getPath(name)`, `showSaveDialog(options)`, `showOpenDialog(options)`

### 屏幕功能

- `screenCapture(callback?)`
- `getPrimaryDisplay()`, `getAllDisplays()`
- 其他屏幕 API

### 其他工具

- `sendInputEvent(event)`
- `shellOpenExternal(url)`, `shellShowItemInFolder(fullPath)`
- `redirect(label, payload?)`
- 等等...

## ⏳ 计划实现

### ubrowser API（高优先级）

- 网页自动化完整 API

## 📝 兼容性说明

ZTools 致力于 100% 兼容 uTools 插件 API。未实现的 API 仍保留在类型定义中。

---

**同步信息**

- uTools 版本: 7.2.0
- Git Commit: 22df3aa
- 同步日期: 2025-12-12
