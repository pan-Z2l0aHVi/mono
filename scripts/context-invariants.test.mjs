import assert from 'node:assert/strict'

import {
  AUTHORIZATION_POINTER,
  contentDigest,
  corpusLayer,
  countNonWhitespace,
  findBudgetViolations,
  findMissingAuthorizationPointers,
  findRetiredAdrMarkers,
  findUnmarkedReferenceDocs,
  findUnroutedAgentDocs,
  layerTotals,
  scanVolatilePhrases
} from './lib/context-invariants.mjs'

const entry = (file, source) => ({ file, source })

assert.equal(countNonWhitespace(' 你 好\n\t world '), 7)

assert.deepEqual(findUnroutedAgentDocs('见 docs/agents/build.md', ['docs/agents/build.md', 'docs/agents/review.md']), [
  'docs/agents/review.md'
])
assert.deepEqual(findUnroutedAgentDocs('', ['docs/adr/0001-x.md']), [])

const volatile = scanVolatilePhrases([
  entry('a.md', '当前规则集只要求 check'),
  entry('b.md', '仍未实现'),
  entry('c.md', 'strict 只要求 PR 跟上 base'),
  entry('d.md', '当前 required context 属于远端状态')
])
assert.deepEqual(volatile.map(item => item.file).sort(), ['a.md', 'b.md', 'd.md'])

assert.deepEqual(
  findMissingAuthorizationPointers([
    entry('docs/agents/release.md', '运行 git push 前先确认'),
    entry('docs/agents/workflow.md', 'git push'),
    entry('docs/adr/0025-pr-review-flow.md', 'git push'),
    entry('docs/agents/build.md', `git push；见 ${AUTHORIZATION_POINTER}`),
    entry('docs/agents/review.md', '合并前核对 base/head')
  ]),
  ['docs/agents/release.md']
)

const marked = '<!-- corpus-status: reference -->\n\n# 研究\n\n> 状态：非权威参考（时点性研究）。\n'
assert.deepEqual(
  findUnmarkedReferenceDocs([
    entry('docs/research/marked.md', marked),
    entry('docs/research/missing-comment.md', '# 研究\n\n> 状态：非权威参考\n'),
    entry('docs/research/missing-banner.md', '<!-- corpus-status: reference -->\n\n# 研究\n')
  ]),
  ['docs/research/missing-banner.md', 'docs/research/missing-comment.md']
)

assert.equal(corpusLayer('AGENTS.md'), 'entry')
assert.equal(corpusLayer('apps/demo/AGENTS.md'), 'task-specific')
assert.equal(corpusLayer('CONTEXT.md'), 'project')
assert.equal(corpusLayer('docs/agents/build.md'), 'task-specific')
assert.equal(corpusLayer('.agents/rules/commit.md'), 'task-specific')
assert.equal(corpusLayer('docs/adr/0004-progressive-agent-context-architecture.md'), 'adr')
assert.equal(corpusLayer('docs/research/wails3-spa-routing.md'), null)

const violations = findBudgetViolations(
  [
    entry('AGENTS.md', '123456'),
    entry('CONTEXT.md', '1234'),
    entry('docs/agents/a.md', '123456789012'),
    entry('docs/adr/0001-x.md', '123456')
  ],
  { layers: { entry: 5, project: 10, 'task-specific': 10 }, adrFile: 5 }
)
assert.deepEqual(
  violations.map(item => [item.layer ?? item.file, item.limit]),
  [
    ['entry', 5],
    ['task-specific', 10],
    ['docs/adr/0001-x.md', 5]
  ]
)
assert.deepEqual(findBudgetViolations([entry('CONTEXT.md', 'x')], { layers: {}, adrFile: 1 }), [
  { layer: 'project', size: 1, limit: null }
])

assert.deepEqual(
  [
    ...layerTotals([
      entry('AGENTS.md', '12'),
      entry('CONTEXT.md', '123'),
      entry('ARCHITECTURE.md', '4567'),
      entry('docs/agents/a.md', '89'),
      entry('docs/adr/0001-x.md', 'ignored')
    ])
  ],
  [
    ['entry', 2],
    ['project', 7],
    ['task-specific', 2]
  ]
)

assert.deepEqual(
  findRetiredAdrMarkers([
    entry('docs/adr/0004-x.md', '# x\n\n## 角色实施补充（已废止）\n\nADR-0009 已删除。\n\n本节已废止。\n\n它已删除。'),
    entry('docs/agents/build.md', '已废止')
  ]),
  [
    { file: 'docs/adr/0004-x.md', line: 3, phrase: '已废止' },
    { file: 'docs/adr/0004-x.md', line: 7, phrase: '已废止' }
  ]
)

const digest = contentDigest([entry('AGENTS.md', 'a'), entry('CONTEXT.md', 'b')])
assert.equal(digest, contentDigest([entry('CONTEXT.md', 'b'), entry('AGENTS.md', 'a')]))
assert.notEqual(digest, contentDigest([entry('AGENTS.md', 'a'), entry('CONTEXT.md', 'c')]))

console.log('context-invariants tests passed')
