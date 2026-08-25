import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/option'
import '@/components/select'
import type { WebUiOption } from '@/components/option'
import type { WebUiSelect } from '@/components/select'
import { waitForUpdate } from '@/shared/test-utils'

afterEach(() => document.body.replaceChildren())

const OPTIONS_HTML_THREE = `
  <web-ui-option value="apple" label="Apple"></web-ui-option>
  <web-ui-option value="banana" label="Banana"></web-ui-option>
  <web-ui-option value="cherry" label="Cherry"></web-ui-option>
`

// 通过宿主 select 驱动 shared option-portal 的完整链路（注册/查询/刷新/id 分配）。
// portal 内容同步与微任务调度的行为细节由 select/autocomplete 组件测试覆盖。
describe('shared/option-portal', () => {
  it('同一宿主内 option id 唯一；跨实例注册表互不串扰', async () => {
    const elA = document.createElement('web-ui-select') as WebUiSelect
    elA.innerHTML = OPTIONS_HTML_THREE
    document.body.append(elA)
    const elB = document.createElement('web-ui-select') as WebUiSelect
    elB.innerHTML = OPTIONS_HTML_THREE
    document.body.append(elB)
    await Promise.all([waitForUpdate(elA), waitForUpdate(elB)])

    const optionsA = [...elA.querySelectorAll<WebUiOption>('web-ui-option')]
    const idsA = new Set(optionsA.map(o => o.id))
    expect(idsA.size).toBe(optionsA.length)

    // B 的 id 分配不受 A 已用 id 的影响（每实例独立闭包）
    const optionsB = [...elB.querySelectorAll<WebUiOption>('web-ui-option')]
    expect(new Set(optionsB.map(o => o.id)).size).toBe(optionsB.length)

    elA.remove()
    elB.remove()
  })

  it('remove/reorder 后 option id 保持稳定（aria 引用依赖的时序稳定性）', async () => {
    const el = document.createElement('web-ui-select') as WebUiSelect
    el.innerHTML = OPTIONS_HTML_THREE
    document.body.append(el)
    await waitForUpdate(el)

    const [apple, banana, cherry] = [...el.querySelectorAll<WebUiOption>('web-ui-option')]
    const appleId = apple.id

    banana.remove()
    await waitForUpdate(el)
    expect(apple.id).toBe(appleId)
    expect(cherry.id).toBeTruthy()

    // 重排后 id 仍跟随元素身份而非位置
    el.append(banana)
    await waitForUpdate(el)
    expect(banana.id).not.toBe(appleId)
    expect(apple.id).toBe(appleId)
    el.remove()
  })

  it('外部已设置的 option id 不被覆盖', async () => {
    const el = document.createElement('web-ui-select') as WebUiSelect
    el.innerHTML = '<web-ui-option value="a" label="A" id="custom-id"></web-ui-option>'
    document.body.append(el)
    await waitForUpdate(el)

    expect(el.querySelector<WebUiOption>('web-ui-option')!.id).toBe('custom-id')
    el.remove()
  })
})
