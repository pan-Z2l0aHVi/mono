import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/middle-ellipsis-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/middle-ellipsis')({
  staticData: { title: 'MiddleEllipsis 中间省略' },
  component: Component
})
