import { GetStats, Rescan } from '@bindings/github.com/pan-Z2l0aHVi/mono/apps/weave/indexservice'
import type {
  Settings,
  SettingsPatch,
  Stats,
  WatchRoot
} from '@bindings/github.com/pan-Z2l0aHVi/mono/apps/weave/models'
import {
  GetSettings,
  RegenerateMcpToken,
  UpdateSettings
} from '@bindings/github.com/pan-Z2l0aHVi/mono/apps/weave/settingsservice'
import {
  AddWatchRoot,
  ListWatchRoots,
  RemoveWatchRoot
} from '@bindings/github.com/pan-Z2l0aHVi/mono/apps/weave/watchservice'
import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: null as Settings | null,
    watchRoots: [] as WatchRoot[],
    stats: null as Stats | null,
    loading: false,
    rescanning: false,
    error: ''
  }),
  actions: {
    async load() {
      this.loading = true
      try {
        this.settings = await GetSettings()
        this.watchRoots = await ListWatchRoots()
        this.stats = await GetStats()
      } catch (err) {
        this.error = String(err)
      } finally {
        this.loading = false
      }
    },
    async update(patch: SettingsPatch) {
      await UpdateSettings(patch)
      await this.load()
    },
    async regenerateToken() {
      await RegenerateMcpToken()
      await this.load()
    },
    async addWatchRoot(path: string) {
      if (!path) return
      await AddWatchRoot(path)
      await this.load()
    },
    async removeWatchRoot(id: string) {
      await RemoveWatchRoot(id)
      await this.load()
    },
    async rescan() {
      this.rescanning = true
      try {
        await Rescan()
        await this.load()
      } finally {
        this.rescanning = false
      }
    }
  }
})
