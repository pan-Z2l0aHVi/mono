import { act, useState, type ComponentType } from 'react'
import { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vite-plus/test'

import { createDemo } from '../examples'

it('运行示例下载失败后允许重新加载，并复用成功的结果', async () => {
  const module = { default: () => <button>Ready</button> }
  const load = vi
    .fn<() => Promise<typeof module>>()
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValue(module)
  const entry = createDemo(load)
  await expect(entry.load()).rejects.toThrow('Offline')
  await expect(entry.load()).resolves.toBe(module)
  await expect(entry.load()).resolves.toBe(module)
  expect(load).toHaveBeenCalledTimes(2)
})

it('初次懒载后重渲染不改变运行示例身份或重置状态', async () => {
  function Counter() {
    const [count, setCount] = useState(0)
    return <button onClick={() => setCount(n => n + 1)}>{count}</button>
  }
  let resolve!: (value: { default: ComponentType }) => void
  const pending = new Promise<{ default: ComponentType }>(done => {
    resolve = done
  })
  const entry = createDemo(() => pending)
  function Parent({ Demo }: { Demo: ComponentType }) {
    return (
      <Suspense fallback={<span>Loading</span>}>
        <Demo />
      </Suspense>
    )
  }
  const host = document.createElement('div')
  const root = createRoot(host)
  try {
    await act(async () => {
      root.render(<Parent Demo={entry.get()} />)
    })
    await act(async () => {
      resolve({ default: Counter })
      await entry.load()
    })
    const button = host.querySelector('button')!
    await act(async () => {
      button.click()
    })
    expect(button.textContent).toBe('1')
    await act(async () => {
      root.render(<Parent Demo={entry.get()} />)
    })
    expect(host.querySelector('button')).toBe(button)
    expect(button.textContent).toBe('1')
  } finally {
    await act(async () => {
      root.unmount()
    })
  }
})
