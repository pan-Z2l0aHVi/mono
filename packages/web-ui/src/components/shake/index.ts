import { findRootTheme } from '@/shared/overlay/theme-overlay-scope'
import { prefersReducedMotion } from '@/shared/theme/reduced-motion'

/** `shake()` 的可选项。除 `target` 外都有默认值，`shake()` 不带参数即可用。 */
export interface ShakeOptions {
  /**
   * 位移目标。省略时震整页（`document.documentElement`）：页面里 in-flow 与 `position: fixed`
   * 的内容一起跟着走，而 top layer 的 `<dialog>` 与它的 `::backdrop` 不受影响（Chromium 实测），
   * 因此正在打开的 drawer / dialog 不会跟着晃。
   */
  target?: HTMLElement
  /**
   * 横向首摆幅度（px）。省略时读目标计算样式上的 `--wui-shake-x-distance`。
   * 震整页时该 token 要写在 `html` / `:root` 上：主题元素在 body 之下，它的声明继承
   * 不到 `documentElement`（继承只往下走）。
   */
  xDistance?: number
  /**
   * 纵向幅度（px），默认与横向同值。省略时读目标计算样式上的 `--wui-shake-y-distance`。
   * 与横向同相位，所以合成位移沿一条直线、倾角由两个幅度决定；把横向置 `0` 就是纯上下摆，
   * 把纵向置 `0` 就是纯横摆。
   */
  yDistance?: number
  /** 整段时长（ms）。省略时读目标计算样式上的 `--wui-shake-duration`。 */
  duration?: number
}

/** 横向幅度 token 的名字；注册项与 JS 读取共用这一个字符串。 */
export const SHAKE_X_DISTANCE_VARIABLE = '--wui-shake-x-distance'
/** 纵向幅度 token 的名字。 */
export const SHAKE_Y_DISTANCE_VARIABLE = '--wui-shake-y-distance'
const DURATION_PROPERTY = '--wui-shake-duration'

/*
 * 两个 FALLBACK 各是对应注册项 initialValue 的镜像，**不是**第二真相源：浏览器里
 * computed style 永远有值，走不到这个兜底；保留它们只为 jsdom——那里没有 registerProperty，
 * 读回来是空串。shake.browser.spec.ts 有断言把两者钉在一起，防止漂移。
 * 两轴默认同值：不带参数就是斜向摆，单轴归零才只摆另一条轴。
 */
export const SHAKE_X_DISTANCE_FALLBACK = 12
export const SHAKE_Y_DISTANCE_FALLBACK = 12
// 时长不注册，没有对应的 initialValue 可镜像，兜底就是唯一真相源。
const DURATION_FALLBACK = 420

/** 挂在 Animation.id 上的标记，用于「同一次调用只保留一条震动」。 */
const SHAKE_ANIMATION_ID = 'wui-shake'

/*
 * 波形：阻尼正弦 f(t) = -sin(2π·CYCLES·t)·e^(-DECAY·t)，t ∈ [0, 1]，负号让首摆先朝**自己幅度的负方向**
 * （默认两轴同幅，首摆朝左上）。
 *
 * - CYCLES 取**半整数**，于是 sin(2π·CYCLES) = 0：t=0 与 t=1 天然落在原位，收尾不需要额外补一条
 *   归零关键帧，也不会因为「最后一个采样点还剩一点振幅」而在动画结束时跳一下。
 * - 采样后按最大绝对值归一，`xDistance` 与 `yDistance` 因此就是**各自轴上实际摆出的最大位移**，
 *   不随 DECAY 漂移：改衰减只改「摆几下来回」，不改「摆多大」。两轴共用同一条采样序列，
 *   即**同相位**——合成轨迹因此是一条直线而不是椭圆轨道，方向可预期，读起来仍是「摆几下」。
 * - 采样点取 25（含首尾）：420ms / 24 段 ≈ 17.5ms，约一帧一段，折线对正弦的逼近误差在
 *   亚像素量级，人眼读不出台阶。
 * - 关键帧之间的插值用 `linear`：整段 `easing` 会重排**每段之间的时间分配**，
 *   ease-out 会把尾段拉长、首摆压短，而首摆正是「被拦下了」这一下信号，不能被压。
 */
const SHAKE_CYCLES = 3.5
const SHAKE_DECAY = 3.2
const SHAKE_SAMPLE_COUNT = 24

if (typeof CSS !== 'undefined' && 'registerProperty' in CSS) {
  /*
   * 幅度注册为 <length>：消费方写 unitless 的 0 会在计算值阶段归一成 0px，读回来永远是带单位的
   * 长度；inherits 为 true，让挂在 html 或 web-ui-theme 上的一次改写覆盖到页面里任何一处调用点。
   * `<length>` 同时吃视口单位与 calc()（`2vmax`、`calc(1vmax + 4px)` 在两个引擎里都在计算值阶段
   * 落成确定 px），但**不接受百分号**——写了会静默回落到 initialValue。
   * 时长不注册为 <time>：注册项的计算值会按规范单位序列化成 `s`，一个名为 duration 却只能写
   * 毫秒数的 token 反而更容易读错，所以走「带单位读、按后缀换算」的解析。
   * 注册表是全局的，模块重复执行（HMR）时捕获已注册错误并忽略。
   */
  for (const [name, initialValue] of [
    [SHAKE_X_DISTANCE_VARIABLE, '12px'],
    [SHAKE_Y_DISTANCE_VARIABLE, '12px']
  ] as const) {
    try {
      CSS.registerProperty({ name, syntax: '<length>', inherits: true, initialValue })
    } catch {
      // 已注册（如 HMR 重复执行）时忽略
    }
  }
}

