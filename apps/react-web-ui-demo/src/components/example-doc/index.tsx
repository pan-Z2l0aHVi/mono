import { lazy, Suspense, type ComponentType } from 'react'

import { exampleDocs } from '@/generated/examples'

/**
 * 由示例文档 markdown 生成的示例文档：可交互示例 + 示例代码（语法高亮）+ API 表。
 *
 * 数据全部来自 `packages/web-ui/docs/<name>.md`：示例代码、以及 API 表的名称 / 说明 / 类型 / 默认值都
 * 手写在那份 markdown 里，组件源码不参与生成。`src/generated/**` 由 `@greypan/md-to-comp` 的 Vite
 * 插件在 dev 与 build 时生成，这里只负责渲染，不写死任何字段。
 *
 * `flavor` 选择渲染哪一份示例代码：同一个示例在 markdown 里同时带 react 与 vue 两个代码块，
 * 两个 demo 各取自己那份，避免为了「视觉一致」把另一端的写法搬错。
 *
 * markdown 里带 `{#id}` 锚点的示例会被生成器原样落成 `src/generated/demos/<component>--<id>.tsx`，
 * 也就是下面 glob 到的这份文件——所以 `<pre>` 里显示的字节和屏幕上被执行的字节是同一份。
 * 没有锚点的示例只有代码块。
 */
const demoModules = import.meta.glob<{ default: ComponentType }>('../../generated/demos/*.tsx')
const DEMO_PREFIX = '../../generated/demos/'

// lazy 组件在模块作用域建一次：在 render 里调 lazy() 每帧换一个组件身份，示例会被反复卸载重建，
// 拖到一半的 slider 状态当场丢失。
const demoComponents = new Map(
  Object.entries(demoModules).map(([file, load]) => [file.slice(DEMO_PREFIX.length, -'.tsx'.length), lazy(load)])
)

/**
 * API 小节有两型：登记过表头的是表，列形状完全由生成的 `columns` 决定（渲染端不认识任何一节叫什么，
 * 只按每列的 `kind` 决定等宽 / 富文本两种单元格）；没登记表头的是散文，正文是一段渲染好的 HTML。
 */
function ExampleDoc({ component, flavor = 'react' }: { component: string; flavor?: 'react' | 'vue' }) {
  const doc = exampleDocs.find(candidate => candidate.component === component)
  if (!doc) return null

  return (
    <section className="mt-8 flex flex-col gap-4" data-example-doc={doc.component}>
      {/* intro 与说明是生成器把 markdown 渲染成的 HTML 片段，不是运行时拼的用户输入。 */}
      <p
        className="m-0 text-(--wui-color-text)"
        data-example-intro
        dangerouslySetInnerHTML={{ __html: doc.introHtml }}
      />

      <h2>Example code</h2>
      {doc.samples.map(sample => {
        const Demo = sample.demoKey ? demoComponents.get(`${doc.component}--${sample.demoKey}`) : undefined
        return (
          <div className="flex flex-col gap-2" data-sample={sample.title} key={sample.title}>
            <h3 className="m-0">{sample.title}</h3>
            <p className="m-0 text-gray-500" dangerouslySetInnerHTML={{ __html: sample.descriptionHtml }} />
            {Demo ? (
              <div
                className="flex flex-wrap items-center gap-4 rounded-lg border border-(--wui-color-border) bg-(--wui-color-surface) p-4"
                data-sample-preview={sample.demoKey ?? undefined}
              >
                <Suspense fallback={null}>
                  <Demo />
                </Suspense>
              </div>
            ) : null}
            <div className="overflow-x-auto rounded-lg border border-(--wui-color-border) bg-(--wui-color-surface-raised) p-3 font-mono text-sm leading-5">
              {/* 高亮结果是 shiki 产出的 `<pre>`（纯文本已在生成时转义成 HTML），这里只负责套外框。 */}
              <div dangerouslySetInnerHTML={{ __html: sample.html[flavor] }} />
            </div>
          </div>
        )
      })}

      {/* 没有 `## API` 小节的语料（纯展示的子组件）不留一个空标题。 */}
      {doc.api.length > 0 ? <h2>API</h2> : null}
      {doc.api.map(section => (
        <div className="flex flex-col gap-3" data-example-api={section.key} key={section.key}>
          <h3 className="m-0">{section.title}</h3>
          {section.kind === 'prose' ? (
            // 散文小节也是生成器渲染好的 HTML 片段，不是运行时拼的用户输入。表格用 flex 间距，
            // 列表要显式补回 preflight 清掉的记号与缩进。
            <div
              className="flex flex-col gap-3 text-(--wui-color-text) [&_ol]:list-decimal [&_ol]:ps-5 [&_ul]:list-disc [&_ul]:ps-5"
              dangerouslySetInnerHTML={{ __html: section.html }}
            />
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {section.columns.map(column => (
                    <th
                      className="border-b border-(--wui-color-border) px-3 py-2 text-left align-top font-semibold text-gray-500"
                      key={column.title}
                    >
                      {column.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.map(row => (
                  <tr key={row[0]}>
                    {section.columns.map((column, index) =>
                      column.kind === 'html' ? (
                        <td className="border-b border-(--wui-color-border) px-3 py-2 align-top" key={column.title}>
                          <span dangerouslySetInnerHTML={{ __html: row[index] ?? '' }} />
                        </td>
                      ) : (
                        <td
                          className={
                            // 名称列是这一行的身份，值列是回填量：后者弱一档，与表格外框的灰阶一致。
                            `border-b border-(--wui-color-border) px-3 py-2 align-top font-mono whitespace-nowrap${
                              column.kind === 'code' ? ' text-gray-500' : ''
                            }`
                          }
                          key={column.title}
                        >
                          {row[index]}
                        </td>
                      )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </section>
  )
}

export default ExampleDoc
