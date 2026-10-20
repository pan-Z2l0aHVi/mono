import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'
import DemoComponent from '@/components/segmented-demo'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="segmented" />
      <ExampleDoc component="segmented-trigger" />
    </>
  )
}

export const Route = createFileRoute('/components/segmented')({
  staticData: { title: 'Segmented' },
  component: Component
})
