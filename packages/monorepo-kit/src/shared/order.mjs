// 按 UTF-16 码元比较。`Array.prototype.sort()` 不传比较函数时用的也是码元序，但显式写出来
// 才不会被读成 `localeCompare`：这里的排序结果会进哈希、进断言与进错误信息的顺序，locale
// 差异会让同一份仓库在不同机器上得出不同结果。
export function byCodeUnit(left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}
