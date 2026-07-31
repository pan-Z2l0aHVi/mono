import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/input-number-demo'

function Component() {
  return (
    <div className="p-3">
      <DemoComponent />
    </div>
  )
}

export const Route = createFileRoute('/components/input-number')({
  staticData: { title: 'InputNumber 数字输入框' },
  component: Component
})
