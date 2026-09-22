// 版本同步脚本：以 package.json 为唯一版本源，确保所有 Wails 构建产物版本一致。
//
// 用法：
//   node scripts/sync-version.mjs          # 同步版本到 build/config.yml 与平台产物
//   node scripts/sync-version.mjs --check  # 仅校验（CI 用），不修改文件
//
// 同步链路：package.json → build/config.yml + Info.plist / Info.dev.plist / wails.exe.manifest / info.json
//
// 读判据与写落点共用下面同一张表：否则「校验通过」和「写入完成」各自漂移，而 CI 只看得见前者。
//
// 不再调用 `wails3 update build-assets`：它按内嵌模板整文件重渲染产物，而版本变更只需要替换版本
// token。窄写法保住产物里的非版本内容，也让版本 job 不必装 Go 与桌面工具链——那次 spawn 曾在版本
// PR 路径上因缺系统库以 exit 127 炸掉整个发版链。实测（2026-09-22，装机对临时副本跑一次重新脚手架）：
// 除 `windows/info.json` 外全部字节相同，而它被模板写成 tab 缩进且无结尾换行，`vp check` 判为未格式化
// ——所以旧写法连版本提交自己的格式 gate 都过不了。只有重新脚手架构建产物（改图标、加 file
// association）才需要在装机环境跑 `wails3 task common:update:build-assets`。
//
// CI 调用点：
//   - wails-verify.yml（--check）：PR 阶段校验版本一致性
//   - changeset-version.yml → scripts/release-version.mjs：Changesets 升级 package.json 后写入产物
import { readFile, writeFile } from 'node:fs/promises'

const packagePath = new URL('../package.json', import.meta.url)
const configPath = new URL('../build/config.yml', import.meta.url)

// 每个 `values` 项是一个带单个捕获组的 `dg` 正则：捕获组即版本 token，读用 `match[1]`、写用
// `match.indices[1]`，所以同一项在两个边界里都是精确定位，不需要额外的替换模板。`g` 只为数命中次数。
const generatedVersionFiles = [
  {
    path: new URL('../build/darwin/Info.plist', import.meta.url),
    values: [
      /CFBundleVersion<\/key>\s*<string>([^<]+)<\/string>/dg,
      /CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/dg
    ]
  },
  {
    path: new URL('../build/darwin/Info.dev.plist', import.meta.url),
    values: [
      /CFBundleVersion<\/key>\s*<string>([^<]+)<\/string>/dg,
      /CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/dg
    ]
  },
  {
    path: new URL('../build/windows/wails.exe.manifest', import.meta.url),
    values: [/assemblyIdentity type="win32" name="com\.greypan\.interweave" version="([^"]+)"/dg]
  },
  {
    path: new URL('../build/windows/info.json', import.meta.url),
    values: [/"file_version":\s*"([^"]+)"/dg, /"ProductVersion":\s*"([^"]+)"/dg]
  }
]

const stableVersion = /^\d+\.\d+\.\d+$/

function fail(message) {
  throw new Error(`Wails version sync: ${message}`)
}

function getConfigVersion(config) {
  const lines = config.split(/\r?\n/)
  const infoIndex = lines.findIndex(line => line === 'info:')

  if (infoIndex === -1) {
    fail('missing info section in build/config.yml')
  }

  for (let index = infoIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]

    if (line !== '' && !line.startsWith(' ') && !line.startsWith('#')) {
      break
    }

    const match = line.match(/^(\s*version:\s*)'([^']+)'(\s*#.*)?$/)
    if (match) {
      return { index, version: match[2] }
    }
  }

  fail('missing info.version in build/config.yml')
}

// 每个 site 必须恰好命中一次。多于一次是窄写法新引入的失效面：整文件重渲染会覆盖所有出现处，而
// 「只改第一个」会让第二处永久携带过期版本，读写同源的两端都看不见它。
function findVersionToken(content, pattern, path) {
  const matches = Array.from(content.matchAll(pattern))

  if (matches.length === 0) {
    fail(`no version token matched in ${path.pathname}`)
  }
  if (matches.length > 1) {
    fail(`${path.pathname} matched ${matches.length} version tokens, expected exactly one`)
  }

  return matches[0]
}

async function assertGeneratedVersions(version) {
  for (const file of generatedVersionFiles) {
    const content = await readFile(file.path, 'utf8')

    for (const pattern of file.values) {
      const match = findVersionToken(content, pattern, file.path)

      if (match[1] !== version) {
        fail(`${file.path.pathname} has version ${match[1]}, expected ${version}`)
      }
    }
  }
}

// 逐 site 重新匹配而不是复用旧下标：一次替换会改变后续下标基准，且长度不同的版本（9.9.9 → 10.0.0）
// 会让按原始内容算出的偏移错位。
function replaceVersionToken(content, pattern, version, path) {
  const match = findVersionToken(content, pattern, path)
  const [start, end] = match.indices[1]

  return `${content.slice(0, start)}${version}${content.slice(end)}`
}

async function writeGeneratedVersions(version) {
  for (const file of generatedVersionFiles) {
    const content = await readFile(file.path, 'utf8')
    let next = content

    for (const pattern of file.values) {
      next = replaceVersionToken(next, pattern, version, file.path)
    }

    if (next !== content) {
      await writeFile(file.path, next)
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const checkOnly = args.length === 1 && args[0] === '--check'
  if (!checkOnly && args.length > 0) {
    fail('only --check is supported')
  }

  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'))
  const version = packageJson.version
  if (typeof version !== 'string' || !stableVersion.test(version)) {
    fail('package.json version must be a stable semantic version')
  }

  const config = await readFile(configPath, 'utf8')
  const configVersion = getConfigVersion(config)

  if (checkOnly) {
    if (configVersion.version !== version) {
      fail(`build/config.yml has version ${configVersion.version}, expected ${version}`)
    }
    await assertGeneratedVersions(version)
    return
  }

  if (configVersion.version === version) {
    await assertGeneratedVersions(version)
    return
  }

  const lines = config.split(/\r?\n/)
  lines[configVersion.index] = lines[configVersion.index].replace(configVersion.version, version)
  await writeFile(configPath, lines.join('\n'))

  await writeGeneratedVersions(version)
  await assertGeneratedVersions(version)
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
