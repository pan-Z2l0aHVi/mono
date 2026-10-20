import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/empty-demo'
import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="empty" />
    </>
  )
}

export const Route = createFileRoute('/components/empty')({
  staticData: { title: 'Empty' },
  component: Component
})
