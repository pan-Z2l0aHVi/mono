import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'
import DemoComponent from '@/components/theme-demo'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="theme" />
    </>
  )
}

export const Route = createFileRoute('/components/theme')({
  staticData: { title: 'Theme' },
  component: Component
})
