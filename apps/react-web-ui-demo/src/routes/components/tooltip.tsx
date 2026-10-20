import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'
import DemoComponent from '@/components/tooltip-demo'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="tooltip" />
    </>
  )
}

export const Route = createFileRoute('/components/tooltip')({
  staticData: { title: 'Tooltip' },
  component: Component
})
