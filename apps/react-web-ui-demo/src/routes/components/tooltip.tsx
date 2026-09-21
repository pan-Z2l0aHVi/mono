import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/tooltip-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/tooltip')({
  staticData: { title: 'Tooltip 工具提示' },
  component: Component
})
