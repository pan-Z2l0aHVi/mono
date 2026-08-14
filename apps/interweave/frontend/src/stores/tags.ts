import type { Tag } from '@api/models'
import { CreateTag, DeleteTag, ListTags, MoveTag, RenameTag } from '@api/tagservice'
import { Events } from '@wailsio/runtime'
import { defineStore } from 'pinia'

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
        this.tree = await ListTags()
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
  Events.On('interweave:tags-changed', () => {
    useTagsStore().onTagsChanged()
  })
}
