import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { Suspense, type CSSProperties, type ReactNode } from 'react'
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'

import { DelayedFallback } from './DelayedFallback'

export interface ContentBoundaryProps {
  /** Skeleton shown after `delayMs`. */
  skeleton: ReactNode
  delayMs?: number
  minHeight?: string | number
  /** Replacement for the default error card. */
  errorFallback?: (props: FallbackProps) => ReactNode
  children: ReactNode
}

function DefaultErrorFallback({ resetErrorBoundary, minHeight }: FallbackProps & { minHeight: string | number }) {
  const style = {
    '--loading-min-height': typeof minHeight === 'number' ? `${minHeight}px` : minHeight
  } as CSSProperties
  return (
    <div role="alert" className="loading-content-error" style={style}>
      <p>该区域加载失败</p>
      <button type="button" onClick={resetErrorBoundary}>
        重新加载
      </button>
    </div>
  )
}

/**
 * Suspense boundary with a delayed skeleton and a retryable error card.
 *
 * Must be rendered inside a `QueryClientProvider`: the reset callback comes
 * from `QueryErrorResetBoundary`, so retrying a failed query clears its cached
 * error before the Suspense subtree renders again.
 */
export function ContentBoundary({
  skeleton,
  delayMs = 150,
  minHeight = 160,
  errorFallback,
  children
}: ContentBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={errorFallback ?? (props => <DefaultErrorFallback {...props} minHeight={minHeight} />)}
        >
          <Suspense
            fallback={
              <DelayedFallback delayMs={delayMs} minHeight={minHeight}>
                {skeleton}
              </DelayedFallback>
            }
          >
            {children}
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}
