import { rust } from '@greypan/js-kit'
import { kebabCase, pascalCase } from 'change-case'
import type { UnpluginOptions } from 'unplugin'

import { transformReactCode } from './transforms/react'
import { transformVueCode } from './transforms/vue'

export interface UnpluginWebComponentsOptions {
  tagPrefix: string
  packageName: string
  sideEffects?: boolean
  withStyle?: string
}

// 移除不参与元素解析的区域，避免其中的伪标签触发无效导入。替换顺序有依赖：
// 先剥带引号属性值——其中的尖括号是属性文本而非标签，若不先移除，属性值里的 `<script>`
// 等字面量会被当作 RAWTEXT 起点、吞掉其后直到 EOF 的真实组件标签；再剥 RAWTEXT/字符数据
// 元素整体（script/style/xmp/iframe/noembed/noframes/noscript 原始文本，title/textarea
// 字符数据）；最后剥注释。未闭合区域通常匹配到 EOF（注释内伪 RAWTEXT 起点是已知限制）。
// 其余标记（含 <template> 内容）保留。
function stripHtmlAttributeValues(html: string): string {
  const chars = html.split('')
  let inStartTag = false
  let quote: '"' | "'" | undefined

  for (let i = 0; i < html.length; i++) {
    const char = html[i]
    if (quote) {
      if (char === quote) quote = undefined
      chars[i] = ' '
      continue
    }

    if (!inStartTag) {
      if (char === '<' && /[A-Za-z]/.test(html[i + 1] ?? '')) inStartTag = true
      continue
    }

    if (char === '>') {
      inStartTag = false
    } else if (char === '"' || char === "'") {
      quote = char
      chars[i] = ' '
    }
  }

  return chars.join('')
}

function stripHtmlNoise(html: string): string {
  return stripHtmlAttributeValues(html)
    .replace(/<(script|style|title|textarea|xmp|iframe|noembed|noframes|noscript)\b[\s\S]*?(?:<\/\1\s*>|$)/gi, '')
    .replace(/<!--[\s\S]*?(?:-->|$)/g, '')
}

export const factory = (options: UnpluginWebComponentsOptions): UnpluginOptions => {
  const { tagPrefix, packageName, sideEffects = false, withStyle } = options

  const kebabTagPrefix = kebabCase(tagPrefix)
  const pascalTagPrefix = pascalCase(tagPrefix)

  const kebabReg = new RegExp(`<\\s*${kebabTagPrefix}-([a-z0-9-]+)(?=[\\s/>])`, 'gi')
  const pascalReg = new RegExp(`<\\s*${pascalTagPrefix}([A-Z][a-zA-Z0-9]+)(?=[\\s/>])`, 'g')

  function makeImports(code: string, detectPascal = true): rust.Result<string, Error> {
    const dirs = new Set<string>()
    // 用 matchAll 而非共享 g-flag 正则 + exec：避免跨 transform 调用残留 lastIndex，
    // 使同一正则被复用多次时匹配起点漂移
    for (const match of code.matchAll(kebabReg)) {
      // HTML/Vue 模板标签名大小写不敏感，捕获名统一小写，避免导入路径携带大小写
      // （如 <web-ui-Button> 归一到 components/button，在大小写敏感文件系统上才可解析）
      dirs.add(match[1].toLowerCase())
    }
    if (detectPascal) {
      for (const match of code.matchAll(pascalReg)) {
        dirs.add(kebabCase(match[1]))
      }
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
    },

    // Vite 专属：为 Vite 处理的 HTML 入口（index.html 等构建入口）注入组件导入脚本。
    // HTML 必须经 Vite 构建或开发服务器处理；public/ 静态文件与直接双击打开的文件不受支持。
    // Webpack 适配器不提供 HTML 注入，仍只做模块源码转换。
    vite: {
      transformIndexHtml: {
        order: 'pre',
        handler: (html: string) => {
          // HTML 标签名大小写不敏感，解析器统一小写化：先把可扫描区域整体小写，
          // 使 <WEB-UI-BUTTON>/<web-ui-Button> 等变体归一到 web-ui-button 并匹配 fast-path；
          // 驼峰/帕斯卡命名（<WebUiButton>）小写后是另一个标签名，仍不识别
          const markup = stripHtmlNoise(html).toLowerCase()
          if (!markup.includes(kebabTagPrefix)) return html
          const imports = makeImports(markup, false)
          if (!imports.ok) return html
          return [
            {
              tag: 'script',
              attrs: { type: 'module' },
              children: imports.value,
              injectTo: 'head-prepend'
            }
          ]
        }
      }
    }
  }
}
