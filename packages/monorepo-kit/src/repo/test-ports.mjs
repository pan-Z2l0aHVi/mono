// 测试用浏览器 API 端口的分配表。
//
// 端口是「每台机器一套」的资源，而写进 vite.config 的数字是「每个 checkout 一份」的常量，
// 所以固定端口只能保证同一轮 turbo test 内不冲突，挡不住同一台机器上并行的其他 worktree。
// 这里把端口收敛成一张表加一个偏移量：默认偏移 0 时端口是固定值（原先散落在各配置里的是
// 63411 / 63412 / 63413，迁移后换成段基地址；「同一 worktree 内互不冲突」这个性质不变）；
// 多 agent 并行时给每个 worktree 导出不同的 GREYPAN_TEST_PORT_OFFSET 即可整体错开。
//
// 每个项目占一个 BAND_WIDTH 宽的段，段之间不重叠。Vite 在端口被占且未设 strictPort 时会 +1
// 重试，段内留出的空间让这次重试落回自己的段。偏移是整表平移，表内相对间隔不受影响；真正的
// 约束是不同 worktree 的两组端口不能重叠，也就是偏移步长不得小于全表跨度（当前
// 63469 - 63410 + 1 = 60，取 100 给后续项目留余量）。段间不重叠与跨度不超步长这两条在模块
// 加载时校验，加段位或调段宽时先让它们成立，否则直接抛错。

export const BAND_WIDTH = 10
export const OFFSET_STRIDE = 100
const MAX_PORT = 65535

const BANDS = {
  'react-web-ui-demo': 63410,
  'vue-web-ui-demo': 63420,
  'interweave-frontend': 63430,
  'web-ui': 63440,
  'web-ui-reduced-motion': 63450,
  'browser-kit': 63460
}

/**
 * 项目名从表本身推导，不另抄一份联合类型：给表加段位就自动进类型。
 *
 * @typedef {keyof typeof BANDS} TestApiPortName
 */

/** @type {readonly TestApiPortName[]} */
export const TEST_API_PORT_NAMES = Object.freeze(/** @type {TestApiPortName[]} */ (Object.keys(BANDS)))

const bases = Object.values(BANDS).sort((a, b) => a - b)
for (const [index, base] of bases.entries()) {
  if (index > 0 && base - bases[index - 1] < BAND_WIDTH) {
    // 段没有真占住自己的宽度时，两个项目会在同一批端口上互相 +1 抢位，而调用点看不出来。
    throw new Error(`test-ports: 段 ${bases[index - 1]} 与 ${base} 相距不足 ${BAND_WIDTH}，两个项目会重叠`)
  }
}

const SPAN = Math.max(...bases) + BAND_WIDTH - Math.min(...bases)
if (SPAN > OFFSET_STRIDE) {
  // 跨度超过步长时，偏移 100 的 worktree 会和偏移 0 的 worktree 抢同一批端口，而调用点看不出来。
  // 加段位或调宽段宽时先改 OFFSET_STRIDE，否则这里直接失败。
  throw new Error(`test-ports: 端口表跨度 ${SPAN} 超过偏移步长 ${OFFSET_STRIDE}，不同偏移会重叠`)
}

/**
 * 取某个项目的基端口；偏移只做整表平移，不改段内间隔。
 *
 * @param {TestApiPortName} name
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {number}
 */
export function testApiPort(name, env = process.env) {
  const base = /** @type {number | undefined} */ (BANDS[name])
  if (base === undefined) throw new Error(`test-ports: 未知项目 "${name}"`)

  const raw = env.GREYPAN_TEST_PORT_OFFSET
  const offset = raw === undefined || raw === '' ? 0 : Number(raw)
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error(`test-ports: GREYPAN_TEST_PORT_OFFSET 必须是非负整数，收到 "${raw}"`)
  }
  if (offset % OFFSET_STRIDE !== 0) {
    throw new Error(`test-ports: GREYPAN_TEST_PORT_OFFSET 必须是 ${OFFSET_STRIDE} 的倍数，收到 ${offset}`)
  }
  if (base + offset + BAND_WIDTH - 1 > MAX_PORT) {
    throw new Error(`test-ports: 偏移 ${offset} 让 "${name}" 超出端口上限 ${MAX_PORT}`)
  }

  return base + offset
}
