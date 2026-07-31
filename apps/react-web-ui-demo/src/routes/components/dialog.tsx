import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/dialog-demo'

function Component() {
  return (
    <div className="p-3">
      <DemoComponent />
    </div>
  )
}

export const Route = createFileRoute('/components/dialog')({
  staticData: { title: 'Dialog 对话框' },
  component: Component
})
