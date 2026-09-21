import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/input-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/input')({
  staticData: { title: 'Input 输入框' },
  component: Component
})
