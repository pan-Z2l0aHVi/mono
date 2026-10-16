import { lazy, Suspense, type ComponentType } from 'react'

import { exampleDocs } from '@/generated/web-ui-examples'

/**
 * 由示例文档 markdown 生成的示例文档：可交互示例（live）+ 示例代码（语法高亮）+ API 表。
 *
 * 数据全部来自 `docs/examples/web-ui/<name>.md`：示例代码、以及 API 表的名称 / 说明 / 类型 / 默认值都
 * 手写在那份 markdown 里，组件源码不参与生成。生成物由 `node scripts/generate-web-ui-examples.mjs`
 * 维护，这里只负责渲染，不写死任何字段。
 *
 * `flavor` 选择渲染哪一份示例代码：同一个示例在 markdown 里同时带 react 与 vue 两个代码块，
 * 两个 demo 各取自己那份，避免为了「视觉一致」把另一端的写法搬错。
 *
 * markdown 里带 `{#id}` 锚点的示例会被生成器原样落成 `src/generated/demos/<component>--<id>.tsx`，
 * 也就是下面 glob 到的这份文件——所以 `<pre>` 里显示的字节和屏幕上被执行的字节是同一份。
 * 没有锚点的示例只有代码块，等其余 29 篇的围栏改写成完整组件形态后再逐个开。
 */
const demoModules = import.meta.glob<{ default: ComponentType }>('../../generated/demos/*.tsx')
const DEMO_PREFIX = '../../generated/demos/'

// lazy 组件在模块作用域建一次：在 render 里调 lazy() 每帧换一个组件身份，示例会被反复卸载重建，
// 拖到一半的滑块状态当场丢失。
const demoComponents = new Map(
  Object.entries(demoModules).map(([file, load]) => [file.slice(DEMO_PREFIX.length, -'.tsx'.length), lazy(load)])
)

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

      <h2>示例代码</h2>
      {doc.samples.map(sample => {
        const Demo = sample.liveKey ? demoComponents.get(`${doc.component}--${sample.liveKey}`) : undefined
        return (
          <div className="flex flex-col gap-2" data-example-sample={sample.title} key={sample.title}>
            <h3 className="m-0">{sample.title}</h3>
            <p className="m-0 text-gray-500" dangerouslySetInnerHTML={{ __html: sample.descriptionHtml }} />
            {Demo ? (
              <div
                className="flex flex-wrap items-center gap-4 rounded-lg border border-(--wui-color-border) bg-(--wui-color-surface) p-4"
                data-example-preview={sample.liveKey ?? undefined}
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

      <h2>API</h2>
      {doc.api.map(section => (
        <div className="flex flex-col gap-3" data-example-api={section.key} key={section.key}>
          <h3 className="m-0">{section.title}</h3>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-(--wui-color-border) px-3 py-2 text-left align-top font-semibold text-gray-500">
                  名称
                </th>
                {section.key === 'props' ? (
                  <>
                    <th className="border-b border-(--wui-color-border) px-3 py-2 text-left align-top font-semibold text-gray-500">
                      类型
                    </th>
                    <th className="border-b border-(--wui-color-border) px-3 py-2 text-left align-top font-semibold text-gray-500">
                      默认值
                    </th>
                  </>
                ) : null}
                <th className="border-b border-(--wui-color-border) px-3 py-2 text-left align-top font-semibold text-gray-500">
                  说明
                </th>
              </tr>
            </thead>
            <tbody>
              {section.rows.map(row => (
                <tr key={row.name}>
                  <td className="border-b border-(--wui-color-border) px-3 py-2 align-top font-mono whitespace-nowrap">
                    {row.name}
                  </td>
                  {section.key === 'props' ? (
                    <>
                      <td className="border-b border-(--wui-color-border) px-3 py-2 align-top font-mono whitespace-nowrap text-gray-500">
                        {row.type}
                      </td>
                      <td className="border-b border-(--wui-color-border) px-3 py-2 align-top font-mono whitespace-nowrap text-gray-500">
                        {row.default}
                      </td>
                    </>
                  ) : null}
                  <td className="border-b border-(--wui-color-border) px-3 py-2 align-top">
                    <span dangerouslySetInnerHTML={{ __html: row.descriptionHtml }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  )
}

export default ExampleDoc
