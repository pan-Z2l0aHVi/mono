import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/autocomplete-demo'
import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="autocomplete" />
    </>
  )
}

export const Route = createFileRoute('/components/autocomplete')({
  staticData: { title: 'Autocomplete 自动补全' },
  component: Component
})
