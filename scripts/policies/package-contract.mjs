import { definePackageContract } from '@greypan/monorepo-kit'

/** 发布包契约：`package.json` 的声明必须与 `pnpm pack` 的实际产物一致。 */
export const packageContract = definePackageContract()
