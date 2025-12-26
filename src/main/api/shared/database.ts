import { ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import lmdbInstance from '../../core/lmdb/lmdbInstance'
import pluginWindowManager from '../../core/pluginWindowManager'

/**
 * 数据库API模块 - 主程序和插件共享
 * 提供同步和异步两种API版本
 */
export class DatabaseAPI {
  private pluginManager: any = null

  public init(pluginManager: any): void {
    this.pluginManager = pluginManager
    this.setupIPC()
  }

  /**
   * 获取插件专属前缀
   * 如果请求来自插件，返回 "PLUGIN/{pluginName}/"
   * 否则返回 null（主程序使用）
   */
  private getPluginPrefix(event: IpcMainEvent | IpcMainInvokeEvent): string | null {
    // 1. 检查是否来自插件主 BrowserView
    const pluginInfo = this.pluginManager?.getPluginInfoByWebContents(event.sender)
    if (pluginInfo) {
      return `PLUGIN/${pluginInfo.name}/`
    }

    // 2. 检查是否来自插件创建的独立窗口
    const pluginName = pluginWindowManager.getPluginNameByWebContentsId(event.sender.id)
    if (pluginName) {
      return `PLUGIN/${pluginName}/`
    }

    return null
  }

  private setupIPC(): void {
    // ============ 同步API（供插件使用） ============
    ipcMain.on('db:put', (event, doc) => {
      const prefix = this.getPluginPrefix(event)
      if (prefix) {
        doc._id = prefix + doc._id
      }
      const result = lmdbInstance.put(doc)
      // 如果是插件调用，需要去除返回结果中的前缀
      if (prefix && result.id && result.id.startsWith(prefix)) {
        result.id = result.id.slice(prefix.length)
      }
      event.returnValue = result
    })

    ipcMain.on('db:get', (event, id) => {
      const prefix = this.getPluginPrefix(event)
      if (prefix) {
        id = prefix + id
      }
      const doc = lmdbInstance.get(id)
      // 如果是插件调用，需要去除返回文档的前缀
      if (doc && prefix && doc._id.startsWith(prefix)) {
        doc._id = doc._id.slice(prefix.length)
      }
      event.returnValue = doc
    })

    ipcMain.on('db:remove', (event, docOrId) => {
      const prefix = this.getPluginPrefix(event)
      if (prefix) {
        if (typeof docOrId === 'string') {
          docOrId = prefix + docOrId
        } else {
          docOrId._id = prefix + docOrId._id
        }
      }
      const result = lmdbInstance.remove(docOrId)
      console.log('sync db:remove', docOrId, 'result', result)
      // 如果是插件调用，需要去除返回结果中的前缀
      if (prefix && result.id && result.id.startsWith(prefix)) {
        result.id = result.id.slice(prefix.length)
      }
      event.returnValue = result
    })

    ipcMain.on('db:bulk-docs', (event, docs) => {
      const prefix = this.getPluginPrefix(event)
      if (prefix) {
        docs.forEach((doc: any) => {
          doc._id = prefix + doc._id
        })
      }
      const results = lmdbInstance.bulkDocs(docs)
      // 如果是插件调用，需要去除返回结果中的前缀
      if (prefix && Array.isArray(results)) {
        results.forEach((result) => {
          if (result.id && result.id.startsWith(prefix)) {
            result.id = result.id.slice(prefix.length)
          }
        })
      }
      event.returnValue = results
    })

    ipcMain.on('db:all-docs', (event, key) => {
      const prefix = this.getPluginPrefix(event)
      if (prefix) {
        if (Array.isArray(key)) {
          key = key.map((k) => prefix + k)
        } else if (typeof key === 'string') {
          key = prefix + key
        } else {
          // 如果未指定 key，则查询该插件下的所有文档
          key = prefix
        }
      }
      const docs = lmdbInstance.allDocs(key)
      // 如果是插件调用，需要去除返回文档的前缀
      if (prefix && Array.isArray(docs)) {
        docs.forEach((doc) => {
          if (doc._id.startsWith(prefix)) {
            doc._id = doc._id.slice(prefix.length)
          }
        })
      }
      event.returnValue = docs
    })

    ipcMain.on('db:post-attachment', (event, id, attachment, type) => {
      const prefix = this.getPluginPrefix(event)
      if (prefix) {
        id = prefix + id
      }
      console.log('on db:post-attachment', id, attachment, type)
      const result = lmdbInstance.postAttachment(id, attachment, type)
      // 如果是插件调用，需要去除返回结果中的前缀
      if (prefix && result.id && result.id.startsWith(prefix)) {
        result.id = result.id.slice(prefix.length)
      }
      event.returnValue = result
    })

    ipcMain.on('db:get-attachment', (event, id) => {
      const prefix = this.getPluginPrefix(event)
      if (prefix) {
        id = prefix + id
      }
      const result = lmdbInstance.getAttachment(id)
      console.log('on db:get-attachment', id, 'result', result)
      event.returnValue = result
    })

    ipcMain.on('db:get-attachment-type', (event, id) => {
      const prefix = this.getPluginPrefix(event)
      if (prefix) {
        id = prefix + id
      }
      console.log('on db:get-attachment-type', id)
      event.returnValue = lmdbInstance.getAttachmentType(id)
    })

    // ============ Promise API（供主程序渲染进程使用） ============
    ipcMain.handle('db:put', async (event, doc) => {
      const prefix = this.getPluginPrefix(event)
      if (prefix) {
        doc._id = prefix + doc._id
      }
      const result = await lmdbInstance.promises.put(doc)
      // 如果是插件调用，需要去除返回结果中的前缀
      if (prefix && result.id && result.id.startsWith(prefix)) {
        result.id = result.id.slice(prefix.length)
      }
      return result
    })

    ipcMain.handle('db:get', async (event, id) => {
      const prefix = this.getPluginPrefix(event)
      if (prefix) {
        id = prefix + id
      }
      const doc = await lmdbInstance.promises.get(id)
      // 如果是插件调用，需要去除返回文档的前缀
      if (doc && prefix && doc._id.startsWith(prefix)) {
        doc._id = doc._id.slice(prefix.length)
      }
      return doc
    })

    ipcMain.handle('db:remove', async (event, docOrId) => {
      const prefix = this.getPluginPrefix(event)
      if (prefix) {
        if (typeof docOrId === 'string') {
          docOrId = prefix + docOrId
        } else {
          docOrId._id = prefix + docOrId._id
        }
      }
      const result = await lmdbInstance.promises.remove(docOrId)
      console.log('handle db:remove', docOrId, 'result', result)
      // 如果是插件调用，需要去除返回结果中的前缀
      if (prefix && result.id && result.id.startsWith(prefix)) {
        result.id = result.id.slice(prefix.length)
      }
      return result
    })

    ipcMain.handle('db:bulk-docs', async (event, docs) => {
      const prefix = this.getPluginPrefix(event)
      if (prefix) {
        docs.forEach((doc: any) => {
          doc._id = prefix + doc._id
        })
      }
      const results = await lmdbInstance.promises.bulkDocs(docs)
      // 如果是插件调用，需要去除返回结果中的前缀
      if (prefix && Array.isArray(results)) {
        results.forEach((result) => {
          if (result.id && result.id.startsWith(prefix)) {
            result.id = result.id.slice(prefix.length)
          }
        })
      }
      return results
    })

    ipcMain.handle('db:all-docs', async (event, key) => {
      const prefix = this.getPluginPrefix(event)
      if (prefix) {
        if (Array.isArray(key)) {
          key = key.map((k) => prefix + k)
        } else if (typeof key === 'string') {
          key = prefix + key
        } else {
          // 如果未指定 key，则查询该插件下的所有文档
          key = prefix
        }
      }
      const docs = await lmdbInstance.promises.allDocs(key)
      // 如果是插件调用，需要去除返回文档的前缀
      if (prefix && Array.isArray(docs)) {
        docs.forEach((doc) => {
          if (doc._id.startsWith(prefix)) {
            doc._id = doc._id.slice(prefix.length)
          }
        })
      }
      return docs
    })

    ipcMain.handle('db:post-attachment', async (event, id, attachment, type) => {
      const prefix = this.getPluginPrefix(event)
      if (prefix) {
        id = prefix + id
      }
      console.log('handle db:post-attachment', id, attachment, type)
      const result = await lmdbInstance.promises.postAttachment(id, attachment, type)
      // 如果是插件调用，需要去除返回结果中的前缀
      if (prefix && result.id && result.id.startsWith(prefix)) {
        result.id = result.id.slice(prefix.length)
      }
      return result
    })

    ipcMain.handle('db:get-attachment', async (event, id) => {
      const prefix = this.getPluginPrefix(event)
      if (prefix) {
        id = prefix + id
      }
      const result = await lmdbInstance.promises.getAttachment(id)
      console.log('handle db:get-attachment', id, 'result', result)
      return result
    })

    ipcMain.handle('db:get-attachment-type', async (event, id) => {
      const prefix = this.getPluginPrefix(event)
      if (prefix) {
        id = prefix + id
      }
      console.log('handle db:get-attachment-type', id)
      return await lmdbInstance.promises.getAttachmentType(id)
    })

    // ============ dbStorage API（类似 localStorage 的简化接口） ============
    ipcMain.on('db-storage:set-item', (event, key: string, value: any) => {
      const prefix = this.getPluginPrefix(event)
      const docId = prefix ? `${prefix}${key}` : key

      try {
        // 获取现有文档以保留 _rev
        const existing = lmdbInstance.get(docId)
        const doc: any = {
          _id: docId,
          data: value
        }
        if (existing) {
          doc._rev = existing._rev
        }

        const result = lmdbInstance.put(doc)
        event.returnValue = result.ok ? undefined : result
      } catch (error: unknown) {
        console.error('dbStorage.setItem 失败:', error)
        event.returnValue = { error: error instanceof Error ? error.message : String(error) }
      }
    })

    ipcMain.on('db-storage:get-item', (event, key: string) => {
      const prefix = this.getPluginPrefix(event)
      const docId = prefix ? `${prefix}${key}` : key

      try {
        const doc = lmdbInstance.get(docId)
        event.returnValue = doc ? doc.data : null
      } catch (error: unknown) {
        console.error('dbStorage.getItem 失败:', error)
        event.returnValue = null
      }
    })

    ipcMain.on('db-storage:remove-item', (event, key: string) => {
      const prefix = this.getPluginPrefix(event)
      const docId = prefix ? `${prefix}${key}` : key

      try {
        const result = lmdbInstance.remove(docId)
        event.returnValue = result.ok ? undefined : result
      } catch (error: unknown) {
        console.error('dbStorage.removeItem 失败:', error)
        event.returnValue = { error: error instanceof Error ? error.message : String(error) }
      }
    })

    // ============ 主程序渲染进程专用API（直接操作 ZTOOLS 命名空间） ============
    ipcMain.handle('ztools:db-put', async (_event, key: string, data: any) => {
      // console.log('ztools:db-put', key, data)
      return await this.dbPut(key, data)
    })

    ipcMain.handle('ztools:db-get', async (_event, key: string) => {
      console.log('ztools:db-get', key)
      return await this.dbGet(key)
    })

    // ============ 插件数据管理 API ============
    // 获取所有插件的数据统计
    ipcMain.handle('get-plugin-data-stats', async () => {
      return await this._getPluginDataStats()
    })

    // 获取指定插件的所有文档 key（包括附件）
    ipcMain.handle('get-plugin-doc-keys', async (_event, pluginName: string) => {
      return await this._getPluginDocKeys(pluginName)
    })

    // 获取指定插件的指定文档
    ipcMain.handle('get-plugin-doc', async (_event, pluginName: string, key: string) => {
      return await this._getPluginDoc(pluginName, key)
    })

    // 清空指定插件的所有文档（包括附件）
    ipcMain.handle('clear-plugin-data', async (_event, pluginName: string) => {
      return await this._clearPluginData(pluginName)
    })
  }

  /**
   * 内部使用的数据库辅助方法
   * 用于主进程内部直接操作 ZTOOLS 命名空间的数据
   */
  public async dbPut(key: string, data: any): Promise<any> {
    try {
      const docId = `ZTOOLS/${key}`

      // 将数据包装到 data 字段中，以正确支持数组和对象
      const doc: any = {
        _id: docId,
        data: data
      }

      // 获取现有文档以保留 _rev
      const existing = await lmdbInstance.promises.get(docId)
      if (existing) {
        doc._rev = existing._rev
      }

      return await lmdbInstance.promises.put(doc)
    } catch (error) {
      console.error('dbPut 失败:', key, error)
      throw error
    }
  }

  public async dbGet(key: string): Promise<any> {
    try {
      const docId = `ZTOOLS/${key}`
      const doc = await lmdbInstance.promises.get(docId)

      if (!doc) {
        return null
      }

      return doc.data
    } catch (error) {
      console.error('dbGet 失败:', key, error)
      return null
    }
  }

  /**
   * 计算字典序的下一个前缀（用于精确的范围查询）
   * 例如：prefix = "PLUGIN/test/" -> end = "PLUGIN/test0"
   */
  private getNextPrefix(prefix: string): string {
    const lastChar = prefix[prefix.length - 1]
    const nextChar = String.fromCharCode(lastChar.charCodeAt(0) + 1)
    return prefix.slice(0, -1) + nextChar
  }

  /**
   * 获取所有插件的数据统计（供内部调用）
   */
  private async _getPluginDataStats(): Promise<{
    success: boolean
    data?: Array<{
      pluginName: string
      docCount: number
      attachmentCount: number
      logo: string | null
    }>
    error?: string
  }> {
    try {
      const allDocs = lmdbInstance.allDocs('PLUGIN/')
      const pluginStats = new Map<string, { docCount: number; attachmentCount: number }>()

      for (const doc of allDocs) {
        const match = doc._id.match(/^PLUGIN\/([^/]+)\//)
        if (match) {
          const pluginName = match[1]
          const stats = pluginStats.get(pluginName) || { docCount: 0, attachmentCount: 0 }
          stats.docCount++
          pluginStats.set(pluginName, stats)
        }
      }

      const attachmentDb = lmdbInstance.getAttachmentDb()
      const attachmentPrefix = 'attachment-ext:PLUGIN/'

      for (const { key } of attachmentDb.getRange({
        start: attachmentPrefix,
        end: this.getNextPrefix(attachmentPrefix)
      })) {
        // 双重检查：确保 key 完全匹配前缀
        if (key.startsWith(attachmentPrefix)) {
          const match = key.match(/^attachment-ext:PLUGIN\/([^/]+)\//)
          if (match) {
            const pluginName = match[1]
            const stats = pluginStats.get(pluginName) || { docCount: 0, attachmentCount: 0 }
            stats.attachmentCount++
            pluginStats.set(pluginName, stats)
          }
        }
      }

      const pluginsDoc = lmdbInstance.get('ZTOOLS/plugins')
      const plugins = pluginsDoc?.data || []

      const data = Array.from(pluginStats.entries()).map(([pluginName, stats]) => {
        const plugin = plugins.find((p: any) => p.name === pluginName)
        return {
          pluginName,
          docCount: stats.docCount,
          attachmentCount: stats.attachmentCount,
          logo: plugin?.logo || null
        }
      })

      return { success: true, data }
    } catch (error: unknown) {
      console.error('获取插件数据统计失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * 获取指定插件的所有文档 key（供内部调用）
   */
  private async _getPluginDocKeys(
    pluginName: string
  ): Promise<{ success: boolean; data?: Array<{ key: string; type: string }>; error?: string }> {
    try {
      const prefix = `PLUGIN/${pluginName}/`

      // 使用 Set 去重（避免重复添加）
      const keySet = new Set<string>()
      const keyTypeMap = new Map<string, 'document' | 'attachment'>()

      // 1. 从主数据库获取文档 key
      const allDocs = lmdbInstance.allDocs(prefix)
      for (const doc of allDocs) {
        const key = doc._id.substring(prefix.length)
        keySet.add(key)
        keyTypeMap.set(key, 'document')
      }

      // 2. 从附件数据库获取附件 key
      const attachmentDb = lmdbInstance.getAttachmentDb()
      const attachmentPrefix = `attachment-ext:${prefix}`

      for (const { key } of attachmentDb.getRange({
        start: attachmentPrefix,
        end: this.getNextPrefix(attachmentPrefix)
      })) {
        if (key.startsWith(attachmentPrefix)) {
          const attachmentKey = key.substring(attachmentPrefix.length)
          keySet.add(attachmentKey)
          keyTypeMap.set(attachmentKey, 'attachment')
        }
      }

      // 3. 转换为数组
      const keys = Array.from(keySet).map((key) => ({
        key,
        type: keyTypeMap.get(key) || 'document'
      }))

      return { success: true, data: keys }
    } catch (error: unknown) {
      console.error('获取插件文档 key 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * 获取指定插件的文档或附件内容（供内部调用）
   */
  private async _getPluginDoc(
    pluginName: string,
    key: string
  ): Promise<{ success: boolean; data?: any; type?: string; error?: string }> {
    try {
      const docId = `PLUGIN/${pluginName}/${key}`

      // 先尝试从主数据库获取
      const doc = lmdbInstance.get(docId)
      if (doc) {
        return { success: true, data: doc, type: 'document' }
      }

      // 尝试从附件数据库获取
      const attachmentDb = lmdbInstance.getAttachmentDb()
      const metadataStr = attachmentDb.get(`attachment-ext:${docId}`)
      if (metadataStr) {
        const metadata = JSON.parse(metadataStr)
        return {
          success: true,
          data: {
            _id: docId,
            ...metadata
          },
          type: 'attachment'
        }
      }

      return { success: false, error: '文档不存在' }
    } catch (error: unknown) {
      console.error('获取插件文档失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * 清空指定插件的所有数据（供内部调用）
   */
  private async _clearPluginData(
    pluginName: string
  ): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    try {
      const prefix = `PLUGIN/${pluginName}/`
      const allDocs = lmdbInstance.allDocs(prefix)

      let deletedCount = 0

      // 1. 删除主数据库和元数据库的文档
      for (const doc of allDocs) {
        const result = lmdbInstance.remove(doc._id)
        if (result.ok) {
          deletedCount++
        }
      }

      // 2. 清理可能残留的元数据（主数据已删除但 meta 还在的情况）
      const metaDb = lmdbInstance.getMetaDb()
      const metaKeysToDelete: string[] = []
      for (const { key } of metaDb.getRange({
        start: prefix,
        end: this.getNextPrefix(prefix)
      })) {
        if (key.startsWith(prefix)) {
          metaKeysToDelete.push(key)
        }
      }

      for (const key of metaKeysToDelete) {
        metaDb.removeSync(key)
      }

      // 3. 删除附件数据库的附件和元数据
      const attachmentDb = lmdbInstance.getAttachmentDb()
      const attachmentPrefix = `attachment:${prefix}`
      const metadataPrefix = `attachment-ext:${prefix}`

      const attachmentKeysToDelete: string[] = []
      for (const { key } of attachmentDb.getRange({
        start: attachmentPrefix,
        end: this.getNextPrefix(attachmentPrefix)
      })) {
        if (key.startsWith(attachmentPrefix)) {
          attachmentKeysToDelete.push(key)
        }
      }

      const metadataKeysToDelete: string[] = []
      for (const { key } of attachmentDb.getRange({
        start: metadataPrefix,
        end: this.getNextPrefix(metadataPrefix)
      })) {
        if (key.startsWith(metadataPrefix)) {
          metadataKeysToDelete.push(key)
        }
      }

      for (const key of attachmentKeysToDelete) {
        attachmentDb.removeSync(key)
        deletedCount++
      }
      for (const key of metadataKeysToDelete) {
        attachmentDb.removeSync(key)
      }

      return { success: true, deletedCount }
    } catch (error: unknown) {
      console.error('清空插件数据失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * 公共方法：获取所有插件的数据统计
   */
  public async getPluginDataStats(): Promise<{
    success: boolean
    data?: Array<{
      pluginName: string
      docCount: number
      attachmentCount: number
      logo: string | null
    }>
    error?: string
  }> {
    return await this._getPluginDataStats()
  }

  /**
   * 公共方法：获取指定插件的所有文档 key
   */
  public async getPluginDocKeys(
    pluginName: string
  ): Promise<{ success: boolean; data?: Array<{ key: string; type: string }>; error?: string }> {
    return await this._getPluginDocKeys(pluginName)
  }

  /**
   * 公共方法：获取指定插件的文档或附件内容
   */
  public async getPluginDoc(
    pluginName: string,
    key: string
  ): Promise<{ success: boolean; data?: any; type?: string; error?: string }> {
    return await this._getPluginDoc(pluginName, key)
  }

  /**
   * 公共方法：清空指定插件的所有数据
   */
  public async clearPluginData(
    pluginName: string
  ): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    return await this._clearPluginData(pluginName)
  }
}

export default new DatabaseAPI()
