declare namespace BrowserWindow {
  interface WebPreferences {
    devTools?: boolean
    preload?: string
    zoomFactor: number
    [key: string]: any
  }

  interface InitOptions {
    width?: number
    height?: number
    webPreferences: WebPreferences
    show?: boolean
    title?: string
    x?: number
    y?: number
    center?: boolean
    resizable?: boolean
    fullscreen?: boolean
    fullscreenable?: boolean
    skipTaskbar?: true
    closable?: boolean
    frame?: boolean
    alwayOnTop?: boolean
    [key: string]: any
  }

  interface NativeImage {
    toPng: (options?: { scaleFator?: number }) => Uint8Array
    toJPEG: (options?: { quality?: number }) => Uint8Array
    isEmpty: () => boolean
    [key: string]: any
  }

  interface PrinterSync {
    description: string
    displayName: string
    isDefault: boolean
    status: number
    options?: {
      'printer-location'?: string
      'printer-make-and-model'?: string
      system_driverinfo?: string
    }
  }

  type WebRTCIPHandlingPolicy =
    | 'default'
    | 'default_public_interface_only'
    | 'default_public_and_private_interfaces'
    | 'disable_non_proxied_udp'

  interface WebContents {
    id: number
    capturePage: () => Promise<NativeImage>
    closeDevTools: () => void
    copy: () => void
    copyImageAt: (x: number, y: number) => void
    cut: () => void
    /**
     * @deprecated
     */
    decrementCapturerCount: () => any
    delete: () => void
    disableDeviceEmulation: () => void
    enableDeviceEmulation: () => void
    executeJavaScript: <T>(code: string, userGesture?: boolean) => Promise<T>
    findInPage: (
      text: string,
      options?: {
        forward?: boolean
        findNext?: boolean
        matchCase?: boolean
      }
    ) => number
    focus: () => void
    getBackgroundThrottling: () => boolean
    getFrameRate: () => number
    getOSProcessId: () => number
    getPrinters: () => PrinterSync[]
    getProcessId: () => number
    getUserAgent: () => string
    getWebRTCIPHandlingPolicy: () => WebRTCIPHandlingPolicy
    getZoomFactor: () => number
    /**
     * @deprecated
     */
    incrementCapturerCount: () => any
    insertCSS: (
      css: string,
      options?: {
        /**
         * @default 'author'
         */
        cssOrigin?: 'user' | 'author'
      }
    ) => Promise<string>
    insertText: (text: string) => Promise<void>
    invalidate: () => void
    isAudioMuted: () => boolean
    isBeingCaptured: () => boolean
    isCrashed: () => boolean
    isCurrentlyAudible: () => boolean
    isDestroyed: () => boolean
    isDevToolsFocused: () => boolean
    isDevToolsOpened: () => boolean
    isFocused: () => boolean
    isLoading: () => boolean
    isLoadingMainFrame: () => boolean
    isOffscreen: () => boolean
    isPainting: () => void
    isWaitingForResponse: () => boolean
    openDevTools: (options?: {
      mode: 'left' | 'right' | 'bottom' | 'undocked' | 'detach'
      activate?: boolean
      title?: string
    }) => void
    paste: () => void
    pasteAndMatchStyle: () => void
    print: (
      options?: Record<string, any>,
      callback?: (success: boolean, errorType?: string) => void
    ) => void
    printToPDF: (options: Record<string, any>) => Promise<Uint8Array>
    redo: () => void
    removeInsertedCSS: (key: string) => Promise<void>
    replace: (text: string) => void
    replaceMisspelling: (text: string) => void
    savePage: (fullPath: string, saveType: 'HTMLOnly' | 'HTMLComplete' | 'MHTML') => Promise<void>
    selectAll: () => void
    sendInputEvent: (e: any) => void
    setAudioMuted: (muted: boolean) => void
    setBackgroundThrottling: (allowed: boolean) => void
    setFrameRate: (fps: number) => void
    setIgnoreMenuShortcuts: (ignore: boolean) => void
    setUserAgent: (userAgent: string) => void
    setWebRTCIPHandlingPolicy: (policy: WebRTCIPHandlingPolicy) => void
    setZoomFactor: (factor: number) => void
    startPainting: () => void
    stopFindInPage: (action: 'clearSelection' | 'keepSelection' | 'activateSelection') => void
    stopPainting: () => void
    takeHeapSnapshot: (filePath: string) => Promise<void>
    toggleDevTools: () => void
    undo: () => void
    unselect: () => void

    [key: string]: any
  }

  interface Rectangle {
    x: number
    y: number
    width: number
    height: number
  }

  interface WindowInstance {
    id: number
    webContents: WebContents
    show: () => void
    hide: () => void
    destory: () => void
    close: () => void
    isFocused: () => boolean
    isDestroyed: () => boolean
    setResizable: (resizable: boolean) => void
    setSize: (width: number, height: number) => void
    getSize: () => [width: number, height: number]
    isVisible: () => boolean
    maximize: () => void
    unmaximize: () => void
    isMaximized: () => void
    minimize: () => void
    restore: () => void
    isMinimized: () => boolean
    setFullScreen: (flag: boolean) => void
    isFullScreen: () => boolean
    isNormal: () => boolean
    setAspectRatio: (aspectiRotio: number) => void
    setBackgroundColor: (backgroundColor: string) => void
    getBounds: () => Rectangle
    getBackgroundColor: () => string
    setContentBounds: (bounds: Rectangle) => void
    getContentBounds: () => Rectangle
    getNormalBounds: () => Rectangle
    setEnabled: (enable: boolean) => void
    isEnabled: () => boolean
    setContentSize: (width: number, height: number) => void
    getContentSize: () => [width: number, height: number]
    setMinimumSize: (width: number, height: number) => void
    getMinimumSize: () => [width: number, height: number]
    setMaximumSize: (width: number, height: number) => void
    getMaximumSize: () => [width: number, height: number]
    isResizable: () => boolean
    setFullScreenable: (fullscreenable: boolean) => void
    isFullScreenable: () => boolean
    setClosable: (closable: boolean) => void
    isClosable: () => boolean
    setAlwaysOnTop: (flag: boolean) => void
    isAlwaysOnTop: () => boolean
    moveTop: () => void
    setPosition: (x: number, y: number) => void
    getPosition: () => [x: number, y: number]
    setTitle: (title: string) => void
    getTitle: () => string
    flashFrame: (flag: boolean) => void
    setKiosk: (flag: boolean) => void
    isKiosk: () => boolean
    focusOnWebView: () => void
    blurWebView: () => void
    capturePage: (
      rect?: Rectangle,
      options?: {
        stayHidden?: boolean
        stayAwake?: boolean
      }
    ) => Promise<NativeImage>
    reload: () => void

    [key: string]: any
  }
}
