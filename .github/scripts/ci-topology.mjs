// CI 拓扑的唯一声明处。workflow 文件不能被 import，所以这张表的强制方式是「被测试比对」：
// 同目录的 ci-topology.test.mjs 用下面的 parseWorkflow 读真实 YAML，逐字段与表核对，任一漂移即失败。
// 表里记的是会让发布行为改变的事实（触发面、必需 context、job 依赖、分支常量、声明的安装面、权限提级），
// 以及 PR changeset 与仓库 policy step 的命令和执行约束。
//
// 为什么自己扫 YAML 而不是加解析器：仓库根解析不到 `yaml` / `js-yaml`，为一个拓扑断言引入依赖是
// 比这张表更重的决策；本仓 workflow 只用顶格 section + 固定缩进这一小撮形状，parseWorkflow 的每条正则
// 都对应其中一种 —— YAML 一旦改用别的形状（多行 `branches:`、step 名写在 `id:` 之后），表现是测试红，
// 不是静默漏检。
import { POLICY_CHECKS } from '../../scripts/check-policies.mjs'

export const RELEASE_BRANCH = 'changeset-release/main'

// main 保护规则集唯一要求的上下文名；它保持单个 job 名，便于 ruleset 稳定绑定。
export const REQUIRED_CONTEXT = 'check'

export const requiredPolicyStep = {
  name: 'Check repository policies',
  job: 'check',
  shell: 'bash',
  runs: POLICY_CHECKS.filter(name => name !== 'format-clean').map(name => '.agents/checks/' + name)
}

const mergedIntoReleaseBranch = `github.event.pull_request.merged == true && github.event.pull_request.head.ref == '${RELEASE_BRANCH}'`

