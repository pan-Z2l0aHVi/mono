import { defineCommandConventions } from '@greypan/monorepo-kit'

/** 根命令面的 namespace 闭集。归属与命名理由见 `docs/agents/commands.md`。 */
export const commandConventions = defineCommandConventions({ namespaces: ['agent', 'ci', 'dev'] })
