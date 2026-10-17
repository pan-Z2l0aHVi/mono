import type { Plugin } from 'vite'

import { createMdToCompVite, type MdToCompViteOptions } from './vite'

/** Vue 宿主入口：钉死产物 flavor 为 vue（`.vue`），其余配置透传。 */
export default function mdToCompVue(options: MdToCompViteOptions): Plugin {
  return createMdToCompVite(options, 'vue')
}

export type { MdToCompViteOptions }
