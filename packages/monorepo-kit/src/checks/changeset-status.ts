import { defineChangesets, type ChangesetsOptions } from '../plugins/changesets'
import type { CheckUnit } from '../runner/check-runner'

export function defineChangesetStatus(options: ChangesetsOptions = {}): CheckUnit {
  const changesets = defineChangesets(options)

  return {
    name: 'changeset-status',
    async run({ root, base, env = process.env }: { root: string; base: string; env?: NodeJS.ProcessEnv }) {
      changesets.make({ root, env }).status(base)
      return `since ${base}`
    }
  }
}
