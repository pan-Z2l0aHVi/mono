import type { Plugin } from 'vite'

import { createMdToCompVite, type MdToCompViteOptions } from './vite'

/** React 宿主入口：钉死产物 flavor 为 react（`.tsx`），其余配置透传。 */
export default function mdToCompReact(options: MdToCompViteOptions): Plugin {
  return createMdToCompVite(options, 'react')
}

export type { MdToCompViteOptions }
