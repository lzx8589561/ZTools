declare module 'electron' {
  type ClipboardType = 'selection' | 'clipboard'
  module clipboard {
    function availableFormats(type?: ClipboardType): void
    function clear(type?: ClipboardType): void
    function has(fmt: string, type?: ClipboardType): boolean
    function read(fmt: string): string
    function readBookmark(): {
      title: string
      url: string
    }

    function readBuffer(fmt: string): Uint8Array
    function readHTML(type?: ClipboardType): string
    function readImage(type?: ClipboardType): BrowserWindow.NativeImage
    function readRTF(type?: ClipboardType): string
    function readText(type?: ClipboardType): string
    function write(
      data: {
        text?: string
        html?: string
        image?: BrowserWindow.NativeImage
        rtf?: string
        bookmark?: string
      },
      type?: ClipboardType
    ): void
    function writeBookmark(title: string, url: string, type?: ClipboardType): void
    function writeBuffer(fmt: string, buffer: Uint8Array, type?: ClipboardType): void
    function writeHTML(markup: string, type?: ClipboardType): void
    function writeImage(img: BrowserWindow.NativeImage, type?: ClipboardType): void
    function writeRTF(text: string, type?: ClipboardType): void
    function writeText(text: string, type?: ClipboardType): void
  }
  interface UIpcSendEventInit {
    senderId: number
  }
  type UIpcSendEventListener<T extends any[]> = (event: UIpcSendEventInit, ...args: T) => void
  module ipcRenderer {
    function on<T extends any[] = any[]>(channel: string, listener: UIpcSendEventListener<T>): void
    function once<T extends any[] = any[]>(
      channel: string,
      listener: UIpcSendEventListener<T>
    ): void
    function off<T extends any[] = any[]>(channel: string, listener: UIpcSendEventListener<T>): void
    function sendTo<T extends any[] = any[]>(id: number, channel: string, ...args: T): void
  }

  module contextBridge {}

  module webFrame {}

  module shell {}

  module nativeImage {
    type NativeImage = BrowserWindow.NativeImage
    function createEmpty(): NativeImage
    function createFromPath(path: string): NativeImage
    function createFromBitmap(
      buffer: Uint8Array,
      options: {
        width: number
        height: number
        scaleFator?: number
      }
    ): NativeImage
    function createFromBuffer(
      buffer: Uint8Array,
      options?: {
        width?: number
        height?: number
        scaleFator?: number
      }
    ): NativeImage
    function createFromDataURL(dataURL: string): NativeImage
  }
}
