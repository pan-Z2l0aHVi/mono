import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

function fail(message) {
  console.error(`PR title check failed: ${message}`)
  process.exitCode = 1
}

const titlePath = process.env.PR_TITLE_PATH
const configPath = process.env.COMMITLINT_CONFIG_PATH
if (!titlePath || !configPath) {
  fail('PR_TITLE_PATH or COMMITLINT_CONFIG_PATH is missing')
} else {
  const title = readFileSync(titlePath, 'utf8')
  if (title.trim().length === 0) {
    fail('the GitHub event payload and API response both returned an empty title')
  } else {
    const { default: commitlintConfig } = await import(pathToFileURL(configPath).href)
    const englishOnlyPlugin = commitlintConfig.plugins?.find(plugin => plugin.rules?.['message-english-only'])
    if (!englishOnlyPlugin) {
      fail('the PR base commitlint.config.js does not define message-english-only')
    } else {
      const [valid, reason] = englishOnlyPlugin.rules['message-english-only']({ header: title, body: '', footer: '' })
      if (!valid) {
        const number = process.env.GITHUB_REF?.match(/^refs\/pull\/(\d+)\/merge$/u)?.[1]
        const command = number ? `gh pr edit ${number}` : 'gh pr edit <PR>'
        fail(
          `${reason.replace('commit message', 'pull request title')}. Update the title with ${command} --title "<English title>"`
        )
      }
    }
  }
}

if (process.exitCode !== 1) console.log(`PR title is English: ${readFileSync(titlePath, 'utf8').trim()}`)
