import type { FallbackProps } from 'react-error-boundary'

export function RootErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    <div>
      <h2>Something went wrong</h2> <pre>{message}</pre> <button onClick={resetErrorBoundary}>Retry</button>
    </div>
  )
}
