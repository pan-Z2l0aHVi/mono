// 统一订阅后端推送事件（应用入口调用一次）
import { subscribeLibraryEvents } from '@/stores/library'
import { subscribeRepairEvents } from '@/stores/repair'
import { subscribeTagsEvents } from '@/stores/tags'

export function subscribeInterweaveEvents() {
  subscribeLibraryEvents()
  subscribeTagsEvents()
  subscribeRepairEvents()
}
