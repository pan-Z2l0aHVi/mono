import { ref } from 'vue'

/** 页面切换时保留尚未交给资源库的文件路径与链接。 */
export const pendingWindowFileDrops = ref<string[][]>([])
export const pendingWindowURLDrops = ref<string[][]>([])

export function queueWindowFileDrop(paths: string[]) {
  if (paths.length) pendingWindowFileDrops.value = [...pendingWindowFileDrops.value, paths]
}

export function queueWindowURLDrop(urls: string[]) {
  if (urls.length) pendingWindowURLDrops.value = [...pendingWindowURLDrops.value, urls]
}
