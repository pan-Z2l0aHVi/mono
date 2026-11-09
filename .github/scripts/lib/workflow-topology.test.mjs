import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { readPnpmWorkspaceDirectories } from '@greypan/monorepo-kit'

import { CONFIG_ENV, priorConclusionDirectory } from '../codex-review.mjs'

import {
  CODEX_CONFIG_ENV,
  CODEX_CONFIG_INPUTS,
  RELEASE_BRANCH,
  REQUIRED_CONTEXT,
  codexConfigInputViolations,
  crossRunArtifactViolations,
  ghTokenStepViolations,
  jobEnvContextViolations,
  localActionBootstrapViolations,
  parseWorkflow,
  requiredPolicyStep
} from './workflow-topology.mjs'

const repoRoot = path.resolve(import.meta.dirname, '../../..')
const workflowDir = path.join(repoRoot, '.github/workflows')
const workflowFiles = fs
  .readdirSync(workflowDir)
  .filter(file => file.endsWith('.yml'))
  .sort()
const workflowText = Object.fromEntries(
  workflowFiles.map(file => [file, fs.readFileSync(path.join(workflowDir, file), 'utf8')])
)
const parsed = Object.fromEntries(workflowFiles.map(file => [file, parseWorkflow(workflowText[file])]))

function workflowJob(text, id) {
  const start = text.indexOf(`\n  ${id}:\n`)
  assert.notEqual(start, -1, `job ${id} must exist`)
  const rest = text.slice(start + 1)
  const next = /^  [a-z0-9-]+:\s*$/gm
  next.lastIndex = rest.indexOf('\n') + 1
  const match = next.exec(rest)
  return match ? rest.slice(0, match.index) : rest
}

function namedStep(text, name) {
  const start = text.indexOf(`      - name: ${name}\n`)
  assert.notEqual(start, -1, `step ${name} must exist`)
  const rest = text.slice(start)
  const next = /\n      - /.exec(rest.slice(1))
  return next ? rest.slice(0, next.index + 1) : rest
}

function assertCheckoutRef(text, jobId, expected) {
  assert.ok(workflowJob(text, jobId).includes(`ref: ${expected}`), `${jobId} must checkout ${expected}`)
}

function runTexts(block) {
  const runs = []
  const lines = block.split(/\r?\n/)
  for (let index = 0; index < lines.length; index++) {
    const inline = lines[index].match(/^ {8}run:\s*(\S.*)$/)
    if (inline && !/^\|[+-]?$/.test(inline[1])) {
      runs.push(inline[1])
      continue
    }
    if (!/^ {8}run:\s*\|[+-]?\s*$/.test(lines[index])) continue
    const body = []
    for (index++; index < lines.length && /^ {10,}\S/.test(lines[index]); index++) body.push(lines[index].trim())
    index--
    runs.push(body.join('\n'))
  }
  return runs
    .join('\n')
    .replace(/\\\n\s*/g, ' ')
    .split('\n')
    .filter(Boolean)
}

function assertPolicyStepContract(text) {
  const workflow = parseWorkflow(text)
  const policy = requiredPolicyStep
  assert.equal(workflow.stepJobs[policy.name], policy.job, 'policy step must belong to the required context job')
  assert.equal(workflow.stepShells[policy.name], policy.shell, 'policy step must use fail-fast Bash')
  assert.equal(workflow.steps[policy.name], undefined, 'policy step must always run')
  assert.equal(workflow.stepContinueOnError[policy.name], undefined, 'policy errors must fail the step')
  assert.equal(
    workflow.jobs[policy.job]?.if,
    "${{ github.event_name != 'push' && !cancelled() }}",
    'required job must skip cache-only pushes, run after preparation failure, and honor workflow cancellation'
  )
  assert.equal(workflow.jobs[policy.job]?.continueOnError, undefined, 'required job must propagate failures')
  assert.deepEqual(runTexts(namedStep(text, policy.name)), policy.runs)
}

function assertChangesetStepContract(text) {
  const workflow = parseWorkflow(text)
  const name = 'Check changesets'
  const step = namedStep(text, name)
  assert.equal(workflow.stepJobs[name], REQUIRED_CONTEXT, 'changeset validation must run in the required context')
  assert.equal(
    workflow.steps[name],
    `github.event_name == 'pull_request' && github.head_ref != '${RELEASE_BRANCH}'`,
    'changeset validation must run only for PRs outside the version branch'
  )
  assert.equal(workflow.stepContinueOnError[name], undefined, 'changeset validation errors must fail the step')
  assert.ok(step.includes('PR_BASE_SHA: ${{ github.event.pull_request.base.sha }}'))
  assert.ok(step.includes('PR_HEAD_SHA: ${{ github.event.pull_request.head.sha }}'))
  assert.deepEqual(runTexts(step), ['pnpm run check-changeset --base "$PR_BASE_SHA" --head "$PR_HEAD_SHA"'])
}

function assertPrTitleStepContract(text) {
  const workflow = parseWorkflow(text)
  const requiredCheckJob = workflowJob(text, REQUIRED_CONTEXT)
  const readerName = 'Read PR title'
  const reader = namedStep(requiredCheckJob, readerName)
  const prepareName = 'Prepare base PR title rule'
  const prepare = namedStep(requiredCheckJob, prepareName)
  const checkerName = 'Check PR title'
  const checker = namedStep(requiredCheckJob, checkerName)
  const setup = requiredCheckJob.indexOf('      - uses: ./.github/actions/setup-deps\n')

  assert.equal(workflow.stepJobs[readerName], REQUIRED_CONTEXT, 'PR title lookup must belong to the required context')
  assert.equal(workflow.steps[readerName], "github.event_name == 'pull_request'", 'title lookup must run only for PRs')
  assert.equal(workflow.permissions['pull-requests'], 'read', 'title lookup must have read-only PR permission')
  assert.ok(reader.includes('.pull_request.base.sha // empty'), 'title lookup must read the PR base SHA')
  assert.ok(reader.includes('GH_TOKEN: ${{ github.token }}'), 'title API fallback must use the workflow token')
  assert.ok(reader.includes('gh api --jq .title'), 'title API fallback must read the PR title')
  assert.ok(reader.includes('gh api --jq .base.sha'), 'title API fallback must read the PR base SHA')
  assert.ok(
    reader.includes('printf \'%s\' "$title" > "$RUNNER_TEMP/pr-title"'),
    'title lookup must persist to a temp file'
  )
  assert.ok(
    reader.includes('printf \'%s\' "$base_sha" > "$RUNNER_TEMP/pr-base-sha"'),
    'title lookup must persist the base SHA'
  )

  assert.equal(
    workflow.stepJobs[prepareName],
    REQUIRED_CONTEXT,
    'trusted checker preparation must belong to the required context'
  )
  assert.equal(
    workflow.steps[prepareName],
    "github.event_name == 'pull_request'",
    'trusted checker preparation must run only for PRs'
  )
  assert.ok(prepare.includes('git cat-file -e "$base_sha^{commit}"'), 'trusted base commit must be present')
  assert.ok(prepare.includes('git show "$base_sha:commitlint.config.js"'), 'rule must come from the PR base')
  assert.ok(
    prepare.includes('git show "$base_sha:.github/scripts/check-pr-title.mjs"'),
    'checker must come from the PR base once it exists there'
  )
  assert.ok(
    prepare.includes('cp .github/scripts/check-pr-title.mjs "$RUNNER_TEMP/check-pr-title.mjs"'),
    'the first rollout must be able to introduce its checker'
  )
  assert.equal(workflow.stepJobs[checkerName], REQUIRED_CONTEXT, 'PR title check must belong to the required context')
  assert.equal(workflow.steps[checkerName], "github.event_name == 'pull_request'", 'title check must run only for PRs')
  assert.ok(checker.includes('COMMITLINT_CONFIG_PATH: ${{ runner.temp }}/commitlint.config.mjs'))
  assert.deepEqual(runTexts(checker), ['node "$RUNNER_TEMP/check-pr-title.mjs"'])
  assert.ok(
    setup > -1 && requiredCheckJob.indexOf(`      - name: ${readerName}\n`) < setup,
    'title lookup must run before dependency setup'
  )
  assert.ok(
    requiredCheckJob.indexOf(`      - name: ${prepareName}\n`) < setup,
    'trusted checker preparation must run before dependency setup'
  )
  assert.ok(
    requiredCheckJob.indexOf(`      - name: ${checkerName}\n`) < setup,
    'title check must run before dependency setup'
  )

  const trigger = workflow.triggers.find(item => item.on === 'pull_request')
  assert.deepEqual(trigger.types, ['opened', 'synchronize', 'reopened', 'edited'], 'editing the title must rerun CI')
}

