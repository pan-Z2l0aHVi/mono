import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'
import DemoComponent from '@/components/slider-demo'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="slider" />
    </>
  )
}

export const Route = createFileRoute('/components/slider')({
  staticData: { title: 'Slider 滑块' },
  component: Component
})
