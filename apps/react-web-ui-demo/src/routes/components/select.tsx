import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'
import DemoComponent from '@/components/select-demo'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="select" />
    </>
  )
}

export const Route = createFileRoute('/components/select')({
  staticData: { title: 'Select 下拉选择' },
  component: Component
})
