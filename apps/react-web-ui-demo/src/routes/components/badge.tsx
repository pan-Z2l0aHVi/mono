import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/badge-demo'
import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="badge" />
    </>
  )
}

export const Route = createFileRoute('/components/badge')({
  staticData: { title: 'Badge' },
  component: Component
})
