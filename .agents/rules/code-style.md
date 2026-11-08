# 代码与散文风格约束

本文件只保留不能从工具、类型或现有代码推导的约束。格式和 lint 细节见 [`docs/agents/lint-format.md`](../../docs/agents/lint-format.md)；当前实现以源码和配置为准。

- 错误处理和 fallback 必须保留出错原因，不能静默吞掉；公共 API 的 JSDoc 写清参数、返回值和副作用。
- 注释只写代码读不出来的信息：API 契约、设计意图、特殊逻辑、竞态与时序原因；删掉后代码仍能表达原意的注释不写。
- 注释与文档散文只陈述现状，不叙述被取代的旧实现、旧属性名与改动过程；指令面与参考语料的约定见 [`docs/agents/agent-context.md`](../../docs/agents/agent-context.md)，组件示例文档见所属包的 `AGENTS.md`。
- 间距类工具（padding、margin、gap、space）用 Tailwind spacing 刻度写纯数字，如 `p-3`、`gap-1.5`、`-mr-2`，不要写 `p-[12px]`；只有落在刻度之外的值（如 5px、7px）才用 px 任意值。
- 禁止手写 `rem`。其他 CSS 长度优先 `px`；本身无单位的属性（line-height、z-index、flex、opacity 等）直接写纯数字。
- 同心嵌套的表面遵循 `外圆角 = 内圆角 + 间距`，使内外轮廓协调。圆角值采用不同单位或写法时，可根据实际渲染效果换算为视觉等效的 px 值，再按公式判断；独立控件和非同心布局按设计需要设置圆角。
