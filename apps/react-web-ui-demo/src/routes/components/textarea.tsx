import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'
import DemoComponent from '@/components/textarea-demo'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="textarea" />
    </>
  )
}

export const Route = createFileRoute('/components/textarea')({
  staticData: { title: 'Textarea' },
  component: Component
})
