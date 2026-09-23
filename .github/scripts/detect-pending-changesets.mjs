// 用法: node .github/scripts/detect-pending-changesets.mjs <changeset-status.json 路径>
import { appendFile, readFile } from 'node:fs/promises'

const status = JSON.parse(await readFile(process.argv[2], 'utf8'))
const hasChangesets = (status.releases ?? []).length > 0

await appendFile(process.env.GITHUB_OUTPUT, `has-changesets=${hasChangesets}\n`)
