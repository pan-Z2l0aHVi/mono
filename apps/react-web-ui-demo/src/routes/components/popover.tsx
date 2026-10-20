import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'
import DemoComponent from '@/components/popover-demo'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="popover" />
    </>
  )
}

export const Route = createFileRoute('/components/popover')({
  staticData: { title: 'Popover' },
  component: Component
})
