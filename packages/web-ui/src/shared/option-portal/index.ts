import { definePlugin } from '@greypan/js-kit'

import type { WebUiOption } from '@/components/option'
import type { OverlayPortal } from '@/shared/overlay/portal'

/**
 * select / autocomplete 共用的 portal option 域：宿主侧 option 注册表、
 * portal 内容同步（打开期迁移 + 真删除清理）与微任务调度。
 *
 * 交互语义与 Lit 响应式由各组件保留（同 anchored-panel 的边界约定）：
 * 组件通过 host 回调注入差异点（迁移节点来源、打开期即时同步等），
 * 并持有 _options/_activeIndex 的 @state，shared 只经返回值同步数据。
 */

export interface OptionPortalHost {
  /** 承载宿主级监听的元素（select / autocomplete 宿主自身）。 */
  readonly element: HTMLElement
  /** option id 前缀；宿主应保证跨实例唯一（如含实例序号），供 aria 引用与样式定位。 */
  readonly idPrefix: string
  getPortal(): OverlayPortal | undefined
  getPortalContent(): HTMLElement | undefined
  /** 打开判定：syncPortalContent 仅在打开期执行内容迁移。 */
  isOpen(): boolean
  /**
   * 打开期待迁移的节点来源。两组件粒度不同（select 迁裸 option，
   * autocomplete 迁全部 childNodes），保持各自现状不在此统一。
   */
  getMigratableNodes(): Node[]
  /** 微任务回调中判断宿主是否已完成首次渲染（Lit hasUpdated）。 */
  hasUpdated(): boolean
  /** 微任务末的宿主刷新（requestUpdate）。 */
  requestUpdate(): void
  /**
   * 打开期即时同步钩子。select 在微任务内立即刷新标签与激活态
   * （portal 打开时 willUpdate 查不到面板外的新增项），autocomplete 无此需要。
   */
  onImmediateSync?(): void
  /**
   * 组件侧的逐元素交互监听（click/pointerover/pointerdown/option-update）。
   * shared 负责随 refresh 配对调用，语义由组件定义。
   */
  bindOption(option: WebUiOption): void
  unbindOption(option: WebUiOption): void
}

export interface OptionPortalApi {
  /** 面板优先查询，面板无 option 或关闭时回退 light DOM。 */
  queryOptions(): WebUiOption[]
  /**
   * diff 出旧集合解绑、新集合绑定；按 option 身份保持激活索引。
   * 返回新注册表数组与新的激活索引（-1 表示激活项已失效，如移除/迁移）。
   */
  refresh(
    previous: readonly WebUiOption[],
    activeOption: WebUiOption | undefined
  ): {
    options: WebUiOption[]
    activeIndex: number
  }
  /** 稳定 id 分配（WeakMap 身份 + 冲突循环），跨 remove/reorder 保持不变。 */
  ensureOptionIds(options: readonly WebUiOption[]): void
  /** pending 真删除清理 + 打开期把滞留 light DOM 的节点迁入面板。 */
  syncPortalContent(): void
  /** register/unregister/contentChange 的统一微任务收敛入口（slot 监听由组件模板持有）。 */
  scheduleRefresh(): void
  /** 宿主级与逐元素 unregister 监听共用的处理器。 */
  handleOptionUnregister(event: Event): void
  /** 宿主级监听配对（connectedCallback 调用，与 dispose 配对）。 */
  bindHost(): void
  /** 断连清理：解绑宿主监听并清空 pending 集合。 */
  dispose(): void
}

const OPTION_TAG = 'web-ui-option'

