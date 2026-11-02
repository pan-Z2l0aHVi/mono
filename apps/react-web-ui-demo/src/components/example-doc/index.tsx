import { useExampleDoc } from '@/i18n/locale'

import { MetaComp } from '../meta'

interface ExampleDocProps {
  component: string
}

/**
 * 由示例文档 markdown 生成的页面主体：按 meta 的顺序渲染。
 *
 * 文档只有一个来源——`packages/web-ui/docs/<name><suffix>.md`：中文是源（`.CN.md`），英文译文没有
 * 后缀。语种与组件都在 `i18n/` 里按文件名解析，meta 本身不含任何语种或示例契约；围栏的源代码
 * 与页面 `<pre>` 显示的字节由生成器保证同源。
 */
function ExampleDoc({ component }: ExampleDocProps) {
  const docNodes = useExampleDoc(component)
  if (!docNodes) return null

  return (
    // 根节点这条字面量 aria-label 同时是 wuchale 的锚点：组件作用域里没有其它文案时，它才会在
    // 组件顶部生成运行时初始化；否则嵌套标题会引用到回调作用域里那个未定义的 `_w_runtime_`。
    // 正文块自带 margin，与 gap 叠加会双倍，所以这一层逐个清零。
    <section
      className="mdm-markdown mt-10 flex flex-col gap-4 [&>*]:my-0"
      aria-label="示例文档"
      data-example-doc={component}
    >
      <MetaComp nodes={docNodes} />
    </section>
  )
}

export default ExampleDoc
