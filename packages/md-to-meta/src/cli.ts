#!/usr/bin/env node
import { runCli } from './cli-run'

// 入口只负责把退出码翻译成进程状态；命令行语义与依赖装配见 cli-run.ts。
runCli(process.argv.slice(2)).then(
  code => {
    if (code !== 0) process.exit(code)
  },
  error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
)
