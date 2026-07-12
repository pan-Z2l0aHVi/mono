import { definePlugin } from '@greypan/js-kit'

export interface CapturedRequest {
  url: string
  body: unknown
  method: string
  timestamp: number
}

export interface CapturedRequestsContext {
  capturedRequests: CapturedRequest[]
  clearCapturedRequests: () => void
}

/**
 * 请求捕获插件
 * 提供 capturedRequests 数组和 clearCapturedRequests 方法
 * 通常与 defineMsw 配合使用，在 MSW handler 中 push 请求记录
 */
export function defineCapturedRequests() {
  const captured: CapturedRequest[] = []

  return definePlugin<CapturedRequestsContext, object>(() => ({
    capturedRequests: captured,
    clearCapturedRequests: () => {
      captured.length = 0
    }
  }))
}
