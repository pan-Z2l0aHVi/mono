import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/back-top-demo'

function Component() {
  return (
    <div className="p-3">
      <DemoComponent />
    </div>
  )
}

export const Route = createFileRoute('/components/back-top')({
  staticData: { title: 'BackTop 回到顶部' },
  component: Component
})
