import type { Tag } from '@bindings/github.com/pan-Z2l0aHVi/mono/apps/weave/models'
import { CreateTag, DeleteTag, MoveTag, RenameTag } from '@bindings/github.com/pan-Z2l0aHVi/mono/apps/weave/tagservice'
import { Events } from '@wailsio/runtime'
import { defineStore } from 'pinia'

import { listTags } from '@/services/wails'

export const useTagsStore = defineStore('tags', {
  state: () => ({
    tree: [] as Tag[],
    selectedPath: '',
    loading: false,
    error: ''
  }),
  actions: {
    async load() {
      this.loading = true
      try {
        this.tree = await listTags()
      } catch (err) {
        this.error = String(err)
      } finally {
        this.loading = false
      }
    },
    async create(name: string, parentPath: string) {
      await CreateTag(name, parentPath)
      await this.load()
    },
    async rename(path: string, newName: string) {
      await RenameTag(path, newName)
      await this.load()
    },
    async move(path: string, newParentPath: string) {
      await MoveTag(path, newParentPath)
      await this.load()
    },
    async remove(path: string) {
      await DeleteTag(path)
      if (this.selectedPath === path || this.selectedPath.startsWith(path + '/')) {
        this.selectedPath = ''
      }
      await this.load()
    },
    onTagsChanged() {
      void this.load()
    }
  }
})

let subscribed = false
export function subscribeTagsEvents() {
  if (subscribed) return
  subscribed = true
  Events.On('weave:tags-changed', () => {
    useTagsStore().onTagsChanged()
  })
}
