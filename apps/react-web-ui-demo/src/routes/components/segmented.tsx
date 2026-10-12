import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'
import DemoComponent from '@/components/segmented-demo'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="segmented" />
    </>
  )
}

export const Route = createFileRoute('/components/segmented')({
  staticData: { title: 'Segmented 分段控制器' },
  component: Component
})
