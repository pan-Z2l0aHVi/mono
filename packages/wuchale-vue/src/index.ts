import type { Adapter, AdapterPassThruOpts, DeepPartial, HeuristicFunc } from 'wuchale'
import { defaultHeuristic, fillDefaults, pofile } from 'wuchale'
import { loaderPathResolver } from 'wuchale/adapter-utils'

import { transformVue } from './transform'

export interface VueDiagnostic {
  code: 'unsupported-sfc' | 'unsupported-template' | 'binding-collision' | 'parse-error'
  filename: string
  message: string
  offset: number
  line: number
  column: number
}

export type VueAdapterOptions = DeepPartial<
  Pick<AdapterPassThruOpts, 'sourceLocale' | 'files' | 'storage' | 'loading'>
> & {
  heuristic?: HeuristicFunc
  /** 接收保留原文的原因；省略时使用 console.warn。 */
  onWarn?: (diagnostic: VueDiagnostic) => void
  /** 按组件 tag 明确允许额外的文案属性，例如 label/content。 */
  componentAttributes?: Record<string, string[]>
}

const loaderPath = loaderPathResolver(import.meta.url, '../src/loaders', 'js')

/** 创建 Vue SFC adapter，在构建时转换模板文案，不修改磁盘上的 SFC。 */
export function adapter(options: VueAdapterOptions = {}): Adapter {
  const { heuristic = defaultHeuristic, onWarn = warn, componentAttributes = {}, ...args } = options
  const config = fillDefaults<Pick<AdapterPassThruOpts, 'sourceLocale' | 'files' | 'storage' | 'loading'>>(args, {
    files: { include: 'src/**/*.vue', ignore: [] },
    storage: pofile(),
    loading: { direct: false, granular: false, group: [] }
  })
  return {
    ...config,
    transform: ctx => transformVue(ctx, heuristic, onWarn, componentAttributes),
    loaderExts: ['.js', '.ts'],
    defaultLoaderPath: loaderPath(config.loading.direct ? 'bundle' : 'vue'),
    addImports: ['wuchale/dev'],
    runtime: {
      initReactive: () => true,
      useReactive: true,
      plain: { wrapInit: expr => expr, wrapUse: expr => expr },
      reactive: { wrapInit: expr => expr, wrapUse: expr => expr }
    }
  }
}

function warn(diagnostic: VueDiagnostic) {
  console.warn(`[wuchale-vue] ${diagnostic.filename}:${diagnostic.line}:${diagnostic.column} ${diagnostic.message}`)
}
