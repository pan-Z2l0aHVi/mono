import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { exec, pnpm } from './exec.mjs'

// React demo 的壳文案走 wuchale：中文是源语种，英文是 PO 里的译文。构建期的 wuchale 插件只按已有
// PO 编译，不抽取新文案，所以「代码加了中文却没进语料」和「英文 msgstr 还空着」这两类静默降级
// 必须在这里判掉——否则英文站的壳会退回显示中文，而没有任何东西变红。
export const name = 'shell-i18n-catalog'

const APP_DIR = path.join('apps', 'react-web-ui-demo')
const SOURCE_LOCALE = 'zh-CN'
const TARGET_LOCALES = ['en']

/** PO 的转义与 JSON 字符串兼容（`\n`、`\"`、`\\`、`\t`），所以字面量直接交给 JSON.parse。 */
function poString(literal) {
  return JSON.parse(literal.trim())
}

/**
 * 只解析这份门禁需要的部分：`msgid` → `msgstr` 的配对，以及 `#~` 开头的废弃条目。
 * 复数条目保留每个 `msgstr[n]`，按 header 里的 `nplurals` 校验所有必需的译文。
 */
export function parsePo(text) {
  const entries = new Map()
  const obsolete = []
  const pluralCount = Number(text.match(/Plural-Forms:\s*nplurals\s*=\s*(\d+)/)?.[1] ?? 1)
  let current = null
  let field = null
  let pluralIndex = null
  let isObsolete = false

  const close = () => {
    if (current && current.msgid !== '' && !isObsolete) {
      const isPlural = current.msgidPlural !== '' || current.pluralForms.size > 0
      if (isPlural) {
        const highestIndex = Math.max(-1, ...current.pluralForms.keys())
        entries.set(
          current.msgid,
          Array.from({ length: highestIndex + 1 }, (_, index) => current.pluralForms.get(index) ?? '')
        )
      } else {
        entries.set(current.msgid, current.msgstr)
      }
    }
    if (current && current.msgid !== '' && isObsolete) obsolete.push(current.msgid)
    current = null
    field = null
    pluralIndex = null
  }

  const newEntry = () => ({ msgid: '', msgidPlural: '', msgstr: '', pluralForms: new Map() })

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trimEnd()
    if (line === '') {
      close()
      continue
    }
    const obsoleteLine = line.startsWith('#~')
    const body = obsoleteLine ? line.slice(2).trimStart() : line
    if (!obsoleteLine && body.startsWith('#')) continue

    const quoted = body.match(/"(.*)"\s*$/)
    if (quoted) {
      const head = body.slice(0, body.length - quoted[0].length).trim()
      if (head === 'msgid') {
        if (current && current.msgid !== '') close()
        current ??= newEntry()
        isObsolete = obsoleteLine
        field = 'msgid'
        current.msgid += poString(quoted[0])
        continue
      }
      if (head === 'msgid_plural') {
        current ??= newEntry()
        isObsolete = obsoleteLine
        field = 'msgidPlural'
        current.msgidPlural += poString(quoted[0])
        continue
      }
      if (head === 'msgstr') {
        current ??= newEntry()
        isObsolete = obsoleteLine
        field = 'msgstr'
        current.msgstr += poString(quoted[0])
        continue
      }
      const pluralMatch = head.match(/^msgstr\[(\d+)\]$/)
      if (pluralMatch) {
        current ??= newEntry()
        isObsolete = obsoleteLine
        field = 'pluralForm'
        pluralIndex = Number(pluralMatch[1])
        current.pluralForms.set(pluralIndex, (current.pluralForms.get(pluralIndex) ?? '') + poString(quoted[0]))
        continue
      }
      if (field && current) {
        const value = poString(quoted[0])
        if (field === 'pluralForm' && pluralIndex !== null) {
          current.pluralForms.set(pluralIndex, (current.pluralForms.get(pluralIndex) ?? '') + value)
        } else {
          current[field] += value
        }
        continue
      }
    }
    if (body.startsWith('msgctxt')) {
      if (current) close()
      current = newEntry()
      isObsolete = obsoleteLine
      field = null
    }
  }
  close()
  return { entries, obsolete, pluralCount }
}

function poFile(appDir, locale) {
  return path.join(appDir, 'src', 'locales', `${locale}.po`)
}

function readPo(appDir, locale) {
  const file = poFile(appDir, locale)
  if (!fs.existsSync(file)) throw new Error(`${file} 不存在：壳文案的 ${locale} 语料缺失`)
  return parsePo(fs.readFileSync(file, 'utf8'))
}

