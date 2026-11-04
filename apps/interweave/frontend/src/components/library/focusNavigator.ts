/*
 * 列表键盘导航的落焦状态机。
 *
 * 从 ResourceList.vue 抽出的纯类：资源解析、activate 事件、滚动与行查询走注入的 port，
 * 等待源（轮询 sleep）可注入，单测不 mount 组件、不开浏览器。
 */

import type { ResourceView } from '@/stores/library'

/**
 * 目标行还挂在虚拟窗口之外时轮询等待的上限。窗口随 scrollIndexIntoView 滚动后才可能
 * 挂载目标行，这个上限只是兜底：轮询每醒来先核对请求号，拿到新请求或卸载都作废。
 */
export const FOCUS_WAIT_TIMEOUT_MS = 1000
/** 轮询间隔取一帧量级；真实值不重要，重要的是请求号作废语义，见 focusRowWhenMounted。 */
export const FOCUS_POLL_INTERVAL_MS = 16

export interface FocusNavigatorPorts {
  /** 目标下标对应的资源；越界返回 null，该次导航不发 activate、不滚动。 */
  resourceAt(index: number): ResourceView | null
  /** 请求父级把该资源置为当前行（组件 emit activate）。 */
  activate(resource: ResourceView): void
  /**
   * 等一轮渲染：emit activate 之后 roving tabindex（activeResourceId -> activeIndex ->
   * 模板 tabindex）要跨一次 nextTick 才落进 DOM。
   */
  afterRender(): Promise<void>
  /** 把下标滚进视口。 */
  scrollIndexIntoView(index: number): void
  /** 查窗口内已挂载的目标行；虚拟窗口之外没有元素，返回 null。 */
  rowElementAt(index: number): { focus(): void } | null
  /** 轮询等待；不注入时用全局 setTimeout。 */
  sleep?(ms: number): Promise<void>
}

/**
 * 方向键在行间移动焦点、Home / End 到首尾的下一个下标。
 *
 * 全程按数据下标算，边界是 resources 的长度而不是「已渲染了几行」——虚拟化之后这两者
 * 差着一整屏，按已渲染行取末位会让 End 停在最后一屏而不是最后一条资源。
 * 返回与当前相同的下标表示不移动（列表不是环，按键交回浏览器、不 preventDefault）。
 * 不在导航键之列的 key 原样返回当前下标。
 */
export function rowFocusTarget(key: string, index: number, lastIndex: number): number {
  switch (key) {
    case 'Home':
      return 0
    case 'End':
      return lastIndex
    case 'ArrowDown':
      return Math.min(index + 1, lastIndex)
    case 'ArrowUp':
      return Math.max(index - 1, 0)
    default:
      return index
  }
}

export class FocusNavigator {
  private readonly ports: FocusNavigatorPorts

  /*
   * 每一轮 focusIndex/navigateToIndex 领一个递增的号，轮询每醒来一次先核对号是不是自己的。
   * 不是自己的就立即收工——方向键连按时，先发的那一轮可能在后一轮落焦之后才等到目标行，
   * 不作废就会把焦点从用户已经移开的那行拽回去，表现为焦点闪回上一目标行。
   */
  private requestId = 0

  constructor(ports: FocusNavigatorPorts) {
    this.ports = ports
  }

  /**
   * 键盘导航到某一行：发出 activate 事件请求父级更新 activeResourceId，再滚动并落焦。
   *
   * 只请求 activate，不直接维护当前下标：父级把 activeResourceId 置为目标资源 id，
   * roving tabindex 与 data-active-index 随之更新。右键改名那条路上焦点在名字编辑器里，
   * 不走这里——父级已把 activeResourceId 置好，不再二次请求。
   */
  async navigateToIndex(index: number): Promise<void> {
    const resource = this.ports.resourceAt(index)
    if (!resource) return
    this.ports.activate(resource)
    await this.ports.afterRender()
    this.ports.scrollIndexIntoView(index)
    await this.focusRowWhenMounted(index)
  }

  /**
   * 仅落焦不请求 activate：用于「已有 activeResourceId、只需把焦点交给对应行」的场景
   * （容器上 Enter / ArrowDown 进列表）。此时活动下标已由派生得到，只需滚动并落焦。
   */
  async focusIndex(index: number): Promise<void> {
    this.ports.scrollIndexIntoView(index)
    await this.focusRowWhenMounted(index)
  }

  /**
   * 轮询等目标行挂载后落焦。
   *
   * navigateToIndex 已在 activate 后等过一轮渲染，此处只需等行挂载；jsdom 与真实浏览器均适用。
   */
  async focusRowWhenMounted(index: number): Promise<void> {
    const requestId = ++this.requestId
    const sleep = (ms: number) =>
      this.ports.sleep ? this.ports.sleep(ms) : new Promise<void>(resolve => setTimeout(resolve, ms))
    for (let waited = 0; waited <= FOCUS_WAIT_TIMEOUT_MS; waited += FOCUS_POLL_INTERVAL_MS) {
      if (requestId !== this.requestId) return
      const row = this.ports.rowElementAt(index)
      if (row) {
        row.focus()
        return
      }
      await sleep(FOCUS_POLL_INTERVAL_MS)
    }
    // 组件可能已经卸载：行容器是 null，rowElementAt 恒为 null，这个循环会空转到上限。
    // 拿到新请求或卸载都作废它，别让定时器在没人等的行上继续转。
    if (requestId !== this.requestId) return
  }

  /** 组件卸载时作废还没跑完的落焦轮询，否则它会在行容器变 null 之后一路空转到超时上限。 */
  cancel() {
    this.requestId++
  }
}
