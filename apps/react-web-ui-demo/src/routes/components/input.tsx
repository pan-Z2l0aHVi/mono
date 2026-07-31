import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/input-demo'

function Component() {
  return (
    <div className="p-3">
      <DemoComponent />
    </div>
  )
}

export const Route = createFileRoute('/components/input')({
  staticData: { title: 'Input 输入框' },
  component: Component
})
