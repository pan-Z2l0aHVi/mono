/// <reference types="vite/client" />
import type { WebUiComponents } from '@mono/web-ui/types/react'

export {}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends WebUiComponents {}
  }
}
