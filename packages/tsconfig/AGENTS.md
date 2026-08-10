# tsconfig 包指令

- 这是供 workspace 通过 TypeScript `extends` 消费的 profile 配置包；修改 profile 时检查所有继承者仍能通过根目录 `pnpm run check:code`。
- profile 之间的层级和 workspace 使用边界以 [`CONTEXT.md`](../../CONTEXT.md) 与当前 `packages/tsconfig/*.json` 为准。