function readLength(target: HTMLElement, property: string, fallback: number): number {
  const parsed = Number.parseFloat(getComputedStyle(target).getPropertyValue(property))
  return Number.isFinite(parsed) ? parsed : fallback
}

/*
 * 时长读的是带单位的 CSS 时间字面量。计算值可能序列化成 `420ms`（未注册的原样透传）或
 * `0.42s`（注册为 <time> 的规范单位），所以按后缀换算，不能直接 parseFloat——那会把 0.42 当成
 * 0.42ms，整段震动塌成一次瞬移。
 */
function readDuration(target: HTMLElement, property: string, fallback: number): number {
  const raw = getComputedStyle(target).getPropertyValue(property).trim()
  const value = Number.parseFloat(raw)
  if (!Number.isFinite(value)) return fallback
  return raw.endsWith('ms') ? value : value * 1000
}

/**
 * 目标所在范围是否要求减少动效。
 *
 * 指定 target 时按它自己的主题范围走。默认震整页时不能只看祖先：主题元素总在 body 之下，
 * `documentElement` 往上走找不到它们，于是 `shake()` 会和页面里其它动效认的档位分叉。
 * 这里改用**根主题**——与 toast / imagePreview 解析挂载根时同一个 `findRootTheme()`，
 * 命令式入口的「页面级默认值」两条路径认的是同一个主题；没有主题范围时回退系统偏好。
 */
function isReducedFor(target: HTMLElement): boolean {
  if (target !== document.documentElement) return prefersReducedMotion(target)
  const theme = findRootTheme()
  return theme ? theme.isReducedMotion() : prefersReducedMotion(target)
}

function resolveOptions(input: HTMLElement | ShakeOptions | undefined): {
  target: HTMLElement
  xDistance: number
  yDistance: number
  duration: number
} {
  const options: ShakeOptions = input instanceof HTMLElement ? { target: input } : (input ?? {})
  const target = options.target ?? document.documentElement
  return {
    target,
    xDistance: options.xDistance ?? readLength(target, SHAKE_X_DISTANCE_VARIABLE, SHAKE_X_DISTANCE_FALLBACK),
    yDistance: options.yDistance ?? readLength(target, SHAKE_Y_DISTANCE_VARIABLE, SHAKE_Y_DISTANCE_FALLBACK),
    duration: options.duration ?? readDuration(target, DURATION_PROPERTY, DURATION_FALLBACK)
  }
}

/**
 * 关键帧里写的是 `<transform-list>`，而计算值在没有变换时是 `none`——`none translate(-6px, 0px)`
 * 不是合法的变换列表，整条关键帧会被丢弃。
 */
function withBaseTransform(base: string, dx: number, dy: number): string {
  const translate = `translate(${dx.toFixed(3)}px, ${dy.toFixed(3)}px)`
  return base === 'none' ? translate : `${base} ${translate}`
}

/**
 * 让一次「不行 / 请先处理」的信号可见：目标摆几下后回到原位。
 *
 * 用于打断一次被拦下的操作（例如表单还有未保存内容却要退出），或把注意力拉回某个元素。
 * 传 `target` 就只震那一块，不传就震整页。播放期间目标上已有的 `transform` 会被逐帧带上，
 * 因此居中定位不会被震动吃掉。
 *
 * 两个幅度默认同值，所以不带参数是斜向摆；把某一轴设为 0 就只剩另一条轴，
 * 两轴同相位所以合成轨迹始终是一条直线。
 * 同一目标上重复调用会**重新开始**摆（撤掉上一条），而不是叠加成更大的位移；
 * `prefers-reduced-motion`（系统或 `web-ui-theme` 的 motion 档位）下不产生任何位移。
 */
export function shake(input?: HTMLElement | ShakeOptions): void {
  const { target, xDistance, yDistance, duration } = resolveOptions(input)
  // 两轴都为 0 才是「什么都不摆」：单轴归零只是把那条轴摘掉，另一轴照旧。
  if (duration <= 0 || (xDistance === 0 && yDistance === 0)) return
  // 前庭动效敏感用户的档位：不摆，也不留任何状态。
  if (isReducedFor(target)) return
  // jsdom 等没有 WAAPI 的环境：命令式入口不该因为「测试环境没有动画」而抛错。
  if (typeof target.animate !== 'function') return

  // 重触发时先撤掉自己上一条：同一属性上的两条动画会各自生效，读起来是「位移翻倍」而不是「重摆」。
  for (const animation of target.getAnimations()) {
    if (animation.id === SHAKE_ANIMATION_ID) animation.cancel()
  }

  const base = getComputedStyle(target).transform
  const samples: number[] = []
  for (let i = 0; i <= SHAKE_SAMPLE_COUNT; i++) {
    const t = i / SHAKE_SAMPLE_COUNT
    samples.push(-Math.sin(2 * Math.PI * SHAKE_CYCLES * t) * Math.exp(-SHAKE_DECAY * t))
  }
  const peak = Math.max(...samples.map(Math.abs))
  const xUnit = peak > 0 ? xDistance / peak : xDistance
  const yUnit = peak > 0 ? yDistance / peak : yDistance

  const animation = target.animate(
    samples.map((sample, index) => ({
      offset: index / SHAKE_SAMPLE_COUNT,
      transform: withBaseTransform(base, sample * xUnit, sample * yUnit)
    })),
    { duration, easing: 'linear' }
  )
  animation.id = SHAKE_ANIMATION_ID
}
