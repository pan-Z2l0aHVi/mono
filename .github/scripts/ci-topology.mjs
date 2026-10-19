import { POLICY_CHECKS } from '../../scripts/check-policies.mjs'

export const RELEASE_BRANCH = 'changeset-release/main'
export const REQUIRED_CONTEXT = 'check'

export const requiredPolicyStep = {
  name: 'Check repository policies',
  job: REQUIRED_CONTEXT,
  shell: 'bash',
  runs: POLICY_CHECKS.filter(name => name !== 'format-clean').map(name => `.agents/checks/${name}`)
}

function unquote(value) {
  const plain = value.replace(/\s+#\s.*$/, '')
  return plain.startsWith("'") && plain.endsWith("'") ? plain.slice(1, -1) : plain
}

// This reader covers only the workflow shapes used by the assertions below; workflow YAML remains authoritative.
export function parseWorkflow(text) {
  const parsed = {
    triggers: [],
    permissions: {},
    jobs: {},
    steps: {},
    stepIds: [],
    stepIdsByJob: {},
    stepJobs: {},
    stepShells: {},
    stepContinueOnError: {}
  }
  let section = null
  let trigger = null
  let triggerPaths = false
  let job = null
  let jobPermissions = false
  let step = null

  for (const line of text.split(/\r?\n/)) {
    const top = line.match(/^([A-Za-z-]+):(?:\s*(.*))?$/)
    if (top) {
      section = ['on', 'jobs', 'permissions'].includes(top[1]) ? top[1] : null
      trigger = null
      triggerPaths = false
      job = null
      jobPermissions = false
      step = null
      continue
    }

    if (section === 'on') {
      const start = line.match(/^ {2}([a-z_]+):/)
      if (start) {
        trigger = { on: start[1] }
        parsed.triggers.push(trigger)
        triggerPaths = false
        continue
      }
      const list = line.match(/^ {4}(branches|types):\s*\[(.*)\]$/)
      if (list && trigger) {
        trigger[list[1]] = list[2]
          .split(',')
          .map(entry => unquote(entry.trim()))
          .filter(Boolean)
        continue
      }
      if (line === '    paths:') {
        triggerPaths = true
        trigger.paths = []
        continue
      }
      const pathEntry = line.match(/^ {6}- '(.*?)'$/)
      if (triggerPaths && pathEntry) trigger.paths.push(pathEntry[1])
      continue
    }

    if (section === 'permissions') {
      const grant = line.match(/^ {2}([a-z-]+):\s*(.*)$/)
      if (grant) parsed.permissions[grant[1]] = unquote(grant[2])
      continue
    }

    if (section !== 'jobs') continue

    const jobStart = line.match(/^ {2}([a-z0-9-]+):$/)
    if (jobStart) {
      job = jobStart[1]
      jobPermissions = false
      step = null
      parsed.jobs[job] = { name: undefined, needs: [], if: undefined, continueOnError: undefined, permissions: {} }
      parsed.stepIdsByJob[job] = []
      continue
    }
    if (job === null) continue

    if (/^ {4}\S/.test(line)) jobPermissions = line === '    permissions:'
    if (jobPermissions) {
      const grant = line.match(/^ {6}([a-z-]+):\s*(.*)$/)
      if (grant) parsed.jobs[job].permissions[grant[1]] = unquote(grant[2])
      continue
    }

    const jobField = line.match(/^ {4}(name|needs|if|continue-on-error):\s*(.*)$/)
    if (jobField) {
      const [, field, raw] = jobField
      const value = unquote(raw)
      if (field === 'needs') {
        parsed.jobs[job].needs = value
          .replace(/^\[|\]$/g, '')
          .split(',')
          .map(entry => unquote(entry.trim()))
          .filter(Boolean)
      } else {
        parsed.jobs[job][field === 'continue-on-error' ? 'continueOnError' : field] = value
      }
      continue
    }

    const stepStartId = line.match(/^ {6}- id:\s*(.*)$/)
    if (stepStartId) {
      step = unquote(stepStartId[1])
      parsed.stepIds.push(step)
      parsed.stepIdsByJob[job].push(step)
      parsed.stepJobs[step] = job
      continue
    }

    const nestedId = line.match(/^ {8}id:\s*(.*)$/)
    if (nestedId) {
      const id = unquote(nestedId[1])
      parsed.stepIds.push(id)
      parsed.stepIdsByJob[job].push(id)
      parsed.stepJobs[id] = job
      if (step === null) step = id
      continue
    }

    const stepStart = line.match(/^ {6}- name:\s*(.*)$/)
    if (/^ {6}- /.test(line)) {
      step = stepStart ? unquote(stepStart[1]) : null
      if (step) parsed.stepJobs[step] = job
      continue
    }

    const stepIf = line.match(/^ {8}if:\s*(.*)$/)
    if (stepIf && step) {
      parsed.steps[step] = unquote(stepIf[1])
      continue
    }
    const stepShell = line.match(/^ {8}shell:\s*(.*)$/)
    if (stepShell && step) {
      parsed.stepShells[step] = unquote(stepShell[1])
      continue
    }
    const stepContinueOnError = line.match(/^ {8}continue-on-error:\s*(.*)$/)
    if (stepContinueOnError && step) parsed.stepContinueOnError[step] = unquote(stepContinueOnError[1])
  }
  return parsed
}