function assertPrTitleCheckerBehavior() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-title-check-'))
  try {
    const titlePath = path.join(directory, 'title')
    const configPath = path.join(directory, 'commitlint.config.mjs')
    fs.copyFileSync(path.join(repoRoot, 'commitlint.config.js'), configPath)

    function check(title) {
      fs.writeFileSync(titlePath, title)
      return spawnSync(process.execPath, [path.join(repoRoot, '.github/scripts/check-pr-title.mjs')], {
        encoding: 'utf8',
        env: {
          ...process.env,
          COMMITLINT_CONFIG_PATH: configPath,
          GITHUB_REF: 'refs/pull/54/merge',
          PR_TITLE_PATH: titlePath
        }
      })
    }

    const english = check('ci(root): enforce English commit messages')
    assert.equal(english.status, 0, english.stderr)
    assert.match(english.stdout, /PR title is English/)

    const cjk = check('#319 radio/checkbox 把 role 挂在 label 上')
    assert.equal(cjk.status, 1)
    assert.match(cjk.stderr, /gh pr edit 54 --title/)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
}

function assertPullRequestValidationIsReadOnly(workflow) {
  for (const [name, permission] of Object.entries(workflow.permissions)) {
    assert.ok(permission === 'read' || permission === 'none', `${name} must not grant write access to PR validation`)
  }
  for (const [jobId, job] of Object.entries(workflow.jobs)) {
    for (const [name, permission] of Object.entries(job.permissions)) {
      assert.ok(
        permission === 'read' || permission === 'none',
        `${jobId}.${name} must not grant write access to PR validation`
      )
    }
  }
}

// The single required CI context must run all policy checks and propagate any failure.
{
  const ci = workflowText['ci.yml']
  const ciWorkflow = parsed['ci.yml']
  assert.match(
    ci,
    /group: \$\{\{ github\.workflow \}\}-\$\{\{ github\.head_ref \|\| github\.ref_name \}\}-\$\{\{ github\.event_name \}\}/,
    'cache-only main pushes must not cancel a full workflow_dispatch check'
  )
  const cachePreparation = workflowJob(ci, 'prepare-wails-apt-cache')
  assert.deepEqual(ciWorkflow.jobs.check.needs, ['prepare-wails-apt-cache'])
  assert.equal(ciWorkflow.jobs['prepare-wails-apt-cache'].if, undefined)
  assert.equal(ciWorkflow.jobs.check.if, "${{ github.event_name != 'push' && !cancelled() }}")
  assert.match(cachePreparation, /timeout-minutes: 35/)
  assert.match(
    cachePreparation,
    /skip-mise: 'true'[\s\S]*skip-install: 'true'[\s\S]*wails: 'true'[\s\S]*wails-download-only: 'true'/
  )
  assert.ok(parsed['ci.yml'].jobs[REQUIRED_CONTEXT], 'the required context must remain the CI job')
  assertChangesetStepContract(ci)
  assertPrTitleStepContract(ci)
  assertPrTitleCheckerBehavior()
  const requiredChangesetCommand = 'pnpm run check-changeset --base "$PR_BASE_SHA" --head "$PR_HEAD_SHA"'
  assert.equal(ci.split(requiredChangesetCommand).length - 1, 1, 'the changeset command mutation anchor must be unique')
  assert.throws(
    () => assertChangesetStepContract(ci.replace(`${requiredChangesetCommand}\n`, '')),
    'removing the changeset command must fail topology validation'
  )
  assert.deepEqual(requiredPolicyStep.runs, ['pnpm run check-policy'])
  assertPolicyStepContract(ci)
  assert.ok(
    parsed['ci.yml'].jobs.check.name === undefined || parsed['ci.yml'].jobs.check.name === REQUIRED_CONTEXT,
    'the required job display name must stay equal to its registered context'
  )
  assert.deepEqual(
    parsed['ci.yml'].permissions,
    { contents: 'read', 'pull-requests': 'read' },
    'PR validation must remain read-only'
  )
  assert.deepEqual(parsed['ci.yml'].jobs.check.permissions, {}, 'the required job must not elevate PR permissions')
  assert.throws(() =>
    assert.deepEqual(parseWorkflow(ci.replace('  pull-requests: read\n', '  pull-requests: write\n')).permissions, {
      contents: 'read',
      'pull-requests': 'read'
    })
  )
  assert.throws(() =>
    assert.deepEqual(
      parseWorkflow(ci.replace('  check:\n', '  check:\n    permissions:\n      contents: write\n')).jobs.check
        .permissions,
      {}
    )
  )
  const rootScripts = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).scripts
  for (const command of requiredPolicyStep.runs) {
    const script = command.match(/^pnpm run ([a-z][a-z0-9:-]*)$/)?.[1]
    assert.ok(script, `${command} must invoke a root pnpm script`)
    assert.equal(typeof rootScripts[script], 'string', `${command} must resolve to a package.json script`)
  }

  function mutateOnce(text, from, to) {
    assert.equal(text.split(from).length - 1, 1, 'mutation anchor must occur once')
    return text.replace(from, to)
  }
  const marker = `      - name: ${requiredPolicyStep.name}\n`
  assert.throws(() => assertPolicyStepContract(mutateOnce(ci, '          pnpm run check-policy\n', '')))
  assert.throws(() => assertPolicyStepContract(mutateOnce(ci, marker, `${marker}        if: false\n`)))
  assert.throws(() => assertPolicyStepContract(mutateOnce(ci, marker, `${marker}        continue-on-error: true\n`)))
  assert.throws(() =>
    assertPolicyStepContract(mutateOnce(ci, marker, `${marker}        id: repository-policies\n        if: false\n`))
  )
  assert.throws(() =>
    assertPolicyStepContract(
      mutateOnce(ci, "    if: ${{ github.event_name != 'push' && !cancelled() }}\n", '    if: false\n')
    )
  )
  assert.throws(() => assertPolicyStepContract(mutateOnce(ci, '  check:\n', '  check:\n    continue-on-error: true\n')))

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-policy-fail-fast-'))
  try {
    const markerPath = path.join(directory, 'later-command-ran')
    const result = spawnSync(
      'bash',
      ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', 'false\nprintf reached > "$1"', 'policy', markerPath],
      { encoding: 'utf8' }
    )
    assert.equal(result.status, 1)
    assert.equal(fs.existsSync(markerPath), false, 'a later policy command must not run after an error')
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
}

