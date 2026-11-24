# @greypan/doc-demo-kit

> `react-web-ui-demo` 与 `vue-web-ui-demo` 共享的文档示例层：locale 状态机、shell 状态、语料契约、meta 渲染与 codeblock 纯逻辑。

这是私有 workspace 包，不发布到 npm；在 workspace 应用中通过 `workspace:*` 协议引入。宿主应用只保留框架绑定（React hook / Vue composable）、视图组件与中文壳文案，跨端共享的状态机与纯逻辑统一收口在本包。

## 导出入口

| 入口                                     | 内容                                                                                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@greypan/doc-demo-kit`                  | 共享运行时纯逻辑：shell 状态（主题 / 动效 / 侧栏折叠与宽度）、locale 状态机、导航与搜索、quick-link 倾斜数学、meta / readme / install / codeblock 控制器 |
| `@greypan/doc-demo-kit/testing`          | 语料契约测试辅助：`runExampleDocsContractTests` 与 `runNavCorpusContractTests`                                                                           |
| `@greypan/doc-demo-kit/testing.viewport` | 视口与布局测试辅助                                                                                                                                       |

源码运行时只从 `@greypan/md-to-meta/contract` 导入纯契约常量与文本辅助，不从 `@greypan/md-to-meta` 根入口引入生成期依赖。

## Tailwind 接入

Tailwind 的自动源检测止步于 workspace 边界。宿主应用若要让本包导出的样式类生效，需在自身 `global.css` 中使用 `@source` 显式登记本包 `src`。

## 验证

```bash
pnpm --filter @greypan/doc-demo-kit build
pnpm --filter @greypan/doc-demo-kit test
pnpm run check-generated-parity
```
