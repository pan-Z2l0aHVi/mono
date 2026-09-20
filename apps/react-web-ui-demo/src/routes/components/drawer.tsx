import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/drawer-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/drawer')({
  staticData: { title: 'Drawer 抽屉' },
  component: Component
})
