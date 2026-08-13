# ADR-0016: Weave MCP 服务形态

MCP 服务器运行在 App 内 Go 进程，监听 127.0.0.1 的随机端口，以令牌鉴权，使用 Streamable HTTP 传输（基于 `mark3labs/mcp-go`），令牌与状态在设置页可见并可轮换；不提供 stdio，因为 GUI App 常驻模式下 stdio 与外部 agent 的连接方式不匹配。AI 能力采用 **Agent 驱动**：App 只暴露 MCP 工具（查询/增删/标签/修复等），AI 分析与自动打标由外部 agent 通过 MCP 完成，另提供可选的 `suggest_tags` 工具（M2 加入）调用可配置的 OpenAI 兼容端点返回候选标签。
