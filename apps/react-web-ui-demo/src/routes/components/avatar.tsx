import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/avatar-demo'
import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="avatar" />
    </>
  )
}

export const Route = createFileRoute('/components/avatar')({
  staticData: { title: 'Avatar' },
  component: Component
})
