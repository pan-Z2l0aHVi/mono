import { createPlugin } from '@mono/utils-core'

export interface Params {
  [key: string]: unknown
}
export interface TransportApi {
  send: <S extends Params>(paramsList: S[]) => Promise<void>
}
export interface TransportOptions {
  url: string
  chunkSize?: number // KB
  // 数据最终发送前的格式化函数
  formatter?: (paramsList: Params[]) => unknown
}
export type TransportConfig = Required<TransportOptions>

export const DEFAULT_OPTIONS = {
  chunkSize: 64,
  formatter: (x: Params[]) => x
}

export function createTransport(options?: TransportOptions) {
  return createPlugin<'transport', TransportApi>('transport', () => {
    const config = { ...DEFAULT_OPTIONS, ...options } as TransportConfig

    async function send<S extends Params>(paramsList: S[]): Promise<void> {
      if (!paramsList.length) return

      const { url, chunkSize, formatter } = config
      const data = JSON.stringify(formatter(paramsList))

      const MAX_BEACON_SIZE = chunkSize * 1024
      if (data.length > MAX_BEACON_SIZE && paramsList.length > 1) {
        // 递归分片：简单粗暴地将列表一分为二发送
        const mid = Math.floor(paramsList.length / 2)
        await Promise.all<void>([send(paramsList.slice(0, mid)), send(paramsList.slice(mid))])
        return
      }
      try {
        const isSuccess = navigator.sendBeacon(url, data)
        if (isSuccess) return
      } catch (error) {
        console.error('SendBeacon error, falling back fetch: ', error)
      }
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        mode: 'no-cors',
        body: data
      })
    }

    return { send }
  })
}
