// 改写已复制到开发版 .app 的 Info.plist。入库的 Info.dev.plist 仍是 Wails
// build asset，只能在它进入构建产物后改 product identifier。
import { readFile, writeFile } from 'node:fs/promises'

const devBundleIdentifier = 'com.greypan.interweave.dev'
const identifierPattern = /(<key>CFBundleIdentifier<\/key>\s*<string>)([^<]*)(<\/string>)/g

function fail(message) {
  throw new Error(`Interweave dev bundle id: ${message}`)
}

function rewriteIdentifier(content, path) {
  const matches = Array.from(content.matchAll(identifierPattern))

  if (matches.length !== 1) {
    fail(`expected exactly one CFBundleIdentifier in ${path}, found ${matches.length}`)
  }

  const match = matches[0]
  const current = match[2]
  if (current.trim().length === 0) {
    fail(`CFBundleIdentifier in ${path} is empty`)
  }

  if (current === devBundleIdentifier) {
    return content
  }

  return `${content.slice(0, match.index)}${match[1]}${devBundleIdentifier}${match[3]}${content.slice(match.index + match[0].length)}`
}

async function main() {
  const [plistPath, ...extraArgs] = process.argv.slice(2)
  if (!plistPath || extraArgs.length > 0) {
    fail('usage: node scripts/set-dev-bundle-id.mjs <Info.plist>')
  }

  const content = await readFile(plistPath, 'utf8')
  const next = rewriteIdentifier(content, plistPath)
  if (next !== content) {
    await writeFile(plistPath, next)
  }
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
