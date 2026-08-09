# tsconfig 包指令

- 共享 TypeScript 配置 profile（`base`/`core`/`dom`/`node`/`react`/`vue`），无构建步骤，仅发布 JSON 文件。
- 消费方式：`"extends": "@greypan/tsconfig/<profile>.json"`；各包按项目需要补充 `include`、`paths` 和 `tsBuildInfoFile`。
- 修改 profile 时，检查所有继承它的包仍能通过根目录 `pnpm run check:code`。
- 配置层级关系见 `docs/agents/build.md` 的「TypeScript 配置」。
