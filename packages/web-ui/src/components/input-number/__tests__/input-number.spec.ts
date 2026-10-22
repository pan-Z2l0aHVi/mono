import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import {
  cleanupElement,
  flush,
  mountElement,
  pollUntil,
  queryA11y,
  spyEvents,
  waitForUpdate
} from '@/shared/test-utils'

import type { WebUiInputNumber } from '..'

afterEach(() => document.body.replaceChildren())

/**
 * 共有契约（value/disabled 默认值、属性反射、input・change・focus・blur 事件、
 * value 双向同步、formAssociated）见
 * `src/shared/form-association/__tests__/text-control-contract.spec.ts`。
 * 本文件只保留 input-number 特有的公开契约：步进 button、min/max 收敛、精度、键盘。
 */
const createNumber = (attrs?: Record<string, string>): WebUiInputNumber =>
  mountElement<WebUiInputNumber>('web-ui-input-number', { attrs })

const nativeInput = (el: WebUiInputNumber): HTMLInputElement => queryA11y(el, 'input') as HTMLInputElement
const stepButton = (el: WebUiInputNumber, direction: 'Increase' | 'Decrease'): HTMLButtonElement =>
  queryA11y(el, `button[aria-label="${direction}"]`) as HTMLButtonElement

describe('WebUiInputNumber 组件特有契约', () => {
  it('precision 默认 0', () => {
    const el = createNumber()
    expect(el.precision).toBe(0)
    cleanupElement(el)
  })

  describe('可访问名称', () => {
    it('将 aria-label 转发给原生 number input', async () => {
      const el = createNumber()
      await waitForUpdate(el)

      el.setAttribute('aria-label', '数量')
      await waitForUpdate(el)

      expect(nativeInput(el).getAttribute('aria-label')).toBe('数量')
      cleanupElement(el)
    })

    it('转发 aria-labelledby，并为跨 Shadow DOM 引用提供文本名称', async () => {
      const label = document.createElement('span')
      label.id = 'quantity-label'
      label.setAttribute('aria-label', '件数')
      document.body.append(label)

      const el = createNumber({ 'aria-labelledby': label.id })
      await waitForUpdate(el)

      expect(nativeInput(el).getAttribute('aria-labelledby')).toBe(label.id)
      expect(nativeInput(el).getAttribute('aria-label')).toBe('件数')
      cleanupElement(el)
      label.remove()
    })

    it('跟随引用标签上的 aria-labelledby 生成回退名称', async () => {
      const nestedLabel = document.createElement('span')
      nestedLabel.id = 'nested-quantity-label'
      nestedLabel.textContent = '件数'
      const label = document.createElement('span')
      label.id = 'quantity-label-reference'
      label.setAttribute('aria-labelledby', nestedLabel.id)
      label.textContent = '错误名称'
      document.body.append(nestedLabel, label)

      const el = createNumber({ 'aria-labelledby': label.id })
      await waitForUpdate(el)

      expect(nativeInput(el).getAttribute('aria-label')).toBe('件数')
      cleanupElement(el)
      nestedLabel.remove()
      label.remove()
    })

    it('用 title 命名没有文本内容的标签引用，并跟随 title 更新', async () => {
      const label = document.createElement('span')
      label.id = 'title-quantity-label'
      label.title = '数量'
      document.body.append(label)

      const el = createNumber({ 'aria-labelledby': label.id })
      await waitForUpdate(el)
      expect(nativeInput(el).getAttribute('aria-label')).toBe('数量')

      label.title = '商品数量'
      await pollUntil(() => nativeInput(el).getAttribute('aria-label') === '商品数量', '预期 title 改变后更新回退名称')
      cleanupElement(el)
      label.remove()
    })

    it('嵌入 select 时只使用选中项，并跟随 selection change 更新', async () => {
      const label = document.createElement('span')
      label.id = 'selected-option-label'
      label.append('包装：')
      const select = document.createElement('select')
      select.innerHTML = '<option value="box">箱</option><option value="piece">件</option>'
      label.append(select)
      document.body.append(label)

      const el = createNumber({ 'aria-labelledby': label.id })
      await waitForUpdate(el)
      expect(nativeInput(el).getAttribute('aria-label')).toBe('包装：箱')

      select.value = 'piece'
      select.dispatchEvent(new Event('change', { bubbles: true }))
      await pollUntil(() => nativeInput(el).getAttribute('aria-label') === '包装：件', '预期选中项变化后更新回退名称')

      cleanupElement(el)
      label.remove()
    })

    it('直接引用 text input 时使用其关联 label，而不是当前值', async () => {
      const textInput = document.createElement('input')
      textInput.type = 'text'
      textInput.id = 'email-address-input'
      textInput.value = 'person@example.com'
      const label = document.createElement('label')
      label.htmlFor = textInput.id
      label.textContent = '邮箱地址'
      document.body.append(textInput, label)

      const el = createNumber({ 'aria-labelledby': textInput.id })
      await waitForUpdate(el)

      expect(nativeInput(el).getAttribute('aria-label')).toBe('邮箱地址')
      cleanupElement(el)
      textInput.remove()
      label.remove()
    })

    it('保留图片的显式空 alt，不以 title 生成名称', async () => {
      const image = document.createElement('img')
      image.id = 'decorative-image-label'
      image.alt = ''
      image.title = '装饰图片'
      document.body.append(image)

      const el = createNumber({ 'aria-labelledby': image.id })
      await waitForUpdate(el)

      expect(nativeInput(el).hasAttribute('aria-label')).toBe(false)
      cleanupElement(el)
      image.remove()
    })

    it('引用 checkbox 时使用其关联 label 名称而不是选中状态', async () => {
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.id = 'subscription-checkbox'
      document.body.append(checkbox)

      const el = createNumber({ 'aria-labelledby': checkbox.id })
      await waitForUpdate(el)

      expect(nativeInput(el).hasAttribute('aria-label')).toBe(false)
      const label = document.createElement('label')
      label.htmlFor = checkbox.id
      label.textContent = '接收更新'
      document.body.append(label)
      await pollUntil(() => nativeInput(el).getAttribute('aria-label') === '接收更新', '预期新增关联 label 后生成名称')

      label.textContent = '接收产品更新'
      await pollUntil(
        () => nativeInput(el).getAttribute('aria-label') === '接收产品更新',
        '预期关联 label 文本变化后更新回退名称'
      )

      label.htmlFor = 'another-control'
      await pollUntil(() => !nativeInput(el).hasAttribute('aria-label'), '预期 label 改绑后清除旧关联名称')

      label.htmlFor = checkbox.id
      await pollUntil(
        () => nativeInput(el).getAttribute('aria-label') === '接收产品更新',
        '预期 label 重新关联后恢复名称'
      )
      cleanupElement(el)
      checkbox.remove()
      label.remove()
    })

    it('保留直接引用的隐藏标签子树文本', async () => {
      const label = document.createElement('span')
      label.id = 'hidden-quantity-label'
      label.hidden = true
      label.append('商品', document.createElement('span'))
      label.lastElementChild!.textContent = '数量'
      document.body.append(label)

      const el = createNumber({ 'aria-labelledby': label.id })
      await waitForUpdate(el)

      expect(nativeInput(el).getAttribute('aria-label')).toBe('商品数量')
      cleanupElement(el)
      label.remove()
    })

    it('遵循祖先隐藏下标签自身的 visibility 覆盖', async () => {
      const wrapper = document.createElement('div')
      wrapper.style.visibility = 'hidden'
      const label = document.createElement('span')
      label.id = 'visibility-override-label'
      label.style.visibility = 'visible'
      label.append('商品')
      const hiddenText = document.createElement('span')
      hiddenText.hidden = true
      hiddenText.textContent = '隐藏数量'
      label.append(hiddenText)
      wrapper.append(label)
      document.body.append(wrapper)

      const el = createNumber({ 'aria-labelledby': label.id })
      await waitForUpdate(el)

      expect(nativeInput(el).getAttribute('aria-label')).toBe('商品')
      cleanupElement(el)
      wrapper.remove()
    })

    it('祖先可见性变化使直接引用标签转入隐藏引用状态时刷新回退名称', async () => {
      const wrapper = document.createElement('div')
      const label = document.createElement('span')
      label.id = 'visibility-quantity-label'
      label.textContent = '商品'
      const hiddenText = document.createElement('span')
      hiddenText.hidden = true
      hiddenText.textContent = '隐藏数量'
      label.append(hiddenText)
      wrapper.append(label)
      document.body.append(wrapper)

      const el = createNumber({ 'aria-labelledby': label.id })
      await waitForUpdate(el)
      expect(nativeInput(el).getAttribute('aria-label')).toBe('商品')

      wrapper.style.visibility = 'hidden'
      await pollUntil(
        () => nativeInput(el).getAttribute('aria-label') === '商品隐藏数量',
        '预期祖先可见性变化后回退名称包含隐藏子树文本'
      )

      wrapper.style.visibility = 'visible'
      await pollUntil(
        () => nativeInput(el).getAttribute('aria-label') === '商品',
        '预期祖先恢复可见后回退名称排除隐藏子树文本'
      )

      const replacementWrapper = document.createElement('div')
      replacementWrapper.append(label)
      document.body.append(replacementWrapper)
      wrapper.remove()
      await flush()
      await waitForUpdate(el)

      replacementWrapper.style.visibility = 'hidden'
      await pollUntil(
        () => nativeInput(el).getAttribute('aria-label') === '商品隐藏数量',
        '预期标签移动到新祖先后仍观察其可见性变化'
      )
      cleanupElement(el)
      replacementWrapper.remove()
    })

    it('忽略仅含空白的 aria-labelledby 引用', async () => {
      const el = createNumber({ 'aria-labelledby': '   ' })
      await waitForUpdate(el)

      expect(nativeInput(el).getAttribute('aria-labelledby')).toBe('   ')
      expect(nativeInput(el).hasAttribute('aria-label')).toBe(false)
      cleanupElement(el)
    })
  })

  describe('步进 button', () => {
    it('点击增加 button 增大值', async () => {
      const el = createNumber()
      el.value = 5
      await waitForUpdate(el)

      stepButton(el, 'Increase').click()
      await waitForUpdate(el)

      expect(el.value).toBe(6)
      cleanupElement(el)
    })

    it('点击减少 button 减小值', async () => {
      const el = createNumber()
      el.value = 5
      await waitForUpdate(el)

      stepButton(el, 'Decrease').click()
      await waitForUpdate(el)

      expect(el.value).toBe(4)
      cleanupElement(el)
    })

    it('默认 precision 下按 step=0.3 步进', async () => {
      const el = createNumber()
      el.value = 1
      el.step = 0.3
      await waitForUpdate(el)

      const increase = stepButton(el, 'Increase')
      for (let i = 0; i < 3; i++) {
        increase.click()
        await waitForUpdate(el)
      }

      expect(el.value).toBe(1.9)
      cleanupElement(el)
    })

    it('默认 precision 下按 step=0.5 每次增加 0.5', async () => {
      const el = createNumber()
      el.value = 1
      el.step = 0.5
      await waitForUpdate(el)

      const increase = stepButton(el, 'Increase')
      increase.click()
      await waitForUpdate(el)
      expect(el.value).toBe(1.5)

      increase.click()
      await waitForUpdate(el)
      expect(el.value).toBe(2)
      cleanupElement(el)
    })

    it('显式 precision=0 仍按指定精度规整 step', async () => {
      const el = createNumber()
      el.value = 1
      el.step = 0.3
      el.precision = 0
      await waitForUpdate(el)

      stepButton(el, 'Increase').click()
      await waitForUpdate(el)

      expect(el.value).toBe(1)
      cleanupElement(el)
    })

    it('已渲染后显式设置 precision=0 会更新显示值', async () => {
      const el = createNumber()
      el.value = 1
      el.step = 0.5
      await waitForUpdate(el)

      stepButton(el, 'Increase').click()
      await waitForUpdate(el)
      expect(el.value).toBe(1.5)

      el.precision = 0
      await waitForUpdate(el)

      expect(el.value).toBe(2)
      expect(nativeInput(el).value).toBe('2')
      cleanupElement(el)
    })

    it('移除 precision 属性后恢复按 step 推导精度', async () => {
      const el = createNumber({ precision: '0', step: '0.3', value: '1' })
      await waitForUpdate(el)

      el.removeAttribute('precision')
      await waitForUpdate(el)
      stepButton(el, 'Increase').click()
      await waitForUpdate(el)

      expect(el.value).toBe(1.3)
      expect(el.hasAttribute('precision')).toBe(false)
      cleanupElement(el)
    })

    it('将 precision 设为 null 后克隆仍按 step 推导精度', async () => {
      const el = createNumber({ precision: '0', step: '0.3', value: '1' })
      await waitForUpdate(el)

      el.precision = null
      await waitForUpdate(el)
      const clone = el.cloneNode(true) as WebUiInputNumber
      document.body.append(clone)
      await waitForUpdate(clone)

      stepButton(clone, 'Increase').click()
      await waitForUpdate(clone)

      expect(el.hasAttribute('precision')).toBe(false)
      expect(clone.value).toBe(1.3)
      cleanupElement(el)
      cleanupElement(clone)
    })

    it('step 精度规整不会让极大有限值溢出或失精', async () => {
      const el = createNumber()
      el.step = 0.1
      el.value = Number.MAX_SAFE_INTEGER
      await waitForUpdate(el)

      expect(el.value).toBe(Number.MAX_SAFE_INTEGER)

      el.value = Number.MAX_VALUE
      await waitForUpdate(el)

      expect(el.value).toBe(Number.MAX_VALUE)
      cleanupElement(el)
    })

    it('点击增加 button 只派发 input，不派发 change', async () => {
      const el = createNumber()
      await waitForUpdate(el)

      const [inputEvents] = spyEvents(el, 'input')
      const [changeEvents] = spyEvents(el, 'change')
      stepButton(el, 'Increase').click()
      await waitForUpdate(el)

      expect(inputEvents).toHaveLength(1)
      expect(changeEvents).toHaveLength(0)
      cleanupElement(el)
    })

    it('disabled 时点击 button 不触发 input 事件', async () => {
      const el = createNumber()
      el.disabled = true
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'input')
      stepButton(el, 'Increase').click()
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      cleanupElement(el)
    })

    it('readonly 时步进 button 禁用且点击不触发 input', async () => {
      const el = createNumber()
      el.readonly = true
      await waitForUpdate(el)

      expect(stepButton(el, 'Increase').disabled).toBe(true)
      expect(stepButton(el, 'Decrease').disabled).toBe(true)

      const [events] = spyEvents(el, 'input')
      stepButton(el, 'Increase').click()
      await waitForUpdate(el)
      expect(events).toHaveLength(0)
      cleanupElement(el)
    })
  })

  describe('min / max 边界', () => {
    it('到达 min 时减少 button 被禁用', async () => {
      const el = createNumber()
      el.min = 0
      el.value = 0
      await waitForUpdate(el)

      expect(stepButton(el, 'Decrease').disabled).toBe(true)
      expect(stepButton(el, 'Increase').disabled).toBe(false)
      cleanupElement(el)
    })

    it('到达 max 时增加 button 被禁用', async () => {
      const el = createNumber()
      el.max = 10
      el.value = 10
      await waitForUpdate(el)

      expect(stepButton(el, 'Increase').disabled).toBe(true)
      expect(stepButton(el, 'Decrease').disabled).toBe(false)
      cleanupElement(el)
    })

    it('超出范围时自动 clamp', async () => {
      const el = createNumber()
      el.min = 0
      el.max = 100
      el.value = 200
      await waitForUpdate(el)

      expect(el.value).toBe(100)
      cleanupElement(el)
    })

    it('低于范围时自动 clamp', async () => {
      const el = createNumber()
      el.min = 0
      el.max = 100
      el.value = -10
      await waitForUpdate(el)

      expect(el.value).toBe(0)
      cleanupElement(el)
    })
  })

  describe('精度', () => {
    it('precision=1 保留一位小数', async () => {
      const el = createNumber()
      el.precision = 1
      el.value = 1.26
      await waitForUpdate(el)

      expect(el.value).toBe(1.3)
      cleanupElement(el)
    })

    it('precision=2 保留两位小数', async () => {
      const el = createNumber()
      el.precision = 2
      el.value = 1.234
      await waitForUpdate(el)

      expect(el.value).toBe(1.23)
      cleanupElement(el)
    })

    // 原实现断言「precision 变化不恢复设值时已按旧精度舍入的值」，等价于接受
    // 赋值即销毁原始小数（#340 的同一根因）。现改为：原始值保留，读取时按当前
    // precision 规整，故精度提上来之后 1.234 应回到 1.23。
    it('precision 提升后按新精度重新规整原始值', async () => {
      const el = createNumber()
      el.value = 1.234
      await waitForUpdate(el)
      expect(el.value).toBe(1)

      el.precision = 2
      await waitForUpdate(el)
      expect(el.value).toBe(1.23)
      cleanupElement(el)
    })

    it('precision 调低后截断到新的精度', async () => {
      const el = createNumber()
      el.value = 1.234
      await waitForUpdate(el)
      el.precision = 2
      await waitForUpdate(el)
      el.precision = 1
      await waitForUpdate(el)
      expect(el.value).toBe(1.2)
      cleanupElement(el)
    })
  })

  describe('键盘操作', () => {
    it('默认 precision 下 ArrowUp 按小数 step 增加', async () => {
      const el = createNumber()
      el.value = 1
      el.step = 0.3
      await waitForUpdate(el)

      nativeInput(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, composed: true }))
      await waitForUpdate(el)

      expect(el.value).toBe(1.3)
      cleanupElement(el)
    })

    it('ArrowUp 增大值并派发 input 和 change', async () => {
      const el = createNumber()
      el.value = 5
      await waitForUpdate(el)

      const [inputEvents] = spyEvents(el, 'input')
      const [changeEvents] = spyEvents(el, 'change')

      nativeInput(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, composed: true }))
      await waitForUpdate(el)

      expect(el.value).toBe(6)
      expect(inputEvents).toHaveLength(1)
      expect(changeEvents).toHaveLength(1)
      cleanupElement(el)
    })

    it('ArrowDown 减小值并派发 input 和 change', async () => {
      const el = createNumber()
      el.value = 5
      await waitForUpdate(el)

      const [inputEvents] = spyEvents(el, 'input')
      const [changeEvents] = spyEvents(el, 'change')

      nativeInput(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }))
      await waitForUpdate(el)

      expect(el.value).toBe(4)
      expect(inputEvents).toHaveLength(1)
      expect(changeEvents).toHaveLength(1)
      cleanupElement(el)
    })

    it('disabled 时键盘无响应', async () => {
      const el = createNumber()
      el.value = 5
      el.disabled = true
      await waitForUpdate(el)

      const [inputEvents] = spyEvents(el, 'input')
      nativeInput(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, composed: true }))
      await waitForUpdate(el)

      expect(el.value).toBe(5)
      expect(inputEvents).toHaveLength(0)
      cleanupElement(el)
    })

    it('readonly 时键盘无响应', async () => {
      const el = createNumber()
      el.value = 5
      el.readonly = true
      await waitForUpdate(el)

      const [inputEvents] = spyEvents(el, 'input')
      nativeInput(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, composed: true }))
      await waitForUpdate(el)

      expect(el.value).toBe(5)
      expect(inputEvents).toHaveLength(0)
      cleanupElement(el)
    })
  })

  describe('readonly 时的原生 change', () => {
    it('文本失焦提交时原生 change 转发为宿主 change', async () => {
      const el = createNumber()
      el.value = 5
      await waitForUpdate(el)

      const [changeEvents] = spyEvents(el, 'change')
      const input = nativeInput(el)
      // 真实浏览器派发的 change 不 composed，被 shadow root 挡住；组件补发 composed change
      input.value = '8'
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await waitForUpdate(el)

      expect(el.value).toBe(8)
      expect(changeEvents).toHaveLength(1)
      cleanupElement(el)
    })

    it('readonly 时原生 change 不转发', async () => {
      const el = createNumber()
      el.value = 5
      el.readonly = true
      await waitForUpdate(el)

      const [changeEvents] = spyEvents(el, 'change')
      const input = nativeInput(el)
      input.value = '8'
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await waitForUpdate(el)

      expect(el.value).toBe(5)
      expect(changeEvents).toHaveLength(0)
      cleanupElement(el)
    })
  })

  /**
   * value 先于 precision 声明是模板里的自然书写顺序（`<web-ui-input-number
   * value="1.5" precision="2">`）。赋值时若立刻按当时的 precision（默认 0）
   * 取整，原始小数会被不可逆地抹掉，精度随后声明也无法恢复。
   */
  describe('赋值顺序不依赖精度声明顺序', () => {
    it('value 在 precision 之前声明时保留小数', async () => {
      const el = createNumber({ value: '1.5', precision: '2' })
      await waitForUpdate(el)

      expect(el.value).toBe(1.5)
      cleanupElement(el)
    })

    it('极小值 0.01 不被取整成 0', async () => {
      const el = createNumber({ value: '0.01', precision: '2' })
      await waitForUpdate(el)

      expect(el.value).toBe(0.01)
      cleanupElement(el)
    })

    it('precision 在 value 之前声明时结果一致', async () => {
      const el = createNumber()
      el.precision = 2
      el.value = 1.5
      await waitForUpdate(el)

      expect(el.value).toBe(1.5)
      cleanupElement(el)
    })
  })

  /**
   * 清空/非法输入是编辑中的临时态：失焦时必须把显示回填成已提交值，
   * 否则显示与 value、以及 ElementInternals 的 validity 会三方不一致。
   */
  describe('非法输入在失焦时回填', () => {
    const mountWithValue = async (value: number) => {
      const el = createNumber()
      el.value = value
      await waitForUpdate(el)
      return el
    }

    it('清空后失焦回填已提交值', async () => {
      const el = await mountWithValue(5)
      const input = nativeInput(el)

      input.value = ''
      input.dispatchEvent(new Event('input', { bubbles: true }))
      await waitForUpdate(el)

      input.dispatchEvent(new Event('change', { bubbles: true }))
      input.dispatchEvent(new FocusEvent('blur'))
      await waitForUpdate(el)

      expect(nativeInput(el).value).toBe('5')
      expect(el.value).toBe(5)
      cleanupElement(el)
    })

    it('非法文本粘贴后失焦回填已提交值', async () => {
      const el = await mountWithValue(5)
      const input = nativeInput(el)

      // type=number 对非数字文本的 value 归一为空串
      input.value = 'abc'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      await waitForUpdate(el)

      input.dispatchEvent(new Event('change', { bubbles: true }))
      input.dispatchEvent(new FocusEvent('blur'))
      await waitForUpdate(el)

      expect(nativeInput(el).value).toBe('5')
      expect(el.value).toBe(5)
      cleanupElement(el)
    })

    it('输入合法值后失焦提交并规范化显示', async () => {
      const el = await mountWithValue(5)
      const input = nativeInput(el)

      input.value = '7'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      await waitForUpdate(el)
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await waitForUpdate(el)

      expect(el.value).toBe(7)
      expect(nativeInput(el).value).toBe('7')
      cleanupElement(el)
    })
  })
})
