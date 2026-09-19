# Review 指南

在进行代码 review 或自我 review 时使用本指南。报告应以按严重程度排列的具体发现开头（`Block` / `Should fix` / `Nit`），包含文件和行号引用。未发现缺陷时，说明测试缺口和残余风险。

检查项包括：公共行为与向后兼容性、聚焦测试覆盖、边界与失败情况、类型与错误处理、竞态或资源泄漏、用户输入安全风险、以及文档变更。对于重构，将完成的变更与变更前的行为清单进行对照。

独立的 review agent 不得同时参与所 review 变更的实施。应 review 最终代码和测试，而非依赖实施过程中的描述。

浏览器相关的 review 必须核实证据档位：按 [`browser-verification.md`](browser-verification.md) 的三档标注检查，修复类变更的 handoff 必须携带「已证实机制」（见 [`task-packet.md`](task-packet.md) 字段约束）；未给出已证实根因的方案性返工是 review 发现项。
