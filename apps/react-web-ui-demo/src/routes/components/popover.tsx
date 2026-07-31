import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/popover-demo'

function Component() {
  return (
    <div className="p-3">
      <DemoComponent />
    </div>
  )
}

export const Route = createFileRoute('/components/popover')({
  staticData: { title: 'Popover 气泡卡片' },
  component: Component
})
