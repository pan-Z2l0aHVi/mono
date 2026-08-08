import { rust } from '@greypan/js-kit'
import { kebabCase, pascalCase } from 'change-case'

import { transformReactCode } from './transforms/react'
import { transformVueCode } from './transforms/vue'

export interface UnpluginWebComponentsOptions {
  tagPrefix: string
  packageName: string
  sideEffects?: boolean
  withStyle?: string
}

export const factory = (options: UnpluginWebComponentsOptions) => {
  const { tagPrefix, packageName, sideEffects = false, withStyle } = options

  const kebabTagPrefix = kebabCase(tagPrefix)
  const pascalTagPrefix = pascalCase(tagPrefix)

  const kebabReg = new RegExp(`<\\s*${kebabTagPrefix}-([a-z0-9-]+)(?=[\\s/>])`, 'gi')
  const pascalReg = new RegExp(`<\\s*${pascalTagPrefix}([A-Z][a-zA-Z0-9]+)(?=[\\s/>])`, 'g')

  function makeImports(code: string): rust.Result<string, Error> {
    const dirs = new Set<string>()
    // 用 matchAll 而非共享 g-flag 正则 + exec：避免跨 transform 调用残留 lastIndex，
    // 使同一正则被复用多次时匹配起点漂移
    for (const match of code.matchAll(kebabReg)) {
      dirs.add(match[1])
    }
    for (const match of code.matchAll(pascalReg)) {
      dirs.add(kebabCase(match[1]))
    }

    if (!dirs.size) {
      return rust.err(new Error('No components found.'))
    }

    const imports = [...dirs]
      .map(dir => {
        const exportName = `${pascalTagPrefix}${pascalCase(dir)}`
        const style = withStyle ? `\nimport '${packageName}/components/${dir}/${withStyle}';` : ''
        return sideEffects
          ? `import '${packageName}/components/${dir}'${style};`
          : `import { ${exportName} } from '${packageName}/components/${dir}'${style};`
      })
      .join('\n')

    return rust.ok(imports)
  }

  return {
    name: 'unplugin-web-components',
    enforce: 'pre' as const,

    transform(code: string, id: string) {
      if (id.includes('node_modules')) return
      if (!code.includes(kebabTagPrefix) && !code.includes(pascalTagPrefix)) return
      if (!/\.(vue|jsx|tsx)$/.test(id)) return

      const imports = makeImports(code)
      if (!imports.ok) return

      if (id.endsWith('.vue')) {
        return { code: transformVueCode(code, imports.value) }
      }

      if (id.endsWith('.tsx') || id.endsWith('.jsx')) {
        return { code: transformReactCode(code, imports.value) }
      }
    }
  }
}
