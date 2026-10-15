import type { ComponentContract, SourceProp, SourceEvent, SourceSlot } from './component-source'
import { fail } from './errors'
import type { ApiTable } from './markdown'

export interface ApiRow {
  name: string
  type?: string
  default?: string
  descriptionHtml: string
}

export type ApiKind = keyof ComponentContract & ('props' | 'events' | 'slots')

function entryName(kind: ApiKind, entry: SourceProp | SourceEvent | SourceSlot): string {
  return kind === 'props' ? (entry as SourceProp).attribute : (entry as SourceEvent | SourceSlot).name
}

/**
 * markdown 的中文描述 × 组件源码的字段契约，按名字 join。
 * 两侧多一个少一个都直接失败：表格与组件漂移是这里唯一要挡的形状，静默补位只会让文档看起来对、其实是错的。
 */
export function joinApi(
  kind: 'props' | 'events' | 'slots',
  contract: ComponentContract,
  table: ApiTable,
  file: string
): ApiRow[] {
  const entries = contract[kind] as (SourceProp | SourceEvent | SourceSlot)[]
  const descriptions = new Map(table.rows.map(row => [row.name, row.descriptionHtml]))
  const rows: ApiRow[] = []
  for (const entry of entries) {
    const name = entryName(kind, entry)
    const descriptionHtml = descriptions.get(name)
    if (descriptionHtml === undefined)
      fail(
        `${file}：${kind}「${name}」存在于组件源码但 markdown 的 ### ${kind[0].toUpperCase()}${kind.slice(1)} 表里没有描述行。` +
          `要么补上描述，要么把它从源码里去掉——不静默留空`
      )
    if (!descriptionHtml.trim()) fail(`${file}：${kind}「${name}」的描述是空字符串`)
    rows.push(
      kind === 'props'
        ? { name, type: (entry as SourceProp).type, default: (entry as SourceProp).default, descriptionHtml }
        : { name, type: (entry as SourceEvent).type, descriptionHtml }
    )
  }
  for (const row of table.rows) {
    if (!entries.some(entry => entryName(kind, entry) === row.name))
      fail(`${file}：${kind}「${row.name}」写在 markdown 里，但组件源码里没有这个 ${kind}——表格在漂移`)
  }
  return rows
}
