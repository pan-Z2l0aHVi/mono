import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/spinner-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/spinner')({
  staticData: { title: 'Spinner 加载指示器' },
  component: Component
})
