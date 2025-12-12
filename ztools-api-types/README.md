# ZTools 官方类型辅助文件

## 提供代码提示文件

- [ztools.api.d.ts](./ztools.api.d.ts) `window.ztools` 对象类型提示
- [electron.d.ts](./electron.d.ts) preload 内 `electron` 模块导入提示
- [resource/utools.schema](./resource/ztools.schema.json) 配置文件 JSON Schema

## `window.ztools` 对象类型提示

目前将 utools 挂载到全局 window 下，提供在渲染层跟 preload 层的群体代码提示

第一步

```bash
npm install ztools-api-types --save-dev
```

第二步 配置 tsconfig.json

```json
{
  "compilerOptions": {
    "types": ["ztools-api-types"]
  },
  "includes": [
    // 如果使用ts或者框架，请添加需要类型提示的文件范围
    // 案例：
    // src/**/*.ts
    // preload.js
  ]
}
```

### API 代码示例

```javascript
// 默认浏览器打开网页
window.ztools.shellOpenExternal('https://u.tools')

// 在资源管理器中显示文件
window.ztools.shellShowItemInFolder('d:\\test')

// ubrowser 网页自动化
window.ztools.ubrowser
  .goto('https://cn.bing.com')
  .value('#sb_form_q', 'ZTools')
  .click('#sb_form_go')
  .run({ width: 1000, height: 600 })

// 值键对方式存储数据
window.ztools.dbStorage.setItem('key', 'value')

// 执行截图
window.ztools.screenCapture((imagebase64) => {
  // 截图完的回调
})

// 执行取色
window.ztools.screenColorPick(({ hex, rgb }) => {
  // 取色完的回调
})
```

## `electron` 模块代码提示

引入此类型文件后，支持在 cjs 模式下也提供定制化的 `electron` 模块 api 提示

> 在 ZTools 中，可以通过 cjs 的形式直接使用部分 `electron` 的 api ，但是此部分支持是直接通过 ZTools 内置的 nodejs 实现，因此请勿下载额外的 `electron` 依赖。

### API 代码示例

```javascript
// preload.js

const { ipcRenderer } = require('electron')

window.onMyChannel = (callback) => {
  ipcRenderer.on('myChannel', (e, data) => {
    callback?.({
      ...data,
      senderId: e.senderId
    })
  })
}

window.ipc = ipcRenderer
```

## 配置文件 JSON Schema

通过 JSON Schema 实现了在 `plugin.json` 内的代码提示

引入 JSON Schema 需要在 `plugin.json` 的第一行添加 `$schema` 字段：

```json
{
  "$schema": "./node_modules/ztools-api-types/resource/ztools.schema.json"
}
```

> 添加 `$schema` 时，需要注意跟 `plugin.json` 所在的文件位置有关系，必须是相对于 `plugin.json` 的位置
