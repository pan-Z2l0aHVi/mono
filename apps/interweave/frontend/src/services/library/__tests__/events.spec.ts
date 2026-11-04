import { describe, expect, it, vi } from 'vite-plus/test'

// 生成的 bindings/events 会附带加载 @wailsio/runtime：其 drag 模块在导入时挂一个
// 50ms 轮询，短用例在轮询触发前就拆掉 jsdom，回调里再碰 window 会变成未处理异常。
// 在导入求值前装上 fake timers，让这个轮询永远不落到已销毁的环境里。
vi.hoisted(() => {
  vi.useFakeTimers()
})

import {
  LibraryFilesDropped,
  LibraryPasteFilesRequested,
  LibrarySourceAvailabilityChanged
} from '../../../../bindings/events'

// 事件名由 Go 侧的 RegisterEvent 生成；这里钉住线上字符串，改名必须同时改测试。
describe('library 事件名', () => {
  it('生成的常量与 Go 注册的事件名一致', () => {
    expect({
      LibraryFilesDropped,
      LibraryPasteFilesRequested,
      LibrarySourceAvailabilityChanged
    }).toEqual({
      LibraryFilesDropped: 'library:files-dropped',
      LibraryPasteFilesRequested: 'library:paste-files-requested',
      LibrarySourceAvailabilityChanged: 'library:source-availability-changed'
    })
  })
})