export const defineOptionPortal = () =>
  definePlugin<OptionPortalApi, OptionPortalHost>(host => {
    const pendingUnregistered = new Set<WebUiOption>()
    // 稳定 id：WeakMap 按 option 身份记忆分配结果，remove/reorder 后 id 不变；
    // aria-activedescendant / 外部样式都依赖 id 的时序稳定性。
    const optionIds = new WeakMap<WebUiOption, string>()
    let nextOptionId = 0

    const bindOption = (option: WebUiOption) => {
      host.bindOption(option)
      option.addEventListener('option-unregister', handleOptionUnregister)
    }

    const unbindOption = (option: WebUiOption) => {
      host.unbindOption(option)
      option.removeEventListener('option-unregister', handleOptionUnregister)
    }

    const handleOptionUnregister = (event: Event) => {
      // Portal 迁移与真实删除都会触发 unregister；先记录候选，
      // 微任务末 syncPortalContent 按最终位置区分二者。
      if (event.target instanceof HTMLElement && event.target.localName === OPTION_TAG) {
        pendingUnregistered.add(event.target as WebUiOption)
      }
      api.scheduleRefresh()
    }

    const handleRegister = () => {
      api.scheduleRefresh()
    }

    const api: OptionPortalApi = {
      queryOptions() {
        const panel = host.getPortal()?.panel ?? host.getPortalContent()
        const panelOptions = panel ? [...panel.querySelectorAll<WebUiOption>(OPTION_TAG)] : []
        // 面板内容仅在浮层打开、moveContent 之后存在；关闭时回退 light DOM，
        // 否则 portal 组件首次加载时注册表为空。
        return panelOptions.length > 0 ? panelOptions : [...host.element.querySelectorAll<WebUiOption>(OPTION_TAG)]
      },

      refresh(previous, activeOption) {
        const nextOptions = api.queryOptions()

        // register/unregister 是 composed 事件：Portal 迁移时 target 会 retarget 成宿主，
        // 不能作为监听器绑定依据；绑定只发生在按 DOM 查询确认身份的 option 上。
        for (const option of previous) if (!nextOptions.includes(option)) unbindOption(option)
        nextOptions.forEach(bindOption)

        // 激活索引按 option 身份保持，避免移除中间项后静默偏移到相邻项
        return {
          options: nextOptions,
          activeIndex: activeOption && nextOptions.includes(activeOption) ? nextOptions.indexOf(activeOption) : -1
        }
      },

      ensureOptionIds(registryOptions) {
        const usedIds = new Set(registryOptions.map(option => option.id).filter((id): id is string => Boolean(id)))
        registryOptions.forEach(option => {
          if (option.id) return

          let id = optionIds.get(option)
          if (!id || usedIds.has(id)) {
            do {
              id = `${host.idPrefix}-option-${++nextOptionId}`
            } while (usedIds.has(id))
            optionIds.set(option, id)
          }
          option.id = id
          usedIds.add(id)
        })
      },

      syncPortalContent() {
        const portal = host.getPortal()
        const portalContent = host.getPortalContent()
        if (!portal || !portalContent) return

        // 真删除（既不在面板也不在 light DOM）的 option 从 portal 追踪列表摘除，
        // 否则关闭时 restoreContent 会把它复活回 light DOM。
        for (const option of pendingUnregistered) {
          if (!portalContent.contains(option) && !host.element.contains(option)) portal.removeContent([option])
        }
        pendingUnregistered.clear()

        if (!host.isOpen()) return

        // Portal 打开期间框架条件渲染（v-if）可能在 light DOM 插入新节点；
        // 面板内已有内容时 queryOptions 不会回退 light DOM，必须显式迁入面板。
        const nodes = host.getMigratableNodes()
        if (nodes.length) portal.appendContent(nodes, portalContent)
      },

      scheduleRefresh() {
        queueMicrotask(() => {
          if (!host.element.isConnected) return
          api.syncPortalContent()
          host.requestUpdate()
          // 关闭状态下 willUpdate 查不到 portal 面板内容；打开期的新增/删除
          // 由宿主在微任务内立即同步标签与激活态。
          if (host.isOpen() && host.hasUpdated()) host.onImmediateSync?.()
        })
      },

      handleOptionUnregister,

      bindHost() {
        host.element.addEventListener('option-register', handleRegister)
        host.element.addEventListener('option-unregister', handleOptionUnregister)
      },

      dispose() {
        host.element.removeEventListener('option-register', handleRegister)
        host.element.removeEventListener('option-unregister', handleOptionUnregister)
        pendingUnregistered.clear()
      }
    }

    return api
  })
