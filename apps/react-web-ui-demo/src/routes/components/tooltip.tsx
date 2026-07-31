import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/tooltip-demo'

function Component() {
  return (
    <div className="p-3">
      <DemoComponent />
    </div>
  )
}

export const Route = createFileRoute('/components/tooltip')({
  staticData: { title: 'Tooltip 工具提示' },
  component: Component
})
