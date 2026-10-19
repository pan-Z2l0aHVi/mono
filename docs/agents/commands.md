# 根命令面

本文件规定根命令的命名与 namespace 归属。短约束见 `.agents/rules/commands.md`；完整命令面以根 `package.json` 为准，工具参数与契约查询接口见 monorepo-change-impact skill 的 SKILL.md。

## 命名约定

```text
{namespace}:{do}-{something}
```

- 动宾之间用 `-` 连接；没有宾语时省略（`clean`，不是 `clean-something`）。
- 分组 CLI 以管理对象命名，动作由子命令提供（如 `agent:task-ledger status`）；单动作 CLI 仍使用动宾结构。
- namespace 取值闭集：`agent` / `ci` / `dev`。无 namespace 合法，基础命令属于这一类。

### namespace 按拥有方划分

前缀表达这条命令失效时谁先受影响，与它什么时候被调用、有多重要无关。

| namespace | 拥有方        | 判定                                                      |
| --------- | ------------- | --------------------------------------------------------- |
| `agent`   | agent 自己    | 改动后先打断 agent 自己的工作流：本地任务登记、环境体检   |
| `ci`      | CI 与仓库自检 | 改动后先让流水线变红或让自检失真：策略、context、脚本测试 |
| `dev`     | 本地开发      | 改动后先影响开发者起服务                                  |

`agent:*` 与 `ci:*` 的分界看命令失效后谁先受影响，而不是谁调用它。作用于整个工作树、不依赖 task 状态或 CI 的整理命令（如 `fix-code`）归入无 namespace 的基础命令。

## 机检

命令名形状、namespace 闭集与文档引用的命令存在性由仓库守卫和 CI 检查；新增或重命名命令时，命令名、用途与文档引用在同一变更里完成。具体守卫与执行端见仓库配置。
