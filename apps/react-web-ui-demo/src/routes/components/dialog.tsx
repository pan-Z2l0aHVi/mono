import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/dialog-demo'
import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="dialog" />
    </>
  )
}

export const Route = createFileRoute('/components/dialog')({
  staticData: { title: 'Dialog' },
  component: Component
})
