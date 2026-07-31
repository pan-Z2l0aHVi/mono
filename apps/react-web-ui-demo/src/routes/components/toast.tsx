import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/toast-demo'

function Component() {
  return (
    <div className="p-3">
      <DemoComponent />
    </div>
  )
}

export const Route = createFileRoute('/components/toast')({
  staticData: { title: 'Toast 通知' },
  component: Component
})
