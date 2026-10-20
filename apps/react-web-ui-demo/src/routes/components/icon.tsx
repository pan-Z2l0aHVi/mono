import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'
import DemoComponent from '@/components/icon-demo'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="icon" />
    </>
  )
}

export const Route = createFileRoute('/components/icon')({
  staticData: { title: 'Icon' },
  component: Component
})
