// CI 拓扑的唯一声明处。workflow 文件不能被 import，所以这张表的强制方式是「被测试比对」：
// scripts/ci-topology.test.mjs 用下面的 parseWorkflow 读真实 YAML，逐字段与表核对，任一漂移即失败。
// 表里记的是会让发布行为改变的事实（触发面、必需 context、job 依赖、分支常量、声明的安装面、权限提级），
// 不复制 YAML 里那些改动无害的字段（timeout、cache key、step 命令）。
//
// 为什么自己扫 YAML 而不是加解析器：仓库根解析不到 `yaml` / `js-yaml`，为一个拓扑断言引入依赖是
// 比这张表更重的决策；本仓 workflow 只用顶格 section + 固定缩进这一小撮形状，parseWorkflow 的每条正则
// 都对应其中一种 —— YAML 一旦改用别的形状（多行 `branches:`、step 名写在 `id:` 之后），表现是测试红，
// 不是静默漏检。

export const RELEASE_BRANCH = 'changeset-release/main'

// main 保护规则集唯一要求的上下文名；它必须保持单个 job 名，拆多个 context 会让 ruleset 与
// 「PR head 的树等于合并后 main 的树」这条 squash-only 保证变复杂。
export const REQUIRED_CONTEXT = 'check'

const mergedIntoReleaseBranch = `github.event.pull_request.merged == true && github.event.pull_request.head.ref == '${RELEASE_BRANCH}'`

