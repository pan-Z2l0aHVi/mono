import { andThen, err, isOk, ok, to, unwrap, type Result } from '@greypan/js-kit/rust'

function parsePositive(raw: string): Result<number, string> {
  const num = Number(raw)
  if (!Number.isFinite(num) || num <= 0) return err('Expected a positive number')
  return ok(num)
}

const parsed = parsePositive('42')
const doubled = await andThen(parsed, n => ok(n * 2))
const asyncResult = await to(Promise.resolve('done'))

if (isOk(doubled) && isOk(asyncResult)) {
  console.log(unwrap(doubled), unwrap(asyncResult))
}
