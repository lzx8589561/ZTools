/**
 * 全局样式定义
 * 用于注入到插件 WebContentsView 和独立窗口
 *
 * 注意：这些样式与 src/renderer/src/style.css 中的滚动条样式保持一致
 * 主窗口使用 style.css，插件使用这里的注入样式
 */

/**
 * 全局滚动条样式
 * 如果插件没有自定义滚动条样式，则使用这个默认样式
 *
 * 对应 style.css 第 562-603 行
 */
export const GLOBAL_SCROLLBAR_CSS = `
  /* 全局滚动条样式 - 仅在插件未自定义时生效 */
  ::-webkit-scrollbar {
    width: 6px !important;
    height: 6px !important;
  }

  ::-webkit-scrollbar-track {
    background: transparent !important;
  }

  ::-webkit-scrollbar-thumb {
    border-radius: 3px !important;
  }

  /* 亮色模式滚动条 */
  @media (prefers-color-scheme: light) {
    ::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.15) !important;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.25) !important;
    }

    ::-webkit-scrollbar-thumb:active {
      background: rgba(0, 0, 0, 0.35) !important;
    }
  }

  /* 暗色模式滚动条 */
  @media (prefers-color-scheme: dark) {
    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2) !important;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.35) !important;
    }

    ::-webkit-scrollbar-thumb:active {
      background: rgba(255, 255, 255, 0.5) !important;
    }
  }
`
