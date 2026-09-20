import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/switch-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/switch')({
  staticData: { title: 'Switch 开关' },
  component: Component
})
