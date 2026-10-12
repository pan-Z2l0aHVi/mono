import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'
import DemoComponent from '@/components/toast-demo'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="toast" />
    </>
  )
}

export const Route = createFileRoute('/components/toast')({
  staticData: { title: 'Toast 通知' },
  component: Component
})
