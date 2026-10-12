import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'
import DemoComponent from '@/components/middle-ellipsis-demo'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="middle-ellipsis" />
    </>
  )
}

export const Route = createFileRoute('/components/middle-ellipsis')({
  staticData: { title: 'MiddleEllipsis 中间省略' },
  component: Component
})
