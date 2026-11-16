// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { hasEditableFocus, insertTextAtFocus, readSelectionText } from '../plainTextClipboard'

/** 让某个元素成为文档焦点；jsdom 支持 focus，但不实现 shadow root 的 activeElement 传递。 */
function focus<T extends HTMLElement>(element: T): T {
  document.body.append(element)
  element.focus()
  return element
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/** 造一个「输入框在 shadow root 内」的结构，并返回它。 */
function shadowInput() {
  const host = document.createElement('div')
  document.body.append(host)
  const shadow = host.attachShadow({ mode: 'open' })
  const input = document.createElement('input')
  shadow.append(input)
  return { host, input }
}

describe('复制为纯文本：选区文本', () => {
  it('取 input 里的选中片段', () => {
    const input = focus(document.createElement('input'))
    input.value = 'interweave notes'
    input.setSelectionRange(0, 10)

    expect(readSelectionText()).toBe('interweave')
  })

  it('没有输入焦点时取文档选区', () => {
    const paragraph = document.createElement('p')
    paragraph.textContent = '选中的正文'
    document.body.append(paragraph)
    const range = document.createRange()
    range.selectNodeContents(paragraph)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)

    expect(readSelectionText()).toBe('选中的正文')
  })

  // web-ui 的名称编辑器与链接输入都在 shadow root 内：不沿 activeElement 链下钻就读不到它们的选区。
  it('焦点在 shadow root 内的输入框上时读它的选区', () => {
    const { host, input } = shadowInput()
    input.value = 'shadow selection'
    input.setSelectionRange(0, 6)
    input.focus()
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(host)

    expect(readSelectionText()).toBe('shadow')
  })

  it('什么都没选中时返回空串', () => {
    window.getSelection()?.removeAllRanges()
    expect(readSelectionText()).toBe('')
  })
})

describe('粘贴为纯文本：可编辑焦点', () => {
  it('焦点在 textarea 上时可插入', () => {
    focus(document.createElement('textarea'))
    expect(hasEditableFocus()).toBe(true)
  })

  it('焦点在 contenteditable 上时可插入', () => {
    const div = focus(document.createElement('div'))
    // jsdom 没有实现 contentEditable 的隐式可聚焦性；真实浏览器里 contenteditable 自带焦点。
    div.setAttribute('tabindex', '-1')
    div.setAttribute('contenteditable', 'true')
    div.focus()
    expect(hasEditableFocus()).toBe(true)
  })

  it('焦点在普通按钮上时不可插入', () => {
    focus(document.createElement('button'))
    expect(hasEditableFocus()).toBe(false)
  })

  it('没有焦点时不可插入', () => {
    expect(hasEditableFocus()).toBe(false)
  })

  // 编辑控件封在 web-ui 的 shadow root 里：document.activeElement 只会是 host，
  // 判据必须下钻到 shadowRoot.activeElement，否则「在名称里按粘贴」会被当成没有焦点。
  it('焦点在 shadow root 内的输入框上时也算可编辑', () => {
    const { host, input } = shadowInput()
    input.focus()
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(host)

    expect(hasEditableFocus()).toBe(true)
  })
})

describe('粘贴为纯文本：插入', () => {
  // jsdom 没有 document.execCommand；它在这里只是「有没有被调用」的观测点。
  function stubExecCommand(result = true) {
    const execCommand = vi.fn<() => boolean>(() => result)
    Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true })
    return execCommand
  }

  it('没有可编辑焦点时不调用 execCommand', () => {
    focus(document.createElement('button'))
    const execCommand = stubExecCommand()

    expect(insertTextAtFocus('anything')).toBe(false)
    expect(execCommand).not.toHaveBeenCalled()
  })

  it('有可编辑焦点时把文本交给 insertText', () => {
    focus(document.createElement('textarea'))
    const execCommand = stubExecCommand()

    expect(insertTextAtFocus('粘贴内容')).toBe(true)
    expect(execCommand).toHaveBeenCalledWith('insertText', false, '粘贴内容')
  })
})
