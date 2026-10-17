---
'@greypan/md-to-comp': patch
---

feat(md-to-comp): 子组件补上 API 语料，覆盖守卫不再要求「一页一文档」，`## API` 小节改为可省

`radio-group` / `checkbox-group` / `button-group` / `option` / `dropdown-item` / `dropdown-divider` /
`dropdown-header` 这 7 个组件此前只在父组件的示例里露过面，自己没有语料，于是页面上没有一棵属于它们的
API 表。这次按它们实际被用在哪儿补语料：radio 页渲染 `radio-group`，checkbox 页渲染 `checkbox-group`，
button 页渲染 `button-group`，select 与 autocomplete 两页渲染 `option`，dropdown 与 context-menu 两页
渲染 `dropdown-item` / `dropdown-divider` / `dropdown-header`。示例按 live 口径写——每节都带 `{#id}`
锚点、围栏是自包含的完整组件源码，两侧各落成一份 `src/generated/demos/<component>--<id>.<tsx|vue>` 并在
页面上挂成真组件。语料至此 37 篇（Props 225 行、Events 43 行、Slots 48 行），其中 8 篇带锚点。

`scripts/example-docs.test.mjs` 的覆盖守卫从「路由 ↔ 页面 ↔ markdown 一一同名」改判四条：路由名集合
== 页面名集合；每个路由 / 页面仍渲染自己那份 `<ExampleDoc component="<自己的名字>" />`；每份 markdown
至少被一个页面渲染；`<ExampleDoc component="X">` 引用不存在的 markdown 非零退出。第 2、3 条合起来仍然
挡住「加了页面却没有文档」与「加了 markdown 却没人渲染」，只是不再要求 1:1——`dropdown-item` 一条语料被
两个页面渲染就是这一型。四条判据都在同一份脚本里配了合成输入的负例，判据自己写错（例如把 `includes`
写成恒真）时会当场红。

引擎侧跟着放宽一条：`## API` 小节由必填改为可省。整段省略是「这个组件没有对外契约」的明确声明
（`web-ui-dropdown-divider` 只有一条分隔线，没有属性、事件与插槽），页面在 `api` 为空时整段跳过、不留
一个空标题。小节一旦存在就仍须有数据行——「留着标题却没有表格行」只会在页面上渲染成一个空标题，照旧
非零退出。
