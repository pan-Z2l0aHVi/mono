import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'
import DemoComponent from '@/components/radio-demo'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="radio" />
    </>
  )
}

export const Route = createFileRoute('/components/radio')({
  staticData: { title: 'Radio 单选框' },
  component: Component
})
