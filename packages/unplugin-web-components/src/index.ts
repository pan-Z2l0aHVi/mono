import { err, ok, type Result } from '@mono/utils-core/rust'
import { kebabCase, pascalCase } from 'change-case'
import { createUnplugin } from 'unplugin'

import { transformReactCode } from './transforms/react'
import { transformVueCode } from './transforms/vue'

export interface UnpluginWebComponentsOptions {
  tagPrefix: string
  packageName: string
  sideEffects?: boolean
  withStyle?: string
}

export const unpluginWebComponents = createUnplugin<UnpluginWebComponentsOptions>(options => {
  const { tagPrefix, packageName, sideEffects = false, withStyle } = options

  const kebabTagPrefix = kebabCase(tagPrefix) // web-component
  const pascalTagPrefix = pascalCase(tagPrefix) // WebComponent

  const kebabReg = new RegExp(`<\\s*${kebabTagPrefix}-([a-z0-9-]+)(?=[\\s/>])`, 'gi')
  const pascalReg = new RegExp(`<\\s*${pascalTagPrefix}([A-Z][a-zA-Z0-9]+)(?=[\\s/>])`, 'g')

  function makeImports(code: string): Result<string, Error> {
    const dirs = new Set<string>()
    let matches: RegExpExecArray | null = null

    while ((matches = kebabReg.exec(code))) {
      dirs.add(matches[1])
    }
    while ((matches = pascalReg.exec(code))) {
      dirs.add(kebabCase(matches[1]))
    }

    if (!dirs.size) {
      return err(new Error('No components found.'))
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

    return ok(imports)
  }

  return {
    name: 'unplugin-web-components',
    enforce: 'pre',

    transform(code, id) {
      if (id.includes('node_modules')) return
      if (!code.includes(kebabTagPrefix) && !code.includes(pascalTagPrefix)) return
      if (!/\.(vue|jsx|tsx)$/.test(id)) return

      const imports = makeImports(code)
      if (!imports.ok) return

      // Vue
      if (id.endsWith('.vue')) {
        return { code: transformVueCode(code, imports.value) }
      }

      // React
      if (id.endsWith('.tsx') || id.endsWith('.jsx')) {
        return { code: transformReactCode(code, imports.value) }
      }
    }
  }
})

export default unpluginWebComponents
