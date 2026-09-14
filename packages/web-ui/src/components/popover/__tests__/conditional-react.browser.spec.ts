import { createElement, type ReactNode } from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { getPortalPanel, pollUntil, waitForFrame } from '@/shared/test-utils'

import '..'
import type { WebUiPopover } from '..'

// React act 要求测试环境显式声明，否则每次 commit 输出告警并可能掩盖真实告警。
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => document.body.replaceChildren())

// React 对自定义元素用属性直写（open/portal/trigger 均为 Lit reactive property）。
// React 通过 commit 时记录的插入父节点增删节点：内容迁移后，裸条件渲染的删除会因
// recorded parent 失配而失败（README 已成文边界），稳定 wrapper 模式则与位置无关。
async function mountReactPopover(children: ReactNode): Promise<{
  popover: WebUiPopover
  render: (children: ReactNode) => Promise<void>
  unmount: () => Promise<void>
}> {
  const mountPoint = document.createElement('div')
  document.body.append(mountPoint)
  const container = document.createElement('div')
  mountPoint.append(container)
  const root: Root = createRoot(container)

  const commit = (node: ReactNode) =>
    act(async () => {
      root.render(
        createElement(
          'web-ui-popover',
          { portal: true, trigger: 'manual', open: false },
          createElement('button', { slot: 'trigger' }, 't'),
          node
        )
      )
    })

  await commit(children)
  const popover = mountPoint.querySelector('web-ui-popover') as WebUiPopover
  if (!popover) throw new Error('popover element not mounted')
  return {
    popover,
    render: async node => {
      await commit(node)
    },
    unmount: () =>
      act(async () => {
        root.unmount()
      })
  }
}

describe('WebUiPopover portal 条件渲染边界（React，浏览器）', () => {
  it('打开期裸条件新增实时迁入面板并在关闭后恢复', async () => {
    let show = false
    const { popover, render, unmount } = await mountReactPopover(
      show ? createElement('p', { className: 'probe-flag' }, 'flag') : null
    )
    await popover.updateComplete

    popover.open = true
    await popover.updateComplete
    await waitForFrame()
    expect(getPortalPanel()?.querySelector('.probe-flag')).toBeNull()

    // 打开期新增：React 以 recorded parent（宿主）appendChild，宿主观察者迁入面板
    show = true
    await render(show ? createElement('p', { className: 'probe-flag' }, 'flag') : null)
    await popover.updateComplete
    await pollUntil(
      () =>
        Boolean(getPortalPanel()?.querySelector('.probe-flag')) &&
        document.querySelectorAll('.probe-flag').length === 0,
      'Expected added React content to migrate into the panel'
    )

    popover.open = false
    await popover.updateComplete
    await pollUntil(
      () => !getPortalPanel() && document.querySelectorAll('.probe-flag').length === 1,
      'Expected bare React conditional content to restore'
    )
    await unmount()
  })

  it('稳定 wrapper 内条件删除：打开期移除不报错且关闭后不复活', async () => {
    let show = true
    const wrap = (flag: ReactNode) => createElement('div', { className: 'probe-wrap' }, flag)
    const { popover, render, unmount } = await mountReactPopover(
      wrap(show ? createElement('p', { className: 'probe-flag' }, 'flag') : null)
    )
    await popover.updateComplete

    popover.open = true
    await popover.updateComplete
    await waitForFrame()
    expect(getPortalPanel()?.querySelector('.probe-wrap')).not.toBeNull()
    expect(getPortalPanel()?.querySelector('.probe-flag')).not.toBeNull()

    // React 记录的插入父节点是 wrapper 本身：wrapper 迁移后父子关系保持一致，
    // 打开期删除走 wrapper.removeChild，不经过宿主 recorded parent，无 commit 报错
    show = false
    await render(wrap(null))
    await popover.updateComplete
    await pollUntil(
      () => !getPortalPanel()?.querySelector('.probe-flag'),
      'Expected removed React flag to leave the panel'
    )

    popover.open = false
    await popover.updateComplete
    await pollUntil(
      () =>
        !getPortalPanel() &&
        document.querySelectorAll('.probe-flag').length === 0 &&
        document.querySelectorAll('.probe-wrap').length === 1,
      'Expected wrapper removal and portal disposal to settle'
    )
    await unmount()
  })

  it('稳定 wrapper 内条件新增：打开期插入进面板并随关闭周期往返', async () => {
    let show = false
    const wrap = (flag: ReactNode) => createElement('div', { className: 'probe-wrap' }, flag)
    const { popover, render, unmount } = await mountReactPopover(
      wrap(show ? createElement('p', { className: 'probe-flag' }, 'flag') : null)
    )
    await popover.updateComplete

    popover.open = true
    await popover.updateComplete
    await waitForFrame()
    expect(getPortalPanel()?.querySelector('.probe-flag')).toBeNull()

    // React 向 wrapper（面板内）插入节点，父子关系一致，内容直接落面板
    show = true
    await render(wrap(createElement('p', { className: 'probe-flag' }, 'flag')))
    await popover.updateComplete
    await pollUntil(
      () => Boolean(getPortalPanel()?.querySelector('.probe-flag')),
      'Expected wrapped React content to enter the panel'
    )

    // 关闭恢复：wrapper 连同内部条件内容回到宿主原位
    popover.open = false
    await popover.updateComplete
    await pollUntil(
      () =>
        !getPortalPanel() &&
        document.querySelectorAll('.probe-flag').length === 1 &&
        document.querySelectorAll('.probe-wrap').length === 1,
      'Expected wrapped React content to restore'
    )

    // 重开：wrapper 再次迁入，内容保持
    popover.open = true
    await popover.updateComplete
    await waitForFrame()
    expect(getPortalPanel()?.querySelector('.probe-flag')).not.toBeNull()
    expect(document.querySelectorAll('.probe-flag').length).toBe(0)
    await unmount()
  })
})
