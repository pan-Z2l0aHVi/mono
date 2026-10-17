import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'
import DemoComponent from '@/components/layout-demo'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="layout" />
    </>
  )
}

export const Route = createFileRoute('/components/layout')({
  staticData: { title: 'Layout 布局' },
  component: Component
})
