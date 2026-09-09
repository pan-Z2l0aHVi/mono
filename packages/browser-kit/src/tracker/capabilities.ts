/**
 * Tracker 插件的窄能力接口。
 *
 * 插件只声明它真正依赖的 core 切片，而不是对整个
 * PluginMade<typeof defineTracker> 打类型；"这个插件需要哪些 ctx 成员"
 * 由此集中在其依赖类型里，而不是散落在组合顺序的注释中。
 *
 * 可选能力用 Partial 表达（如 last-words 对 flush）：
 * batch-track 已组合时调用其带批量冲刷的 flush，未组合时回落 core 的 flush；
 * 两种形态都不需要运行时 cast。
 */

/** 上报能力：core 直接提供，允许单条对象或批量数组。 */
export interface TrackCapability {
  /**
   * Core 接受单条对象或批量数组；batch-track 组合后始终把 wire payload
   * 规约为数组，让下游 transport / persistence 不再区分单项与批量。
   */
  track(data: object | object[]): void
  /** 返回 transform 后载荷的序列化字节数，供批量分片估算体积。 */
  computeDataSize(data: object): number
}

/** 退出/手动清空能力：core 直接提供；batch-track 组合后覆盖为"批量缓冲 + core 队列"的语义。 */
export interface FlushCapability {
  flush(): void | Promise<void>
}

/** 暂停/恢复能力：core 直接提供。 */
export interface PauseCapability {
  pause(): void
  resume(): void | Promise<void>
}
