import { createWebpackPlugin } from 'unplugin'

import { depsReloadFactory } from './factory'

export default createWebpackPlugin(depsReloadFactory)
