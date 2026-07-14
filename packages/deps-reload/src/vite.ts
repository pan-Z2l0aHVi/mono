import { createVitePlugin } from 'unplugin'

import { depsReloadFactory } from './factory'

export default createVitePlugin(depsReloadFactory)
