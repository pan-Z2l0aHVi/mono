import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { it } from 'vite-plus/test'

import { defineShellI18nCatalog, parsePo } from '../shell-i18n-catalog'

// 语种与 PO 目录是消费方的事实，测试自带一份；两端应用的真实取值写在各自的 `catalog.spec.ts`。
const shellI18nCatalog = defineShellI18nCatalog({
  locales: { source: 'zh-CN', targets: ['en'] },
  directory: 'src/locales'
})

const header = 'msgid ""\nmsgstr ""\n"Language: en\\n"\n"Plural-Forms: nplurals=2; plural=(n != 1);\\n"\n\n'

function entry(msgid: string, msgstr: string): string {
  return `#: src/a.tsx\nmsgid ${JSON.stringify(msgid)}\nmsgstr ${JSON.stringify(msgstr)}\n\n`
}

function pluralEntry(msgid: string, plural: string, translations: readonly string[]): string {
  return `#: src/a.tsx\nmsgid ${JSON.stringify(msgid)}\nmsgid_plural ${JSON.stringify(plural)}\n${translations
    .map((translation, index) => `msgstr[${index}] ${JSON.stringify(translation)}`)
    .join('\n')}\n\n`
}

// parsePo 是门禁唯一的读取路径：它读漏一条，空译文就永远判不出来。
it('parsePo reads msgid and msgstr pairs', async () => {
  const parsed = parsePo(
    `${header}${entry('已复制', 'Copied')}${entry('重试', '')}${entry('多行', 'line one\nline two')}`
  )
  assert.equal(parsed.entries.get('已复制'), 'Copied')
  assert.equal(parsed.entries.get('重试'), '')
  assert.equal(parsed.entries.get('多行'), 'line one\nline two')
  assert.equal(parsed.entries.has(''), false, 'PO header must not count as a message')
  assert.deepEqual(parsed.obsolete, [])
})

// `#~` 块是「代码里已经没有了」的条目，它必须单独报出来，不能混进正常文案数里。
it('parsePo reports obsolete entries', async () => {
  const parsed = parsePo(`${header}${entry('留着', 'Kept')}#~ msgid "废弃"\n#~ msgstr "Dropped"\n\n`)
  assert.equal(parsed.entries.get('留着'), 'Kept')
  assert.deepEqual(parsed.obsolete, ['废弃'])
})

// 复数条目中的 msgid_plural 属于同一条；msgstr[n] 各自保留，不能把空表单与非空表单拼成一条。
it('parsePo keeps every plural msgstr form', async () => {
  const parsed = parsePo(`${header}${pluralEntry('文件', '多个文件', ['File', 'Files'])}`)
  assert.deepEqual(parsed.entries.get('文件'), ['File', 'Files'])
  assert.equal(parsed.pluralCount, 2)
  assert.deepEqual(parsePo(`${header}${pluralEntry('文件', '多个文件', ['', 'Files'])}`).entries.get('文件'), [
    '',
    'Files'
  ])
})

// 目标语种必须填满 header 声明的每个复数表单。
it('target locale must fill every plural form', async () => {
  const root = fixture([])
  const locales = path.join(root, 'apps', 'react-web-ui-demo', 'src', 'locales')
  fs.writeFileSync(path.join(locales, 'zh-CN.po'), `${header}${pluralEntry('文件', '多个文件', ['文件', '多个文件'])}`)
  fs.writeFileSync(path.join(locales, 'en.po'), `${header}${pluralEntry('文件', '多个文件', ['File', ''])}`)
  try {
    await assert.rejects(() => shellI18nCatalog.run({ root, app: 'apps/react-web-ui-demo' }), /空译文/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

function fixture(messages: readonly (readonly [string, string?])[], app = 'react-web-ui-demo'): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shell-i18n-fixture-'))
  const locales = path.join(root, 'apps', app, 'src', 'locales')
  fs.mkdirSync(locales, { recursive: true })
  const zh = `${header}${messages.map(([zhText]) => entry(zhText, zhText)).join('')}`
  const en = `${header}${messages.map(([zhText, enText]) => entry(zhText, enText ?? '')).join('')}`
  fs.writeFileSync(path.join(locales, 'zh-CN.po'), zh)
  fs.writeFileSync(path.join(locales, 'en.po'), en)
  return root
}

// 空 msgstr 是这条门禁存在的首要理由：英文站会静默退回中文。
it('empty msgstr fails the check', async () => {
  const root = fixture([['已复制', '']])
  try {
    await assert.rejects(() => shellI18nCatalog.run({ root, app: 'apps/react-web-ui-demo' }), /空译文/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

// 源语料有、译文没有：英文运行时按 msgid 回落，同样静默。
it('missing translation fails the check', async () => {
  const root = fixture([['已复制', 'Copied']])
  const enFile = path.join(root, 'apps', 'react-web-ui-demo', 'src', 'locales', 'en.po')
  fs.writeFileSync(enFile, `${header}${entry('别的', 'Other')}`)
  try {
    await assert.rejects(() => shellI18nCatalog.run({ root, app: 'apps/react-web-ui-demo' }), /缺 1 条译文/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

// Vue 使用同一空译文判据，不能只在聚合输出中列出名字。
it('vue app uses the same empty-translation rule', async () => {
  const root = fixture([['复制代码', '']], 'vue-web-ui-demo')
  try {
    await assert.rejects(() => shellI18nCatalog.run({ root, app: 'apps/vue-web-ui-demo' }), /空译文/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

// options 是消费方的事实：换一组语种与目录，判据跟着变，不会回头读本仓的 `src/locales`。
it('options drive locales and the PO directory', async () => {
  const root = fixture([['已复制', 'Copied']])
  const directory = path.join(root, 'apps', 'react-web-ui-demo', 'i18n', 'messages')
  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(path.join(directory, 'zh-CN.po'), `${header}${entry('已复制', '已复制')}`)
  fs.writeFileSync(path.join(directory, 'ja.po'), `${header}${entry('已复制', '')}`)
  const check = defineShellI18nCatalog({
    locales: { source: 'zh-CN', targets: ['ja'] },
    directory: 'i18n/messages'
  })
  try {
    await assert.rejects(check.run({ root, app: 'apps/react-web-ui-demo' }), /ja 语料有 1 条空译文/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
