import { describe, expect, it } from 'vite-plus/test'

import { LINE_NUMBER_CLASS, MDM_CODE_CLASS, visibleText } from '../contract'
import { highlightRuntime } from '../runtime-highlight'
describe('highlightRuntime', () => {
  it('按语言着色：双主题变量、行号槽与 .mdm-code 类名都并进输出', async () => {
    const html = await highlightRuntime('const answer = 42\n', 'ts')
    expect(html).toContain(MDM_CODE_CLASS)
    expect(html).toContain('--shiki-light')
    expect(html).toContain('--shiki-dark')
    expect(html).toContain(LINE_NUMBER_CLASS)
    // 与生成期同一条自证：可见文本必须逐字等于输入。
    expect(visibleText(html)).toBe('const answer = 42\n')
  })

  it('白名单之外回退纯文本，不触发语言加载', async () => {
    const html = await highlightRuntime('SELECT 1;\n', 'sql', { allowedLangs: ['ts', 'bash'] })
    expect(html).toContain('SELECT 1;')
    expect(html).toContain(MDM_CODE_CLASS)
    expect(html).not.toContain('--shiki-light')
  })

  it('未知语言与空语言回退纯文本', async () => {
    expect(await highlightRuntime('x', 'not-a-lang')).toContain('<code>x</code>')
    expect(await highlightRuntime('x', '')).toContain('<code>x</code>')
  })
})
