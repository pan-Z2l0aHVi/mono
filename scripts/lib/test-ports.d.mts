export type TestApiPortName =
  | 'react-web-ui-demo'
  | 'vue-web-ui-demo'
  | 'interweave-frontend'
  | 'web-ui'
  | 'web-ui-reduced-motion'
  | 'browser-kit'

export const BAND_WIDTH: number
export const OFFSET_STRIDE: number
export const TEST_API_PORT_NAMES: readonly TestApiPortName[]

export function testApiPort(name: TestApiPortName, env?: Record<string, string | undefined>): number
