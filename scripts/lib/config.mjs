import fs from 'node:fs'

export function readJsonFile(file) {
  let source
  try {
    source = fs.readFileSync(file, 'utf8')
  } catch (error) {
    throw new Error(`cannot read ${file}: ${error.message}`)
  }
  try {
    return JSON.parse(source)
  } catch (error) {
    throw new Error(`cannot parse ${file}: ${error.message}`)
  }
}
