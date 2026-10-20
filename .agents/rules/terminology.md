# 术语约束

文档、注释、示例与说明文字里的专业术语用英文原文，不自造中文译名。术语的权威来源是代码里已有的标识：组件名取 custom element 名，构件名取 class / prop / token 名。语料权威与漂移门禁见 [`docs/agents/agent-context.md`](../../docs/agents/agent-context.md)。

- 术语写代码里的英文标识：组件写 slider（`web-ui-slider`），构件写 thumb（`.wui-slider-thumb`）、indicator（`.wui-segmented-indicator`）、track（`.wui-slider-track`）。中文只写行为、状态与解释，不拿中文当术语本身。
- 同一术语全仓只留一个名字：已有英文原名就不再写中文译名，两种叫法也不并存。发现旧译名（手柄、滑块、指示器一类）按本条改回英文原名。
- 领域词汇按其 owner 定的名字写：包或应用级 `AGENTS.md` 里已定义的领域名照该处写，本条只管通用术语与代码标识的对应。
- 术语随实现走：改了 class / prop / token 名，先同步这里的对应关系，再改文档与注释里的叫法。
