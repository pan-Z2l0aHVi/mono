---
'@greypan/md-to-comp': patch
---

feat(md-to-comp,web-ui,react-web-ui-demo,vue-web-ui-demo): `## API` 小节支持散文，README 独有的表格与行为说明搬进 `docs/*.md`

`## API` 下的小节过去只有表格一种形状，列数还由渲染端按「这一节的行带不带类型」猜。现在解析端按配置
分流：标题登记在 `apiTables.columns` 里的按表格解析，表头字面量与列数由那一项给出；没登记的按散文解析，
正文整段渲染成 markdown HTML（行为说明、迁移说明、已知限制这类写在这里，正文里出现表格行即报错，那说明
这一节的表头漏登记了）。列的语义按位置定——首列是名称、次列是富文本说明、第 3 列起都是普通值列——所以
每一节有几列由配置说了算，不再受「四列 / 两列」两种形状限制。

payload 随之从 `ExampleApiRow { name; descriptionHtml; type?; default? }` 换成 `rows: string[][]` 加
`columns: { title; kind }[]`，`ExampleApiSection` 成为 `{ kind: 'table' } | { kind: 'prose' }` 的并集。
两个 demo 的 `ExampleDoc` 改成照 `columns` 逐列渲染——名称列与值列进 `font-mono`、说明列走富文本——于是
新增一节、给某一节多配一列都只是改配置，渲染端不再认识任何一节叫什么。

同一件事在 README 与 `docs/*.md` 两处各写一遍是这轮要拆掉的重复。`packages/web-ui/README.md` 与
`README.CN.md` 里只存在于 README 的内容——24 张 CSS 自定义属性表、theme 的 8 张 token 表（颜色与阴影两族
各带浅色/深色两列）与 `### 返回句柄`、以及 72 段散文小节（行为说明、迁移说明、已知限制这类）——全部搬进
对应的 `docs/*.md`，`docs/` 下因此多出 105 个小节。`## API 参考` / `## API Reference` 整段删除，两份 README 收成一张指向
`docs/*.md` 的索引表。

`### 返回句柄` 只收命令式 API 返回对象上的只读成员（`index` / `scale` / `images` / `closed`），
同名的方法仍归 `### Methods`，避免同一件事在两节里各写一遍。
