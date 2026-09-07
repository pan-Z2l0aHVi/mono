import { createWebpackPlugin } from 'unplugin'

import { depsReloadFactory } from './factory'

export default createWebpackPlugin(depsReloadFactory)

export type { Dep } from './factory'
