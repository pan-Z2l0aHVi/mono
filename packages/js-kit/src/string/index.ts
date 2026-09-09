/**
 * 获取文件名的后缀名，例如 'file.txt' 的后缀名为 'txt'。
 * @param filename 文件名
 * @returns 文件名的后缀名
 */
export function getFileExtension(filename: string): string {
  if (!filename || typeof filename !== 'string') throw new Error('Filename is invalid.')

  const lastDotIndex = filename.lastIndexOf('.')
  // 边缘情况处理：
  // - 没有点 (lastDotIndex = -1)
  // - 点在开头 (lastDotIndex = 0)，例如 .gitignore，不视作后缀
  // - 点在末尾 (lastDotIndex = filename.length - 1)，例如 report.，不视作后缀
  if (lastDotIndex <= 0 || lastDotIndex === filename.length - 1) {
    throw new Error('Filename has no extension.')
  }

  return filename.slice(lastDotIndex + 1).toLowerCase()
}
