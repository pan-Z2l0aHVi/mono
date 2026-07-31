import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/textarea-demo'

function Component() {
  return (
    <div className="p-3">
      <DemoComponent />
    </div>
  )
}

export const Route = createFileRoute('/components/textarea')({
  staticData: { title: 'Textarea 文本域' },
  component: Component
})
