import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/button-demo'

function Component() {
  return (
    <div className="p-3">
      <DemoComponent />
    </div>
  )
}

export const Route = createFileRoute('/components/button')({
  staticData: { title: 'Button 按钮' },
  component: Component
})