export const workflows = {
  'ci.yml': {
    name: 'CI',
    // 没有 push 触发：squash-only + strict required status 已经保证 PR head 的树就是合并后 main 的树，
    // trunk 复检要按需做就用 workflow_dispatch。
    triggers: [{ on: 'pull_request', branches: ['main'] }, { on: 'workflow_dispatch' }],
    permissions: { contents: 'read' },
    jobs: {
      check: {
        needs: [],
        toolchain: { wails: 'true' },
        requiredContext: true
      }
    },
    // 版本 PR 自己不带 pending changeset（它删掉的就是 changeset），所以那一步只在非版本分支上跑。
    steps: {
      'Check changesets': `github.event_name == 'pull_request' && github.head_ref != '${RELEASE_BRANCH}'`
    }
  },
  'changeset-version.yml': {
    name: 'Create Version PR',
    triggers: [{ on: 'push', branches: ['main'] }],
    permissions: { contents: 'write', 'pull-requests': 'write' },
    jobs: {
      version: {
        name: 'Create or update version pull request',
        needs: [],
        // 收窄的安装面是刻意的：这个 job 的 version-script 会跑 interweave 的 sync:version，
        // 而它现在必须是纯 node（见 scripts/version-sync.test.mjs）。
        toolchain: { 'mise-install': 'node pnpm' }
      }
    },
    // changesets/action 这一步只在有 pending changeset 时才跑，main 上因此不会长出空版本 PR。
    steps: {
      'Create or update version pull request': "steps.changesets.outputs.has-changesets == 'true'"
    }
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
          'packages/js-kit/**'
        ]
      },
      { on: 'workflow_dispatch' }
    ],
    permissions: { contents: 'read' },
    jobs: {
      metadata: {
        name: 'Validate Wails metadata',
        needs: [],
        toolchain: { 'mise-install': 'node', 'skip-install': 'true' }
      },
      build: {
        name: '${{ matrix.name }}',
        needs: ['metadata'],
        toolchain: {}
      }
    },
    steps: {}
  },
  'wails-release.yml': {
    name: 'Release Wails Desktop',
    triggers: [{ on: 'pull_request', branches: ['main'], types: ['closed'], paths: ['apps/interweave/**'] }],
    permissions: { contents: 'read' },
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
        toolchain: {},
        if: "needs.prepare.outputs.should-release == 'true'"
      },
      publish: {
        name: 'Publish desktop release',
        needs: ['prepare', 'build'],
        toolchain: {},
        if: "needs.prepare.outputs.should-release == 'true'",
        // workflow 级保持 read，写权限只提级到真正创建 GitHub Release 的这个 job。
        permissions: { contents: 'write' }
      }
    },
    steps: {}
  },
  'npm-publish.yml': {
    name: 'Publish npm Packages',
    triggers: [{ on: 'pull_request', branches: ['main'], types: ['closed'], paths: ['packages/**'] }],
    permissions: { contents: 'read', 'id-token': 'write' },
    jobs: {
      prepare: {
        name: 'Detect public package release',
        needs: [],
        toolchain: {},
        if: mergedIntoReleaseBranch
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
        toolchain: {},
        if: "needs.prepare.outputs.should-publish == 'true'",
        permissions: { contents: 'write' }
      }
    },
    steps: {}
  },
  'deploy-pages.yml': {
    name: 'Deploy to GitHub Pages',
    triggers: [{ on: 'workflow_dispatch' }],
    permissions: { contents: 'read', pages: 'write', 'id-token': 'write' },
    jobs: {
      // 仍然只有一个 job：Pages 部署只要 JavaScript 工具链，拆成 build + deploy 会把 artifact 在两个
      // runner 之间搬一遍，而这里没有需要分开的第二套工具链。
      deploy: {
        needs: [],
        toolchain: { 'mise-install': 'node pnpm' }
      }
    },
    steps: {}
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
// （缩进 10）、缩进 8 的 step `if:`。run 块里的内容缩进更深或不以 `- `/`key:` 开头，不会误判。
export function parseWorkflow(text) {
  const lines = text.split(/\r?\n/)
  const parsed = { name: '', triggers: [], permissions: {}, jobs: {}, steps: {} }
  let section = null
  let trigger = null
  let triggerPaths = false
  let job = null
  let jobPermissions = false
  let step = null

  for (const line of lines) {
    const top = line.match(/^([A-Za-z-]+):(?:\s*(.*))?$/)
    if (top) {
      section = ['on', 'jobs', 'permissions'].includes(top[1]) ? top[1] : null
      trigger = null
      triggerPaths = false
      job = null
      jobPermissions = false
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
      step = null
      parsed.jobs[job] = { name: undefined, needs: [], toolchain: {}, if: undefined, permissions: {} }
      continue
    }
    if (job === null) {
      continue
    }

    // 缩进 4 的键结束上一个 job 级块；只有 permissions 需要收条目，其余（env/outputs/strategy）落回下面的字段处理。
    if (/^ {4}\S/.test(line)) {
      jobPermissions = line === '    permissions:'
    }

    if (jobPermissions) {
      const grant = line.match(/^ {6}([a-z-]+):\s*(.*)$/)
      if (grant) {
        parsed.jobs[job].permissions[grant[1]] = unquote(grant[2])
      }
      continue
    }

    const jobField = line.match(/^ {4}(name|needs|if):\s*(.*)$/)
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
        parsed.jobs[job][field] = value
      }
      continue
    }

    const stepStart = line.match(/^ {6}- (?:name|uses):\s*(.*)$/)
    if (/^ {6}- /.test(line)) {
      // 本地 action（`./.github/actions/...`）与 `- id:` 开头的步骤没有可用的 step 名，置空：
      // 否则它下面缩进 8 的 `if:` 会被挂到上一个具名步骤上，把「没有守卫」读成「守卫属于别人」。
      step = stepStart && !unquote(stepStart[1]).startsWith('.') ? unquote(stepStart[1]) : null
      continue
    }

    const stepIf = line.match(/^ {8}if:\s*(.*)$/)
    if (stepIf && step) {
      parsed.steps[step] = unquote(stepIf[1])
      continue
    }

    const toolchainInput = line.match(/^ {10}(mise-install|skip-install|wails):\s*'(.*)'$/)
    if (toolchainInput) {
      // 键名按 YAML 原样存（`mise-install` 而不是 `miseInstall`）：任何改名式映射都是这张表与
      // setup-deps 入参之间多出来的一层漂移面。
      parsed.jobs[job].toolchain[toolchainInput[1]] = toolchainInput[2]
    }
  }

  return parsed
}
