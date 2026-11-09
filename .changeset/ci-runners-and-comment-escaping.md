---
---

CI 修复，不涉及发包：审查结论评论不再直接删除尖括号，改为按反引号代码段分段转义，`Plugin<ToolchainApi, KitCtx>` 这类泛型不会再被吃成 `PluginToolchainApi, KitCtx`，HTML 注入仍被阻断；Wails 的 macOS 构建 job 从已退役的 `macos-14` 迁到 `macos-15`（arm64），并加断言防止退役标签回到工作流。
