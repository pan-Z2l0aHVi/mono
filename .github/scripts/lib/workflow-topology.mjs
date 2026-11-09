export const RELEASE_BRANCH = 'changeset-release/main'
export const REQUIRED_CONTEXT = 'check'

// 模型参数只能来自 GitHub 后台。CI 定义里的字面量或 `||` 兜底会让后台配置永远不生效。
export const CODEX_CONFIG_INPUTS = Object.freeze({
  'openai-api-key': 'secrets.CODEX_REVIEW_API_KEY',
  'responses-api-endpoint': 'vars.CODEX_RESPONSES_ENDPOINT',
  'codex-version': 'vars.CODEX_VERSION',
  model: 'vars.CODEX_REVIEW_MODEL',
  effort: 'vars.CODEX_REVIEW_EFFORT'
})

export const CODEX_CONFIG_ENV = Object.freeze([
  'CODEX_REVIEW_API_KEY',
  'CODEX_RESPONSES_ENDPOINT',
  'CODEX_REVIEW_MODEL',
  'CODEX_REVIEW_EFFORT',
  'CODEX_VERSION'
])

// `staged-clean` 由 `check-code` 的 `vp check` 覆盖，不在 required job 里重复执行。
export const requiredPolicyStep = {
  name: 'Check repository policies',
  job: REQUIRED_CONTEXT,
  shell: 'bash',
  runs: ['pnpm run check-policy']
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

/** 逐行核对 Codex 模型输入的唯一来源；缺一行、写成字面量或加兜底都算违约。 */
export function codexConfigInputViolations(text) {
  const violations = []
  const seen = new Set()
  for (const line of text.split(/\r?\n/)) {
    for (const [input, source] of Object.entries(CODEX_CONFIG_INPUTS)) {
      const match = line.match(new RegExp(`^\\s+${input}:\\s*(.*)$`))
      if (!match) continue
      seen.add(input)
      const expected = '${{ ' + source + ' }}'
      if (match[1].trim() !== expected) violations.push({ input, found: match[1].trim(), expected })
    }
  }
  for (const input of Object.keys(CODEX_CONFIG_INPUTS)) {
    if (!seen.has(input)) violations.push({ input, found: 'missing', expected: 'declared in both model legs' })
  }
  return violations
}

// GitHub 在 jobs.<job_id>.env 只接受 github、needs、strategy、matrix、vars、secrets、inputs 这些上下文。
// 引用 runner 或 steps 不是「这一步失败」，而是整个 workflow 文件被判 invalid：一个 job 都不会创建，
// PR 上连这个 check 都不会出现。YAML 结构本身合法，所以严格的 YAML 解析器也发现不了，只能按位置判。
export function jobEnvContextViolations(text) {
  const violations = []
  let job = null
  let inJobEnv = false

  for (const line of text.split(/\r?\n/)) {
    if (/^[A-Za-z-]+:/.test(line)) {
      job = null
      inJobEnv = false
      continue
    }
    const jobStart = line.match(/^ {2}([a-z0-9-]+):$/)
    if (jobStart) {
      job = jobStart[1]
      inJobEnv = false
      continue
    }
    if (job === null) continue
    if (/^ {4}\S/.test(line)) inJobEnv = line === '    env:'
    if (/^ {6}- /.test(line)) inJobEnv = false
    if (!inJobEnv) continue

    // 变量名不是只能大写：小写键在 job 级 env 同样会让整个文件被判 invalid，判据不能只认大写。
    const entry = line.match(/^ {6}([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/)
    if (!entry) continue
    for (const match of entry[2].matchAll(/\b(runner|steps)\./g))
      violations.push({ job, key: entry[1], context: match[1] })
  }
  return violations
}

// 本地 action（uses: ./...）从 job 自己的工作区解析。工作区检出到 pull_request.base.sha 时，
// 本 PR 新建的 action 在 base 里还不存在，action 连解析都过不去——不是某一步失败，是这道门整个跑不起来。
// 被审查的改动改不了门禁执行的脚本，靠的是 stage-codex-inputs 从 base 的对象里读脚本，而不是把整个工作区检出到 base；
// 于是 PR job 必须显式传 base-sha：不传就从工作区（head）读，读到的正是被审查的那份改动。
// 写回 workflow 由 workflow_run 触发，没有 PR payload，它的工作区就是默认分支，留空才是对的，所以第二个判据只看 if 里
// 引用了 github.event.pull_request 的 job。
export function localActionBootstrapViolations(text) {
  const jobs = []
  let job = null
  let step = null
  let inWith = false

  const recordUse = raw => {
    const target = unquote(raw)
    if (!target.startsWith('./')) return
    const name = target.split('/').pop()
    job.localActions.push(name)
    if (step) step.action = name
  }
  const closeStep = () => {
    if (step?.action === 'stage-codex-inputs' && !step.pinned) job.unpinnedStaging.push(step)
    step = null
    inWith = false
  }

  for (const line of text.split(/\r?\n/)) {
    if (/^[A-Za-z-]+:/.test(line)) {
      if (step) closeStep()
      job = null
      continue
    }
    const jobStart = line.match(/^ {2}([a-z0-9-]+):$/)
    if (jobStart) {
      if (step) closeStep()
      job = { id: jobStart[1], prLeg: false, localActions: [], baseCheckout: false, unpinnedStaging: [] }
      jobs.push(job)
      continue
    }
    if (job === null) continue

    if (/^ {4}\S/.test(line)) {
      if (step) closeStep()
      const jobIf = line.match(/^ {4}if:\s*(.*)$/)
      if (jobIf) job.prLeg = jobIf[1].includes('github.event.pull_request')
      continue
    }
    const stepStart = line.match(/^ {6}- (.*)$/)
    if (stepStart) {
      closeStep()
      step = { action: null, pinned: false }
      const inline = stepStart[1].match(/^uses:\s*(.*)$/)
      if (inline) recordUse(inline[1])
      continue
    }
    if (!inWith) {
      const field = line.match(/^ {8}([a-z-]+):\s*(.*)$/)
      if (!field) continue
      inWith = field[1] === 'with'
      if (field[1] === 'uses') recordUse(field[2])
      continue
    }
    const input = line.match(/^ {10}([a-z0-9-]+):\s*(.*)$/)
    if (!input) continue
    if (input[1] === 'ref' && input[2].includes('github.event.pull_request.base.sha')) job.baseCheckout = true
    if (input[1] === 'base-sha' && step?.action === 'stage-codex-inputs') step.pinned = true
  }
  if (step) closeStep()

  const violations = []
  for (const record of jobs) {
    if (record.localActions.length === 0) continue
    if (record.baseCheckout)
      violations.push({ job: record.id, rule: 'base-checkout', detail: record.localActions.join(', ') })
    if (record.prLeg && record.unpinnedStaging.length > 0)
      violations.push({ job: record.id, rule: 'unpinned-staging', detail: `${record.unpinnedStaging.length} step(s)` })
  }
  return violations
}

// 需要向 GitHub 开口才要凭据，所以表里记的是命令而不是脚本：prepare 与 capture 只读本地文件。
const ghCommands = {
  'codex-review.mjs': ['prior-run', 'gate', 'resolve-pull', 'report'],
  'codex-autofix.mjs': ['prepare', 'apply']
}

// gh 只认 GH_TOKEN，runner 不会替普通步骤注入 GITHUB_TOKEN：缺凭据不是「跳过这一步」，
// 而是它非零退出、整个 job 变红。判定按步骤块做，因为 env 只在步骤级生效。
export function ghTokenStepViolations(text) {
  const violations = []
  let job = null
  let block = null

  const labelOf = stepBlock => {
    const named = stepBlock.match(/^ {6}- name:\s*(.*)$/m) ?? stepBlock.match(/^ {8}name:\s*(.*)$/m)
    if (named) return unquote(named[1])
    const used = stepBlock.match(/^ {6}- uses:\s*(.*)$/m)
    return used ? unquote(used[1]) : 'unnamed step'
  }
  const close = () => {
    if (block === null) return
    const commands = [...block.matchAll(/scripts\/(codex-[a-z-]+\.mjs)" ([a-z-]+)/g)].filter(match =>
      ghCommands[match[1]]?.includes(match[2])
    )
    if (commands.length > 0 && !/^ {10}GH_TOKEN:/m.test(block))
      violations.push({ job, step: labelOf(block), commands: commands.map(match => match[2]).join(', ') })
    block = null
  }

  for (const line of text.split(/\r?\n/)) {
    if (/^[A-Za-z-]+:/.test(line)) {
      close()
      job = null
      continue
    }
    const jobStart = line.match(/^ {2}([a-z0-9-]+):$/)
    if (jobStart) {
      close()
      job = jobStart[1]
      continue
    }
    if (job === null) continue
    if (/^ {6}- /.test(line)) {
      close()
      block = `${line}\n`
      continue
    }
    if (block === null) continue
    if (/^ {4}\S/.test(line)) {
      close()
      continue
    }
    block += `${line}\n`
  }
  close()
  return violations
}

// download-artifact@v7 只有在显式给出 github-token 时才会用 repository/run-id 跨 run 查找：
// 源码里 `if (inputs.token) { options.findBy = { workflowRunId: inputs.runID } }`。
// 缺 token 会静默退化成「只查当前 workflow run」，写回 job 与结论复用都拿不到产物。
export function crossRunArtifactViolations(text) {
  const violations = []
  let job = null
  let block = null

  const close = () => {
    if (block === null) return
    const named = block.match(/^ {6}- name:\s*(.*)$/m)
    if (
      /^ {6,8}(?:- )?uses: actions\/download-artifact@/m.test(block) &&
      /^ {8,}run-id:/m.test(block) &&
      !/^ {8,}github-token:\s*\$\{\{\s*(?:github\.token|secrets\.GITHUB_TOKEN)\s*\}\}\s*$/m.test(block)
    ) {
      violations.push({ job, step: named ? unquote(named[1]) : 'unnamed step' })
    }
    block = null
  }

  for (const line of text.split(/\r?\n/)) {
    if (/^[A-Za-z-]+:/.test(line)) {
      close()
      job = null
      continue
    }
    const jobStart = line.match(/^ {2}([a-z0-9-]+):$/)
    if (jobStart) {
      close()
      job = jobStart[1]
      continue
    }
    if (job === null) continue
    if (/^ {6}- /.test(line)) {
      close()
      block = `${line}\n`
      continue
    }
    if (block === null) continue
    if (/^ {4}\S/.test(line)) {
      close()
      continue
    }
    block += `${line}\n`
  }
  close()
  return violations
}
