import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/editable-text-demo'
import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="editable-text" />
    </>
  )
}

export const Route = createFileRoute('/components/editable-text')({
  staticData: { title: 'EditableText' },
  component: Component
})
