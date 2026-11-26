type PageErrorPayload = {
  event: 'page_error'
  timestamp: number
  error: {
    category: 'uncaught' | 'unhandled_rejection'
    message: string
    filename?: string
    lineno?: number
    colno?: number
    stack?: string
  }
  metadata?: object
}