/**
 * 把 app 自己的 `wuchale.config.js` 改写到临时目录：语种目录、PO 落点与文件通配全部换成绝对路径。
 * CLI 的通配相对**配置文件所在目录**解析，所以不改写的话抽取到的是空集合，门禁会假绿。
 * 配置文件写成源码而不是序列化对象：`storage` 是工厂函数，序列不了。
 */
function extractionConfigSource(appDir, outDir) {
  const q = value => JSON.stringify(value)
  return `import base from ${q(path.join(appDir, 'wuchale.config.js'))}
import { pofile } from ${q(path.join(appDir, 'node_modules', 'wuchale', 'dist', 'index.js'))}

const out = ${q(outDir)}
const absolutize = glob => glob.startsWith('/') || /^[A-Za-z]:[\\\\/]/.test(glob) ? glob : ${q(appDir)} + '/' + glob.replace(/^\\.\\//, '')
const adapter = base.adapters.main
const list = value => (value === undefined ? [] : [value].flat())

export default {
  ...base,
  localesDir: out,
  adapters: {
    main: {
      ...adapter,
      files: { include: list(adapter.files.include).map(absolutize), ignore: list(adapter.files.ignore).map(absolutize) },
      storage: pofile({ location: out + '/{locale}.po' })
    }
  },
  ai: null
}
`
}

export async function run({ root }) {
  const appDir = path.join(root, APP_DIR)
  if (!fs.existsSync(appDir)) throw new Error(`${APP_DIR} 不存在`)

  const source = readPo(appDir, SOURCE_LOCALE)
  const obsolete = [...source.obsolete]
  for (const locale of TARGET_LOCALES) {
    const target = readPo(appDir, locale)
    obsolete.push(...target.obsolete)
    const missing = [...source.entries.keys()].filter(id => !target.entries.has(id))
    const extra = [...target.entries.keys()].filter(id => !source.entries.has(id))
    if (missing.length) {
      throw new Error(`${locale} 语料缺 ${missing.length} 条译文：${missing.map(id => `"${id}"`).join('、')}`)
    }
    const empty = [...target.entries]
      .filter(([, translations]) =>
        Array.isArray(translations)
          ? translations.length !== target.pluralCount || translations.some(value => value.trim() === '')
          : translations.trim() === ''
      )
      .map(([msgid]) => msgid)
    if (empty.length) {
      throw new Error(`${locale} 语料有 ${empty.length} 条空译文：${empty.map(id => `"${id}"`).join('、')}`)
    }
    if (extra.length) {
      throw new Error(`${locale} 语料混入了源语料没有的文案：${extra.map(id => `"${id}"`).join('、')}`)
    }
  }
  if (obsolete.length) {
    throw new Error(`语料里有 ${obsolete.length} 条废弃（#~）文案，跑一次 wuchale --clean 清掉：${obsolete.join('、')}`)
  }

  // 抽取一次到临时目录：PO 是代码里那批中文的判据，只有重新抽取才知道代码现在到底有哪些文案。
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shell-i18n-'))
  try {
    const outDir = path.join(tempDir, 'locales')
    fs.mkdirSync(outDir, { recursive: true })
    for (const locale of [SOURCE_LOCALE, ...TARGET_LOCALES]) {
      fs.copyFileSync(poFile(appDir, locale), path.join(outDir, `${locale}.po`))
    }
    const configFile = path.join(tempDir, 'wuchale.check.config.mjs')
    fs.writeFileSync(configFile, extractionConfigSource(appDir, outDir), 'utf8')

    const result = exec(pnpm, ['exec', 'wuchale', '--config', configFile, '--clean'], { cwd: appDir })
    if (!result.ok) {
      throw new Error(`wuchale 抽取失败（exit ${result.status}）：${result.stderr.trim() || result.stdout.trim()}`)
    }
    const fresh = parsePo(fs.readFileSync(path.join(outDir, `${SOURCE_LOCALE}.po`), 'utf8'))
    const freshIds = [...fresh.entries.keys()]
    const committedIds = [...source.entries.keys()]
    const notExtracted = freshIds.filter(id => !source.entries.has(id))
    const stale = committedIds.filter(id => !fresh.entries.has(id))
    if (notExtracted.length) {
      throw new Error(
        `代码里有 ${notExtracted.length} 条中文没进语料，跑一次 wuchale 抽取：${notExtracted.map(id => `"${id}"`).join('、')}`
      )
    }
    if (stale.length) {
      throw new Error(`语料里有 ${stale.length} 条代码已经不再引用的文案：${stale.map(id => `"${id}"`).join('、')}`)
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }

  return `${source.entries.size} 条壳文案，${TARGET_LOCALES.join('/')} 译文齐全且与代码抽取一致`
}
