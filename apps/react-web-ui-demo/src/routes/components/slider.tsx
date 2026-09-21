import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/slider-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/slider')({
  staticData: { title: 'Slider 滑块' },
  component: Component
})
