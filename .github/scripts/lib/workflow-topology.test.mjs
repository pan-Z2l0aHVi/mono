import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { readPnpmWorkspaceDirectories } from '@greypan/monorepo-kit'

import { RELEASE_BRANCH, REQUIRED_CONTEXT, parseWorkflow, requiredPolicyStep } from './workflow-topology.mjs'

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

console.log('.github/scripts/lib/workflow-topology.test.mjs: all assertions passed')
