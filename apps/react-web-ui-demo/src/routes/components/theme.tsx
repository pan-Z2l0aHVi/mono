import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/theme-demo'

function Component() {
  return <DemoComponent />
}

export const Route = createFileRoute('/components/theme')({
  component: Component
})
