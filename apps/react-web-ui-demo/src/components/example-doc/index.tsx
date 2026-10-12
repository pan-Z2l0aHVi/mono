import { exampleDocs } from '@/generated/web-ui-examples'

/**
 * 由 markdown 与组件源码生成的示例文档：示例代码（语法高亮）+ API 表。
 *
 * 数据全部来自 `docs/examples/web-ui/<name>.md` 与 `packages/web-ui/src/components/<name>/index.ts`，
 * 生成物由 `node scripts/generate-web-ui-examples.mjs` 维护。这里只负责渲染，不写死任何字段。
 *
 * `flavor` 选择渲染哪一份示例代码：同一个示例在 markdown 里同时带 react 与 vue 两个代码块，
 * 两个 demo 各取自己那份，避免为了「视觉一致」把另一端的写法搬错。
 */
function ExampleDoc({ component, flavor = 'react' }: { component: string; flavor?: 'react' | 'vue' }) {
  const doc = exampleDocs.find(candidate => candidate.component === component)
  if (!doc) return null

  return (
    <section className="mt-8 flex flex-col gap-4" data-example-doc={doc.component}>
      <p className="m-0 text-(--wui-color-text)" data-example-intro>
        {doc.intro}
      </p>

      <h2>示例代码</h2>
      {doc.samples.map(sample => (
        <div className="flex flex-col gap-2" data-example-sample={sample.title} key={sample.title}>
          <h3 className="m-0">{sample.title}</h3>
          <p className="m-0 text-gray-500">{sample.description}</p>
          <pre className="m-0 overflow-x-auto rounded-lg border border-(--wui-color-border) bg-(--wui-color-surface-raised) p-3 font-mono text-sm leading-5">
            <code
              // 高亮结果由生成器产出（纯文本已在生成时转义成 HTML），不是运行时拼的用户输入。
              dangerouslySetInnerHTML={{ __html: sample.html[flavor] }}
            />
          </pre>
        </div>
      ))}

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
                  <td className="border-b border-(--wui-color-border) px-3 py-2 align-top">{row.description}</td>
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
