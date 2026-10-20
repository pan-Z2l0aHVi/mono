import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'
import DemoComponent from '@/components/input-number-demo'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="input-number" />
    </>
  )
}

export const Route = createFileRoute('/components/input-number')({
  staticData: { title: 'InputNumber' },
  component: Component
})
