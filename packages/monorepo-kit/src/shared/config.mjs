import fs from 'node:fs'

import { errorMessage } from './errors.mjs'

/**
 * 读 JSON 并保留「读不到」与「不是合法 JSON」两种失败原因的区分。
 *
 * 默认返回 `unknown`：形状由调用方按自己读的文件声明，本函数不假装知道所有 JSON 的 schema。
 *
 * @template T
 * @param {string} file
 * @returns {T}
 */
export function readJsonFile(file) {
  let source
  try {
    source = fs.readFileSync(file, 'utf8')
  } catch (error) {
    throw new Error(`cannot read ${file}: ${errorMessage(error)}`)
  }
  try {
    return /** @type {T} */ (JSON.parse(source))
  } catch (error) {
    throw new Error(`cannot parse ${file}: ${errorMessage(error)}`)
  }
}
