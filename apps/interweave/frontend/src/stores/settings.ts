/**
 * 应用设置的外观快照中转。
 *
 * 真值在 Go 侧（backend/settings）：本 store 只缓存 Go 下发的快照，并把组件的方法调用
 * 转发成 UpdateSettings。组件只调这里的方法，不直接碰 bindings；Go 是唯一的校验与持久化方，
 * 前端不再从 localStorage 读任何设置。
 *
 * resolved appearance 仍由 web-ui-theme 自己按 `appearance` 属性算，本 store 不存派生值。
 */
import { defineStore } from 'pinia'

import {
  createSettingsRuntime,
  PLACEHOLDER_SNAPSHOT,
  type AccentPreset,
  type Appearance,
  type SettingsPatchInput,
  type SettingsRuntime,
  type Snapshot,
  type ZoomPreset
} from '@/services/settings'

export type ThemeAppearance = Appearance
export type { AccentPreset, ZoomPreset }

/**
 * 强调色上的前景色。Go 在快照里一并下发，前端只查表：
 * 未加载完或色板里没有该值时回白色，与 Apple prominent-action 的默认一致。
 */
export function onAccentFor(accent: string, presets: readonly AccentPreset[] = []): string {
  return presets.find(preset => preset.value === accent)?.onAccent ?? '#ffffff'
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    snapshot: PLACEHOLDER_SNAPSHOT as Snapshot,
    /** 是否已经拿到过 Go 的快照。启动层的退场判据之一。 */
    loaded: false,
    /** 最近一次写入失败的原因；界面据此提示，成功后清空。 */
    error: ''
  }),
  getters: {
    appearance: state => state.snapshot.appearance,
    accent: state => state.snapshot.accent,
    reducedMotion: state => state.snapshot.reducedMotion,
    minimizeToTrayOnClose: state => state.snapshot.minimizeToTrayOnClose,
    presets: state => state.snapshot.presets,
    zoom: state => state.snapshot.zoom,
    zoomPresets: state => state.snapshot.zoomPresets,
    /** 启动期一次性警告；界面取走后由 takeWarnings 清空。 */
    warnings: state => state.snapshot.warnings
  },
  actions: {
    /** 用 Go 快照整体覆盖本地缓存。事件与初次拉取走同一入口。 */
    applySnapshot(snapshot: Snapshot) {
      this.snapshot = snapshot
      this.loaded = true
    },
    /** 取走一次性警告并清空，避免重启提示在会话内重复弹出。 */
    takeWarnings(): string[] {
      const warnings = this.snapshot.warnings
      if (warnings.length === 0) return []
      this.snapshot = { ...this.snapshot, warnings: [] }
      return warnings
    },
    /** 取走最近的错误并清空；界面提示一次后调用，避免同一原因每次重渲染都弹。 */
    takeError(): string {
      const error = this.error
      if (error) this.error = ''
      return error
    },
    async load(runtime: SettingsRuntime = createSettingsRuntime()) {
      try {
        this.applySnapshot(await runtime.get())
      } catch (cause) {
        // 读不到就按本地兜底继续启动：界面上以默认外观呈现，原因记在 error 里。
        this.error = describeError(cause, '读取设置失败')
      }
    },
    async setAppearance(appearance: ThemeAppearance, runtime?: SettingsRuntime) {
      await this.patch({ appearance }, runtime)
    },
    async setAccent(accent: string, runtime?: SettingsRuntime) {
      await this.patch({ accent }, runtime)
    },
    async setReducedMotion(reduced: boolean, runtime?: SettingsRuntime) {
      await this.patch({ reducedMotion: reduced }, runtime)
    },
    async setMinimizeToTrayOnClose(enabled: boolean, runtime?: SettingsRuntime) {
      await this.patch({ minimizeToTrayOnClose: enabled }, runtime)
    },
    async setZoom(zoom: number, runtime?: SettingsRuntime) {
      await this.patch({ zoom }, runtime)
    },
    /**
     * 写一次设置。成功后用返回的快照覆盖，失败则保留 Go 已回滚的状态并记下原因——
     * 界面不能显示一个磁盘上并不存在的设置。
     *
     * runtime 可选只是为了测试能注入假实现；生产路径一律走默认的 createSettingsRuntime()。
     */
    async patch(patch: SettingsPatchInput, runtime: SettingsRuntime = createSettingsRuntime()) {
      this.error = ''
      try {
        this.applySnapshot(await runtime.update(patch))
      } catch (cause) {
        this.error = describeError(cause, '保存设置失败')
        // 写入失败时回读一次，让界面回到磁盘上的真实状态。
        await this.load(runtime)
      }
    }
  }
})

function describeError(cause: unknown, fallback: string): string {
  if (cause instanceof Error && cause.message.trim()) return cause.message
  return fallback
}
