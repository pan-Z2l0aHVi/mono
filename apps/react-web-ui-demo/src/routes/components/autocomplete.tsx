import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
      <ExampleDoc component="autocomplete" level="primary" />
      <ExampleDoc component="option" level="secondary" />
    </>
  )
}

export const Route = createFileRoute('/components/autocomplete')({
  staticData: { title: 'Autocomplete' },
  component: Component
})
