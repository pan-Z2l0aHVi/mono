import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/empty-demo'

function Component() {
  return (
    <div className="p-3">
      <DemoComponent />
    </div>
  )
}

export const Route = createFileRoute('/components/empty')({
  staticData: { title: 'Empty 空状态' },
  component: Component
})
