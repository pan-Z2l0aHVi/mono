import { spawnSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const appRoot = fileURLToPath(new URL('..', import.meta.url))
const packagePath = new URL('../package.json', import.meta.url)
const configPath = new URL('../build/config.yml', import.meta.url)

const generatedVersionFiles = [
  {
    path: new URL('../build/darwin/Info.plist', import.meta.url),
    values: [
      /CFBundleVersion<\/key>\s*<string>([^<]+)<\/string>/,
      /CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/
    ]
  },
  {
    path: new URL('../build/darwin/Info.dev.plist', import.meta.url),
    values: [
      /CFBundleVersion<\/key>\s*<string>([^<]+)<\/string>/,
      /CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/
    ]
  },
  {
    path: new URL('../build/windows/wails.exe.manifest', import.meta.url),
    values: [/assemblyIdentity type="win32" name="com.greypan.interweave" version="([^"]+)"/]
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

async function assertGeneratedVersions(version) {
  for (const file of generatedVersionFiles) {
    const content = await readFile(file.path, 'utf8')

    for (const pattern of file.values) {
      const match = content.match(pattern)
      if (!match) {
        fail(`could not read generated version from ${file.path.pathname}`)
      }
      if (match[1] !== version) {
        fail(`${file.path.pathname} has version ${match[1]}, expected ${version}`)
      }
    }
  }

  const windowsInfo = JSON.parse(await readFile(new URL('../build/windows/info.json', import.meta.url), 'utf8'))
  if (windowsInfo.fixed?.file_version !== version || windowsInfo.info?.['0000']?.ProductVersion !== version) {
    fail('build/windows/info.json does not match the Wails application version')
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

  const result = spawnSync('wails3', ['task', 'common:update:build-assets'], {
    cwd: appRoot,
    stdio: 'inherit'
  })

  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }

  await assertGeneratedVersions(version)
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
