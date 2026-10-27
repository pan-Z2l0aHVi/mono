import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { checkApp, parsePo } from './shell-i18n-catalog.mjs'

const header = 'msgid ""\nmsgstr ""\n"Language: en\\n"\n"Plural-Forms: nplurals=2; plural=(n != 1);\\n"\n\n'

function entry(msgid, msgstr) {
  return `#: src/a.tsx\nmsgid ${JSON.stringify(msgid)}\nmsgstr ${JSON.stringify(msgstr)}\n\n`
}

function pluralEntry(msgid, plural, translations) {
  return `#: src/a.tsx\nmsgid ${JSON.stringify(msgid)}\nmsgid_plural ${JSON.stringify(plural)}\n${translations
    .map((translation, index) => `msgstr[${index}] ${JSON.stringify(translation)}`)
    .join('\n')}\n\n`
}

// parsePo 是门禁唯一的读取路径：它读漏一条，空译文就永远判不出来。
{
  const parsed = parsePo(
    `${header}${entry('已复制', 'Copied')}${entry('重试', '')}${entry('多行', 'line one\nline two')}`
  )
  assert.equal(parsed.entries.get('已复制'), 'Copied')
  assert.equal(parsed.entries.get('重试'), '')
  assert.equal(parsed.entries.get('多行'), 'line one\nline two')
  assert.equal(parsed.entries.has(''), false, 'PO header must not count as a message')
  assert.deepEqual(parsed.obsolete, [])
}

// `#~` 块是「代码里已经没有了」的条目，它必须单独报出来，不能混进正常文案数里。
{
  const parsed = parsePo(`${header}${entry('留着', 'Kept')}#~ msgid "废弃"\n#~ msgstr "Dropped"\n\n`)
  assert.equal(parsed.entries.get('留着'), 'Kept')
  assert.deepEqual(parsed.obsolete, ['废弃'])
}

// 复数条目中的 msgid_plural 属于同一条；msgstr[n] 各自保留，不能把空表单与非空表单拼成一条。
{
  const parsed = parsePo(`${header}${pluralEntry('文件', '多个文件', ['File', 'Files'])}`)
  assert.deepEqual(parsed.entries.get('文件'), ['File', 'Files'])
  assert.equal(parsed.pluralCount, 2)
  assert.deepEqual(parsePo(`${header}${pluralEntry('文件', '多个文件', ['', 'Files'])}`).entries.get('文件'), [
    '',
    'Files'
  ])
}

// 目标语种必须填满 header 声明的每个复数表单。
{
  const root = fixture([])
  const locales = path.join(root, 'apps', 'react-web-ui-demo', 'src', 'locales')
  fs.writeFileSync(path.join(locales, 'zh-CN.po'), `${header}${pluralEntry('文件', '多个文件', ['文件', '多个文件'])}`)
  fs.writeFileSync(path.join(locales, 'en.po'), `${header}${pluralEntry('文件', '多个文件', ['File', ''])}`)
  try {
    await assert.rejects(() => checkApp({ root, app: 'apps/react-web-ui-demo' }), /空译文/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

function fixture(messages, app = 'react-web-ui-demo') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shell-i18n-fixture-'))
  const locales = path.join(root, 'apps', app, 'src', 'locales')
  fs.mkdirSync(locales, { recursive: true })
  const zh = `${header}${messages.map(([zhText]) => entry(zhText, zhText)).join('')}`
  const en = `${header}${messages.map(([zhText, enText]) => entry(zhText, enText)).join('')}`
  fs.writeFileSync(path.join(locales, 'zh-CN.po'), zh)
  fs.writeFileSync(path.join(locales, 'en.po'), en)
  return root
}

// 空 msgstr 是这条门禁存在的首要理由：英文站会静默退回中文。
{
  const root = fixture([['已复制', '']])
  try {
    await assert.rejects(() => checkApp({ root, app: 'apps/react-web-ui-demo' }), /空译文/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

// 源语料有、译文没有：英文运行时按 msgid 回落，同样静默。
{
  const root = fixture([['已复制', 'Copied']])
  const enFile = path.join(root, 'apps', 'react-web-ui-demo', 'src', 'locales', 'en.po')
  fs.writeFileSync(enFile, `${header}${entry('别的', 'Other')}`)
  try {
    await assert.rejects(() => checkApp({ root, app: 'apps/react-web-ui-demo' }), /缺 1 条译文/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

// Vue 使用同一空译文判据，不能只在聚合输出中列出名字。
{
  const root = fixture([['复制代码', '']], 'vue-web-ui-demo')
  try {
    await assert.rejects(() => checkApp({ root, app: 'apps/vue-web-ui-demo' }), /空译文/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

process.stdout.write('shell-i18n-catalog tests passed\n')
