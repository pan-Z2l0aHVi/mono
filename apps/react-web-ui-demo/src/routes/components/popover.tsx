import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/popover-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/popover')({
  staticData: { title: 'Popover 气泡卡片' },
  component: Component
})
