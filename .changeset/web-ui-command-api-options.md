---
'@greypan/md-to-comp': patch
---

feat(web-ui,md-to-comp): 命令式 API 的表格改用 `### Options` 小节，image-preview 的选项表补全

引擎的小节名来自宿主配置（`apiTables.columns` 的键），这次在两个 demo 各加一条 `Options`，列形状与
`Props` 一样是四列。区别是语义：`Props` 记元素属性，`Options` 记命令式 API 的选项——`imagePreview()`
与 `toast()` 都没有声明式契约，把它们的参数摆在 `Props` 标题下会让人以为那是元素属性。

`packages/web-ui/docs/image-preview.md` 的这张表原本只有元素上的 9 个 `@property`，漏了
`ImagePreviewOptions` 独有的三个（`index` 默认 `0`、`target`、`container`），正文里的示例却在用
`index`（issue #360）。换成 `### Options` 后补成完整的 12 项，`images` 是必填项、默认值记 `—`。
`packages/web-ui/docs/toast.md` 换成 `### Options`，放 `toast()` 接受的 9 项（`message` / `type` /
`duration` / `closable` / `id` / `heading` / `position` / `target` / `container`）；只存在于元素上的
`toastId` / `visible` / `no-close-button` 移到「直接使用元素」那条示例的说明里，不再混进同一张表。

两个 demo 的 `ExampleDoc` 不再按小节名（原先写死 `'props'`）判断要不要渲染类型与默认值两列，改看这一节
的行带不带 `type`——四列小节的行都由解析器补上这两个字段，所以列形状仍然只由配置声明一次；渲染端因此
不必知道有哪些小节是四列的，新增 `Options` 也没有再改一处硬编码。`src/markdown.ts` 里那句「只有 props
有类型与默认值两列」的注释跟着改成按小节列数表述。
