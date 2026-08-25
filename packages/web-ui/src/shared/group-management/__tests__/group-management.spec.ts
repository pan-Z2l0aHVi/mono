import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/checkbox'
import '@/components/checkbox-group'
import type { WebUiCheckbox } from '@/components/checkbox'
import type { WebUiCheckboxGroup } from '@/components/checkbox-group'
import { waitForUpdate } from '@/shared/test-utils'

afterEach(() => document.body.replaceChildren())

const GROUP_HTML = `
  <web-ui-checkbox value="a">A</web-ui-checkbox>
  <web-ui-checkbox value="b">B</web-ui-checkbox>
`

const createGroup = (checkboxHtml = GROUP_HTML): WebUiCheckboxGroup => {
  const el = document.createElement('web-ui-checkbox-group')
  el.innerHTML = checkboxHtml
  document.body.appendChild(el)
  return el
}

// 通过宿主 group 组件驱动 shared/group-management 的托管链路
// （注册/值归属/继承禁用/事件收敛）。跨组移动等边界由组件 browser 测试覆盖。
describe('shared/group-management', () => {
  it('成员注册后受组托管：value 变化作用于子项选中态', async () => {
    const el = createGroup()
    await waitForUpdate(el)

    el.value = ['a']
    await waitForUpdate(el)

    const [checkboxA, checkboxB] = [...el.querySelectorAll<WebUiCheckbox>('web-ui-checkbox')]
    await Promise.all([checkboxA.updateComplete, checkboxB.updateComplete])
    expect(checkboxA.checked).toBe(true)
    expect(checkboxB.checked).toBe(false)
  })

  it('v-if 插入的成员立即继承当前值与禁用态', async () => {
    const el = createGroup('<web-ui-checkbox value="a">A</web-ui-checkbox>')
    await waitForUpdate(el)
    el.value = ['a', 'c']
    el.disabled = true
    await waitForUpdate(el)

    const added = document.createElement('web-ui-checkbox') as WebUiCheckbox
    added.setAttribute('value', 'c')
    el.appendChild(added)
    await new Promise(resolve => setTimeout(resolve, 0))
    await Promise.all([added.updateComplete, waitForUpdate(el)])
    await new Promise(resolve => setTimeout(resolve, 0))
    await added.updateComplete

    // 值同步生效；disabled 不写子项属性，经上下文继承表达在 aria 上
    expect(added.disabled).toBe(false)
    expect(added.shadowRoot!.querySelector('[role="checkbox"]')!.getAttribute('aria-disabled')).toBe('true')

    el.disabled = false
    await waitForUpdate(el)
    await added.updateComplete
    expect(added.checked).toBe(true)
  })

  it('移除的成员解除托管：不再跟随组 value 变化', async () => {
    const el = createGroup()
    await waitForUpdate(el)
    el.value = ['a', 'b']
    await waitForUpdate(el)

    const checkboxA = el.querySelector<WebUiCheckbox>('web-ui-checkbox')!
    await checkboxA.updateComplete
    expect(checkboxA.checked).toBe(true)

    const slotChanged = new Promise<void>(resolve =>
      el.shadowRoot!.querySelector('slot')!.addEventListener('slotchange', () => resolve(), { once: true })
    )
    const container = document.createElement('div')
    document.body.append(container)
    container.append(checkboxA)
    await slotChanged
    await Promise.all([checkboxA.updateComplete, waitForUpdate(el)])

    // 移除后改变组值，被移除项不再同步
    el.value = []
    await waitForUpdate(el)
    await checkboxA.updateComplete
    expect(checkboxA.checked).toBe(true)

    // 独立状态恢复：移除后 checked 可自由切换（不再被组收敛覆写）
    checkboxA.checked = false
    await checkboxA.updateComplete
    expect(checkboxA.checked).toBe(false)
  })
})
