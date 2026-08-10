# ADR-0009: 发布平面

Changesets 生成共享的 Version PR，但 registry 发布和桌面端交付是独立的发布平面。该 PR 合并后，npm 包通过 Trusted Publishing 发布，Wails 安装程序通过 GitHub Release 发布，两者并行执行；每个平面拥有各自的工作流、权限、工具链和重试路径。Version PR 的合并是唯一的正式发布授权，而手动运行仅可用于验证产物。
