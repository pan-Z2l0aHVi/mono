/** 一条示例的标题与由标题派生出的 id。id 恒有值：`## Samples` 里写下的每个 `###` 都落成组件文件。 */
export interface SampleAnchor {
  title: string
  id: string
}

/**
 * 从 `###` 标题里取出示例标题与 id。默认实现是 `titleSlug`，换个约定（查表、剥前缀）换一个函数即可。
 * 引擎只依赖返回值，不假设 id 是怎么从标题来的。
 */
export type AnchorFn = (heading: string) => SampleAnchor

/**
 * 标题即身份：`### Basic` 派生出 `basic`，`### Prefix and suffix` 派生出 `prefix-and-suffix`。
 * 标题是给人读的那一份，也是落盘文件名的来源，所以 `## Samples` 里的示例标题必须写成英文——
 * 纯中文标题折完只剩空串，由 `markdown.ts` 的 `anchorId` 报出来。
 */
export function titleSlug(heading: string): SampleAnchor {
  const title = heading.trim()
  const id = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return { title, id }
}
