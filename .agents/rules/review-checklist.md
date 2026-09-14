# Review 约束

- Review 以问题为先，按严重程度列出可验证的发现；无问题时明确说明并列出测试缺口或残余风险。
- 独立 review agent 不得参与同一变更的实施。
- 浏览器证据必须按三档标注并核实档位真实性：仿真无回归（最弱）< 引擎级复现（`pnpm agent:verify`）< 真机验收；修复类变更的 handoff 必须携带「已证实机制」（见 task-packet.md），未给出已证实根因的方案性返工是 review 发现项。
- 详细检查项与报告格式见 [`docs/agents/review.md`](../../docs/agents/review.md)。
