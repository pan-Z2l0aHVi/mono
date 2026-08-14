import {
  ListItems as listItemsBinding,
  PickFiles as pickFilesBinding
} from '@bindings/github.com/pan-Z2l0aHVi/mono/apps/weave/itemservice'
import type {
  Candidate,
  Item,
  ListQuery,
  RepairItem,
  Tag,
  WatchRoot
} from '@bindings/github.com/pan-Z2l0aHVi/mono/apps/weave/models'
import {
  GetCandidates as getCandidatesBinding,
  ListRepairs as listRepairsBinding
} from '@bindings/github.com/pan-Z2l0aHVi/mono/apps/weave/repairservice'
import { ListTags as listTagsBinding } from '@bindings/github.com/pan-Z2l0aHVi/mono/apps/weave/tagservice'
import { ListWatchRoots as listWatchRootsBinding } from '@bindings/github.com/pan-Z2l0aHVi/mono/apps/weave/watchservice'

/**
 * Wails bindings 保守地把 Go slice 生成为 `T[] | null`。Go service 的公开集合契约要求成功结果为
 * 非 nil slice（JSON `[]`）；若 transport 仍返回 null，立即暴露该契约违例，不让它扩散到 Pinia。
 */
function requireCollection<T>(value: T[] | null, operation: string): T[] {
  if (value === null) throw new Error(`${operation} 违反 Wails 集合契约：成功结果不能为 null`)
  return value
}

export async function listItems(query: ListQuery): Promise<Item[]> {
  return requireCollection(await listItemsBinding(query), 'ItemService.ListItems')
}

export async function pickFiles(): Promise<string[]> {
  return requireCollection(await pickFilesBinding(), 'ItemService.PickFiles')
}

export async function listRepairs(state: string): Promise<RepairItem[]> {
  return requireCollection(await listRepairsBinding(state), 'RepairService.ListRepairs')
}

export async function getCandidates(repairID: string): Promise<Candidate[]> {
  return requireCollection(await getCandidatesBinding(repairID), 'RepairService.GetCandidates')
}

export async function listTags(): Promise<Tag[]> {
  return requireCollection(await listTagsBinding(), 'TagService.ListTags')
}

export async function listWatchRoots(): Promise<WatchRoot[]> {
  return requireCollection(await listWatchRootsBinding(), 'WatchService.ListWatchRoots')
}
