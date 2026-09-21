import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/radio-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/radio')({
  staticData: { title: 'Radio 单选框' },
  component: Component
})
