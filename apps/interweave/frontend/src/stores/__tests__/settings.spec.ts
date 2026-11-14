import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vite-plus/test'

import { isSnapshot, type SettingsRuntime, type Snapshot } from '@/services/settings'

import { onAccentFor, useSettingsStore } from '../settings'

function snapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    appearance: 'system',
    accent: '#0071e3',
    reducedMotion: false,
    developerOptions: false,
    warnings: [],
    presets: [
      { value: '#0071e3', label: '蓝', onAccent: '#ffffff' },
      { value: '#ffbe00', label: '黄', onAccent: '#000000' }
    ],
    appearances: ['light', 'dark', 'system'],
    ...overrides
  } as Snapshot
}

/** 只实现 store 真正用到的三个方法，用来观察转发而不是启动 Wails runtime。 */
function fakeRuntime(initial: Snapshot) {
  const updates: unknown[] = []
  let current = initial
  const listeners = new Set<(next: Snapshot) => void>()
  const runtime: SettingsRuntime = {
    isAvailable: true,
    get: async () => current,
    update: async patch => {
      updates.push(patch)
      current = { ...current, ...patch } as Snapshot
      for (const listener of listeners) listener(current)
      return current
    },
    onChanged: listener => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }
  return { runtime, updates }
}

describe('settings store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('从运行时拉取快照并标记已加载', async () => {
    const { runtime } = fakeRuntime(snapshot({ appearance: 'dark', accent: '#ffbe00' }))
    const store = useSettingsStore()

    expect(store.loaded).toBe(false)
    await store.load(runtime)

    expect(store.loaded).toBe(true)
    expect(store.appearance).toBe('dark')
    expect(store.accent).toBe('#ffbe00')
  })

  it('把组件的方法调用转发成 patch', async () => {
    const { runtime, updates } = fakeRuntime(snapshot())
    const store = useSettingsStore()

    await store.setAppearance('dark', runtime)
    await store.setAccent('#ffbe00', runtime)
    await store.setReducedMotion(true, runtime)
    await store.setDeveloperOptions(true, runtime)

    expect(updates).toEqual([
      { appearance: 'dark' },
      { accent: '#ffbe00' },
      { reducedMotion: true },
      { developerOptions: true }
    ])
  })

  it('事件推送的快照整体覆盖本地缓存', () => {
    const store = useSettingsStore()

    store.applySnapshot(snapshot({ developerOptions: true }))

    expect(store.developerOptions).toBe(true)
    expect(store.loaded).toBe(true)
  })

  // 启动期警告只该弹一次：取走后本地必须清空，否则每次重渲染都会再弹。
  it('一次性警告取走后不再重复返回', () => {
    const store = useSettingsStore()
    store.applySnapshot(snapshot({ warnings: ['设置文件损坏'] }))

    expect(store.takeWarnings()).toEqual(['设置文件损坏'])
    expect(store.takeWarnings()).toEqual([])
  })

  // 写入失败不能让界面显示一个磁盘上并不存在的值：store 记下原因并回读运行时。
  it('写入失败时记录原因并回读', async () => {
    let failNext = true
    const runtime: SettingsRuntime = {
      isAvailable: true,
      get: async () => snapshot({ appearance: 'system' }),
      update: async () => {
        if (failNext) {
          failNext = false
          throw new Error('磁盘只读')
        }
        return snapshot({ appearance: 'dark' })
      },
      onChanged: () => () => {}
    }
    const store = useSettingsStore()

    await store.setAppearance('dark', runtime)

    expect(store.error).toBe('磁盘只读')
    expect(store.appearance).toBe('system')
  })

  it('读取失败保留默认快照并记录原因', async () => {
    const runtime: SettingsRuntime = {
      isAvailable: true,
      get: async () => {
        throw new Error('读取失败')
      },
      update: async () => snapshot(),
      onChanged: () => () => {}
    }
    const store = useSettingsStore()

    await store.load(runtime)

    expect(store.error).toBe('读取失败')
    expect(store.appearance).toBe('system')
    expect(store.loaded).toBe(false)
  })
})

describe('accent foreground', () => {
  it('按 Go 下发的 presets 查表', () => {
    expect(onAccentFor('#0071e3', snapshot().presets)).toBe('#ffffff')
    expect(onAccentFor('#ffbe00', snapshot().presets)).toBe('#000000')
  })

  // 快照还没到、或色板里没有这个值时回白色：与 Apple prominent-action 的默认一致。
  it('未知值回落到白色', () => {
    expect(onAccentFor('#123456', [])).toBe('#ffffff')
    expect(onAccentFor('#123456', snapshot().presets)).toBe('#ffffff')
  })
})

describe('snapshot guard', () => {
  it('接受形状完整的快照', () => {
    expect(isSnapshot(snapshot())).toBe(true)
  })

  it('拒绝畸形载荷', () => {
    expect(isSnapshot(null)).toBe(false)
    expect(isSnapshot([])).toBe(false)
    expect(isSnapshot({ appearance: 'dark' })).toBe(false)
    expect(isSnapshot({ ...snapshot(), presets: 'nope' })).toBe(false)
  })
})
