/**
 * message 必须英文这条约束的唯一事实来源就在这里：commitlint 自带规则只管结构——type、scope、
 * 长度、大小写——管不到语言，而 `docs/agents/commit.md` 明说 commitlint 的规则以本文件为准、
 * 不在正文复述，所以这条本地规则同时承担「机检」和「规定」两个角色。
 *
 * 放在这里而不是 `scripts/checks/` 或 `packages/monorepo-kit/src/policy/`：pre-commit 与 required check job 的 policy checks
 * 都拿不到 commit message；`check-changeset` 仅由 PR CI 调用。
 * `commit-msg` 钩子本来就跑 commitlint，规则挂在这里即生效。
 *
 * 判据是 CJK 文字与全角标点，不是「全 ASCII」：
 * - 全角标点必须算违规，否则 `fix(web-ui)：xxx` 这种半中文形状会漏过；
 * - emoji 与带重音的拉丁字母不算违规——`🤖 Generated with [Claude Code]` 这类署名尾注是英文，
 *   只是带了图形字符，按 ASCII 判会把它误伤。
 *
 * 反引号里的行内代码先被剔除再判：commit body 引用仓库内容时躲不开中文标识符，例如
 * `` workflow.md#怎么取得这个授权 ``。引用不是「用中文写 message」。
 *
 * 只看 `header` / `body` / `footer`，不看 `raw`：parser 已经把 `#` 注释行剥掉了，而 `raw` 没有，
 * 用 `raw` 判会把 `git commit` 模板里的中文注释行当成提交内容误报。
 */
const CJK =
  /[\u1100-\u11FF\u2E80-\u2EFF\u3000-\u303F\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF]/gu

/**
 * commitlint 自己的插件类型在 `@commitlint/types`，但它不是本仓的直接依赖（pnpm 不提升），
 * 从根配置里 `import()` 不到。cz-git 把同一套 `Plugin` / `Rule` / `Commit` 类型重新导出，
 * 而 cz-git 正是下面 `UserConfig` 注解的来源，所以类型从这里取，不新增依赖。
 *
 * @type {import('cz-git').Plugin}
 */
const englishOnly = {
  rules: {
    'message-english-only': parsed => {
      const offenders = []
      // 三段的取法显式列出来，而不是用字段名去索引 parsed：`Commit` 没有索引签名，
      // 按字符串索引会在类型检查里报隐式 any。
      const sections = Object.entries({
        header: parsed.header,
        body: parsed.body,
        footer: parsed.footer
      })
      for (const [field, text] of sections) {
        if (!text) continue
        const prose = text.replace(/`[^`]*`/gu, '')
        const chars = [...new Set(prose.match(CJK) ?? [])]
        if (chars.length > 0) offenders.push(`${field}: ${chars.slice(0, 8).join(' ')}`)
      }
      if (offenders.length === 0) return [true]
      return [false, `commit message must be in English; found CJK characters: ${offenders.join('; ')}`]
    }
  }
}

/** @type {import('cz-git').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [englishOnly],
  rules: {
    'message-english-only': [2, 'always'],
    'body-leading-blank': [1, 'always'],
    'body-max-line-length': [2, 'always', 100],
    'footer-leading-blank': [1, 'always'],
    'footer-max-line-length': [2, 'always', 100],
    'header-max-length': [2, 'always', 200],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'type-enum': [
      2,
      'always',
      ['build', 'chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test']
    ]
  },
  prompt: {
    // 与 workspace 的包名去 `@greypan/` 前缀后一致；新增或删除包时同步这份清单，
    // packages/monorepo-kit/src/policy/context-corpus.mjs 会用 workspace manifests 比对，漂移会让 check-context 失败。
    scopes: [
      'root',
      'interweave',
      'interweave-frontend',
      'react-web-ui-demo',
      'vue-web-ui-demo',
      'app-scrollbars',
      'browser-kit',
      'deps-reload',
      'js-kit',
      'md-to-comp',
      'monorepo-kit',
      'test-kit',
      'tsconfig',
      'unplugin-web-components',
      'web-ui',
      'wuchale-vue'
    ],
    enableMultipleScopes: true,
    // 清单外的名字（跨包协调的临时 scope、尚未登记的目录）走「自定义输入 scope」。
    // 注意多选模式下选自定义项会替换掉已勾 option。
    allowCustomScopes: true,
    customScopesAlias: '自定义输入 scope',
    skipQuestions: ['body', 'footer', 'footerPrefix', 'breaking'],
    questions: {
      type: {
        description: "Select the type of change that you're committing",
        enum: {
          feat: {
            description: 'A new feature',
            title: 'Features',
            emoji: '✨'
          },
          fix: {
            description: 'A bug fix',
            title: 'Bug Fixes',
            emoji: '🐛'
          },
          docs: {
            description: 'Documentation only changes',
            title: 'Documentation',
            emoji: '📚'
          },
          style: {
            description:
              'Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)',
            title: 'Styles',
            emoji: '💎'
          },
          refactor: {
            description: 'A code change that neither fixes a bug nor adds a feature',
            title: 'Code Refactoring',
            emoji: '📦'
          },
          perf: {
            description: 'A code change that improves performance',
            title: 'Performance Improvements',
            emoji: '🚀'
          },
          test: {
            description: 'Adding missing tests or correcting existing tests',
            title: 'Tests',
            emoji: '🚨'
          },
          build: {
            description:
              'Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)',
            title: 'Builds',
            emoji: '🛠'
          },
          ci: {
            description:
              'Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)',
            title: 'Continuous Integrations',
            emoji: '⚙️'
          },
          chore: {
            description: "Other changes that don't modify src or test files",
            title: 'Chores',
            emoji: '♻️'
          },
          revert: {
            description: 'Reverts a previous commit',
            title: 'Reverts',
            emoji: '🗑'
          }
        }
      },
      scope: {
        description: 'What is the scope of this change (e.g. component or file name)'
      },
      subject: {
        description: 'Write a short, imperative tense description of the change'
      },
      body: {
        description: 'Provide a longer description of the change'
      },
      isBreaking: {
        description: 'Are there any breaking changes?'
      },
      breakingBody: {
        description: 'A BREAKING CHANGE commit requires a body. Please enter a longer description of the commit itself'
      },
      breaking: {
        description: 'Describe the breaking changes'
      },
      isIssueAffected: {
        description: 'Does this change affect any open issues?'
      },
      issuesBody: {
        description:
          'If issues are closed, the commit requires a body. Please enter a longer description of the commit itself'
      },
      issues: {
        description: 'Add issue references (e.g. "fix #123", "re #123".)'
      }
    }
  }
}
