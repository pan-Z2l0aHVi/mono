import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/switch-demo'

function Component() {
  return (
    <div className="p-3">
      <DemoComponent />
    </div>
  )
}

export const Route = createFileRoute('/components/switch')({
  staticData: { title: 'Switch 开关' },
  component: Component
})
