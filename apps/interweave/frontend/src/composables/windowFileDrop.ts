import { ref } from 'vue'

/** 页面切换时保留尚未交给资源库的文件路径。 */
export const pendingWindowFileDrops = ref<string[][]>([])

export function queueWindowFileDrop(paths: string[]) {
  if (paths.length) pendingWindowFileDrops.value = [...pendingWindowFileDrops.value, paths]
}
