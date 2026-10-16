/**
 * 生成失败一律抛这个错误：`scripts/generate-web-ui-examples.mjs` 把它转成「一句原因 + 非零退出」。
 * 不静默补默认值，也不让表格里空着的一格或多出来的一节悄悄过去，这是本引擎存在的理由。
 */
export class DocError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DocError'
  }
}

export function fail(message: string): never {
  throw new DocError(message)
}
