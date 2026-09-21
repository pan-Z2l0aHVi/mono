import { createFileRoute } from '@tanstack/react-router'

function About() {
  return <>About</>
}

export const Route = createFileRoute('/about')({
  staticData: { title: 'About' },
  component: About
})
