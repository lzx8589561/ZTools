# 同步更新指南

本文档说明如何从 uTools 官方同步 API 类型定义的更新。

## 自动同步（推荐）

直接运行同步脚本：

```bash
# 在 ZTools 根目录
node scripts/sync-api-types.js

# 或使用 npm script
npm run sync-api-types
```

脚本会自动：

1. 拉取/更新 uTools 最新源码
2. 转换所有文件（utools → ztools）
3. 生成 ZTools 特定文件
4. 记录同步版本信息

## 手动检查更新

### 监控 uTools 更新

- **Watch GitHub**: https://github.com/uTools-Labs/utools-api-types
- **RSS Feed**: https://github.com/uTools-Labs/utools-api-types/commits/main.atom

### 查看当前同步版本

```bash
cat ztools-api-types/package.json | grep "utools-version"

# 或 Windows PowerShell
Get-Content ztools-api-types\package.json | Select-String "utools-version"
```

当前同步版本信息保存在 `ztools-api-types/package.json` 的以下字段：

- `utools-version`: uTools 源版本号
- `utools-commit`: 源仓库的 Git commit hash
- `sync-date`: 同步日期

## 同步后验证

```bash
# 1. 检查主项目
npm run build

# 2. 检查 CLI
cd ztools-plugin-cli
npm install
npm run build

# 3. 创建测试插件
cd ..
node ztools-plugin-cli/bin/ztools.js create test-plugin
cd test-plugin
npm install

# 4. 在 IDE 中验证类型提示
# - 打开 preload.js
# - 输入 window.ztools. 查看智能提示
# - 检查 plugin.json 的 Schema 提示
```

## 发布新版本

当同步了新的 uTools API 后，按以下步骤发布更新：

```bash
cd ztools-api-types

# 1. 检查变更
git diff

# 2. 更新版本号
# - patch: 小改动、文档更新
# - minor: 新增 API
# - major: 破坏性变更
npm version patch  # 或 minor/major

# 3. 发布到 npm
npm publish

# 4. 提交变更
cd ..
git add ztools-api-types/
git commit -m "chore(ztools-api-types): sync with utools-api-types@x.x.x"
git push
```

## 定期同步建议

### 同步频率

- **定期检查**: 每月或每季度
- **主动同步**: 当 uTools 有重要更新时
- **按需同步**: 插件开发者反馈 API 不一致时

### 变更类型对应的版本更新

- **新 API 添加**: minor 版本（1.0.0 → 1.1.0）
- **文档/注释改进**: patch 版本（1.0.0 → 1.0.1）
- **API 签名变更**: major 版本（1.0.0 → 2.0.0）

### 通知机制

如果有重大 API 变更，应该：

1. 在 ZTools README 中发布公告
2. 更新 CLI 模板
3. 通知活跃的插件开发者

## 故障排查

### 同步失败

```bash
# 清理缓存重试
rm -rf .ztools-api-types-source
node scripts/sync-api-types.js
```

### Git 权限问题

如果遇到 Git 克隆失败：

```bash
# 使用 SSH 代替 HTTPS（需要配置 SSH key）
# 修改 scripts/sync-api-types.js 中的 UTOOLS_REPO
```

### 类型定义错误

如果生成的类型有问题：

1. 检查 `scripts/sync-api-types.js` 的替换规则
2. 手动修复 `ztools-api-types/` 中的文件
3. 更新脚本防止下次同步覆盖

## 脚本维护

### 添加新的替换规则

编辑 `scripts/sync-api-types.js` 的 `REPLACEMENTS` 数组：

```javascript
const REPLACEMENTS = [
  { from: /pattern/g, to: 'replacement' }
  // ... 添加新规则
]
```

### 添加新的文件转换

编辑 `FILES_TO_CONVERT` 数组：

```javascript
const FILES_TO_CONVERT = [
  'index.d.ts'
  // ... 添加新文件
]
```

## 版本兼容性

### ZTools vs uTools API 版本

| ZTools | uTools API Types | 说明     |
| ------ | ---------------- | -------- |
| 1.0.x  | 7.2.0            | 初始版本 |

### 插件开发者使用

插件开发者应在 `package.json` 中指定版本：

```json
{
  "devDependencies": {
    "ztools-api-types": "^1.0.0"
  }
}
```

使用 `^` 语义化版本自动获取兼容更新。

## 参考链接

- **uTools 官方类型**: https://github.com/uTools-Labs/utools-api-types
- **ZTools 主仓库**: https://github.com/ZToolsCenter/ZTools
- **npm 包**: https://www.npmjs.com/package/ztools-api-types（发布后）
