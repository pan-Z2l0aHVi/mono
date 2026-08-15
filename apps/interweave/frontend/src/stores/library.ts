import {
  AddFiles,
  AddFolder,
  AddUrl,
  GetItem,
  ListItems,
  OpenItem,
  OpenItemLocation,
  PickFiles,
  PickFolder,
  RemoveItems,
  SetItemTags,
  UpdateItemName
} from '@api/itemservice'
import type { Item, ListQuery } from '@api/models'
import { Events } from '@wailsio/runtime'
import { defineStore } from 'pinia'

/** 从 Wails 拖放事件数据中提取文件路径（兼容数组与对象形态）。 */
export function extractFilePaths(data: unknown): string[] {
  if (Array.isArray(data)) return data.filter((v): v is string => typeof v === 'string')
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    for (const key of ['filenames', 'files', 'paths']) {
      if (Array.isArray(obj[key])) return obj[key].filter((v): v is string => typeof v === 'string')
    }
  }
  return []
}

export const useLibraryStore = defineStore('library', {
  state: () => ({
    items: [] as Item[],
    selectedId: '',
    loading: false,
    search: '',
    kind: '',
    status: '',
    tagPath: '',
    addBusy: false,
    error: ''
  }),
  getters: {
    selected(state): Item | undefined {
      return state.items.find(i => i.id === state.selectedId) ?? undefined
    }
  },
  actions: {
    async load() {
      this.loading = true
      this.error = ''
      try {
        const query: ListQuery = {
          search: this.search || undefined,
          kind: this.kind || undefined,
          status: this.status || undefined,
          tagPath: this.tagPath || undefined,
          limit: 500
        }
        this.items = await ListItems(query)
        if (this.selectedId && !this.items.some(i => i.id === this.selectedId)) {
          this.selectedId = ''
        }
      } catch (err) {
        this.error = String(err)
      } finally {
        this.loading = false
      }
    },
    async refreshSelected() {
      if (!this.selectedId) return
      try {
        const item = await GetItem(this.selectedId)
        const idx = this.items.findIndex(i => i.id === item.id)
        if (idx >= 0) this.items[idx] = item
      } catch {
        // 详情刷新失败时忽略，列表仍可用
      }
    },
    async select(id: string) {
      this.selectedId = id
      await this.refreshSelected()
    },
    async pickAndAddFiles() {
      const paths = await PickFiles()
      if (!paths.length) return
      await this.addFiles(paths)
    },
    async pickAndAddFolder() {
      const path = await PickFolder()
      if (!path) return
      await this.addFolder(path)
    },
    async addFiles(paths: string[]) {
      this.addBusy = true
      try {
        await AddFiles(paths, [])
        await this.load()
      } finally {
        this.addBusy = false
      }
    },
    async addFolder(path: string) {
      this.addBusy = true
      try {
        await AddFolder(path, [])
        await this.load()
      } finally {
        this.addBusy = false
      }
    },
    async addUrl(raw: string) {
      if (!raw.trim()) return
      this.addBusy = true
      try {
        await AddUrl(raw.trim(), [])
        await this.load()
      } finally {
        this.addBusy = false
      }
    },
    async remove(ids: string[]) {
      await RemoveItems(ids)
      await this.load()
    },
    async setTags(id: string, tagPaths: string[]) {
      await SetItemTags(id, tagPaths)
      await this.load()
    },
    async rename(id: string, name: string) {
      await UpdateItemName(id, name)
      await this.load()
    },
    async open(id: string) {
      await OpenItem(id)
    },
    async reveal(id: string) {
      await OpenItemLocation(id)
    },
    onItemsChanged() {
      void this.load()
    }
  }
})

// 订阅后端推送的条目变更事件
let subscribed = false
export function subscribeLibraryEvents() {
  if (subscribed) return
  subscribed = true
  Events.On('interweave:items-changed', () => {
    useLibraryStore().onItemsChanged()
  })
}
