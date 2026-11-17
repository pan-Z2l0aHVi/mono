import { describe, expect, it } from 'vite-plus/test'

import {
  LibraryFilesDropped,
  LibraryPreviewsRevoked,
  LibrarySourceAvailabilityChanged,
  LibraryUrlsDropped
} from '../../../../bindings/events'

// 事件名由 Go 侧的 RegisterEvent 生成；这里钉住线上字符串，改名必须同时改测试。
describe('library 事件名', () => {
  it('生成的常量与 Go 注册的事件名一致', () => {
    expect({
      LibraryFilesDropped,
      LibraryUrlsDropped,
      LibrarySourceAvailabilityChanged,
      LibraryPreviewsRevoked
    }).toEqual({
      LibraryFilesDropped: 'library:files-dropped',
      LibraryUrlsDropped: 'library:urls-dropped',
      LibrarySourceAvailabilityChanged: 'library:source-availability-changed',
      LibraryPreviewsRevoked: 'library:previews-revoked'
    })
  })
})
