import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'
import DemoComponent from '@/components/input-demo'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="input" />
    </>
  )
}

export const Route = createFileRoute('/components/input')({
  staticData: { title: 'Input' },
  component: Component
})
