import assert from 'node:assert/strict'

import { isUnqualifiedRelativeTarget, parseLocalLinkTarget, stripCodeSegments } from './context-invariants.mjs'

try {
  // 远程与协议链接不判定可触达性：离线无法验证，域名失效也不是本仓漂移。
  for (const remote of [
    'https://example.com/dead',
    'http://example.com',
    'mailto:someone@example.com',
    'tel:+8610000',
    'vscode:extension/foo'
  ])
    assert.equal(parseLocalLinkTarget(remote), null, remote)

  // 纯锚点与纯 query 都指向本文件本身，没有文件可达性问题。
  assert.equal(parseLocalLinkTarget('#怎么取得这个授权'), null)
  assert.equal(parseLocalLinkTarget('?raw'), null)
  assert.equal(parseLocalLinkTarget('   '), null)

  // 相对路径按当前文件所在目录解析，因此裸文件名必须原样交给调用方去解析成兄弟目录里的文件。
  assert.deepEqual(parseLocalLinkTarget('./workflow.md'), { location: './workflow.md', fragment: '' })
  assert.deepEqual(parseLocalLinkTarget('workflow.md'), { location: 'workflow.md', fragment: '' })
  assert.deepEqual(parseLocalLinkTarget('../adr/0001-ci-pipeline.md'), {
    location: '../adr/0001-ci-pipeline.md',
    fragment: ''
  })

  // 锚点与 query 都要剥出来：`file.md?raw#x` 在文件系统上不是路径。
  assert.deepEqual(parseLocalLinkTarget('./workflow.md#怎么取得这个授权'), {
    location: './workflow.md',
    fragment: '怎么取得这个授权'
  })
  assert.deepEqual(parseLocalLinkTarget('./schema.json?raw'), { location: './schema.json', fragment: '' })
  assert.deepEqual(parseLocalLinkTarget('./schema.json?raw#top'), { location: './schema.json', fragment: 'top' })

  // 尖括号包裹的形式用于带空格的路径。
  assert.deepEqual(parseLocalLinkTarget('<./my doc.md>'), { location: './my doc.md', fragment: '' })

  // title 不是路径的一部分：`[x](./a.md "标题")` 是合法链接，截到 destination 为止。
  assert.deepEqual(parseLocalLinkTarget('./a.md "标题"'), { location: './a.md', fragment: '' })
  assert.deepEqual(parseLocalLinkTarget("./a.md 'title'"), { location: './a.md', fragment: '' })
  assert.deepEqual(parseLocalLinkTarget('./a.md#top "title"'), { location: './a.md', fragment: 'top' })
  assert.deepEqual(parseLocalLinkTarget('<./my doc.md> (title)'), { location: './my doc.md', fragment: '' })

  // 非根文档的 target 必须以 `./`/`../` 起头；`.` 与 `..` 本身已是显式相对写法，绝对路径另有判据。
  assert.equal(isUnqualifiedRelativeTarget('./a.md'), false)
  assert.equal(isUnqualifiedRelativeTarget('../a.md'), false)
  assert.equal(isUnqualifiedRelativeTarget('.'), false)
  assert.equal(isUnqualifiedRelativeTarget('..'), false)
  assert.equal(isUnqualifiedRelativeTarget('/abs/a.md'), false)
  assert.equal(isUnqualifiedRelativeTarget('a.md'), true)
  assert.equal(isUnqualifiedRelativeTarget('docs/a.md'), true)
  assert.equal(isUnqualifiedRelativeTarget('?raw'), true)

  // 代码片段里的 `[...](...)` 不是链接：正则字面量常长成这样。
  assert.equal(
    stripCodeSegments('见 `/[?&](?:worker|raw)\b/` 排除清单').includes('](?:worker'),
    false,
    'inline code must be stripped'
  )
  assert.equal(
    stripCodeSegments('```js\nconst x = [/[?&](?:raw)/]\n```\n[real](./a.md)').includes('](?:raw)'),
    false,
    'fenced code must be stripped'
  )
  assert.equal(
    stripCodeSegments('```js\n[a](./dead.md)\n```\n[real](./a.md)').includes('./dead.md'),
    false,
    'links inside fences must not be scanned'
  )
  assert.equal(stripCodeSegments('[real](./a.md)').includes('](./a.md)'), true, 'real links must survive')

  // ~~~ 围栏与 ``` 同等对待，混用字符时不能互相提前闭合。
  assert.equal(
    stripCodeSegments('~~~md\n[a](./dead.md)\n~~~\n[real](./a.md)').includes('./dead.md'),
    false,
    'tilde fences must be stripped'
  )
  assert.equal(
    stripCodeSegments('~~~md\n```\n[a](./dead.md)\n~~~\n[real](./a.md)').includes('./dead.md'),
    false,
    'a ``` line must not close a ~~~ fence'
  )
  assert.equal(
    stripCodeSegments('````md\n```\n[a](./dead.md)\n````\n[real](./a.md)').includes('./dead.md'),
    false,
    'a ``` line must not close a four-backtick fence'
  )

  // CommonMark 里未闭合围栏延续到文件尾：后面的行不是正文，不能报成断链。
  assert.equal(
    stripCodeSegments('```md\n[a](./dead.md)\n[still code](./dead2.md)').includes('./dead'),
    false,
    'an unclosed fence runs to EOF'
  )

  // 行内 code 按等长反引号配对：跨单个反引号的写法要整段消失。
  assert.equal(
    stripCodeSegments('``a ` [b](./dead.md)``').includes('./dead.md'),
    false,
    'multi-backtick inline code must be stripped whole'
  )
  assert.equal(
    stripCodeSegments('[real](./a.md) 与 ``x ` y `` 并存').includes('](./a.md)'),
    true,
    'inline code stripping must not eat the surrounding text'
  )

  // 围栏外的行数不能因剥离而变化：锚点与报错按行读取时要能对上。
  assert.equal(stripCodeSegments('a\n```\nb\n```\nc').split('\n').length, 5)

  process.stdout.write('scripts/lib/context-invariants.test.mjs: all assertions passed\n')
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`)
  process.exitCode = 1
}
