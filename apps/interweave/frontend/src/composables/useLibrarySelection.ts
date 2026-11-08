import { computed, ref, type Ref } from 'vue'

import type { ResourceView } from '@/stores/library'

/**
 * 列表选择态的唯一 owner。
 *
 * 勾选集合、全选判定与「能不能批量找回」都从这里派生；进入选择态时的依赖关闭
 * （详情 drawer、筛选 panel、行内重命名）也由它执行——判定与执行在同一处，
 * 页面只消费暴露的状态，不再自组这套联动。
 */
export interface LibrarySelectionDependencies {
  /** 筛选与排序后的可见资源：全选与「全部已选」只针对当前看得见的行。 */
  visibleResources: Ref<ResourceView[]>
  /** 全量资源：selectedResources 按 id 从这里取回，被筛掉的已选项仍参与统计。 */
  resources: Ref<ResourceView[]>
  /** 进入选择态时要一起收起的 overlay：详情 drawer 与筛选 panel。 */
  detailOpen: Ref<boolean>
  filterOpen: Ref<boolean>
  /** 详情 drawer 与列表行内可能挂着名字编辑器，进入选择态时统一收掉。 */
  stopResourceRename: () => void
}

export function useLibrarySelection(dependencies: LibrarySelectionDependencies) {
  const { visibleResources, resources, detailOpen, filterOpen, stopResourceRename } = dependencies

  const selectionMode = ref(false)
  const checkedIds = ref<string[]>([])

  const allVisibleSelected = computed(
    () =>
      visibleResources.value.length > 0 &&
      visibleResources.value.every(resource => checkedIds.value.includes(resource.id))
  )
  const selectedResources = computed(() => resources.value.filter(resource => checkedIds.value.includes(resource.id)))
  const canRestore = computed(
    () =>
      selectedResources.value.length > 0 &&
      selectedResources.value.every(resource => resource.sources.some(source => !source.available))
  )

  function toggleSelectionMode() {
    selectionMode.value = !selectionMode.value
    if (selectionMode.value) {
      stopResourceRename()
      detailOpen.value = false
      // 选择态里筛选按钮收起，筛选 panel 必须跟着收起：留在展开状态时它既没有开关可回退，
      // 又会继续压缩列表的可视高度。
      filterOpen.value = false
    } else {
      checkedIds.value = []
    }
  }

  function toggleChecked(resourceId: string) {
    checkedIds.value = checkedIds.value.includes(resourceId)
      ? checkedIds.value.filter(id => id !== resourceId)
      : [...checkedIds.value, resourceId]
  }

  // 扫选要的是「置成某个状态」而不是「翻一下」：一行被指针划过两次不能自己弹回去。
  function setResourceChecked(resourceId: string, checked: boolean) {
    const isChecked = checkedIds.value.includes(resourceId)
    if (isChecked === checked) return
    checkedIds.value = checked ? [...checkedIds.value, resourceId] : checkedIds.value.filter(id => id !== resourceId)
  }

  function toggleCheckAll() {
    const visibleIds = visibleResources.value.map(resource => resource.id)
    if (allVisibleSelected.value) {
      checkedIds.value = checkedIds.value.filter(id => !visibleIds.includes(id))
      return
    }
    checkedIds.value = [...new Set([...checkedIds.value, ...visibleIds])]
  }

  return {
    selectionMode,
    checkedIds,
    allVisibleSelected,
    selectedResources,
    canRestore,
    toggleSelectionMode,
    toggleChecked,
    setResourceChecked,
    toggleCheckAll
  }
}
