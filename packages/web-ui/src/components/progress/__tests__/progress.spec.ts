import '..'

import { describe, expect, it } from 'vite-plus/test'

import { cleanupElement, contractReflection, mountElement, waitForUpdate } from '@/shared/test-utils'

import type { WebUiProgress } from '..'

const createProgress = (attrs?: Record<string, string>): WebUiProgress =>
  mountElement<WebUiProgress>('web-ui-progress', { attrs })

describe('WebUiProgress 组件', () => {
  contractReflection('property 写入后同步到宿主 attribute', () => createProgress(), [
    ['value', 42, 'value', '42'],
    ['max', 240, 'max', '240']
  ])

  describe('数值范围', () => {
    it('value 与 max 一起决定 aria-valuenow 和 aria-valuemax', async () => {
      const el = createProgress({ value: '12', max: '40' })
      await waitForUpdate(el)

      expect(el.value).toBe(12)
      expect(el.max).toBe(40)
      expect(el.getAttribute('role')).toBe('progressbar')
      expect(el.getAttribute('aria-valuemin')).toBe('0')
      expect(el.getAttribute('aria-valuemax')).toBe('40')
      expect(el.getAttribute('aria-valuenow')).toBe('12')
      cleanupElement(el)
    })

    it('value 超过 max 时收敛到 max，并把反射值同步回来', async () => {
      const el = createProgress({ value: '240', max: '200' })
      await waitForUpdate(el)
      await waitForUpdate(el)

      expect(el.value).toBe(200)
      expect(el.getAttribute('value')).toBe('200')
      expect(el.getAttribute('aria-valuenow')).toBe('200')
      cleanupElement(el)
    })

    it('value 在前、max 在后写入时仍保留区间内的原值', async () => {
      const el = createProgress()
      await waitForUpdate(el)

      el.value = 120
      el.max = 200
      await waitForUpdate(el)

      expect(el.value).toBe(120)
      expect(el.getAttribute('aria-valuemax')).toBe('200')
      expect(el.getAttribute('aria-valuenow')).toBe('120')
      cleanupElement(el)
    })

    it.each([
      ['value', 'not-a-number', 0, '0'],
      ['value', '-12', 0, '0'],
      ['max', '0', 100, '100'],
      ['max', 'Infinity', 100, '100']
    ])('%s=%s 回退到 %s', async (prop, input, expectedProp, expectedAttr) => {
      const el = createProgress({ [prop]: input })
      await waitForUpdate(el)

      expect(el[prop as 'value' | 'max']).toBe(expectedProp)
      expect(el.getAttribute(prop)).toBe(expectedAttr)
      cleanupElement(el)
    })
  })

  describe('可访问名称', () => {
    it('没有显式名称时回退内置英文 Progress', async () => {
      const el = createProgress()
      await waitForUpdate(el)

      expect(el.getAttribute('aria-label')).toBe('Progress')
      cleanupElement(el)
    })

    it('显式 aria-label 与 aria-labelledby 都优先于内置名称', async () => {
      const labelled = createProgress({ 'aria-label': '文件上传' })
      const labelledBy = createProgress({ 'aria-labelledby': 'upload-title' })
      await Promise.all([waitForUpdate(labelled), waitForUpdate(labelledBy)])

      expect(labelled.getAttribute('aria-label')).toBe('文件上传')
      expect(labelledBy.getAttribute('aria-label')).toBeNull()
      expect(labelledBy.getAttribute('aria-labelledby')).toBe('upload-title')
      cleanupElement(labelled)
      cleanupElement(labelledBy)
    })
  })

  describe('indeterminate 与 show-value', () => {
    it('indeterminate 移除 aria-valuenow，但不丢名称与上限', async () => {
      const el = createProgress({ indeterminate: '', value: '25', max: '50', 'aria-label': '导入中' })
      await waitForUpdate(el)

      expect(el.getAttribute('aria-label')).toBe('导入中')
      expect(el.getAttribute('aria-valuemax')).toBe('50')
      expect(el.hasAttribute('aria-valuenow')).toBe(false)
      cleanupElement(el)
    })

    it('关闭 indeterminate 后恢复当前 aria-valuenow', async () => {
      const el = createProgress({ indeterminate: '', value: '25' })
      await waitForUpdate(el)

      el.indeterminate = false
      await waitForUpdate(el)

      expect(el.getAttribute('aria-valuenow')).toBe('25')
      cleanupElement(el)
    })

    it('show-value 显示四舍五入后的百分比，关闭时隐藏文本', async () => {
      const visible = createProgress({ value: '1', max: '3', 'show-value': '' })
      const hidden = createProgress({ value: '1', max: '3' })
      await Promise.all([waitForUpdate(visible), waitForUpdate(hidden)])

      const visibleValue = visible.shadowRoot?.querySelector<HTMLElement>('[part="value"]')
      const hiddenValue = hidden.shadowRoot?.querySelector<HTMLElement>('[part="value"]')
      expect(visibleValue?.textContent?.trim()).toBe('33%')
      expect(visibleValue?.hasAttribute('hidden')).toBe(false)
      expect(hiddenValue?.hasAttribute('hidden')).toBe(true)
      cleanupElement(visible)
      cleanupElement(hidden)
    })
  })
})
