import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import { cleanupElement, mountElement, pollUntil, waitForUpdate } from '@/shared/test-utils'

import type { WebUiInputNumber } from '..'

afterEach(() => document.body.replaceChildren())

const createNumber = (attrs?: Record<string, string>): WebUiInputNumber =>
  mountElement<WebUiInputNumber>('web-ui-input-number', { attrs })

describe('WebUiInputNumber 可访问名称（浏览器）', () => {
  it('旧浏览器回退尊重祖先隐藏下标签自身的 visibility 覆盖', async ({ skip }) => {
    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'ariaLabelledByElements')
    if (descriptor && !Reflect.deleteProperty(Element.prototype, 'ariaLabelledByElements')) skip()

    const wrapper = document.createElement('div')
    wrapper.style.visibility = 'hidden'
    const label = document.createElement('span')
    label.id = 'input-number-visibility-override-label'
    label.style.visibility = 'visible'
    label.append('商品')
    const hiddenText = document.createElement('span')
    hiddenText.hidden = true
    hiddenText.textContent = '隐藏数量'
    label.append(hiddenText)
    wrapper.append(label)
    document.body.append(wrapper)

    const el = createNumber({ 'aria-labelledby': label.id })
    try {
      await waitForUpdate(el)
      expect(el.shadowRoot?.querySelector('input')?.getAttribute('aria-label')).toBe('商品')
      expect(page.elementLocator(el).getByRole('spinbutton', { name: '商品' }).length).toBe(1)
    } finally {
      cleanupElement(el)
      wrapper.remove()
      if (descriptor) Object.defineProperty(Element.prototype, 'ariaLabelledByElements', descriptor)
    }
  })

  it('旧浏览器回退引用 checkbox 时使用其关联 label 名称', async ({ skip }) => {
    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'ariaLabelledByElements')
    if (descriptor && !Reflect.deleteProperty(Element.prototype, 'ariaLabelledByElements')) skip()

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.id = 'input-number-subscription-checkbox'
    const label = document.createElement('label')
    document.body.append(checkbox)

    const el = createNumber({ 'aria-labelledby': checkbox.id })
    try {
      await waitForUpdate(el)
      expect(el.shadowRoot?.querySelector('input')?.hasAttribute('aria-label')).toBe(false)

      label.htmlFor = checkbox.id
      label.textContent = '接收更新'
      document.body.append(label)
      await pollUntil(
        () =>
          el.shadowRoot?.querySelector('input')?.getAttribute('aria-label') === '接收更新' &&
          page.elementLocator(el).getByRole('spinbutton', { name: '接收更新' }).length === 1,
        'Expected adding a matching external label to refresh the fallback name'
      )

      label.textContent = '接收产品更新'
      await pollUntil(
        () =>
          el.shadowRoot?.querySelector('input')?.getAttribute('aria-label') === '接收产品更新' &&
          page.elementLocator(el).getByRole('spinbutton', { name: '接收产品更新' }).length === 1,
        'Expected changes to the associated label to refresh the fallback name'
      )

      label.htmlFor = 'another-control'
      await pollUntil(
        () => el.shadowRoot?.querySelector('input')?.hasAttribute('aria-label') === false,
        'Expected changing the external label association to clear the fallback name'
      )

      label.htmlFor = checkbox.id
      await pollUntil(
        () => el.shadowRoot?.querySelector('input')?.getAttribute('aria-label') === '接收产品更新',
        'Expected restoring the label association to restore the fallback name'
      )
    } finally {
      cleanupElement(el)
      checkbox.remove()
      label.remove()
      if (descriptor) Object.defineProperty(Element.prototype, 'ariaLabelledByElements', descriptor)
    }
  })

  it('旧浏览器回退跟随已引用标签的 aria-labelledby 重指向', async ({ skip }) => {
    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'ariaLabelledByElements')
    if (descriptor && !Reflect.deleteProperty(Element.prototype, 'ariaLabelledByElements')) skip()

    const original = document.createElement('span')
    original.id = 'input-number-nested-original-label'
    original.textContent = '原标签'
    const replacement = document.createElement('span')
    replacement.id = 'input-number-nested-replacement-label'
    replacement.textContent = '新标签'
    const label = document.createElement('span')
    label.id = 'input-number-nested-changing-label'
    label.setAttribute('aria-labelledby', original.id)
    label.textContent = '自身文本不参与名称'
    document.body.append(original, replacement, label)

    const el = createNumber({ 'aria-labelledby': label.id })
    try {
      await waitForUpdate(el)
      const input = el.shadowRoot?.querySelector('input')
      expect(input?.getAttribute('aria-label')).toBe('原标签')
      expect(page.elementLocator(el).getByRole('spinbutton', { name: '原标签' }).length).toBe(1)

      label.setAttribute('aria-labelledby', replacement.id)
      await pollUntil(
        () =>
          input?.getAttribute('aria-label') === '新标签' &&
          page.elementLocator(el).getByRole('spinbutton', { name: '新标签' }).length === 1,
        'Expected a nested aria-labelledby change to refresh the fallback accessible name'
      )
      expect(page.elementLocator(el).getByRole('spinbutton', { name: '原标签' }).length).toBe(0)
    } finally {
      cleanupElement(el)
      original.remove()
      replacement.remove()
      label.remove()
      if (descriptor) Object.defineProperty(Element.prototype, 'ariaLabelledByElements', descriptor)
    }
  })

  it('旧浏览器回退使用 text input 的关联 label，并尊重图片的空 alt', async ({ skip }) => {
    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'ariaLabelledByElements')
    if (descriptor && !Reflect.deleteProperty(Element.prototype, 'ariaLabelledByElements')) skip()

    const textInput = document.createElement('input')
    textInput.type = 'text'
    textInput.id = 'input-number-email-input'
    textInput.value = 'person@example.com'
    const textLabel = document.createElement('label')
    textLabel.htmlFor = textInput.id
    textLabel.textContent = '邮箱地址'

    const image = document.createElement('img')
    image.id = 'input-number-decorative-image'
    image.alt = ''
    image.title = '装饰图片'
    document.body.append(textInput, textLabel, image)

    const textInputNumber = createNumber({ 'aria-labelledby': textInput.id })
    const imageInputNumber = createNumber({ 'aria-labelledby': image.id })
    try {
      await waitForUpdate(textInputNumber)
      await waitForUpdate(imageInputNumber)

      expect(textInputNumber.shadowRoot?.querySelector('input')?.getAttribute('aria-label')).toBe('邮箱地址')
      expect(page.elementLocator(textInputNumber).getByRole('spinbutton', { name: '邮箱地址' }).length).toBe(1)
      expect(imageInputNumber.shadowRoot?.querySelector('input')?.hasAttribute('aria-label')).toBe(false)
      expect(page.elementLocator(imageInputNumber).getByRole('spinbutton', { name: '' }).length).toBe(1)
    } finally {
      cleanupElement(textInputNumber)
      cleanupElement(imageInputNumber)
      textInput.remove()
      textLabel.remove()
      image.remove()
      if (descriptor) Object.defineProperty(Element.prototype, 'ariaLabelledByElements', descriptor)
    }
  })

  it('aria-label 与 aria-labelledby 都为原生 spinbutton 提供可访问名称', async () => {
    const stylesheet = document.createElement('style')
    stylesheet.textContent = '.input-number-css-hidden { display: none; }'
    document.body.append(stylesheet)

    const label = document.createElement('span')
    label.id = 'input-number-label'
    label.textContent = '数量'
    document.body.append(label)

    const altLabel = document.createElement('span')
    altLabel.id = 'input-number-alt-label'
    const altImage = document.createElement('img')
    altImage.alt = '件数'
    altLabel.append(altImage)
    document.body.append(altLabel)

    const ariaLabelTarget = document.createElement('span')
    ariaLabelTarget.id = 'input-number-aria-label-target'
    ariaLabelTarget.setAttribute('aria-label', '类别')
    document.body.append(ariaLabelTarget)

    const titleLabel = document.createElement('span')
    titleLabel.id = 'input-number-title-label'
    titleLabel.title = '商品数量'
    document.body.append(titleLabel)

    const changeLabel = document.createElement('span')
    changeLabel.id = 'input-number-change-label'
    changeLabel.textContent = '原数量'
    document.body.append(changeLabel)

    const hiddenLabel = document.createElement('span')
    hiddenLabel.id = 'input-number-hidden-label'
    const ariaHiddenText = document.createElement('span')
    ariaHiddenText.textContent = '隐藏文本'
    ariaHiddenText.setAttribute('aria-hidden', 'true')
    const visuallyHiddenText = document.createElement('span')
    visuallyHiddenText.textContent = '视觉隐藏文本'
    visuallyHiddenText.hidden = true
    hiddenLabel.append('商品', ariaHiddenText, visuallyHiddenText, '数量')
    document.body.append(hiddenLabel)

    const hiddenReferenceLabel = document.createElement('span')
    hiddenReferenceLabel.id = 'input-number-hidden-reference-label'
    hiddenReferenceLabel.hidden = true
    hiddenReferenceLabel.append('隐藏的', document.createElement('span'))
    hiddenReferenceLabel.lastElementChild!.textContent = '引用名称'
    document.body.append(hiddenReferenceLabel)

    const cssVisibilityLabel = document.createElement('span')
    cssVisibilityLabel.id = 'input-number-css-visibility-label'
    const cssHiddenText = document.createElement('span')
    cssHiddenText.className = 'input-number-css-hidden'
    cssHiddenText.textContent = '样式隐藏文本'
    cssVisibilityLabel.append('商品', cssHiddenText, '数量')
    document.body.append(cssVisibilityLabel)

    const adjacentTextLabel = document.createElement('span')
    adjacentTextLabel.id = 'input-number-adjacent-text-label'
    adjacentTextLabel.append('A', document.createElement('span'))
    adjacentTextLabel.querySelector('span')!.textContent = 'B'
    document.body.append(adjacentTextLabel)

    const chainedLabelSource = document.createElement('span')
    chainedLabelSource.id = 'input-number-chained-label-source'
    chainedLabelSource.textContent = '父级名称'
    document.body.append(chainedLabelSource)
    const aliasLabelSource = document.createElement('span')
    aliasLabelSource.id = 'input-number-alias-label-source'
    aliasLabelSource.textContent = '别名来源名称'
    document.body.append(aliasLabelSource)
    const aliasLabel = document.createElement('span')
    aliasLabel.id = 'input-number-alias-label'
    aliasLabel.setAttribute('aria-labelledby', aliasLabelSource.id)
    aliasLabel.textContent = '别名标签文本'
    document.body.append(aliasLabel)
    const chainedLabel = document.createElement('span')
    chainedLabel.id = 'input-number-chained-label'
    const chainedLabelText = document.createElement('span')
    chainedLabelText.setAttribute('aria-labelledby', chainedLabelSource.id)
    chainedLabelText.textContent = '子节点的文本'
    chainedLabel.append('标签前缀', chainedLabelText)
    document.body.append(chainedLabel)

    const valueLabel = document.createElement('input')
    valueLabel.id = 'input-number-value-label'
    valueLabel.type = 'button'
    valueLabel.value = 'Count'
    document.body.append(valueLabel)

    const ancestorVisibilityWrapper = document.createElement('div')
    const ancestorVisibilityLabel = document.createElement('span')
    ancestorVisibilityLabel.id = 'input-number-ancestor-visibility-label'
    ancestorVisibilityLabel.textContent = '商品'
    const ancestorHiddenText = document.createElement('span')
    ancestorHiddenText.hidden = true
    ancestorHiddenText.textContent = '隐藏数量'
    ancestorVisibilityLabel.append(ancestorHiddenText)
    ancestorVisibilityWrapper.append(ancestorVisibilityLabel)
    document.body.append(ancestorVisibilityWrapper)

    const lateStylesheetLabel = document.createElement('span')
    lateStylesheetLabel.id = 'input-number-late-stylesheet-label'
    lateStylesheetLabel.append('商品')
    const lateStylesheetHiddenText = document.createElement('span')
    lateStylesheetHiddenText.className = 'input-number-late-css-hidden'
    lateStylesheetHiddenText.textContent = '数量'
    lateStylesheetLabel.append(lateStylesheetHiddenText)
    document.body.append(lateStylesheetLabel)

    const ariaLabelled = createNumber({ 'aria-labelledby': label.id })
    const ariaAltLabelled = createNumber({ 'aria-labelledby': altLabel.id })
    const ariaLabelledByAriaLabel = createNumber({ 'aria-labelledby': ariaLabelTarget.id })
    const ariaLabelledByTitle = createNumber({ 'aria-labelledby': titleLabel.id })
    const ariaLabelledByLateLabel = createNumber({ 'aria-labelledby': 'input-number-late-label' })
    const ariaLabelledByChangedId = createNumber({ 'aria-labelledby': changeLabel.id })
    const ariaLabelledByAdjacentText = createNumber({ 'aria-labelledby': adjacentTextLabel.id })
    const ariaLabelledByHiddenText = createNumber({ 'aria-labelledby': hiddenLabel.id })
    const ariaLabelledByHiddenReference = createNumber({ 'aria-labelledby': hiddenReferenceLabel.id })
    const ariaLabelledByCssHiddenText = createNumber({ 'aria-labelledby': cssVisibilityLabel.id })
    const ariaLabelledByChainedLabel = createNumber({ 'aria-labelledby': chainedLabel.id })
    const ariaLabelledByAliasLabel = createNumber({ 'aria-labelledby': aliasLabel.id })
    const ariaLabelledByValueControl = createNumber({ 'aria-labelledby': valueLabel.id })
    const ariaLabelledByAncestorVisibility = createNumber({ 'aria-labelledby': ancestorVisibilityLabel.id })
    const ariaLabelledByLateStylesheet = createNumber({ 'aria-labelledby': lateStylesheetLabel.id })
    const ariaNamed = createNumber()
    await Promise.all([
      waitForUpdate(ariaLabelled),
      waitForUpdate(ariaAltLabelled),
      waitForUpdate(ariaLabelledByAriaLabel),
      waitForUpdate(ariaLabelledByTitle),
      waitForUpdate(ariaLabelledByLateLabel),
      waitForUpdate(ariaLabelledByChangedId),
      waitForUpdate(ariaLabelledByAdjacentText),
      waitForUpdate(ariaLabelledByHiddenText),
      waitForUpdate(ariaLabelledByHiddenReference),
      waitForUpdate(ariaLabelledByCssHiddenText),
      waitForUpdate(ariaLabelledByChainedLabel),
      waitForUpdate(ariaLabelledByAliasLabel),
      waitForUpdate(ariaLabelledByValueControl),
      waitForUpdate(ariaLabelledByAncestorVisibility),
      waitForUpdate(ariaLabelledByLateStylesheet),
      waitForUpdate(ariaNamed)
    ])
    expect(ariaLabelledByLateStylesheet.shadowRoot?.querySelector('input')?.getAttribute('aria-label')).toBe('商品数量')

    ariaNamed.setAttribute('aria-label', '数量')
    await waitForUpdate(ariaNamed)

    const lateLabel = document.createElement('span')
    lateLabel.id = 'input-number-late-label'
    lateLabel.textContent = '库存'
    document.body.append(lateLabel)

    changeLabel.id = 'input-number-old-label'
    const replacementLabel = document.createElement('span')
    replacementLabel.id = 'input-number-change-label'
    replacementLabel.textContent = '商品数量'
    document.body.append(replacementLabel)

    const forwardedInput = ariaLabelled.shadowRoot?.querySelector('input')
    expect(forwardedInput?.getAttribute('aria-labelledby')).toBe('')
    expect(forwardedInput?.ariaLabelledByElements).toEqual([label])
    await pollUntil(
      () => page.elementLocator(ariaLabelled).getByRole('spinbutton', { name: '数量' }).length === 1,
      'Expected ariaLabelledByElements to name the spinbutton'
    )
    expect(page.elementLocator(ariaAltLabelled).getByRole('spinbutton', { name: '件数' }).length).toBe(1)
    expect(page.elementLocator(ariaLabelledByAriaLabel).getByRole('spinbutton', { name: '类别' }).length).toBe(1)
    expect(page.elementLocator(ariaLabelledByTitle).getByRole('spinbutton', { name: '商品数量' }).length).toBe(1)
    expect(page.elementLocator(ariaLabelledByAdjacentText).getByRole('spinbutton', { name: 'AB' }).length).toBe(1)
    expect(page.elementLocator(ariaLabelledByHiddenText).getByRole('spinbutton', { name: '商品数量' }).length).toBe(1)
    expect(
      page.elementLocator(ariaLabelledByHiddenReference).getByRole('spinbutton', { name: '隐藏的引用名称' }).length
    ).toBe(1)
    expect(page.elementLocator(ariaLabelledByCssHiddenText).getByRole('spinbutton', { name: '商品数量' }).length).toBe(
      1
    )
    expect(
      page.elementLocator(ariaLabelledByChainedLabel).getByRole('spinbutton', { name: '标签前缀父级名称' }).length
    ).toBe(1)
    expect(page.elementLocator(ariaLabelledByAliasLabel).getByRole('spinbutton', { name: '别名来源名称' }).length).toBe(
      1
    )
    expect(page.elementLocator(ariaLabelledByValueControl).getByRole('spinbutton', { name: 'Count' }).length).toBe(1)
    expect(page.elementLocator(ariaLabelledByAncestorVisibility).getByRole('spinbutton', { name: '商品' }).length).toBe(
      1
    )
    expect(page.elementLocator(ariaNamed).getByRole('spinbutton', { name: '数量' }).length).toBe(1)

    titleLabel.title = '库存数量'
    await pollUntil(
      () =>
        ariaLabelledByTitle.shadowRoot?.querySelector('input')?.getAttribute('aria-label') === '库存数量' &&
        page.elementLocator(ariaLabelledByTitle).getByRole('spinbutton', { name: '库存数量' }).length === 1,
      'Expected title-only referenced labels to name the spinbutton and follow title changes'
    )

    ariaHiddenText.removeAttribute('aria-hidden')
    visuallyHiddenText.hidden = false
    await pollUntil(
      () =>
        page.elementLocator(ariaLabelledByHiddenText).getByRole('spinbutton', { name: '商品隐藏文本视觉隐藏文本数量' })
          .length === 1,
      'Expected the spinbutton name to follow visibility changes in its referenced label'
    )

    await pollUntil(
      () => page.elementLocator(ariaLabelledByLateLabel).getByRole('spinbutton', { name: '库存' }).length === 1,
      'Expected an inserted label to name the spinbutton'
    )
    await pollUntil(
      () => page.elementLocator(ariaLabelledByChangedId).getByRole('spinbutton', { name: '商品数量' }).length === 1,
      'Expected a replacement label with the referenced id to name the spinbutton'
    )
    stylesheet.textContent = '.input-number-css-hidden { display: inline; }'
    await pollUntil(
      () =>
        page.elementLocator(ariaLabelledByCssHiddenText).getByRole('spinbutton', { name: '商品样式隐藏文本数量' })
          .length === 1,
      'Expected the spinbutton name to follow stylesheet visibility changes in its referenced label'
    )
    const lateStylesheet = document.createElement('link')
    lateStylesheet.rel = 'stylesheet'
    const lateStylesheetUrl = URL.createObjectURL(
      new Blob(['.input-number-late-css-hidden { display: none; }'], { type: 'text/css' })
    )
    lateStylesheet.href = lateStylesheetUrl
    document.head.append(lateStylesheet)
    await pollUntil(
      () => ariaLabelledByLateStylesheet.shadowRoot?.querySelector('input')?.getAttribute('aria-label') === '商品',
      'Expected a late linked stylesheet load to refresh the fallback accessible name'
    )
    ancestorVisibilityWrapper.style.visibility = 'hidden'
    await pollUntil(
      () =>
        page.elementLocator(ariaLabelledByAncestorVisibility).getByRole('spinbutton', { name: '商品隐藏数量' })
          .length === 1,
      'Expected a hidden referenced label to include its hidden subtree after ancestor visibility changes'
    )
    ancestorVisibilityWrapper.style.visibility = 'visible'
    await pollUntil(
      () =>
        page.elementLocator(ariaLabelledByAncestorVisibility).getByRole('spinbutton', { name: '商品' }).length === 1,
      'Expected a visible referenced label to exclude its hidden subtree after ancestor visibility changes'
    )
    chainedLabelSource.textContent = '更新后的父级名称'
    await pollUntil(
      () =>
        page.elementLocator(ariaLabelledByChainedLabel).getByRole('spinbutton', { name: '标签前缀更新后的父级名称' })
          .length === 1,
      'Expected the spinbutton name to follow changes to a nested aria-labelledby reference'
    )
    valueLabel.value = 'Count items'
    expect(valueLabel.getAttribute('value')).toBe('Count items')
    await pollUntil(
      () =>
        page.elementLocator(ariaLabelledByValueControl).getByRole('spinbutton', { name: 'Count items' }).length === 1,
      'Expected the spinbutton name to follow value changes on its referenced button input'
    )

    ariaLabelled.remove()
    document.body.append(ariaLabelled)
    await waitForUpdate(ariaLabelled)

    label.textContent = '商品数量'
    await pollUntil(
      () => page.elementLocator(ariaLabelled).getByRole('spinbutton', { name: '商品数量' }).length === 1,
      'Expected the spinbutton name to follow its referenced label text'
    )

    cleanupElement(ariaLabelled)
    cleanupElement(ariaAltLabelled)
    cleanupElement(ariaLabelledByAriaLabel)
    cleanupElement(ariaLabelledByTitle)
    cleanupElement(ariaLabelledByLateLabel)
    cleanupElement(ariaLabelledByChangedId)
    cleanupElement(ariaLabelledByAdjacentText)
    cleanupElement(ariaLabelledByHiddenText)
    cleanupElement(ariaLabelledByHiddenReference)
    cleanupElement(ariaLabelledByCssHiddenText)
    cleanupElement(ariaLabelledByChainedLabel)
    cleanupElement(ariaLabelledByAliasLabel)
    cleanupElement(ariaLabelledByValueControl)
    cleanupElement(ariaLabelledByAncestorVisibility)
    cleanupElement(ariaLabelledByLateStylesheet)
    cleanupElement(ariaNamed)
    label.remove()
    altLabel.remove()
    ariaLabelTarget.remove()
    titleLabel.remove()
    changeLabel.remove()
    adjacentTextLabel.remove()
    hiddenLabel.remove()
    hiddenReferenceLabel.remove()
    cssVisibilityLabel.remove()
    lateLabel.remove()
    replacementLabel.remove()
    chainedLabel.remove()
    chainedLabelSource.remove()
    aliasLabel.remove()
    aliasLabelSource.remove()
    ancestorVisibilityWrapper.remove()
    lateStylesheet.remove()
    URL.revokeObjectURL(lateStylesheetUrl)
    lateStylesheetLabel.remove()
    valueLabel.remove()
    stylesheet.remove()
  })

  it('已加载 stylesheet 的 media 切换后刷新 aria-labelledby 回退名称', async () => {
    const stylesheet = document.createElement('style')
    stylesheet.media = 'not all'
    stylesheet.textContent = '.input-number-media-hidden { display: none; }'
    document.body.append(stylesheet)

    const label = document.createElement('span')
    label.id = 'input-number-media-label'
    const conditionalText = document.createElement('span')
    conditionalText.className = 'input-number-media-hidden'
    conditionalText.textContent = '单位'
    label.append('商品', conditionalText, '数量')
    document.body.append(label)

    const el = createNumber({ 'aria-labelledby': label.id })
    await waitForUpdate(el)
    const input = el.shadowRoot?.querySelector('input')
    expect(input?.getAttribute('aria-label')).toBe('商品单位数量')

    stylesheet.media = 'all'
    await pollUntil(
      () =>
        input?.getAttribute('aria-label') === '商品数量' &&
        page.elementLocator(el).getByRole('spinbutton', { name: '商品数量' }).length === 1,
      'Expected an active stylesheet media change to refresh the fallback name'
    )

    stylesheet.media = 'not all'
    await pollUntil(
      () =>
        input?.getAttribute('aria-label') === '商品单位数量' &&
        page.elementLocator(el).getByRole('spinbutton', { name: '商品单位数量' }).length === 1,
      'Expected an inactive stylesheet media change to restore the fallback name'
    )

    cleanupElement(el)
    label.remove()
    stylesheet.remove()
  })

  it('旧浏览器回退使用 aria-labelledby 标签中 select 的选中项', async ({ skip }) => {
    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'ariaLabelledByElements')
    if (descriptor && !Reflect.deleteProperty(Element.prototype, 'ariaLabelledByElements')) skip()

    const label = document.createElement('span')
    label.id = 'input-number-selected-option-label'
    label.append('包装：')
    const select = document.createElement('select')
    select.innerHTML = '<option value="box">箱</option><option value="piece">件</option>'
    label.append(select)
    document.body.append(label)

    const el = createNumber({ 'aria-labelledby': label.id })
    try {
      await waitForUpdate(el)
      const input = el.shadowRoot?.querySelector('input')
      expect(input?.getAttribute('aria-label')).toBe('包装：箱')
      expect(page.elementLocator(el).getByRole('spinbutton', { name: '包装：箱' }).length).toBe(1)

      select.value = 'piece'
      select.dispatchEvent(new Event('change', { bubbles: true }))
      await pollUntil(
        () =>
          input?.getAttribute('aria-label') === '包装：件' &&
          page.elementLocator(el).getByRole('spinbutton', { name: '包装：件' }).length === 1,
        'Expected the fallback spinbutton name to follow the embedded select value'
      )
    } finally {
      cleanupElement(el)
      label.remove()
      if (descriptor) Object.defineProperty(Element.prototype, 'ariaLabelledByElements', descriptor)
    }
  })
})
