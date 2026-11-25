import { findComponentRoute } from '@greypan/doc-demo-kit'
import { createFileRoute, notFound } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  const { entry } = Route.useLoaderData()
  return (
    <>
      {entry.docs.map(doc => (
        <ExampleDoc key={doc} component={doc} />
      ))}
    </>
  )
}

export const Route = createFileRoute('/components/$component')({
  loader: ({ params }) => {
    const entry = findComponentRoute(params.component)
    if (!entry) throw notFound()
    return { entry }
  },
  component: Component
})
