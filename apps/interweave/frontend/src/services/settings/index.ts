import { Events } from '@wailsio/runtime'

import { SettingsChanged } from '../../../bindings/events'
import type {
  AccentPreset as AccentPresetDTO,
  Snapshot as SnapshotDTO
} from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/settings'
import { Service as SettingsService } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/settings'
import { hasWailsRuntime } from '../library/wails'

/**
 * 设置的真值在 Go 侧；这里只做绑定封装。
 *
 * 浏览器预览没有 Wails runtime，读取直接回一份与 Go 默认值一致的快照，
 * 让界面在 dev 下照常可渲染。
 *
 * 对外用的是字面量联合类型而不是生成的 enum：appearance 在组件里走 attribute 与
 * compare 的都是字符串，enum 会让每个使用点都得多一次类型断言，收益为零。
 */
export type Appearance = 'light' | 'dark' | 'system'

export type AccentPreset = AccentPresetDTO

/** 与 Go 侧 settings.Snapshot 对齐；appearance 收窄成字面量联合。 */
export interface Snapshot extends Omit<SnapshotDTO, 'appearance' | 'appearances'> {
  appearance: Appearance
  appearances: Appearance[]
}

/**
 * 快照到达之前的占位。
 *
 * 它只在两种窗口里可见：Go 还没返回，或读取彻底失败。正常路径上 Go 的快照会立刻覆盖它，
 * 所以这里不是第二份真相，而是一份「至少别渲染成空」的兜底。强调色的白名单与默认值仍由
 * Go 拥有（backend/settings），新增色板只需改 Go。
 */
export const PLACEHOLDER_SNAPSHOT: Snapshot = {
  appearance: 'system',
  accent: '#0071e3',
  reducedMotion: false,
  developerOptions: false,
  warnings: [],
  presets: [
    { value: '#0071e3', label: '蓝', onAccent: '#ffffff' },
    { value: '#a54ca4', label: '紫', onAccent: '#ffffff' },
    { value: '#f54096', label: '粉', onAccent: '#ffffff' },
    { value: '#ff4b53', label: '红', onAccent: '#ffffff' },
    { value: '#ff8616', label: '橙', onAccent: '#ffffff' },
    { value: '#ffbe00', label: '黄', onAccent: '#000000' },
    { value: '#61bf45', label: '绿', onAccent: '#000000' },
    { value: '#8c8c8c', label: '灰', onAccent: '#ffffff' }
  ],
  appearances: ['light', 'dark', 'system']
}

export interface SettingsPatchInput {
  appearance?: Appearance
  accent?: string
  reducedMotion?: boolean
  developerOptions?: boolean
}

export interface SettingsRuntime {
  readonly isAvailable: boolean
  get(): Promise<Snapshot>
  update(patch: SettingsPatchInput): Promise<Snapshot>
  /** 订阅变更推送；返回 unsubscribe。 */
  onChanged(listener: (snapshot: Snapshot) => void): () => void
}

/**
 * 把生成的 DTO 收窄成本地 Snapshot。
 *
 * 生成的 enum 与字面量联合在运行时是同一批字符串，差别只在类型层；这里显式过一次，
 * 让外部（事件推送、Service 返回值）进来的值都经过同一个收窄点。
 */
function toSnapshot(value: SnapshotDTO): Snapshot {
  return {
    appearance: asAppearance(value.appearance) ?? 'system',
    accent: value.accent,
    reducedMotion: value.reducedMotion,
    developerOptions: value.developerOptions,
    warnings: value.warnings ?? [],
    presets: value.presets,
    appearances: (value.appearances ?? []).map(asAppearance).filter((item): item is Appearance => item !== null)
  }
}

function asAppearance(value: unknown): Appearance | null {
  return value === 'light' || value === 'dark' || value === 'system' ? value : null
}

class WailsSettingsRuntime implements SettingsRuntime {
  readonly isAvailable = true

  async get(): Promise<Snapshot> {
    return toSnapshot(await SettingsService.GetSettings())
  }

  async update(patch: SettingsPatchInput): Promise<Snapshot> {
    // 生成类型要求四个字段都在，缺省显式写 null：Go 侧把 null 解释为「不改这一项」。
    return toSnapshot(
      await SettingsService.UpdateSettings({
        appearance: (patch.appearance ?? null) as SnapshotDTO['appearance'] | null,
        accent: patch.accent ?? null,
        reducedMotion: patch.reducedMotion ?? null,
        developerOptions: patch.developerOptions ?? null
      })
    )
  }

  onChanged(listener: (snapshot: Snapshot) => void): () => void {
    return Events.On(SettingsChanged, event => {
      if (isSnapshot(event.data)) listener(toSnapshot(event.data))
    })
  }
}

class PreviewSettingsRuntime implements SettingsRuntime {
  readonly isAvailable = false
  private snapshot: Snapshot = PLACEHOLDER_SNAPSHOT
  private listeners = new Set<(snapshot: Snapshot) => void>()

  async get(): Promise<Snapshot> {
    return this.snapshot
  }

  async update(patch: SettingsPatchInput): Promise<Snapshot> {
    this.snapshot = {
      ...this.snapshot,
      ...(patch.appearance === undefined ? {} : { appearance: patch.appearance }),
      ...(patch.accent === undefined ? {} : { accent: patch.accent }),
      ...(patch.reducedMotion === undefined ? {} : { reducedMotion: patch.reducedMotion }),
      ...(patch.developerOptions === undefined ? {} : { developerOptions: patch.developerOptions })
    }
    for (const listener of this.listeners) listener(this.snapshot)
    return this.snapshot
  }

  onChanged(listener: (snapshot: Snapshot) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

/** 快照守卫：推送载荷不可信，字段类型不对就整条丢弃。 */
export function isSnapshot(value: unknown): value is Snapshot {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const snapshot = value as Record<string, unknown>
  if (typeof snapshot.appearance !== 'string') return false
  if (typeof snapshot.accent !== 'string') return false
  if (typeof snapshot.reducedMotion !== 'boolean') return false
  if (typeof snapshot.developerOptions !== 'boolean') return false
  if (!Array.isArray(snapshot.presets) || !Array.isArray(snapshot.appearances)) return false
  return true
}

const previewRuntime = new PreviewSettingsRuntime()

export function createSettingsRuntime(): SettingsRuntime {
  if (import.meta.env.DEV && !hasWailsRuntime()) return previewRuntime
  return new WailsSettingsRuntime()
}
