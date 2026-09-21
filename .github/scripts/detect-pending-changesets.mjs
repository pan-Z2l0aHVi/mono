// 用法: node .github/scripts/detect-pending-changesets.mjs <changeset-status.json 路径>
import { appendFile, readFile } from 'node:fs/promises'

const status = JSON.parse(await readFile(process.argv[2], 'utf8'))
const releases = status.releases ?? []
const hasChangesets = releases.length > 0
const hasWailsRelease = releases.some(release => release.name === '@greypan/interweave')

await appendFile(process.env.GITHUB_OUTPUT, `has-changesets=${hasChangesets}\nhas-wails-release=${hasWailsRelease}\n`)
