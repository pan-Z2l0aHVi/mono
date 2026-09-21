import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/badge-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/badge')({
  staticData: { title: 'Badge 徽标' },
  component: Component
})
