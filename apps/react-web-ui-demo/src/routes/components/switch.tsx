import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'
import DemoComponent from '@/components/switch-demo'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="switch" />
    </>
  )
}

export const Route = createFileRoute('/components/switch')({
  staticData: { title: 'Switch' },
  component: Component
})
