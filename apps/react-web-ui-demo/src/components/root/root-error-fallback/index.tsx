import type { FallbackProps } from 'react-error-boundary'

export function RootErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    <div>
      <h2>出了点问题</h2> <pre>{message}</pre> <button onClick={resetErrorBoundary}>重试</button>
    </div>
  )
}
