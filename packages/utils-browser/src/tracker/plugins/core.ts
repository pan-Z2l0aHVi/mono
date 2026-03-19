import { definePlugin } from '@mono/utils-core'

interface Options {
  url: string
  // 数据发送前的转化函数
  transform?: <T>(data: T) => unknown
}
type Config = Required<Options>

const DEFAULT_OPTIONS = {
  transform: <T>(x: T): T => x
}

export function defineTracker(options: Options) {
  return definePlugin(() => {
    const config = { ...DEFAULT_OPTIONS, ...options } as Config

    async function track(data: object) {
      if (!data) return

      const { url, transform } = config
      const actualData = JSON.stringify(transform(data))

      try {
        const isSuccess = navigator.sendBeacon(url, actualData)
        if (isSuccess) return
      } catch (error) {
        console.error('SendBeacon error, falling back fetch: ', error)
      }
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        mode: 'no-cors',
        body: actualData
      })
    }

    function computeDataSize(data: object) {
      return JSON.stringify(config.transform(data)).length
    }

    return {
      track,
      computeDataSize
    }
  })
}
