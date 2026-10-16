---
'@greypan/md-to-comp': patch
---

chore(md-to-comp,react-web-ui-demo,vue-web-ui-demo): 示例这条链上的命名一个词只表一件事

原来同一个东西挂两个词：页里的一条示例在引擎内部叫 `sample`（`SampleBlock`、`doc.samples`、`sample.ts`），
产物类型与 DOM 上却叫 `ExampleSamplePayload` / `ExampleSample` / `data-example-sample`。现在按层级分死：

- 一篇语料 = example：`ExampleDoc`、`exampleDocs`、`src/generated/examples.ts`、`data-example-doc|intro|api`
  一律不动（路由文件、产物文件名、页面标记都保持原样）。
- 页里的一条示例 = sample：`ExampleSamplePayload` → `SamplePayload`，写进宿主 `src/generated/examples.ts`
  的 `ExampleSample` → `Sample`，页面标记 `data-example-sample` → `data-sample`、
  `data-example-preview` → `data-sample-preview`。
- 按锚点落成的组件源码文件 = demo：`demos/`、`demoKey`、`demoFileName`、`emitsDemoFile` 不变。
- 围栏语言 = flavor：`SampleFlavor` → `FenceFlavor`——它指的是 `tsx` / `vue`，与「一条示例」无关，
  旧名把两件事混在一起。

`packages/md-to-comp/src/markdown.ts` 里那条 `## 示例` 小节的局部名也跟着改成 sample 系
（`EXAMPLES_SECTION` → `SAMPLES_SECTION`、`examples` → `samplesSection`、`exampleGroups` → `sampleGroups`），
报错文案与 `## 示例` / `## API` 的中文小节名不动。行为零变化：产出的 `examples.ts` / `examples.css`
除类型名外逐字节相同，页面渲染不变。

顺带修掉两个在同一批全量测试里暴露的既有缺陷（都不是这次改名引入的）：

- `highlight.ts` 不再走 shiki 的 `codeToHtml` 懒加载快捷方式，改为自建高亮器并在初始化时预热：
  模块冷启动后的**第一次**调用会返回一份着色错乱的 HTML（同一进程、同一输入能给出两种字节），
  而产物校验比的是字节，「生成物与 markdown 不一致」于是会随机报在一份没被改过的产物上。
  一轮 `turbo build test` 会起多个进程、每个进程冷启一次，冷启后的第一次调用因此每轮都出现好几回——
  修复前的七轮全量运行里五轮报过这条不一致，修复后的三轮为零。
- `vue-web-ui-demo` 的 `example-doc` browser spec 里 `mountDemos` 用上与 React 面相同的 8 秒等待预算：
  第一份 demo 的 dynamic import 是冷的，vitest 默认的 1 秒在高负载下不够，会以「挂载 0 个」随机红。
