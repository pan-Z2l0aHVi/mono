// 读取 JSON 的 version 字段：传文件路径读文件，否则从 stdin 读。供 wails-release 解析 package.json 版本。
// 用法:
//   node .github/scripts/read-json-version.mjs ./apps/interweave/package.json
//   git show <sha>:apps/interweave/package.json | node .github/scripts/read-json-version.mjs
import { readFile } from 'node:fs/promises'

const path = process.argv[2]
const data = path
  ? await readFile(path, 'utf8')
  : await new Promise((resolve, reject) => {
      let buffer = ''
      process.stdin.setEncoding('utf8')
      process.stdin.on('data', chunk => {
        buffer += chunk
      })
      process.stdin.on('end', () => resolve(buffer))
      process.stdin.on('error', reject)
    })

console.log(JSON.parse(data).version)
