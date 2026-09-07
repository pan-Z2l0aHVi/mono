/**
 * Tracker 的默认单条传输适配器：sendBeacon 优先，浏览器拒绝排队时降级到 fetch。
 * 自定义 `transport` 选项会整体替换该适配器；默认行为之外不应有第二个副本。
 */
export async function beaconTransport(url: string, data: object): Promise<void> {
  const body = JSON.stringify(data)
  try {
    // 保持字符串载荷以使用 CORS-safelisted 的 text/plain，避免跨域采集端触发预检。
    const accepted = navigator.sendBeacon(url, body)
    if (!accepted) throw new Error('sendBeacon 未接受数据.')
  } catch (error) {
    console.warn(error, '[track 降级使用 fetch]')
    // no-cors 模式下浏览器只放行 CORS-safelisted 的 Content-Type，application/json
    // 会被剥掉（实际按 text/plain 发送），因此不声明该 header，避免误导后端。
    await fetch(url, {
      method: 'POST',
      keepalive: true,
      mode: 'no-cors',
      body
    })
  }
}
