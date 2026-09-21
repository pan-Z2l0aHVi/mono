import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/segmented-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/segmented')({
  staticData: { title: 'Segmented 分段控制器' },
  component: Component
})
