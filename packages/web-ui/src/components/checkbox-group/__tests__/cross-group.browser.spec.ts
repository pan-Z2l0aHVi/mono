import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/checkbox'
import type { WebUiCheckbox } from '@/components/checkbox'

import type { WebUiCheckboxGroup } from '..'

afterEach(() => document.body.replaceChildren())

// 点击子 checkbox 的 shadow label 触发用户交互
const clickChild = (checkbox: WebUiCheckbox) => {
  checkbox.shadowRoot!.querySelector('label')!.click()
}

describe('CheckboxGroup 跨组移动成员（浏览器）', () => {
  // 回归：晚连接组的移除同步曾覆写早连接组刚安装的托管上下文，
  // 子项移动后 change 直接冒泡出组外且 group.value 不更新。
  it('从后连接的组移入先连接的组后仍受新组托管', async () => {
    const groupA = document.createElement('web-ui-checkbox-group') as WebUiCheckboxGroup
    groupA.innerHTML = '<div><web-ui-checkbox value="a">A</web-ui-checkbox></div>'
    document.body.appendChild(groupA)
    await groupA.updateComplete

    // 组 B 晚于组 A 连接，复现"旧组移除同步晚到"的时序
    const groupB = document.createElement('web-ui-checkbox-group') as WebUiCheckboxGroup
    groupB.innerHTML = '<web-ui-checkbox value="b">B</web-ui-checkbox>'
    document.body.appendChild(groupB)
    await groupB.updateComplete
    const checkboxB = groupB.querySelector<WebUiCheckbox>('web-ui-checkbox')!
    await checkboxB.updateComplete
    clickChild(checkboxB)
    await checkboxB.updateComplete
    expect(groupB.value).toEqual(['b'])

    // 跨组移动：B 的成员移入 A 的深层包裹内
    const wrapper = groupA.querySelector('div')!
    wrapper.appendChild(checkboxB)
    await new Promise(resolve => setTimeout(resolve, 0))
    await Promise.all([checkboxB.updateComplete, groupA.updateComplete, groupB.updateComplete])
    await new Promise(resolve => setTimeout(resolve, 0))
    await checkboxB.updateComplete

    // 先验证事件收敛（不给后续渲染自愈的机会）：managed 子项的 change
    // 由 group 收敛派发，target 为 checkbox 的 change 不冒泡到 body
    const leaked: Event[] = []
    const onLeak = (e: Event) => {
      if (e.target === checkboxB) leaked.push(e)
    }
    document.body.addEventListener('change', onLeak)
    let groupAChanges = 0
    const onGroupAChange = () => {
      groupAChanges += 1
    }
    groupA.addEventListener('change', onGroupAChange)

    clickChild(checkboxB)
    await groupA.updateComplete
    await checkboxB.updateComplete

    expect(groupAChanges).toBe(1)
    expect(leaked).toHaveLength(0)
    groupA.removeEventListener('change', onGroupAChange)
    expect(groupA.value).toEqual(['b'])

    // 值归属：groupA.value 变化继续作用于该子项（托管上下文由 A 持有）
    groupA.value = ['a', 'b']
    await groupA.updateComplete
    await checkboxB.updateComplete
    expect(checkboxB.checked).toBe(true)
    groupA.value = ['a']
    await groupA.updateComplete
    await checkboxB.updateComplete
    expect(checkboxB.checked).toBe(false)

    document.body.removeEventListener('change', onLeak)
    cleanup(groupA, groupB)
  })
  it('从先连接的组移入后连接的组后仍受新组托管', async () => {
    const groupA = document.createElement('web-ui-checkbox-group') as WebUiCheckboxGroup
    groupA.innerHTML = '<web-ui-checkbox value="a">A</web-ui-checkbox>'
    document.body.appendChild(groupA)
    await groupA.updateComplete

    const groupB = document.createElement('web-ui-checkbox-group') as WebUiCheckboxGroup
    groupB.innerHTML = '<div><web-ui-checkbox value="b">B</web-ui-checkbox></div>'
    document.body.appendChild(groupB)
    await groupB.updateComplete

    const checkboxA = groupA.querySelector<WebUiCheckbox>('web-ui-checkbox')!
    groupA.value = ['a']
    await groupA.updateComplete
    await checkboxA.updateComplete
    expect(checkboxA.checked).toBe(true)

    const wrapper = groupB.querySelector('div')!
    wrapper.appendChild(checkboxA)
    await new Promise(resolve => setTimeout(resolve, 0))
    await Promise.all([checkboxA.updateComplete, groupA.updateComplete, groupB.updateComplete])
    await new Promise(resolve => setTimeout(resolve, 0))

    // 新组接管值归属
    groupB.value = ['a']
    await groupB.updateComplete
    await checkboxA.updateComplete
    expect(checkboxA.checked).toBe(true)

    // 点击收敛到 groupB
    let groupBChanges = 0
    const onGroupBChange = () => {
      groupBChanges += 1
    }
    groupB.addEventListener('change', onGroupBChange)
    let leakedToBody = 0
    const onBodyChange = (e: Event) => {
      if (e.target === checkboxA) leakedToBody += 1
    }
    document.body.addEventListener('change', onBodyChange)

    clickChild(checkboxA)
    await groupB.updateComplete
    await checkboxA.updateComplete

    expect(groupBChanges).toBe(1)
    expect(groupB.value).toEqual([])
    expect(leakedToBody).toBe(0)

    groupB.removeEventListener('change', onGroupBChange)
    document.body.removeEventListener('change', onBodyChange)
    cleanup(groupA, groupB)
  })
})

function cleanup(...groups: WebUiCheckboxGroup[]) {
  groups.forEach(group => group.remove())
}
