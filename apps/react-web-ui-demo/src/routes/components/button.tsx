import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/button-demo'
import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="button" />
      <ExampleDoc component="button-group" />
    </>
  )
}

export const Route = createFileRoute('/components/button')({
  staticData: { title: 'Button' },
  component: Component
})
