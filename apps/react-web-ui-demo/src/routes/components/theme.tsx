import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/theme-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/theme')({
  staticData: { title: 'Theme 主题' },
  component: Component
})
