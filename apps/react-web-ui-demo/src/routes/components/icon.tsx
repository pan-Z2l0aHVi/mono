import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/icon-demo'

function Component() {
  return (
    <div className="p-3">
      <DemoComponent />
    </div>
  )
}

export const Route = createFileRoute('/components/icon')({ staticData: { title: 'Icon 图标' }, component: Component })
