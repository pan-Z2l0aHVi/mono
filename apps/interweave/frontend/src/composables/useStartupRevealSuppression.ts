/**
 * 启动期主题揭示压制（startup layer 的伴生机制）。
 *
 * boot 期的首次外观应用（占位 'system' → Go 快照真实外观）会命中 web-ui-theme 的
 * 揭示动画判定：旧帧快照恰好是启动层（居中 logo），light 方向下整页旧帧收缩进视口
 * 圆心——观感即「logo 往中间收拢盖在内容上」，且揭示期间输入被压制约 500ms。本
 * composable 拥有启动层的全部撤层编排（App.vue 原有的 loaded watch 与超时兜底接线
 * 迁入），并通过 `suppressed` 驱动宿主给 `<web-ui-theme>` 绑定 `no-reveal`：
 *
 *   :no-reveal="suppressed ? '' : null"
 *
 * 绑定必须以「存在/移除」表达（Lit Boolean converter 是存在即真，绑定 false 会被
 * 序列化成字符串 "false" 而恒真）。结构不变式：**启动层不透明覆盖期 ⊆ 压制窗口**。
 * 措辞说明——摘除与撤层同 rAF，层节点之后还以 opacity 渐变存活 220ms，这段淡出窗
 * 内压制已解除；豁免依据是 appearance 写入均需 UI 交互，Go boot 期不推送快照。
 *
 * 摘除条件取较早者：
 *
 *   1. 首次快照应用后的下一帧：`loaded` watch（pre-flush，先于 render effect 落
 *      appearance attr）排 rAF，撤层与摘压制都在这一帧——首次提交仍被压制；
 *   2. 超时撤层后 2s 截止：3s 超时只负责撤层，不直接摘压制，防失败路径永久压制。
 *
 * 显式接受的残余风险：极端慢成功（快照晚于截止时限）会以应用内容为旧帧触发一次
 * 揭示（无 logo 收拢、约 500ms 输入压制），概率低、危害有界；不取消截止——永久压制
 * 会复现「手动切换揭示动画静默失效」这一更严重的静默故障。
 */
import { onScopeDispose, ref, watch, type Ref } from 'vue'

import { dismissStartupLayer, scheduleStartupTimeout } from './startupLayer'

/** 超时撤层后压制兜底解除的截止时长。 */
export const SUPPRESSION_DEADLINE_MS = 2000

export function useStartupRevealSuppression(isLoaded: () => boolean): { suppressed: Ref<boolean> } {
  const suppressed = ref(true)
  let cancelTimeout: (() => void) | undefined
  let deadlineTimer: number | undefined
  let stopWatch: (() => void) | undefined

  const releaseSuppression = () => {
    cancelTimeout?.()
    cancelTimeout = undefined
    if (deadlineTimer !== undefined) {
      window.clearTimeout(deadlineTimer)
      deadlineTimer = undefined
    }
    stopWatch?.()
    stopWatch = undefined
    suppressed.value = false
  }

  const arm = () => {
    cancelTimeout = scheduleStartupTimeout(() => {
      // 超时只撤层：压制由 2s 截止解除，覆盖「load 挂起既不 resolve 也不 reject」的形态。
      dismissStartupLayer()
      deadlineTimer = window.setTimeout(releaseSuppression, SUPPRESSION_DEADLINE_MS)
    })
    stopWatch = watch(isLoaded, loaded => {
      if (!loaded) return
      // 等一帧：appearance attr 在同一 flush 内落到 DOM（pre-watcher 先排 rAF、render
      // effect 落 attr），撤层与摘压制都放进这一帧，首次提交仍被压制。
      requestAnimationFrame(() => {
        dismissStartupLayer()
        releaseSuppression()
      })
    })
  }

  // 初始化防呆：连接时启动层已不存在（dev HMR 重挂载、loaded 已 true）则无首帧可遮，
  // 压制无意义。层仍在但已 data-leaving（淡出中重挂载）时防呆不命中——照常布防，
  // 依赖 3s+2s 截止兜底解除。
  if (document.getElementById('startup-layer')) {
    arm()
  } else {
    suppressed.value = false
  }

  // failSilently：测试里 composable 会跑在组件 scope 之外（effectScope 显式接管清理）。
  onScopeDispose(() => {
    cancelTimeout?.()
    cancelTimeout = undefined
    if (deadlineTimer !== undefined) {
      window.clearTimeout(deadlineTimer)
      deadlineTimer = undefined
    }
    stopWatch?.()
    stopWatch = undefined
  }, true)

  return { suppressed }
}