// Workflow YAML owns the process; only protect main/release boundaries and explicit permissions.
{
  const pushWorkflows = Object.entries(parsed)
    .filter(([, workflow]) => workflow.triggers.some(trigger => trigger.on === 'push'))
    .map(([file]) => file)
  assert.deepEqual(pushWorkflows, ['changeset-version.yml', 'ci.yml'])
  assert.deepEqual(parsed['ci.yml'].triggers.map(trigger => trigger.on).sort(), [
    'pull_request',
    'push',
    'workflow_dispatch'
  ])
  for (const [file, workflow] of Object.entries(parsed)) {
    assert.ok(Object.keys(workflow.permissions).length > 0, `${file} must declare workflow permissions`)
    for (const trigger of workflow.triggers) {
      if (trigger.on === 'push' || trigger.on === 'pull_request') {
        assert.deepEqual(trigger.branches, ['main'], `${file} must stay restricted to main`)
      }
    }
  }

  // job 级 env 引用 runner 或 steps 不是某一步失败，而是整个文件被判 invalid：零 job，PR 上连这个 check 都不出现。
  for (const [file, text] of Object.entries(workflowText)) {
    for (const { job, key, context } of jobEnvContextViolations(text)) {
      assert.fail(`${file}:${job} job-level env ${key} uses the unavailable ${context} context`)
    }
  }
  const jobEnvWorkflow = ({ key, value }) =>
    [
      'on:',
      '  pull_request:',
      '    branches: [main]',
      'jobs:',
      '  check:',
      '    env:',
      `      ${key}: ${value}`,
      '    steps:',
      '      - run: exit 0',
      ''
    ].join('\n')
  assert.deepEqual(
    jobEnvContextViolations(jobEnvWorkflow({ key: 'CODEX_DIFF_PATH', value: '${{ runner.temp }}/pr.diff' })),
    [{ job: 'check', key: 'CODEX_DIFF_PATH', context: 'runner' }],
    'an uppercase job env key naming the runner context must be reported'
  )
  assert.deepEqual(
    jobEnvContextViolations(jobEnvWorkflow({ key: 'codex_steps', value: '${{ steps.a.outputs.b }}' })),
    [{ job: 'check', key: 'codex_steps', context: 'steps' }],
    'a lowercase job env key is just as invalid and must be reported'
  )
  assert.deepEqual(
    jobEnvContextViolations(jobEnvWorkflow({ key: 'CODEX_ROOT', value: '${{ github.workspace }}' })),
    [],
    'the github context is available in job-level env'
  )

  // 本地 action 由 job 自己的工作区解析：工作区检出到 base 时，本 PR 新建的 action 在 base 里还不存在，
  // 这道门整个跑不起来；而 stage-codex-inputs 不传 base-sha 就从 head 读脚本，读到的正是被审查的那份改动。
  // 两种写法都在这条腿上真实红过，所以判据要能双向自证。
  const prLegIf = "${{ github.event.pull_request.base.ref == 'main' }}"
  const runLegIf = "${{ github.event.workflow_run.event == 'pull_request' }}"
  const headRef = '${{ github.event.pull_request.head.sha }}'
  const baseRef = '${{ github.event.pull_request.base.sha }}'
  const stagingPin = '${{ github.event.pull_request.base.sha }}'
  const stagingWorkflow = ({ ref, pin, legIf }) =>
    [
      'on:',
      '  pull_request:',
      '    branches: [main]',
      'jobs:',
      '  gate:',
      `    if: ${legIf}`,
      '    steps:',
      '      - uses: actions/checkout@v7',
      '        with:',
      `          ref: ${ref}`,
      '      - uses: ./.github/actions/stage-codex-inputs',
      ...(pin ? ['        with:', `          base-sha: ${stagingPin}`] : []),
      ''
    ].join('\n')
  assert.deepEqual(localActionBootstrapViolations(stagingWorkflow({ ref: headRef, pin: true, legIf: prLegIf })), [])
  assert.deepEqual(
    localActionBootstrapViolations(stagingWorkflow({ ref: baseRef, pin: true, legIf: prLegIf })),
    [{ job: 'gate', rule: 'base-checkout', detail: 'stage-codex-inputs' }],
    'a job using a local action must not check out the pull request base'
  )
  assert.deepEqual(
    localActionBootstrapViolations(stagingWorkflow({ ref: headRef, pin: false, legIf: prLegIf })),
    [{ job: 'gate', rule: 'unpinned-staging', detail: '1 step(s)' }],
    'a pull request leg must pin the staged gate scripts to the base commit'
  )
  assert.deepEqual(
    localActionBootstrapViolations(stagingWorkflow({ ref: headRef, pin: false, legIf: runLegIf })),
    [],
    'a workflow_run leg reads its gate scripts from the default branch it checked out'
  )
  for (const [file, text] of Object.entries(workflowText)) {
    for (const { job, rule, detail } of localActionBootstrapViolations(text)) {
      assert.fail(`${file}:${job} breaks the gate staging bootstrap (${rule}: ${detail})`)
    }
  }

  // gh 只认 GH_TOKEN：runner 不会替普通步骤注入 GITHUB_TOKEN，缺凭据的判定步骤不是跳过而是非零退出。
  // 只有真正开口的命令需要凭据，所以 prepare / capture 这类只读本地文件的步骤不该被要求它。
  const codexStep = ({ script = 'codex-review.mjs', command, token }) =>
    [
      'on:',
      '  pull_request:',
      '    branches: [main]',
      'jobs:',
      '  gate:',
      '    steps:',
      '      - name: Apply review gate',
      ...(token ? ['        env:', '          GH_TOKEN: ${{ github.token }}'] : []),
      `        run: node "$RUNNER_TEMP/trusted/scripts/${script}" ${command}`,
      ''
    ].join('\n')
  assert.deepEqual(ghTokenStepViolations(codexStep({ command: 'gate', token: true })), [])
  assert.deepEqual(
    ghTokenStepViolations(codexStep({ command: 'gate', token: false })),
    [{ job: 'gate', step: 'Apply review gate', commands: 'gate' }],
    'a step that asks gh for the live pull request head must carry a token'
  )
  assert.deepEqual(
    ghTokenStepViolations(codexStep({ command: 'prepare', token: false })),
    [],
    'a step that only reads the local worktree needs no credentials'
  )
  assert.deepEqual(
    ghTokenStepViolations(codexStep({ script: 'codex-autofix.mjs', command: 'capture', token: false })),
    [],
    'reading the model output file needs no credentials'
  )
  for (const [file, text] of Object.entries(workflowText)) {
    for (const { job, step, commands } of ghTokenStepViolations(text)) {
      assert.fail(`${file}:${job} step ${step} calls gh (${commands}) without GH_TOKEN`)
    }
  }

  // download-artifact@v7 跨 run 下载必须显式给 github-token；PR #516 首次真实模型调用后
  // 才发现写回腿一直只查当前 run，导致结论评论永远发不出来。
  const crossRunStep = ({ token, runId }) =>
    [
      'name: CI',
      'on: pull_request',
      'jobs:',
      '  reuse:',
      '    steps:',
      '      - name: Download prior conclusion',
      '        uses: actions/download-artifact@v7',
      '        with:',
      '          name: codex-review-findings',
      ...(token ? ['          github-token: ${{ github.token }}'] : []),
      ...(runId ? ['          run-id: ${{ steps.prior.outputs.prior_run_id }}'] : []),
      '          path: /tmp/out',
      ''
    ].join('\n')
  assert.deepEqual(crossRunArtifactViolations(crossRunStep({ token: true, runId: true })), [])
  assert.deepEqual(
    crossRunArtifactViolations(crossRunStep({ token: false, runId: true })),
    [{ job: 'reuse', step: 'Download prior conclusion' }],
    'a cross-run download without github-token silently searches only the current run'
  )
  assert.deepEqual(
    crossRunArtifactViolations(crossRunStep({ token: false, runId: false })),
    [],
    'a same-run download needs no token'
  )
  for (const [file, text] of Object.entries(workflowText)) {
    for (const { job, step } of crossRunArtifactViolations(text)) {
      assert.fail(`${file}:${job} step ${step} downloads a cross-run artifact without github-token`)
    }
  }
  const tokenLine = '          github-token: ${{ github.token }}'
  for (const file of ['ci.yml', 'codex-review-report.yml']) {
    const text = workflowText[file]
    const hits = text.split(tokenLine).length - 1
    assert.ok(hits > 0, `${file} must carry at least one cross-run download token`)
    // 逐个删除，确保写回腿的两处下载（结论与 autofix patch）都被断言覆盖，而不是只测到第一处。
    for (let index = 0; index < hits; index++) {
      let seen = 0
      const mutated = text.replaceAll(tokenLine, () => (seen++ === index ? '' : tokenLine))
      assert.ok(
        crossRunArtifactViolations(mutated).length > 0,
        `${file} must fail the assertion when cross-run token #${index + 1} is removed`
      )
    }
  }

  // 复用产物不能解到本轮结论目录：上一轮 artifact 里的 review-scope.json 会盖掉本次 prepare
  // 写的范围（含 changed_paths）。路径必须与脚本读的位置同源，只改一边会让复用静默失效。
  {
    const destination = namedStep(workflowText['ci.yml'], 'Download prior conclusion')
      .match(/^\s*path:\s*(.+)$/mu)?.[1]
      ?.trim()
    const scriptDefault = priorConclusionDirectory({ RUNNER_TEMP: '/tmp/runner' })
    assert.equal(
      scriptDefault,
      '/tmp/runner/codex-review-prior',
      'the reuse directory must stay a sibling of the conclusion directory'
    )
    assert.equal(
      destination,
      scriptDefault.replace('/tmp/runner/', '${{ runner.temp }}/'),
      'the download destination must be the directory `reuse` reads'
    )
  }

  // 提示词把 review-scope.json 的位置写成结论目录的默认值。CI 若在这里覆盖目录，
  // prepare 会写到别处、模型仍读默认路径，覆盖判定直接失效；这条断言逼改动方同时更新提示词。
  assert.ok(
    !/^\s*CODEX_REVIEW_CONCLUSION_DIR\s*:/mu.test(workflowText['ci.yml']),
    'ci.yml may not override CODEX_REVIEW_CONCLUSION_DIR: the review prompt hardcodes the default'
  )

  const pullRequestValidation = Object.entries(parsed).filter(([, workflow]) =>
    workflow.triggers.some(
      trigger =>
        trigger.on === 'pull_request' && !(trigger.types?.length && trigger.types.every(type => type === 'closed'))
    )
  )
  assert.deepEqual(
    pullRequestValidation.map(([file]) => file).sort(),
    ['ci.yml', 'wails-verify.yml'],
    'all non-closed pull request workflows must remain in the read-only validation set'
  )
  for (const [file, workflow] of pullRequestValidation) {
    assertPullRequestValidationIsReadOnly(workflow)
    const original = workflowText[file]
    assert.throws(
      () =>
        assertPullRequestValidationIsReadOnly(
          parseWorkflow(original.replace('  contents: read\n', '  contents: write\n'))
        ),
      `${file} must reject workflow-level write access`
    )
    const jobId = file === 'ci.yml' ? REQUIRED_CONTEXT : 'build'
    assert.throws(
      () =>
        assertPullRequestValidationIsReadOnly(
          parseWorkflow(original.replace(`  ${jobId}:\n`, `  ${jobId}:\n    permissions:\n      contents: write\n`))
        ),
      `${file}:${jobId} must reject job-level write access`
    )
  }

  // Codex 审查门：模型只在 ci.yml 的只读 job 里跑，评论与推送都在 codex-review-report.yml。
  {
    const ci = workflowText['ci.yml']
    const reportText = workflowText['codex-review-report.yml']
    const report = parsed['codex-review-report.yml']
    const actionRef = 'openai/codex-action@bdf19a4a223ec2549a3e2274a0cf61556bc07675'

    assert.equal(ci.split(actionRef).length - 1, 2, 'both model legs must run inside the read-only CI workflow')
    assert.ok(!reportText.includes('openai/codex-action'), 'the privileged workflow must never run the model')

    assert.deepEqual(report.permissions, { contents: 'read' })
    assert.deepEqual(report.jobs['report-conclusion'].permissions, {
      contents: 'read',
      issues: 'write',
      'pull-requests': 'write',
      actions: 'write'
    })
    assert.deepEqual(report.jobs['codex-autofix-apply'].permissions, {
      contents: 'write',
      'pull-requests': 'read',
      actions: 'read'
    })

    // 空壳结论自动恢复：写回腿唯一的动作类写权限只用于触发一次 --failed 重跑，模型仍不在这条腿里。
    const autoRetryStep = namedStep(reportText, 'Auto-rerun empty review output')
    assert.match(autoRetryStep, /id: auto_retry/, 'the conclusion comment must read the retry state from this step')
    assert.match(
      autoRetryStep,
      /steps\.findings\.outcome == 'success'/,
      'a missing artifact is not an empty conclusion'
    )
    assert.match(autoRetryStep, /WORKFLOW_RUN_ID: \$\{\{ github\.event\.workflow_run\.id \}\}/)
    assert.match(autoRetryStep, /GH_TOKEN: \$\{\{ github\.token \}\}/)
    assert.match(autoRetryStep, /node "\$RUNNER_TEMP\/trusted\/scripts\/codex-review\.mjs" auto-retry/)
    assert.ok(!autoRetryStep.includes('openai/codex-action'), 'the auto retry must not run the model')
    assert.match(
      namedStep(reportText, 'Post conclusion comment'),
      /CODEX_REVIEW_AUTO_RETRY_STATE: \$\{\{ steps\.auto_retry\.outputs\.state \}\}/,
      'the comment must carry the retry state, including a failed rerun'
    )
    // 上限与失败兜底都在可信脚本里：改掉其中任何一处，编排断言也要跟着红。
    const reviewScript = fs.readFileSync(path.join(repoRoot, '.github/scripts/codex-review.mjs'), 'utf8')
    assert.match(reviewScript, /'auto-retry': commandAutoRetry/, 'the trusted script must own the retry decision')
    assert.match(reviewScript, /AUTO_RETRY_LIMIT = 1\b/, 'the single-retry ceiling must not drift')
    assert.match(
      reviewScript,
      /run_attempt is unavailable/,
      'an unreadable run_attempt must fall back to manual handling'
    )

    const eligibilityGuard =
      "github.event_name == 'pull_request' && github.event.pull_request.base.ref == 'main' && github.event.pull_request.head.repo.full_name == github.repository" +
      ` && github.head_ref != '${RELEASE_BRANCH}'`
    const eligibleJobs = ['codex-review', 'codex-gate', 'codex-autofix-plan']

    function assertEligibilityGuards(text) {
      const workflow = parseWorkflow(text)
      for (const jobId of eligibleJobs) {
        assert.ok(
          workflow.jobs[jobId]?.if?.includes(eligibilityGuard),
          `${jobId} must review only same-repo PRs into main`
        )
      }
    }

    function mutateJobIf(text, jobId, fragment) {
      const block = workflowJob(text, jobId)
      const start = text.indexOf(block)
      assert.equal(block.split(fragment).length - 1, 1, `${jobId} mutation anchor must occur once`)
      return text.slice(0, start) + block.replace(fragment, '') + text.slice(start + block.length)
    }

    assertEligibilityGuards(ci)
    // fork PR 拿不到仓库 secret，版本分支由发布流程自审：判据少一条就必须变红，而不是静默放宽。
    for (const fragment of [
      "github.event_name == 'pull_request' && ",
      "github.event.pull_request.base.ref == 'main' && ",
      'github.event.pull_request.head.repo.full_name == github.repository && ',
      `github.head_ref != '${RELEASE_BRANCH}' && `,
      ` && github.head_ref != '${RELEASE_BRANCH}'`
    ]) {
      for (const jobId of eligibleJobs) {
        assert.throws(
          () => assertEligibilityGuards(mutateJobIf(ci, jobId, fragment)),
          `dropping ${fragment.trim()} from ${jobId} must fail the eligibility check`
        )
      }
    }

    // 本仓 .codex/config.toml 在 project 层写死 sandbox_mode = "danger-full-access"。
    // --sandbox 覆盖的是同一个键，权限档走的是另一个键：只准用 --sandbox，
    // 所以下面这两条 sandbox 断言本身就是那道门的判据，少一条就换成了不受覆盖的档位。
    const reviewStep = namedStep(ci, 'Review pull request with Codex')
    const autofixStep = namedStep(ci, 'Propose autofix patch with Codex')
    assert.match(reviewStep, /sandbox: 'read-only'/)
    assert.match(autofixStep, /sandbox: 'workspace-write'/)
    assert.ok(!/openai-api-key: \$\{\{ vars\./.test(ci), 'the api key must never come from a public variable')

    // openai/codex-action#188：ubuntu-26.04 的 sudo-rs 忽略 -E、uutils `test -w` 只看 mode bits，
    // drop-sudo 的 socket ACL 校验因此误判并在 Run codex exec 前退出。v1.13 及 main 上都没有修复，
    // 两条模型腿固定 24.04 并保留 drop-sudo；恢复条件见 ADR-0021「Runner 镜像」。
    const CODEX_RUNNER = 'ubuntu-24.04'
    const modelLegs = ['codex-review', 'codex-autofix-plan']
    function assertCodexRunnerPin(text) {
      for (const jobId of modelLegs) {
        const block = workflowJob(text, jobId)
        assert.equal(
          /^ {4}runs-on: (.+)$/m.exec(block)?.[1],
          CODEX_RUNNER,
          `${jobId} must pin ${CODEX_RUNNER} while openai/codex-action#188 is unfixed`
        )
        assert.match(block, /safety-strategy: 'drop-sudo'/, `${jobId} must keep the drop-sudo safety strategy`)
      }
    }
    assertCodexRunnerPin(ci)
    for (const jobId of modelLegs) {
      const block = workflowJob(ci, jobId)
      const start = ci.indexOf(block)
      const unpinned =
        ci.slice(0, start) +
        block.replace(`runs-on: ${CODEX_RUNNER}`, 'runs-on: ubuntu-latest') +
        ci.slice(start + block.length)
      assert.throws(
        () => assertCodexRunnerPin(unpinned),
        `moving ${jobId} back to ubuntu-latest must fail the runner pin`
      )
    }

    // 端点、模型、强度、密钥与 codex 版本只准从 GitHub 后台来；字面量与 || 兜底会让后台配置永远不生效。
    assert.deepEqual([...CONFIG_ENV], [...CODEX_CONFIG_ENV], 'preflight and topology checks must share one config list')
    assert.deepEqual(codexConfigInputViolations(ci), [])
    assert.equal(
      codexConfigInputViolations(ci.replace('model: ${{ vars.CODEX_REVIEW_MODEL }}', "model: 'some-model'")).length,
      1,
      'a hardcoded model must be reported'
    )
    const withoutEffort = ci.split('effort: ${{ vars.CODEX_REVIEW_EFFORT }}').join('')
    assert.deepEqual(
      codexConfigInputViolations(withoutEffort),
      [{ input: 'effort', found: 'missing', expected: 'declared in both model legs' }],
      'a missing config input must be reported'
    )
    for (const input of Object.keys(CODEX_CONFIG_INPUTS)) {
      const hits = ci.split('\n').filter(line => new RegExp(`^\\s+${input}:`).test(line))
      assert.equal(hits.length, 2, `${input} must be wired in both model legs`)
    }
    for (const jobId of ['codex-review', 'codex-autofix-plan']) {
      const block = workflowJob(ci, jobId)
        .split('\n')
        .filter(line => !/^\s*#/.test(line))
        .join('\n')
      assert.ok(
        !/\|\||claude-|effort: 'high'|codex-version: '\d/.test(block),
        `${jobId} must not carry config fallbacks`
      )
      assert.ok(
        !/^ {6}CODEX_REVIEW_API_KEY:/m.test(block),
        `${jobId} must not expose the API key through job-level env`
      )
      const preflight = namedStep(block, 'Validate Codex configuration')
      for (const name of CODEX_CONFIG_ENV) {
        assert.ok(
          preflight.includes(`${name}: \${{ ${name === 'CODEX_REVIEW_API_KEY' ? 'secrets' : 'vars'}.${name} }}`),
          `${jobId} preflight must receive ${name} from the GitHub backend`
        )
      }
    }
    assert.match(reviewStep, /id: review/)
    assert.match(reviewStep, /steps\.config\.outputs\.configured == 'true'/)
    assert.match(reviewStep, /continue-on-error: true/, 'the model step alone may mask its own crash')
    assert.match(
      namedStep(ci, 'Record review conclusion'),
      /CODEX_REVIEW_STEP_OUTCOME: \$\{\{ steps\.review\.outcome \}\}/
    )
    const assertNotApplicableIsDerived = text =>
      assert.match(
        namedStep(text, 'Apply review gate'),
        /CODEX_REVIEW_NOT_APPLICABLE: \$\{\{ needs\.codex-review\.result == 'skipped' \}\}/,
        'not-applicable must be derived from the review job result, never hardcoded'
      )
    assertNotApplicableIsDerived(ci)
    const derivedNotApplicable = "CODEX_REVIEW_NOT_APPLICABLE: ${{ needs.codex-review.result == 'skipped' }}"
    assert.equal(
      ci.split(derivedNotApplicable).length - 1,
      1,
      'the derived not-applicable assignment must exist exactly once'
    )
    for (const pinned of ["CODEX_REVIEW_NOT_APPLICABLE: 'true'", "CODEX_REVIEW_NOT_APPLICABLE: 'false'"]) {
      assert.throws(
        () => assertNotApplicableIsDerived(ci.split(derivedNotApplicable).join(pinned)),
        /never hardcoded/,
        'a pinned not-applicable value must be rejected by the assertion itself'
      )
    }
    assert.match(parsed['ci.yml'].jobs['codex-autofix-plan'].if, /vars\.CODEX_AUTOFIX_ENABLED == 'true'/)
    assert.match(
      parsed['codex-review-report.yml'].jobs['codex-autofix-apply'].if,
      /vars\.CODEX_AUTOFIX_ENABLED == 'true'/
    )

    // 写腿：403 的定位信息、收敛条件与 smoke 步骤都得在定义里，不能只靠运行时报错。
    assert.match(
      namedStep(reportText, 'Probe comment permission'),
      /continue-on-error: true/,
      'the best-effort probe must not suppress the conclusion step'
    )
    const assertReportIsUnconditional = text =>
      assert.match(
        namedStep(text, 'Post conclusion comment'),
        /if: always\(\) && steps\.pull\.outputs\.pull_number != '' && steps\.findings\.outcome == 'success'/,
        'the conclusion step must not depend on the probe succeeding'
      )
    assertReportIsUnconditional(reportText)
    assert.equal(
      namedStep(reportText, 'Post conclusion comment').split('if: always() && ').length - 1,
      1,
      'the conclusion step must carry exactly one unconditional guard'
    )
    assert.throws(
      () =>
        assertReportIsUnconditional(
          // 变异必须落在结论评论步骤自己的守卫上：文件里现在还有别的 `if: always()` 步骤。
          reportText.replace(
            namedStep(reportText, 'Post conclusion comment'),
            namedStep(reportText, 'Post conclusion comment').replace('if: always() && ', 'if: success() && ')
          )
        ),
      /the conclusion step must not depend/,
      'a probe-gated conclusion step must be rejected by the assertion itself'
    )
    for (const jobId of ['report-conclusion', 'codex-autofix-apply']) {
      const guard = parsed['codex-review-report.yml'].jobs[jobId].if
      assert.match(guard, /workflow_run\.conclusion != 'cancelled'/)
      assert.match(guard, /head_branch != 'changeset-release\/main'/)
    }

    // 没有产物时不能只是安静地绿着：用户在运行页上必须能读到「为什么没有评论」。
    const skippedReport = namedStep(reportText, 'Explain the skipped report')
    assert.match(
      skippedReport,
      /if: always\(\) && .*steps\.findings\.outcome != 'success'/,
      'the no-artifact path must be explained on the run page'
    )
    assert.match(
      skippedReport,
      />> "\$GITHUB_STEP_SUMMARY"/,
      'the explanation must be written to the step summary, not only to the log'
    )
    assert.match(skippedReport, /::notice /, 'the skipped run must also carry a notice annotation')

    // 解析不到 PR 也是一种跳过：守卫必须按 resolve-pull 的成功取，
    // 挂在 pull_number 上会让「没解析到 PR」这条路径一步都不跑，整条腿静默变绿。
    const assertResolveMissIsExplained = text => {
      const step = namedStep(text, 'Explain the skipped report')
      assert.match(step, /steps\.pull\.outcome == 'success'/, 'the skip explanation must run whenever resolve-pull ran')
      assert.ok(!/pull_number != ''/.test(step), 'the skip explanation must not be gated on a resolved pull request')
      assert.match(
        step,
        /PULL_NUMBER: \$\{\{ steps\.pull\.outputs\.pull_number \}\}/,
        'the step must read the resolved number to tell the two skip reasons apart'
      )
      assert.match(step, /## 未解析到 PR/, 'an unresolved head needs its own summary section')
    }
    assertResolveMissIsExplained(reportText)
    assert.throws(
      () =>
        assertResolveMissIsExplained(
          reportText.replace(
            "if: always() && steps.pull.outcome == 'success' && ",
            "if: always() && steps.pull.outputs.pull_number != '' && "
          )
        ),
      /must not be gated on a resolved pull request|must run whenever resolve-pull ran/,
      'the old pull-number guard must be rejected by the assertion itself'
    )

    for (const [, reference] of `${ci}\n${reportText}`.matchAll(/\/trusted\/([^\s"']+)/g)) {
      assert.ok(/^(?:codex|scripts|\.claude)\//.test(reference), `unexpected trusted path ${reference}`)
    }
    const staged = fs
      .readFileSync(path.join(repoRoot, '.github/actions/stage-codex-inputs/action.yml'), 'utf8')
      .match(/for tracked in[\s\S]*?; do/)[0]
    const trustedPrefix = reference =>
      reference.startsWith('codex/') || reference.startsWith('scripts/') ? `.github/${reference}` : reference
    for (const [, reference] of `${ci}\n${reportText}`.matchAll(/\/trusted\/([^\s"']+)/g)) {
      assert.ok(
        staged.includes(trustedPrefix(reference)),
        `workflows read ${reference} but stage-codex-inputs does not stage it`
      )
    }

    for (const [file, workflow] of Object.entries(parsed)) {
      for (const jobId of Object.keys(workflow.jobs)) {
        const block = workflowJob(workflowText[file], jobId)
        if (!/codex-autofix\.mjs (capture|apply)/.test(runTexts(block))) continue
        assert.ok(
          block.includes('CODEX_TRUSTED_SETTINGS: ${{ runner.temp }}/trusted/.claude/settings.json'),
          `${file}:${jobId} must read the deny list from the staged copy, not the reviewed tree`
        )
      }
    }

    assert.equal(
      parsed['ci.yml'].jobs['codex-review'].continueOnError,
      undefined,
      'the review job must expose preflight and conclusion-write failures; only the model step may mask its own crash'
    )
    assert.equal(parsed['ci.yml'].jobs['codex-autofix-plan'].continueOnError, 'true')
    assert.equal(
      parsed['ci.yml'].jobs['codex-gate'].continueOnError,
      undefined,
      'the gate must be able to redden the run'
    )
    assert.equal(parsed['ci.yml'].stepContinueOnError['Apply review gate'], undefined)
    assert.equal(parsed['ci.yml'].steps['Apply review gate'], undefined, 'the gate step must run unconditionally')
    assert.equal(parsed['ci.yml'].stepContinueOnError['Record review conclusion'], undefined)
    // 审查腿的上限只兜大 PR 的尾巴：137 文件/4.3k 行的 PR 在 60 分钟处用满额仍未收口。
    // 自动修保持 60，它只在 check 失败时跑，且产物是一次小 patch。
    assert.match(workflowJob(ci, 'codex-review'), /timeout-minutes: 120/)
    assert.match(workflowJob(ci, 'codex-autofix-plan'), /timeout-minutes: 60/)
    assert.match(workflowJob(ci, 'codex-gate'), /timeout-minutes: 10/, 'the gate does no model work and stays short')
    assert.match(workflowJob(ci, 'codex-review'), /uses: \.\/\.github\/actions\/stage-codex-inputs/)
    assert.ok(
      !/persist-credentials: 'true'|git push/.test(workflowJob(ci, 'codex-review')),
      'the review leg must stay write-free'
    )
    assert.match(workflowJob(reportText, 'codex-autofix-apply'), /timeout-minutes: 10/)

    // 空壳结论必须让审查腿一起变红：否则 --failed 只重跑 gate，拿同一份空 artifact 再红一次。
    const emptyGuard = namedStep(ci, 'Reject empty review output')
    assert.match(emptyGuard, /if: \$\{\{ always\(\) &&/, 'the guard must run even when the model step fails')
    assert.match(emptyGuard, /steps\.reuse\.outputs\.reused != 'true'/, 'a reused conclusion is not re-judged here')
    assert.match(emptyGuard, /node \.github\/scripts\/check-review-output\.mjs/)
    assert.match(
      emptyGuard,
      /hashFiles\('\.github\/scripts\/check-review-output\.mjs'\) != ''/,
      'a PR head that predates the workspace script must skip the guard instead of failing on module import'
    )
    assert.ok(!/continue-on-error/.test(emptyGuard), 'the guard must be able to fail the review job')
    assert.match(
      namedStep(ci, 'Upload review findings'),
      /overwrite: true/,
      'a --failed rerun must be able to replace the same-named artifact'
    )
  }

  const version = workflowText['changeset-version.yml']
  assert.ok(!version.includes('cache-seed'), 'the extra main cache-seed job must stay removed')
  assert.ok(!version.includes('actions/cache@'), 'versioning must not add a replacement cache-seed job')
  assert.ok(workflowJob(version, 'version').includes('ref: main'))
  assert.match(workflowJob(version, 'version'), /queue: max/)

  const expectedPrepareGuard = `github.event.pull_request.merged == true && github.event.pull_request.head.ref == '${RELEASE_BRANCH}'`
  function assertPrepareGuard(text, file) {
    assert.equal(
      parseWorkflow(text).jobs.prepare.if,
      expectedPrepareGuard,
      `${file} must publish only merged version PRs`
    )
  }
  for (const [file, jobId] of [
    ['npm-publish.yml', 'prepare'],
    ['wails-release.yml', 'prepare']
  ]) {
    const workflow = parsed[file]
    const trigger = workflow.triggers.find(item => item.on === 'pull_request')
    assert.deepEqual(trigger.types, ['closed'])
    assertPrepareGuard(workflowText[file], file)
    assert.notEqual(workflow.jobs[jobId].permissions.contents, 'write', `${file} prepare must not receive write access`)
  }
  assert.throws(() =>
    assertPrepareGuard(
      workflowText['npm-publish.yml'].replace(expectedPrepareGuard, `${expectedPrepareGuard} || true`),
      'npm-publish.yml'
    )
  )

  const npmText = workflowText['npm-publish.yml']
  assert.deepEqual(parsed['npm-publish.yml'].jobs.publish.needs, ['prepare'])
  assert.equal(parsed['npm-publish.yml'].jobs.publish.if, "needs.prepare.outputs.should-publish == 'true'")
  assert.deepEqual(parsed['npm-publish.yml'].jobs['release-notes'].needs, ['prepare', 'publish'])
  const expectedNotesGuard = "needs.prepare.outputs.should-publish == 'true' && needs.publish.result == 'success'"
  assert.equal(parsed['npm-publish.yml'].jobs['release-notes'].if, expectedNotesGuard)
  assert.ok(workflowJob(npmText, 'prepare').includes('package-releases: ${{ steps.release.outputs.package-releases }}'))
  assert.ok(
    workflowJob(npmText, 'release-notes').includes('PACKAGE_RELEASES: ${{ needs.prepare.outputs.package-releases }}')
  )
  assert.ok(workflowJob(npmText, 'release-notes').includes('MERGE_SHA: ${{ needs.prepare.outputs.merge-sha }}'))
  assert.ok(workflowJob(npmText, 'release-notes').includes("needs.publish.result == 'success'"))
  assert.ok(!/receipt|run_attempt|GITHUB_RUN_ID|PUBLISH_RESULT|RECEIPT_PATH/i.test(npmText))
  assert.ok(!fs.existsSync(path.join(repoRoot, '.github/scripts/npm-release-receipt.mjs')))
  assert.ok(!fs.existsSync(path.join(repoRoot, '.github/scripts/npm-release-receipt.test.mjs')))
  assert.deepEqual(parsed['npm-publish.yml'].jobs['release-notes'].permissions, { contents: 'write' })
  assert.deepEqual(parsed['npm-publish.yml'].jobs.publish.permissions, { contents: 'read', 'id-token': 'write' })
  assert.equal(parsed['npm-publish.yml'].permissions.contents, 'read')
  assert.equal(parsed['npm-publish.yml'].permissions['id-token'], 'write')
  assert.throws(() =>
    assert.equal(
      parseWorkflow(npmText.replace(expectedNotesGuard, `${expectedNotesGuard} || true`)).jobs['release-notes'].if,
      expectedNotesGuard
    )
  )
  assertCheckoutRef(npmText, 'prepare', '${{ github.event.pull_request.merge_commit_sha }}')
  assertCheckoutRef(npmText, 'publish', '${{ needs.prepare.outputs.merge-sha }}')
  assertCheckoutRef(npmText, 'release-notes', '${{ github.event.pull_request.merge_commit_sha }}')
  assert.throws(() =>
    assertCheckoutRef(
      npmText.replace('ref: ${{ needs.prepare.outputs.merge-sha }}', 'ref: main'),
      'publish',
      '${{ needs.prepare.outputs.merge-sha }}'
    )
  )

  const wailsText = workflowText['wails-release.yml']
  assert.deepEqual(parsed['wails-release.yml'].jobs.build.needs, ['prepare'])
  assert.deepEqual(parsed['wails-release.yml'].jobs.publish.needs, ['prepare', 'build'])
  assert.equal(parsed['wails-release.yml'].jobs.build.if, "needs.prepare.outputs.should-release == 'true'")
  assert.equal(parsed['wails-release.yml'].jobs.publish.if, "needs.prepare.outputs.should-release == 'true'")
  assert.deepEqual(parsed['wails-release.yml'].jobs.publish.permissions, { contents: 'write' })
  assert.deepEqual(parsed['wails-release.yml'].permissions, { contents: 'read' })
  assert.ok(workflowJob(wailsText, 'prepare').includes('node .github/scripts/publish-wails-release.mjs inspect'))
  assert.ok(workflowJob(wailsText, 'publish').includes('node .github/scripts/publish-wails-release.mjs'))
  assert.ok(!/GITHUB_RUN_ID|ownership marker|createDraft|deleteDraft|uploadAssets|receipt|skip-build/i.test(wailsText))
  assertCheckoutRef(wailsText, 'prepare', '${{ github.event.pull_request.merge_commit_sha }}')
  assertCheckoutRef(wailsText, 'build', '${{ needs.prepare.outputs.merge-sha }}')
  assertCheckoutRef(wailsText, 'publish', '${{ needs.prepare.outputs.merge-sha }}')
  assert.throws(() =>
    assert.ok(
      workflowJob(wailsText, 'publish')
        .replace('ref: ${{ needs.prepare.outputs.merge-sha }}', 'ref: main')
        .includes('ref: ${{ needs.prepare.outputs.merge-sha }}')
    )
  )
  assert.ok(!/cache-seed|receipt/i.test(workflowText['changeset-version.yml']))
}

// Every step output reference must resolve to an id declared in the same job.
for (const [file, workflow] of Object.entries(parsed)) {
  for (const [step, expression] of Object.entries(workflow.steps)) {
    if (/steps\.[a-zA-Z0-9_-]+\.(?:outcome|conclusion)\b/.test(expression)) {
      assert.match(
        expression,
        /\b(?:always|failure|cancelled|success)\(\)/,
        `${file}:${step} must use a status function`
      )
    }
  }
  for (const job of Object.keys(workflow.jobs)) {
    const block = workflowJob(workflowText[file], job)
    for (const reference of block.matchAll(/\bsteps\.([a-zA-Z0-9_-]+)\./g)) {
      assert.ok(
        workflow.stepIdsByJob[job].includes(reference[1]),
        `${file}:${job} references steps.${reference[1]} without declaring it in that job`
      )
    }
  }
}

// The native verification trigger is derived from the frontend's transitive workspace dependency closure.
function collectWorkspacePackages(root) {
  const packages = new Map()
  for (const area of readPnpmWorkspaceDirectories(root)) {
    const areaRoot = path.join(root, area)
    if (!fs.existsSync(areaRoot)) continue
    const visit = directory => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue
        const absolute = path.join(directory, entry.name)
        if (entry.isDirectory()) visit(absolute)
        else if (entry.isFile() && entry.name === 'package.json') {
          const manifest = JSON.parse(fs.readFileSync(absolute, 'utf8'))
          if (manifest.name) {
            packages.set(manifest.name, {
              directory: path.relative(root, path.dirname(absolute)).split(path.sep).join('/'),
              manifest
            })
          }
        }
      }
    }
    visit(areaRoot)
  }
  return packages
}

function workspaceDependencies(manifest) {
  return [manifest.dependencies, manifest.devDependencies, manifest.optionalDependencies, manifest.peerDependencies]
    .filter(Boolean)
    .flatMap(dependencies =>
      Object.entries(dependencies)
        .filter(([, version]) => typeof version === 'string' && version.startsWith('workspace:'))
        .map(([name]) => name)
    )
}

{
  const packages = collectWorkspacePackages(repoRoot)
  const frontend = packages.get('@greypan/interweave-frontend')
  assert.ok(frontend)
  const closure = new Set()
  const visit = name => {
    if (closure.has(name)) return
    const entry = packages.get(name)
    assert.ok(entry, `frontend dependency ${name} must resolve to a workspace package`)
    closure.add(name)
    for (const dependency of workspaceDependencies(entry.manifest)) visit(dependency)
  }
  for (const dependency of workspaceDependencies(frontend.manifest)) visit(dependency)
  const trigger = parsed['wails-verify.yml'].triggers.find(item => item.on === 'pull_request')
  for (const name of closure) {
    const directory = packages.get(name).directory
    assert.ok(trigger.paths.includes(`${directory}/**`), `Wails verification must trigger for ${directory}`)
  }
}

// Verification and release use the same native matrix. Keep one comparison, not a third copy of every field.
function matrixEntries(text) {
  const block = text.match(/^ {8}include:\n((?: {10}- .*\n| {12}.*\n)+)/m)
  assert.ok(block, 'native job must define a matrix include list')
  const entries = []
  for (const line of block[1].trimEnd().split('\n')) {
    const first = line.match(/^ {10}- ([^:]+): (.*)$/)
    if (first) {
      entries.push({ [first[1]]: first[2].replace(/^'|'$/g, '') })
      continue
    }
    const field = line.match(/^ {12}([^:]+): (.*)$/)
    if (field) entries.at(-1)[field[1]] = field[2].replace(/^'|'$/g, '')
  }
  return entries
}

{
  const verify = matrixEntries(workflowText['wails-verify.yml'])
  const release = matrixEntries(workflowText['wails-release.yml'])
  assert.deepEqual(release, verify, 'the verified native matrix must be the release matrix')
  assert.equal(verify.length, 2)
  const scripts = JSON.parse(fs.readFileSync(path.join(repoRoot, 'apps/interweave/package.json'), 'utf8')).scripts
  const artifactNames = new Set()
  for (const entry of verify) {
    assert.ok(Object.hasOwn(scripts, entry.command), `${entry.command} must exist in the Interweave manifest`)
    assert.notEqual(entry.command, 'build', 'native jobs must call platform-specific build scripts')
    assert.ok(!artifactNames.has(entry['artifact-name']), 'native artifact names must be unique')
    artifactNames.add(entry['artifact-name'])
    assert.match(entry['artifact-path'], /\.(dmg|exe)$/)
  }
  assert.ok(verify.some(entry => entry.runner.startsWith('macos-') && entry.command === 'build:macos'))
  assert.ok(verify.some(entry => entry.runner.startsWith('windows-') && entry.command === 'build:windows'))
  assert.match(namedStep(workflowText['wails-verify.yml'], 'Upload verification artifact'), /if-no-files-found: error/)
  assert.match(namedStep(workflowText['wails-release.yml'], 'Upload release artifact'), /overwrite: true/)
}

// The aggregate package build must continue excluding the host-specific Interweave wrapper.
{
  const aggregateBuild = [
    /@greypan\/interweave["']?\s+run\s+["']?build["']?(?![:\w-])/,
    /@greypan\/interweave["']?\s+build(?![:\w-])/,
    /(?:--dir|-C)\s+\S*apps\/interweave["']?\s+run\s+["']?build["']?(?![:\w-])/,
    /(?:--dir|-C)\s+\S*apps\/interweave["']?\s+build(?![:\w-])/,
    /turbo\s+[^\n]*--filter[=\s]+["']?@greypan\/interweave(?![-\w])/i
  ]
  const legalNegativeFilter = 'pnpm exec turbo run build --filter=!@greypan/interweave'
  const forbiddenPositiveFilter = 'pnpm exec turbo run build --filter=@greypan/interweave'
  assert.equal(
    aggregateBuild.some(pattern => pattern.test(legalNegativeFilter)),
    false
  )
  assert.equal(
    aggregateBuild.some(pattern => pattern.test(forbiddenPositiveFilter)),
    true
  )
  for (const [file, text] of Object.entries(workflowText)) {
    for (const run of runTexts(text)) {
      if (!/@greypan\/interweave|apps\/interweave/.test(run)) continue
      for (const pattern of aggregateBuild) {
        assert.ok(!pattern.test(run), `${file} must not run the aggregate Interweave build: ${run}`)
      }
    }
  }
}

// Keep the shared cache inputs that reduce repeated package/native work; do not make tests mirror all YAML fields.
{
  const ci = workflowText['ci.yml']
  assert.match(ci, /TURBO_CACHE_DIR: \$\{\{ github\.workspace \}\}\/\.turbo/)
  assert.match(ci, /uses: actions\/cache@v5[\s\S]*?path: \.turbo[\s\S]*?hashFiles\('\.mise\.toml'\)[\s\S]*?github\.sha/)
  assert.match(ci, /restore-keys: \|\n\s+\$\{\{ runner\.os \}\}-\$\{\{ runner\.arch \}\}-turbo-/)
  assert.match(workflowText['wails-verify.yml'], /go-cache: 'true'/)
  assert.match(workflowText['wails-release.yml'], /go-cache: 'true'/)

  const setup = fs.readFileSync(path.join(repoRoot, '.github/actions/setup-deps/action.yml'), 'utf8')
  const goCacheStart = setup.indexOf('    - name: Cache Go modules and build artifacts\n')
  const miseActionStart = setup.indexOf('    - uses: jdx/mise-action@v4\n')
  assert.ok(goCacheStart > miseActionStart, 'Go cache setup must run after mise installs Go')
  assert.match(setup, /  go-cache:\n[\s\S]*?default: 'false'/)
  assert.match(setup, /go env GOMODCACHE/)
  assert.match(setup, /go env GOCACHE/)
  assert.match(setup, /go env GOVERSION/)
  // 键与前缀同构且不含镜像段：restore-keys 按字面前缀匹配，键多出的段会令前缀永不命中；
  // 镜像滚动接近天级，含镜像段等于每次滚动后 go vet 全冷。
  assert.doesNotMatch(setup, /ImageOS|ImageVersion/)
  assert.match(setup, /key: \$\{\{ runner\.os \}\}-\$\{\{ runner\.arch \}\}-go-/)
  assert.match(setup, /restore-keys: \|\n\s+\$\{\{ runner\.os \}\}-\$\{\{ runner\.arch \}\}-go-/)
  assert.match(setup, /actions\/cache@v5/)
  const aptPlanStart = setup.indexOf('    - name: Resolve Wails Linux package cache key\n')
  const aptCacheStart = setup.indexOf('    - name: Restore Wails Linux package archives\n')
  const aptDownloadStart = setup.indexOf('    - name: Download Wails Linux package archives\n')
  const aptInstallStart = setup.indexOf('    - name: Install Wails Linux prerequisites\n')
  const aptPermissionsStart = setup.indexOf('    - name: Prepare Wails Linux package archives for caching\n')
  const aptSaveStart = setup.indexOf('    - name: Save Wails Linux package archives\n')
  assert.ok(
    aptPlanStart >= 0 &&
      aptPlanStart < aptCacheStart &&
      aptCacheStart < aptDownloadStart &&
      aptDownloadStart < aptInstallStart &&
      aptInstallStart < aptPermissionsStart &&
      aptPermissionsStart < aptSaveStart,
    'Wails apt archives must be restored before download/install, made readable, then saved'
  )
  assert.match(setup, /--print-uris[\s\S]*?libgtk-4-dev libwebkitgtk-6\.0-dev/)
  assert.match(setup, /apt_plan_hash=.*sha256sum/)
  assert.match(setup, /key=\$\{cache_scope\}-\$\{apt_plan_hash\}/)
  assert.match(setup, /cache_scope="\$\{ID\}-\$\{VERSION_ID\}-\$\(dpkg --print-architecture\)"/)
  assert.match(setup, /key: wails-apt-\$\{\{ steps\.wails-apt-cache\.outputs\.key \}\}/)
  assert.match(setup, /restore-keys: \|\n\s+wails-apt-\$\{\{ steps\.wails-apt-cache\.outputs\.scope \}\}-/)
  assert.match(setup, /APT::Keep-Downloaded-Packages=true/)
  assert.match(setup, /  skip-mise:\n[\s\S]*?default: 'false'/)
  assert.match(setup, /uses: jdx\/mise-action@v4\n\s+if: inputs\.skip-mise != 'true'/)
  assert.match(
    setup,
    /id: wails-apt-download[\s\S]*install --download-only -y --no-install-recommends libgtk-4-dev libwebkitgtk-6\.0-dev/
  )
  assert.match(
    setup,
    /id: wails-apt-install[\s\S]*install -y --no-install-recommends libgtk-4-dev libwebkitgtk-6\.0-dev/
  )
  assert.match(setup, /steps\.wails-apt-download\.outcome == 'success'/)
  assert.match(setup, /steps\.wails-apt-install\.outcome == 'success'/)
  assert.match(setup, /id: wails-apt-permissions[\s\S]*sudo chown -R "\$\(id -u\):\$\(id -g\)"/)
  assert.match(setup, /steps\.wails-apt-permissions\.outcome == 'success'/)
  assert.doesNotMatch(setup, /if: always\(\)[^\n]*wails-apt/)
  assert.match(setup, /uses: actions\/cache\/restore@v5[\s\S]*uses: actions\/cache\/save@v5/)
  for (const keyPart of [
    'runner.os',
    'runner.arch',
    'outputs.goversion',
    "hashFiles('apps/interweave/go.sum')",
    'github.sha'
  ]) {
    assert.ok(setup.includes(keyPart), `Go cache must remain scoped by ${keyPart}`)
  }
}

// macOS 14 于 2026-11-02 退役（actions/runner-images#13518）：标签一旦回到工作流，
// macOS 腿会在 0 秒被取消，而同一 run 的 Linux 腿照常绿，很容易被误判成偶发。
for (const file of ['wails-verify.yml', 'wails-release.yml']) {
  assert.match(workflowText[file], /runner: macos-15\b/u, `${file} must build on the supported arm64 macOS runner`)
  assert.doesNotMatch(workflowText[file], /macos-1[34]/u, `${file} must not target a retired macOS runner`)
}

console.log('.github/scripts/lib/workflow-topology.test.mjs: all assertions passed')
