import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/checkbox-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/checkbox')({
  staticData: { title: 'Checkbox 复选框' },
  component: Component
})
