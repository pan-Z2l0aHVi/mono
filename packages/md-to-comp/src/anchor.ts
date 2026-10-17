/** 一条示例的标题与锚点 id。`id` 为 null 表示这条示例只出代码块，不落成组件文件。 */
export interface SampleAnchor {
  title: string
  id: string | null
}

/**
 * 从 `###` 标题里取出示例标题与 id。默认实现是 `braceAnchor`，换个约定（查表、剥前缀）换一个函数即可。
 * 引擎只依赖返回值，不假设 id 是怎么写进标题的。
 */
export type AnchorFn = (heading: string) => SampleAnchor

/**
 * `### 标题 {#id}` 这个通用形状。没有尾巴锚点就是普通小节（`id` 为 null）。
 * id 的合法性不在这里判：它要成为落盘文件名，那是引擎的判据，报错也归引擎说。
 */
export function braceAnchor(heading: string): SampleAnchor {
  const match = heading.match(/^(.*?)\s*\{#([^}]+)\}\s*$/)
  if (!match) return { title: heading.trim(), id: null }
  return { title: match[1].trim(), id: match[2].trim() }
}
