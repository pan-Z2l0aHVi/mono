import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'
import DemoComponent from '@/components/spinner-demo'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="spinner" />
    </>
  )
}

export const Route = createFileRoute('/components/spinner')({
  staticData: { title: 'Spinner' },
  component: Component
})
