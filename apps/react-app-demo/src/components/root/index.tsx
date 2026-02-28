import { Outlet } from '@tanstack/react-router'
import { ErrorBoundary } from 'react-error-boundary'

import { RootErrorFallback } from './root-error-fallback'

export function Root() {
  return (
    <ErrorBoundary FallbackComponent={RootErrorFallback}>
      <web-ui-layout>
        <h1>Vite + Lit</h1>
        <div className="mb-[8px]">
          <web-ui-button>按钮</web-ui-button>
          <web-ui-button primary>Primary</web-ui-button>
          <web-ui-button text>Text</web-ui-button>
        </div>
        <div className="mb-[8px]">
          <web-ui-button full>Full</web-ui-button>
        </div>
        <web-ui-button>
          <span slot="prefix">prefix</span>按钮2<span slot="suffix">suffix</span>
        </web-ui-button>
        <web-ui-button is-icon>
          <span slot="prefix">prefix</span>icon
        </web-ui-button>
        <Outlet />
      </web-ui-layout>
      <web-ui-back-top
        onvisible-change={e => {
          console.log('visible: ', e.detail.visible)
        }}
      ></web-ui-back-top>
    </ErrorBoundary>
  )
}
