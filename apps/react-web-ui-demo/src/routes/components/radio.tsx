import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/radio-demo'

function Component() {
  return (
    <div className="p-3">
      <DemoComponent />
    </div>
  )
}

export const Route = createFileRoute('/components/radio')({
  staticData: { title: 'Radio 单选框' },
  component: Component
})
