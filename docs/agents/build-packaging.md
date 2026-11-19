# 打包、类型与外部化

本文件承接 [`build.md`](./build.md) 的产物与打包切面：库用什么方式出产物、入口与声明文件怎么列、共享 TypeScript 配置怎么引用、依赖如何外部化。构建命令与 demo 开发见 [`build.md`](./build.md)；生成物链路见 [`build-generated.md`](./build-generated.md)。

## 库构建模式

公共面是固定入口集合的包用 `vp pack`（基于 tsdown，可以多入口，输出 ESM 与声明文件，并从依赖中外部化）。公共面含通配子路径导出或需要 Vite CSS/资源管线的包同样用 `vp pack`，但要满足这几条：让产物与源码树一一对应（子路径导出靠它）、把扩展名对齐到 `exports` 指向的 `.js` / `.d.ts` 而不是平台默认值、把 CSS 入口作为产物入口的一项而不是靠副作用发现。声明文件覆盖不到 JS 图之外的纯类型入口时，那类入口要显式列进产物入口；用目录级 glob 一次补齐类型入口会让声明阶段慢数倍，不要用，需要补就逐个列。纯转发的 barrel（`export * from './x'`）在按源码树产出时会被拍平进叶子模块，没有 `index.js` / `index.d.ts`，所以通配子路径覆盖的子目录要逐个列键，键必须写成 `<dir>/index`——写成 `<dir>` 会落到 `<dir>.js`，产物落点由键决定。浏览器下限只在顶层声明一次，它同时驱动 JS 语法降级与 CSS 前缀，不要只在一侧设。选项的写法以各包 `vite.config.ts` 为准，入口数量本身不是判据。

多入口包按消费者分入口：Node 脚本用的判定与链协议一组，`vite.config.ts` 求值期用的 Vite 插件一组。新入口归属哪一侧以消费方式判断，只被包内使用的模块不进公共入口。产物布局与逐包形状以各包 `package.json` 的 `exports` 与包级 `AGENTS.md` 为准；产物新鲜度如何影响门禁由拥有该产物的包说明，本文不复述。

## TypeScript 配置

共享配置在 `packages/tsconfig/`，通过 `"extends": "@greypan/tsconfig/<profile>.json"` 引用。面向 DOM 与 Node 的包把配置拆成 `tsconfig.node.json`、`tsconfig.app.json` 和 `tsconfig.vitest.json`，纯 Node 包只用单个 `tsconfig.json`。每个包声明自己的 `include` 与 `tsBuildInfoFile`；需要路径别名时再声明 `paths`，不要为形式统一添加空配置。`packages/tsconfig` 无构建步骤，只提供通过 TypeScript `extends` 消费的 JSON 文件。

## 外部化规则

匹配 `@greypan/*` 的工作区依赖与 Node 内置模块必须外部化，以保证监听模式可解析并避免重复的消费端代码。这条只对真打包的包有配置意义：按源码树产出、不合并依赖的包加 `external` 正则不会改变产物。第三方依赖在设计意图为零配置消费时可以打包，期望消费端自行提供时外部化。优先用正则而非工作区包列表，并让它同时匹配子路径导入。逐包的外部化清单以各包 `vite.config.ts` 为准。
