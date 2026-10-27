import '..'
import '@/components/segmented-trigger'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { queryA11y, waitForUpdate } from '@/shared/test-utils'

import type { WebUiSegmented } from '..'

afterEach(() => document.body.replaceChildren())

async function createSegmented(): Promise<WebUiSegmented> {
  const segmented = document.createElement('web-ui-segmented') as WebUiSegmented
  segmented.innerHTML = ['mon', 'tue', 'wed']
    .map(value => `<web-ui-segmented-trigger value="${value}">${value}</web-ui-segmented-trigger>`)
    .join('')
  document.body.append(segmented)
  await waitForUpdate(segmented)
  return segmented
}

describe('WebUiSegmented listbox 可访问名称（浏览器）', () => {
  it('宿主 aria-label 转发到内部 listbox，移除后同步清除', async () => {
    const segmented = await createSegmented()
    const listbox = queryA11y(segmented, '[role="listbox"]')
    expect(listbox).toBeTruthy()
    expect(listbox!.hasAttribute('aria-label')).toBe(false)

    segmented.setAttribute('aria-label', 'Weekday')
    await waitForUpdate(segmented)
    expect(queryA11y(segmented, '[role="listbox"]')?.getAttribute('aria-label')).toBe('Weekday')

    segmented.removeAttribute('aria-label')
    await waitForUpdate(segmented)
    expect(queryA11y(segmented, '[role="listbox"]')?.hasAttribute('aria-label')).toBe(false)
  })
})
