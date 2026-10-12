import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/collapse-demo'
import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="collapse" />
    </>
  )
}

export const Route = createFileRoute('/components/collapse')({
  staticData: { title: 'Collapse 折叠面板' },
  component: Component
})
