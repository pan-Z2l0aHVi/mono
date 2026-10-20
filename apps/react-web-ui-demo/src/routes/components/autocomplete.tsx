import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/autocomplete-demo'
import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="autocomplete" />
      <ExampleDoc component="option" />
    </>
  )
}

export const Route = createFileRoute('/components/autocomplete')({
  staticData: { title: 'Autocomplete' },
  component: Component
})
