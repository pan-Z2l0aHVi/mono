/**
 * 协调者模式的激活门槛。
 *
 * 仅当进程处在 Rex 会话里（`REX_SESSION` 存在）且没有被显式关掉（`PI_REX_ORCH !== "0"`）
 * 时激活。`PI_REX_ORCH=0` 由派生 worker 的 `/usr/bin/env` 前缀注入，防止把 `pi` 配成
 * worker 时递归成为「操作者 + agent 协调者」。
 */

export interface ActivationEnv {
  REX_SESSION?: string
  PI_REX_ORCH?: string
}

export type Activation = { active: true } | { active: false; reason: 'no-rex-session' | 'disabled-by-env' }

export function detectActivation(env: ActivationEnv): Activation {
  if (!env.REX_SESSION || env.REX_SESSION.trim() === '') {
    return { active: false, reason: 'no-rex-session' }
  }
  if (env.PI_REX_ORCH === '0') {
    return { active: false, reason: 'disabled-by-env' }
  }
  return { active: true }
}