export const workflows = {
  'ci.yml': {
    name: 'CI',
    // 不监听 push；pull_request 默认验证 GitHub 生成的合并对象。strict 只要求 PR 分支跟上 base，
    // squash 会创建新提交，不能据此断言合并提交与先前测试对象完全相同；trunk 复检走 workflow_dispatch。
    triggers: [{ on: 'pull_request', branches: ['main'] }, { on: 'workflow_dispatch' }],
    permissions: { contents: 'read' },
    concurrency: {
      group: '${{ github.workflow }}-${{ github.head_ref || github.ref_name }}',
      'cancel-in-progress': 'true'
    },
    jobs: {
      check: {
        needs: [],
        toolchain: { wails: 'true', 'go-cache': 'true' },
        requiredContext: true
      }
    },
    // 版本 PR 自己不带 pending changeset（它删掉的就是 changeset），所以那一步只在非版本分支上跑。
    steps: {
      'Check changesets': `github.event_name == 'pull_request' && github.head_ref != '${RELEASE_BRANCH}'`,
      'Record tested PR snapshot': "github.event_name == 'pull_request'"
    },
    stepJobs: {
      [requiredPolicyStep.name]: requiredPolicyStep.job,
      'Record tested PR snapshot': 'check'
    },
    stepShells: {
      'Record tested PR snapshot': 'bash'
    },
    policyStep: requiredPolicyStep,
    stepRuns: {
      'Check changesets': [
        'pnpm exec changeset status --since="$PR_BASE_SHA"',
        '.agents/checks/changeset-required --base "$PR_BASE_SHA" --head "$PR_HEAD_SHA"'
      ],
      Build: ['pnpm exec turbo run build --filter=!@greypan/interweave'],
      [requiredPolicyStep.name]: requiredPolicyStep.runs,
      'Record tested PR snapshot': [
        'checkout_sha=$(git rev-parse HEAD)',
        '{',
        'echo "## Tested PR snapshot"',
        'echo "- PR base SHA: ${{ github.event.pull_request.base.sha }}"',
        'echo "- PR head SHA: ${{ github.event.pull_request.head.sha }}"',
        'echo "- Event SHA: $GITHUB_SHA"',
        'echo "- Checkout SHA: $checkout_sha"',
        '} | tee -a "$GITHUB_STEP_SUMMARY"'
      ]
    },
    stepIds: []
  },
  'changeset-version.yml': {
    name: 'Create Version PR',
    triggers: [{ on: 'push', branches: ['main'] }],
    permissions: { contents: 'write', 'pull-requests': 'write' },
    concurrency: {},
    jobs: {
      version: {
        name: 'Create or update version pull request',
        needs: [],
        // 收窄的安装面是刻意的：这个 job 的 version-script 会跑 interweave 的 sync:version，
        // 而它现在必须是纯 node（见 apps/interweave/scripts/version-sync.test.mjs）。
        toolchain: { 'mise-install': 'node pnpm' },
        concurrency: {
          group: '${{ github.workflow }}-${{ github.repository }}-${{ github.ref }}-version',
          'cancel-in-progress': 'false',
          queue: 'max'
        }
      },
      'cache-seed': {
        name: 'Seed trusted main Turbo cache',
        needs: [],
        toolchain: { 'mise-install': 'node pnpm' },
        permissions: { contents: 'read' },
        concurrency: {
          group: '${{ github.workflow }}-${{ github.repository }}-${{ github.ref }}-main-cache-seed',
          'cancel-in-progress': 'true'
        }
      }
    },
    // changesets/action 这一步只在有 pending changeset 时才跑，main 上因此不会长出空版本 PR。
    steps: {
      'Create or update version pull request': "steps.changesets.outputs.has-changesets == 'true'"
    },
    stepIds: ['changesets']
  },
  'wails-verify.yml': {
    name: 'Verify Wails Desktop',
    triggers: [
      {
        on: 'pull_request',
        branches: ['main'],
        paths: [
          '.github/workflows/wails-verify.yml',
          '.github/actions/setup-deps/action.yml',
          '.mise.toml',
          'package.json',
          'pnpm-lock.yaml',
          'pnpm-workspace.yaml',
          'turbo.json',
          'apps/interweave/**',
          'packages/web-ui/**',
          'packages/browser-kit/**',
          'packages/js-kit/**',
          'packages/deps-reload/**',
          'packages/test-kit/**',
          'packages/tsconfig/**',
          'packages/unplugin-web-components/**'
        ]
      },
      { on: 'workflow_dispatch' }
    ],
    permissions: { contents: 'read' },
    concurrency: {
      group: '${{ github.workflow }}-${{ github.head_ref || github.ref_name }}',
      'cancel-in-progress': 'true'
    },
    jobs: {
      metadata: {
        name: 'Validate Wails metadata',
        needs: [],
        toolchain: { 'mise-install': 'node', 'skip-install': 'true' }
      },
      build: {
        name: '${{ matrix.name }}',
        needs: ['metadata'],
        toolchain: { 'go-cache': 'true' }
      }
    },
    steps: {},
    stepIds: []
  },
  'wails-release.yml': {
    name: 'Release Wails Desktop',
    triggers: [{ on: 'pull_request', branches: ['main'], types: ['closed'], paths: ['apps/interweave/**'] }],
    permissions: { contents: 'read' },
    concurrency: {
      group: '${{ github.workflow }}-${{ github.event.pull_request.number }}',
      'cancel-in-progress': 'false'
    },
    jobs: {
      prepare: {
        name: 'Detect desktop application release',
        needs: [],
        toolchain: { 'mise-install': 'node', 'skip-install': 'true' },
        if: mergedIntoReleaseBranch
      },
      build: {
        name: '${{ matrix.name }}',
        needs: ['prepare'],
        toolchain: { 'go-cache': 'true' },
        if: "needs.prepare.outputs.should-release == 'true'"
      },
      publish: {
        name: 'Publish desktop release',
        needs: ['prepare', 'build'],
        toolchain: { 'mise-install': 'node', 'skip-install': 'true' },
        if: "needs.prepare.outputs.should-release == 'true'",
        // workflow 级保持 read，写权限只提级到真正创建 GitHub Release 的这个 job。
        permissions: { contents: 'write' }
      }
    },
    steps: {
      'Verify existing desktop release before native build': "steps.release.outputs.should-release == 'true'"
    },
    stepJobs: {
      'Verify existing desktop release before native build': 'prepare'
    },
    stepRuns: {
      'Verify existing desktop release before native build': ['node .github/scripts/publish-wails-release.mjs inspect']
    },
    stepInputs: {
      'Upload release artifact': [
        'uses: actions/upload-artifact@v6',
        'name: ${{ matrix.artifact-name }}',
        'path: ${{ matrix.artifact-path }}',
        'if-no-files-found: error',
        'retention-days: 30',
        'overwrite: true'
      ]
    },
    stepIds: ['release', 'existing']
  },
  'npm-publish.yml': {
    name: 'Publish npm Packages',
    triggers: [{ on: 'pull_request', branches: ['main'], types: ['closed'], paths: ['packages/**'] }],
    permissions: { contents: 'read', 'id-token': 'write' },
    concurrency: {
      group: '${{ github.workflow }}-${{ github.repository }}',
      'cancel-in-progress': 'false',
      queue: 'max'
    },
    jobs: {
      prepare: {
        name: 'Detect public package release',
        needs: [],
        toolchain: { 'mise-install': 'node', 'skip-install': 'true' },
        if: mergedIntoReleaseBranch,
        permissions: { contents: 'read' }
      },
      publish: {
        name: 'Build and publish npm packages',
        needs: ['prepare'],
        toolchain: { 'mise-install': 'node pnpm' },
        if: "needs.prepare.outputs.should-publish == 'true'",
        permissions: { contents: 'read', 'id-token': 'write' }
      },
      'release-notes': {
        name: 'Create npm package releases',
        needs: ['prepare', 'publish'],
        toolchain: { 'mise-install': 'node', 'skip-install': 'true' },
        if: "\${{ !cancelled() && github.event.pull_request.merged == true && github.event.pull_request.head.ref == 'changeset-release/main' && (needs.publish.result == 'success' || needs.publish.result == 'failure') }}",
        permissions: { contents: 'write' }
      }
    },
    steps: {},
    stepInputs: {
      'Save the first-attempt npm receipt': [
        'uses: actions/upload-artifact@v6',
        'name: npm-release-receipt-${{ github.run_id }}',
        'path: ${{ runner.temp }}/npm-release-receipt/receipt.json',
        'if-no-files-found: error',
        'retention-days: 30'
      ],
      'Restore the original npm receipt on rerun': [
        'uses: actions/download-artifact@v7',
        'name: npm-release-receipt-${{ github.run_id }}',
        'path: ${{ runner.temp }}/npm-release-receipt'
      ],
      'Download the original npm receipt': [
        'uses: actions/download-artifact@v7',
        'name: npm-release-receipt-${{ github.run_id }}',
        'path: ${{ runner.temp }}/npm-release-receipt'
      ]
    },
    stepIds: ['release']
  },
  'deploy-pages.yml': {
    name: 'Deploy to GitHub Pages',
    triggers: [{ on: 'workflow_dispatch' }],
    permissions: { contents: 'read', pages: 'write', 'id-token': 'write' },
    concurrency: { group: 'pages', 'cancel-in-progress': 'false' },
    jobs: {
      // 仍然只有一个 job：Pages 部署只要 JavaScript 工具链，拆成 build + deploy 会把 artifact 在两个
      // runner 之间搬一遍，而这里没有需要分开的第二套工具链。
      deploy: {
        needs: [],
        toolchain: { 'mise-install': 'node pnpm' }
      }
    },
    steps: {},
    stepIds: ['deployment']
  },
  'artifact-rerun-probe.yml': {
    name: 'Probe artifact rerun recovery',
    triggers: [{ on: 'pull_request', branches: ['main'], paths: ['.github/workflows/artifact-rerun-probe.yml'] }],
    permissions: { contents: 'read' },
    jobs: {
      prepare: { needs: [], toolchain: {} },
      consumer: { needs: ['prepare'], toolchain: {} }
    },
    steps: {
      'Create first-attempt receipt fixture': 'github.run_attempt == 1',
      'Save first-attempt receipt fixture': 'github.run_attempt == 1',
      'Restore original receipt when prepare reruns': 'github.run_attempt > 1',
      'Verify receipt identity': undefined,
      'Verify consumer receipt identity': undefined,
      'Simulate first-attempt publisher failure without publishing': 'github.run_attempt == 1'
    },
    stepJobs: {
      'Create first-attempt receipt fixture': 'prepare',
      'Save first-attempt receipt fixture': 'prepare',
      'Restore original receipt when prepare reruns': 'prepare',
      'Verify receipt identity': 'prepare',
      'Verify consumer receipt identity': 'consumer',
      'Simulate first-attempt publisher failure without publishing': 'consumer'
    },
    stepRuns: {
      'Create first-attempt receipt fixture': [
        'mkdir -p receipt-probe',
        'printf \'%s\\n%s\\n\' "$PROBE_RUN_ID" "$PROBE_SHA" > receipt-probe/receipt.txt'
      ],
      'Verify receipt identity': [
        'test "$(sed -n \'1p\' receipt-probe/receipt.txt)" = "$PROBE_RUN_ID"',
        'test "$(sed -n \'2p\' receipt-probe/receipt.txt)" = "$PROBE_SHA"'
      ],
      'Verify consumer receipt identity': [
        'test "$(sed -n \'1p\' receipt-probe/receipt.txt)" = "$PROBE_RUN_ID"',
        'test "$(sed -n \'2p\' receipt-probe/receipt.txt)" = "$PROBE_SHA"'
      ],
      'Simulate first-attempt publisher failure without publishing': ['exit 1']
    },
    stepInputs: {
      'Save first-attempt receipt fixture': [
        'uses: actions/upload-artifact@v6',
        'name: receipt-probe-${{ github.run_id }}',
        'path: receipt-probe/receipt.txt',
        'retention-days: 1',
        'if-no-files-found: error'
      ],
      'Restore original receipt when prepare reruns': [
        'uses: actions/download-artifact@v7',
        'name: receipt-probe-${{ github.run_id }}',
        'path: receipt-probe'
      ]
    },
    stepIds: []
  }
}

