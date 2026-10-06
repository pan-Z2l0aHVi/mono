import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { copyToClipboard } from '..'

describe('copyToClipboard 测试', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('文本写入剪贴板的内容与输入一致', async () => {
    const writes: Blob[] = []
    vi.spyOn(navigator.clipboard, 'write').mockImplementation(async items => {
      writes.push(await items[0].getType('text/plain'))
    })

    await expect(copyToClipboard('test message')).resolves.toBeUndefined()

    expect(writes).toHaveLength(1)
    expect(await writes[0].text()).toBe('test message')
  })

  it('Blob 按自身 MIME 写入，不退化成 text/plain', async () => {
    // 富文本复制的全部意义在于 type；丢掉它会让「复制链接带标题」复制成一坨纯文本
    const writes: Blob[] = []
    vi.spyOn(navigator.clipboard, 'write').mockImplementation(async items => {
      writes.push((await items[0].getType('text/html')) as Blob)
    })

    await expect(copyToClipboard(new Blob(['<b>blob content</b>'], { type: 'text/html' }))).resolves.toBeUndefined()

    expect(writes).toHaveLength(1)
    expect(await writes[0].text()).toBe('<b>blob content</b>')
  })

  it('format 显式指定时覆盖 Blob 自带的 MIME', async () => {
    const writes: Blob[] = []
    vi.spyOn(navigator.clipboard, 'write').mockImplementation(async items => {
      writes.push((await items[0].getType('text/plain')) as Blob)
    })

    await copyToClipboard(new Blob(['plain please'], { type: 'text/html' }), { format: 'text/plain' })

    expect(writes).toHaveLength(1)
    expect(await writes[0].text()).toBe('plain please')
  })

  it('clipboard 与 execCommand 都失败时静默 resolve，不打断调用方', async () => {
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Fake Error'))
    vi.spyOn(document, 'execCommand').mockImplementation(() => {
      throw new Error('Fake Error')
    })

    // 复制失败对业务是 best-effort：抛错会连带打断用户的点击流程
    await expect(copyToClipboard('test')).resolves.toBeUndefined()
  })

  it('clipboard 拒绝后回退到 execCommand', async () => {
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Fake Error'))
    const execCommand = vi.spyOn(document, 'execCommand').mockReturnValue(true)

    await copyToClipboard('fallback text')

    // 非安全上下文（非 HTTPS）下 clipboard API 不可用，execCommand 是唯一通路
    expect(execCommand).toHaveBeenCalledWith('copy')
  })

  it('debug 模式下失败会输出诊断信息', async () => {
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Fake Error'))
    vi.spyOn(document, 'execCommand').mockImplementation(() => {
      throw new Error('Fake Error')
    })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await copyToClipboard('test', { debug: true })

    // 默认静默吞掉失败，开启 debug 才留痕——这是排查「复制没生效」的唯一线索
    expect(consoleSpy).toHaveBeenCalled()
  })
})
