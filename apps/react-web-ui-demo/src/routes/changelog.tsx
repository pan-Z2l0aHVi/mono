import { createFileRoute } from '@tanstack/react-router'

import { Changelog } from '../components/changelog'

export const Route = createFileRoute('/changelog')({
  staticData: { title: 'Changelog' },
  component: Changelog
})
