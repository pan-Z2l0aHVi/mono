/** 将底层错误保留在日志中，只向用户展示可理解的原因。 */
export function userMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message.trim() : typeof error === 'string' ? error.trim() : ''
  if (/candidate changed since scan/i.test(message)) return '文件在扫描后发生变化，请重新查找'
  if (/candidate unavailable/i.test(message)) return '文件已不存在或无法访问，请重新查找'
  if (/source is no longer an unavailable file/i.test(message)) return '资源状态已改变，请重新查找'
  if (/[\u4e00-\u9fff]/.test(message) && !/\b(?:URL|HTTP|Source|Resource|token)\b/i.test(message)) return message
  if (message) console.error('操作未完成', error)
  return fallback
}
