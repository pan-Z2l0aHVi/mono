import { describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/option'
import { cleanupElement, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiAutocomplete } from '..'

describe('WebUiAutocomplete 条件渲染边界', () => {
  it('注释锚点替换为包含 option 的 wrapper 后可选中候选', async () => {
    const el = document.createElement('web-ui-autocomplete')
    el.innerHTML = '<!--options-->'
    document.body.append(el)
    await waitForUpdate(el)

    const comment = el.firstChild as Comment
    const wrapper = document.createElement('div')
    wrapper.innerHTML = '<web-ui-option value="apple" label="Apple"></web-ui-option>'
    el.replaceChild(wrapper, comment)
    await waitForUpdate(el)

    const input = el.shadowRoot!.querySelector('input')!
    input.focus()
    await waitForUpdate(el)

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    await waitForUpdate(el)

    expect(el.shadowRoot!.querySelector('.autocomplete-a11y-listbox')?.textContent).toContain('Apple')

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await waitForUpdate(el)

    expect(el.value).toBe('Apple')
    expect(el.selectedValue).toBe('apple')

    cleanupElement(el)
  })

  it('portal 打开时删除整个 wrapper 不再选中已删除候选', async () => {
    const el = document.createElement('web-ui-autocomplete')
    el.portal = true
    el.innerHTML = `
      <div>
        <web-ui-option value="apple" label="Apple"></web-ui-option>
      </div>
    `
    document.body.append(el)
    await waitForUpdate(el)

    const wrapper = el.querySelector('div')!
    const input = el.shadowRoot!.querySelector('input')!
    input.focus()
    await waitForUpdate(el)
    await new Promise(resolve => requestAnimationFrame(resolve))
    await waitForUpdate(el)

    wrapper.remove()
    await new Promise<void>(resolve => queueMicrotask(resolve))
    await waitForUpdate(el)

    const [events] = spyEvents(el, 'change')
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await waitForUpdate(el)

    expect(events).toHaveLength(0)
    expect(el.value).toBe('')
    expect(el.selectedValue).toBe('')

    cleanupElement(el)
  })
})
