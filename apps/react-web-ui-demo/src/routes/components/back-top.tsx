import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/back-top-demo'
import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="back-top" />
    </>
  )
}

export const Route = createFileRoute('/components/back-top')({
  staticData: { title: 'BackTop 回到顶部' },
  component: Component
})