// 桌面构建矩阵的单一声明：verify 与 release 各写一份时，任何一侧加 runner 或改 artifact 名都会
// 让「验证过的产物」与「发出去的产物」不是同一份东西。
export const desktopMatrix = [
  {
    name: 'macOS ARM64 DMG',
    runner: 'macos-14',
    command: 'build:macos',
    'artifact-name': 'interweave-macos-arm64',
    'artifact-path': 'apps/interweave/bin/interweave.dmg'
  },
  {
    name: 'Windows x64 EXE',
    runner: 'windows-latest',
    command: 'build:windows',
    'artifact-name': 'interweave-windows-amd64',
    'artifact-path': 'apps/interweave/bin/interweave.exe'
  }
]

// 先去掉 YAML 行内注释（`id-token: write # npm Trusted Publishing`），再剥掉成对的整体引号：
// `a == 'b' && c != 'd'` 这类表达式首尾都有单引号，按字符逐头剥会吃掉结尾。
function unquote(value) {
  const plain = value.replace(/\s+#\s.*$/, '')
  return plain.startsWith("'") && plain.endsWith("'") ? plain.slice(1, -1) : plain
}

// 只认本仓用到的形状：顶格 section、缩进 2 的 trigger/job/permission 键、缩进 4 的 job 字段与
// trigger 的 `branches`/`types`/`paths`、缩进 6 的 step 与 job 级权限、其 `with:` 下的安装面入参
// （缩进 10）、缩进 8 的 step `if:`、`id:`、`shell:` 与 `continue-on-error:`。run 块里的内容缩进更深
// 或不以 `- `/`key:` 开头，不会误判。
export function parseWorkflow(text) {
  const lines = text.split(/\r?\n/)
  const parsed = {
    name: '',
    triggers: [],
    permissions: {},
    concurrency: {},
    jobs: {},
    steps: {},
    stepIds: [],
    stepJobs: {},
    stepShells: {},
    stepContinueOnError: {}
  }
  let section = null
  let trigger = null
  let triggerPaths = false
  let job = null
  let jobPermissions = false
  let jobConcurrency = false
  let step = null

  for (const line of lines) {
    const top = line.match(/^([A-Za-z-]+):(?:\s*(.*))?$/)
    if (top) {
      section = ['on', 'jobs', 'permissions', 'concurrency'].includes(top[1]) ? top[1] : null
      trigger = null
      triggerPaths = false
      job = null
      jobPermissions = false
      jobConcurrency = false
      step = null

      if (top[1] === 'name') {
        parsed.name = unquote(top[2] ?? '')
      }
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
      if (triggerPaths && pathEntry) {
        trigger.paths.push(pathEntry[1])
      }
      continue
    }

    if (section === 'concurrency') {
      const setting = line.match(/^ {2}(group|cancel-in-progress|queue):\s*(.*)$/)
      if (setting) parsed.concurrency[setting[1]] = unquote(setting[2])
      continue
    }

    if (section === 'permissions') {
      const grant = line.match(/^ {2}([a-z-]+):\s*(.*)$/)
      if (grant) {
        parsed.permissions[grant[1]] = unquote(grant[2])
      }
      continue
    }

    if (section !== 'jobs') {
      continue
    }

    const jobId = line.match(/^ {2}([a-z0-9-]+):$/)
    if (jobId) {
      job = jobId[1]
      jobPermissions = false
      jobConcurrency = false
      step = null
      parsed.jobs[job] = {
        name: undefined,
        needs: [],
        toolchain: {},
        if: undefined,
        continueOnError: undefined,
        permissions: {},
        concurrency: {}
      }
      continue
    }
    if (job === null) {
      continue
    }

    // 缩进 4 的键结束上一个 job 级块；只有 permissions 需要收条目，其余（env/outputs/strategy）落回下面的字段处理。
    if (/^ {4}\S/.test(line)) {
      jobPermissions = line === '    permissions:'
      jobConcurrency = line === '    concurrency:'
    }

    if (jobConcurrency) {
      const setting = line.match(/^ {6}(group|cancel-in-progress|queue):\s*(.*)$/)
      if (setting) parsed.jobs[job].concurrency[setting[1]] = unquote(setting[2])
      continue
    }

    if (jobPermissions) {
      const grant = line.match(/^ {6}([a-z-]+):\s*(.*)$/)
      if (grant) {
        parsed.jobs[job].permissions[grant[1]] = unquote(grant[2])
      }
      continue
    }

    const jobField = line.match(/^ {4}(name|needs|if|continue-on-error):\s*(.*)$/)
    if (jobField) {
      const [, field, raw] = jobField
      const value = unquote(raw)
      const parsedField = field === 'continue-on-error' ? 'continueOnError' : field

      if (field === 'needs') {
        parsed.jobs[job].needs = value
          .replace(/^\[|\]$/g, '')
          .split(',')
          .map(entry => unquote(entry.trim()))
          .filter(Boolean)
      } else {
        parsed.jobs[job][parsedField] = value
      }
      continue
    }

    // step id 单独收一份：守卫表达式引用的是 id 而不是 step 名，所以 `- id:` 与缩进 8 的 `id:` 两种
    // 形状都要进表 —— 否则把 `id: test` 改掉只会让 `steps.test.outcome` 恒假，红不了。
    const declaredId = line.match(/^ {6}- id:\s*(.*)$/) ?? line.match(/^ {8}id:\s*(.*)$/)
    if (declaredId) {
      parsed.stepIds.push(unquote(declaredId[1]))
    }

    const stepStart = line.match(/^ {6}- (?:name|uses):\s*(.*)$/)
    if (/^ {6}- /.test(line)) {
      // 本地 action（`./.github/actions/...`）与 `- id:` 开头的步骤没有可用的 step 名，置空：
      // 否则它下面缩进 8 的 `if:` 会被挂到上一个具名步骤上，把「没有守卫」读成「守卫属于别人」。
      step = stepStart && !unquote(stepStart[1]).startsWith('.') ? unquote(stepStart[1]) : null
      if (step) {
        parsed.stepJobs[step] = job
      }
      continue
    }

    const stepIf = line.match(/^ {8}if:\s*(.*)$/)
    if (stepIf && step) {
      parsed.steps[step] = unquote(stepIf[1])
      continue
    }

    const stepContinueOnError = line.match(/^ {8}continue-on-error:\s*(.*)$/)
    if (stepContinueOnError && step) {
      parsed.stepContinueOnError[step] = unquote(stepContinueOnError[1])
      continue
    }

    const stepShell = line.match(/^ {8}shell:\s*(.*)$/)
    if (stepShell && step) {
      parsed.stepShells[step] = unquote(stepShell[1])
      continue
    }

    const toolchainInput = line.match(/^ {10}(mise-install|skip-install|wails|go-cache):\s*'(.*)'$/)
    if (toolchainInput) {
      // 键名按 YAML 原样存（`mise-install` 而不是 `miseInstall`）：任何改名式映射都是这张表与
      // setup-deps 入参之间多出来的一层漂移面。
      parsed.jobs[job].toolchain[toolchainInput[1]] = toolchainInput[2]
    }
  }

  return parsed
}
