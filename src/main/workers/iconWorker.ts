import extractFileIcon from 'extract-file-icon'
import { parentPort } from 'worker_threads'

if (parentPort) {
  parentPort.on('message', (message) => {
    const { id, exePath } = message
    try {
      // 在 Worker 线程中同步执行，不阻塞主线程
      const buffer = extractFileIcon(exePath, 32)
      parentPort?.postMessage({ id, buffer })
    } catch (error) {
      parentPort?.postMessage({ id, error: error instanceof Error ? error.message : String(error) })
    }
  })
}
