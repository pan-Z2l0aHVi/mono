import crypto from 'node:crypto'
import path from 'node:path'

// 只收已观测到的漂移短语。泛化的「当前」「目前」会把合法的过程描述一起判红，
// 而文风 lint 不在门禁职责内（ADR-0026）。
const VOLATILE_PHRASES = Object.freeze([
  { pattern: /当前规则集/, label: '当前规则集' },
  { pattern: /当前\s*GitHub\s*ruleset/, label: '当前 GitHub ruleset' },
  { pattern: /当前唯一\s*required/, label: '当前唯一 required' },
  { pattern: /当前\s*required/, label: '当前 required' },
  { pattern: /当前只有/, label: '当前只有' },
  { pattern: /目前只有/, label: '目前只有' },
  { pattern: /尚未实现/, label: '尚未实现' },
  { pattern: /仍未实现/, label: '仍未实现' },
  { pattern: /仍是[^\n]{0,20}占位/, label: '仍是…占位' }
])

// 远端写操作只认无歧义的命令形态。散文里的「发布」「合并」可能是领域名词或历史叙述，
// 按词根匹配会把大部分文档误判成写操作流程。
const REMOTE_WRITE =
  /\b(?:git push|gh pr (?:create|merge|comment|review|edit)|npm publish|pnpm publish|git tag|gh release|wails3 package)\b/
export const AUTHORIZATION_POINTER = 'workflow.md#怎么取得这个授权'
const UNRELATED_OPERATION_CHANGE_TARGET =
  /\b(?:release|publish(?:ing)?|deployment|deploy(?:ment)?|merge|merging)\b[^.!?;；]{0,24}\b(?:changes?|adjustments?|modifications?|operations?|actions?)\b|\b(?:changes?|adjustments?|modifications?|operations?|actions?)\b[^.!?;；]{0,24}\b(?:to|for|about|concerning)\s+(?:the\s+)?(?:release|publish(?:ing)?|deployment|deploy(?:ment)?|merge|merging)\b|(?:发布|部署|合并)[^。.!?;；]{0,12}(?:变更|调整|操作)|(?:变更|调整|操作)[^。.!?;；]{0,12}(?:发布|部署|合并)/i
const GENERIC_AUTHORIZATION_OVERRIDE =
  /\b(?:approval|authorization|consent|permission)\b[^.!?;；]{0,32}\b(?:(?<!not )optional|not required|not needed|not necessary|not mandatory|assumed)\b|\b(?:(?<!not )optional|not required|not needed|not necessary|not mandatory|assumed)\b[^.!?;；]{0,32}\b(?:approval|authorization|consent|permission)\b|\b(?:approval|authorization|consent|permission)\b[^.!?;；]{0,32}\b(?:may|can|could|might)\s+be\s+(?:obtained|sought|granted|requested)\b[^.!?;；]{0,32}\b(?:afterward|afterwards|later|subsequently|after implementation|after the change|after the fact)\b|\b(?:any\s+)?(?:changes?|adjustments?)\b[^.!?;；]{0,48}\b(?:may|can|could|might)\s+(?:proceed|continue|be made|be applied|be changed|be adjusted)\b[^.!?;；]{0,32}\b(?:pending|before|prior to|without)\b[^.!?;；]{0,24}\b(?:user\s+)?(?:approval|authorization|consent|permission)\b/i
const AUTHORIZATION_EXCEPTION_OVERRIDE =
  /\b(?:no\s+)?(?:exceptions?|exemptions?)\s+(?:to|from)\s+(?:the\s+)?(?:user\s+)?(?:approval|authorization|consent|permission)\s+requirement(?: above)?\b[^.!?;；]{0,32}\b(?:allowed|permitted|may|can|could|might|exist|apply)\b/gi

function hasGenericAuthorizationOverride(text) {
  const exceptionClauses = [...text.matchAll(AUTHORIZATION_EXCEPTION_OVERRIDE)]
  const withoutExceptionClauses = text.replace(AUTHORIZATION_EXCEPTION_OVERRIDE, '')
  const withoutMandatoryOptionality = withoutExceptionClauses.replace(
    /\b(?:(?:isn't|aren't|is not|are not)\s+optional|(?:(?:is|are)\s+)?never\s+(?:be\s+)?optional|(?:can|could|must|should)\s+never\s+be\s+optional)\b/gi,
    'mandatory'
  )
  if (GENERIC_AUTHORIZATION_OVERRIDE.test(withoutMandatoryOptionality)) return true

  return exceptionClauses.some(({ 0: clause }) =>
    !/^no\s+(?:exceptions?|exemptions?)\b/i.test(clause) &&
    !/\b(?:not|never|cannot|can't|must not|should not)\b[^.!?;；]{0,8}\b(?:allowed|permitted|may|can|could|might|exist|apply)\b/i.test(
      clause
    )
  )
}

function hasAuthorizationOverrideOutsideUnrelatedOperation(text, isOverride) {
  return text
    .split(/\bexcept(?:\s+for)?\b|\bunless\b|\bbut\b|但是|但|除非|除外|除了/iu)
    .some(clause => isOverride(clause) && !UNRELATED_OPERATION_CHANGE_TARGET.test(clause))
}

function hasAffirmativeTimeoutCause(text) {
  const statements = text.split(/[.!?。！？;；]+/u)
  const namesTimeoutAsCause =
    /(?:原因|根因|cause|reason)[^.!?;；]{0,48}(?:上限不足|时限过短|超时(?:限制)?过短|(?:timeout|time limit|deadline|cap)[^.!?;；]{0,24}(?:too short|insufficient))|(?:上限不足|时限过短|超时(?:限制)?过短)[^.!?;；]{0,40}(?:导致|造成|引起|所致)|(?:timeout|time limit|deadline|cap)[^.!?;；]{0,36}(?:(?:was|is|remains?)\s+)?(?:the\s+)?(?:cause|reason|responsible)|(?:caused by|due to|because of)[^.!?;；]{0,32}(?:timeout|time limit|deadline|cap)/i
  const negatesTimeoutCause =
    /(?:原因|根因|cause|reason)[^.!?;；]{0,24}(?:不是|并非|不在于|was not|is not|wasn't|isn't|not)[^.!?;；]{0,40}(?:上限|时限|超时|timeout|time limit|deadline|cap)|(?:上限不足|时限过短|超时(?:限制)?过短|timeout|time limit|deadline|cap)[^.!?;；]{0,32}(?:并非|不是|不|was not|is not|wasn't|isn't)[^.!?;；]{0,24}(?:原因|根因|导致|cause|reason|responsible)|(?:not caused by|not due to|not because of)[^.!?;；]{0,32}(?:timeout|time limit|deadline|cap)/i

  return statements.some(statement => namesTimeoutAsCause.test(statement) && !negatesTimeoutCause.test(statement))
}

function preservesValidWorkWhenLowering(text) {
  const statements = text.split(/[.!?。！？;；]+/u)
  const limit = /(?:新值|新上限|拟定值|new value|new cap|proposed limit|lower(?:ed|ing)? timeout|reduced? timeout|reduction)/i
  const validWork = /(?:有效工作|有效任务|正常工作|valid work|valid tasks?|valid jobs?|useful work)/i
  const weakGuarantee =
    /(?:不保证|不能保证|无法保证|不确保|未能确保|未必|不一定|可能无法|可能不会|大概|大致|一般|通常|cannot guarantee|does not guarantee|doesn't guarantee|not guaranteed|no guarantee|not ensure|does not ensure|doesn't ensure|isn't ensured|not assured|not expected to|expected to|\bgenerally\b|\btypically\b|\busually\b|\bprobably\b|\blikely\b|\b(?:cannot|can't|can not|may|might|could)\s+(?:not\s+)?(?:guarantee|ensure|preserve|maintain|keep)\b|\b(?:may|might|could) fail to\b)/i
  const preventsInterruption =
    /(?:不影响|不会中断|不会终止|不会取消|不会停止|不会中止|不能中断|不中断)[^.!?;；]{0,24}(?:有效工作|有效任务|正常工作|有效作业)|(?:有效工作|有效任务|正常工作|有效作业)[^.!?;；]{0,36}(?:仍可|仍能|可以|能够|可继续|继续完成|不受影响|不会中断|不会终止|不会取消|不会停止|不会中止|不能中断|不中断|仍可完成)|\b(?:does not|doesn't|will not|cannot|can never|never|won't)\s+(?:interrupts?|disrupts?|breaks?|terminates?|cancels?|stops?|aborts?|affects?)\b[^.!?;；]{0,36}\b(?:valid work|valid tasks?|valid jobs?|useful work)\b/i
  const validWorkSurvives =
    /(?:有效工作|有效任务|正常工作|valid work|valid tasks?|valid jobs?|useful work)[^.!?;；]{0,36}(?:仍可|仍能|可以|能够|可继续|继续完成|不受影响|不会中断|不会终止|不会取消|不会停止|不会中止|不能中断|不中断|仍可完成|will not be interrupted|won't be interrupted|cannot be interrupted|can still complete|can still finish|can be completed|can complete|can finish|remains? possible|remains? completable)/i

  return statements.some(
    statement =>
      limit.test(statement) &&
      validWork.test(statement) &&
      !weakGuarantee.test(statement) &&
      (preventsInterruption.test(statement) || validWorkSurvives.test(statement))
  )
}

function everyCategoryHasTimeoutCoverage(text, categories, requirement, maxDistance = 48) {
  const matches = expression =>
    [...text.matchAll(new RegExp(expression.source, `${expression.flags.replace('g', '')}g`))]
  const requirementMatches = matches(requirement)
  return categories.every(category =>
    matches(category).some(categoryMatch =>
      requirementMatches.some(requirementMatch => {
        const start = Math.min(categoryMatch.index, requirementMatch.index)
        const end = Math.max(categoryMatch.index, requirementMatch.index)
        const followsCategory = requirementMatch.index >= categoryMatch.index
        const distance = end - start
        const hasDirectReverseRelation =
          !followsCategory &&
          /\b(?:appl(?:y|ies)|covers?|governs?|used for|serves? as)\b/i.test(
            text.slice(requirementMatch.index + requirementMatch[0].length, categoryMatch.index)
          )
        return (
          (followsCategory ? distance <= maxDistance : distance <= 18 || (distance <= maxDistance && hasDirectReverseRelation)) &&
          !/[.!?。！？;；]/u.test(text.slice(start, end))
        )
      })
    )
  )
}

const TIMEOUT_POLICY_CHECKS = Object.freeze([
  {
    label: 'CI/workflow job timeout coverage',
    test: text =>
      everyCategoryHasTimeoutCoverage(text, [/\bCI\b/i, /\bworkflow\b/i], /timeout-minutes|超时|timeout/i)
  },
  {
    label: 'test runner and E2E timeout coverage',
    test: text =>
      everyCategoryHasTimeoutCoverage(
        text,
        [/(?:测试运行器|测试框架|test[ -]?runner|vitest|jest|pytest|mocha)/i, /(?:E2E|端到端|end[ -]to[ -]end)/i],
        /(?:超时|timeout|deadline|time limit)/i
      )
  },
  {
    label: 'build and script timeout/retry coverage',
    test: text => {
      const buildAndScript = everyCategoryHasTimeoutCoverage(
        text,
        [/(?:构建|build)/i, /(?:脚本|script)/i],
        /(?:超时|timeout|deadline)/i
      )
      const retryLimit = /(?:重试|retry)[^.!?;；]{0,32}(?:上限|限制|次数|limit|max|cap)|(?:上限|限制|limit|max|cap)[^.!?;；]{0,32}(?:重试|retry)/i
      return buildAndScript && everyCategoryHasTimeoutCoverage(text, [/(?:构建|build)/i, /(?:脚本|script)/i], retryLimit)
    }
  },
  {
    label: 'toolchain/orchestration wait cap coverage',
    test: text =>
      everyCategoryHasTimeoutCoverage(
        text,
        [/(?:工具链|toolchain)/i, /(?:任务编排|编排层|orchestration)/i],
        /(?:等待|wait)[^.!?;；]{0,24}(?:上限|限制|cap|limit|max)|(?:上限|限制|cap|limit|max)[^.!?;；]{0,24}(?:等待|wait)/i
      )
  },
  {
    label: 'every limit category requires explicit prior user authorization',
    test: text => {
      const statements = text.split(/[.!?。！？;；]+/u)
      const requiresPriorAuthorization = statement =>
        /(?:(?:须|必须|需要|应|要)?先|事先|事前|提前|预先)[^.!?;；]{0,16}(?:取得|获得|得到)?[^.!?;；]{0,8}(?:用户)?(?:明确)?(?:授权|批准)|未经[^.!?;；]{0,24}(?:用户)?(?:明确)?(?:授权|批准)|(?:修改|调整|变更|改变|更改|新增|添加)(?:前|之前|以前)[^.!?;；]{0,24}(?:须|必须|需要|应|要)?[^.!?;；]{0,12}(?:取得|获得|得到)[^.!?;；]{0,12}(?:用户)?(?:明确)?(?:授权|批准)|\b(?:explicit\s+)?prior\s+(?:user\s+)?(?:authorization|approval)\b|\b(?:authorization|approval)\b[^.!?;；]{0,36}\b(?:before|prior to)\b[^.!?;；]{0,24}(?:implement|execut|mak|chang|modif|adjust|add|rais|increas|extend)|\bbefore\b[^.!?;；]{0,80}(?:implement|execut|mak|chang|modif|adjust|add|rais|increas|extend)\w*[^.!?;；]{0,80}\b(?:obtain|seek|get|receive|request)\w*[^.!?;；]{0,16}\b(?:user\s+)?(?:approval|authorization)\b|\b(?:before|prior to)\b[^.!?;；]{0,80}\b(?:explicit\s+)?(?:user\s+)?(?:authorization|approval)\b[^.!?;；]{0,24}\b(?:is\s+)?(?:required|mandatory|needed)\b|\b(?:without|unless)\s+(?:first\s+)?(?:(?:explicit|prior|user|the)\s+)*(?:user\s+)?(?:authorization|approval)\b/i.test(
          statement
        )
      const explicitAuthorization = statement =>
        /用户.{0,8}明确.{0,8}(?:授权|批准)|explicit.{0,20}user.{0,16}(?:authorization|approval)|user.{0,20}explicit.{0,16}(?:authorization|approval)|\bexplicit\b[^.!?;；]{0,40}\b(?:authorization|approval)\b[^.!?;；]{0,32}\bfrom (?:the )?user\b/i.test(
          statement
        )
      const requirementOrProhibition = statement =>
        ((/(?:须|必须|(?<!不)需要|must(?!\s+not)|(?<!not )(?<!cannot )(?<!can't )(?<!don't )(?<!doesn't )require(?:s)?|(?<!not )required|(?<!not )needed|(?<!not )mandatory)/i.test(
          statement
        ) ||
          /\bsubject to\b/i.test(statement)) &&
          explicitAuthorization(statement) &&
          requiresPriorAuthorization(statement)) ||
        (/\b(?:permitted|allowed)\s+only\s+after\b/i.test(statement) &&
          explicitAuthorization(statement)) ||
        (/(?:修改|调整|变更|改变|更改|新增|添加)(?:前|之前|以前)[^.!?;；]{0,24}(?:取得|获得|得到)[^.!?;；]{0,12}(?:用户)?(?:明确)?(?:授权|批准)/i.test(
          statement
        ) &&
          explicitAuthorization(statement) &&
          requiresPriorAuthorization(statement)) ||
        (/(?:未经|未获|without)[^\n]{0,20}(?:用户)?(?:明确)?(?:授权|authorization|approval)[^\n]{0,16}(?:不得|不能|禁止|不应|不可|不要|must not|cannot|never)[^\n]{0,16}(?:调整|修改|变更|新增|改变|change|adjust|modify|add)/i.test(
          statement
        ) &&
          requiresPriorAuthorization(statement)) ||
        (/(?:do not|don't|must not|should not|cannot|never)[^.!?;；]{0,100}(?:modify|change|adjust|add)[^.!?;；]{0,100}without (?:explicit |prior |user |the )*(?:authorization|approval)/i.test(
          statement
        ) &&
          requiresPriorAuthorization(statement))
      const changesLimits = /(?:调整|修改|变更|改变|更改|change(?:s|d|ing)?|adjust(?:s|ed|ment|ments|ing)?|modif(?:y|ies|ied|ying|ication|ications)|modification|modifications)/i
      const addsLimits = /(?:新增|添加|addition|additions|add(?:s|ed|ing)?|introduce|introduces|introduced|new (?:timeout|wait|retry|execution))/i
      const categories = [
        /(?:超时|timeout|deadline|time[ -]?limit|execution time)/i,
        /(?:等待|\bwait(?:ing)?[ -](?:caps?|limits?|ceilings?|upper bounds?)\b)/i,
        /(?:重试|\bretry(?:[ -](?:caps?|limits?|counts?|upper bounds?))?\b)/i
      ]
      const hasUnscopedAdditionAuthorization = statements.some(
        statement =>
          addsLimits.test(statement) &&
          requirementOrProhibition(statement) &&
          !categories.some(category => category.test(statement))
      )
      const hasNamedCategories = categories.some(category => category.test(text))
      const hasUniversalChangeAuthorization =
        hasNamedCategories &&
        statements.some(
          statement =>
            changesLimits.test(statement) &&
            /(?:\b(?:all|any|each|every|such|these|those|above|listed)\b|所有|全部|各类|各项|这类|此类|这些|上述)/i.test(
              statement
            ) &&
            requirementOrProhibition(statement)
        )
      const hasUniversalAdditionAuthorization =
        hasNamedCategories &&
        statements.some(
          statement =>
            addsLimits.test(statement) &&
            /(?:\b(?:all|any|each|every|such|these|those|above|listed)\b|所有|全部|各类|各项|这类|此类|这些|上述)/i.test(
              statement
            ) &&
            requirementOrProhibition(statement)
        )
      const allCategoriesAreCovered = categories.every(category => {
        const authorizedChange = statements.some(
          statement => category.test(statement) && changesLimits.test(statement) && requirementOrProhibition(statement)
        ) || hasUniversalChangeAuthorization
        const authorizedAddition = statements.some(
          statement => category.test(statement) && addsLimits.test(statement) && requirementOrProhibition(statement)
        ) || hasUniversalAdditionAuthorization
        return authorizedChange && (authorizedAddition || hasUnscopedAdditionAuthorization)
      })
      return allCategoriesAreCovered
    }
  },
  {
    label: 'prohibition on loosening limits to pass failing checks',
    test: text =>
      /(?:不得|不能|禁止|不应|不可|不要|must not|should not|cannot|do not|don't)/i.test(text) &&
      /(?:放宽|延长|提高|扩大|调大|上调|增加上限|raise|increase|extend|loosen|relax)/i.test(text) &&
      /(?:失败[^\n]{0,15}检查|未通过[^\n]{0,15}检查|红灯[^\n]{0,15}检查|检查[^\n]{0,15}(?:失败|未通过|变绿|通过)|failed checks?|failing checks?|checks?[^\n]{0,15}(?:fail|pass))/i.test(text)
  },
  {
    label: 'requested value, prior cap, run duration, evidence, and rationale',
    test: text =>
      /(?:目标|拟申请|拟调整|requested|proposed).{0,12}(?:值|上限|分钟|value|cap|limit|minutes?)/i.test(text) &&
      /(?:原(?:有)?(?:值|上限|限制)|(?:当前|现有|原本|之前|prior|previous|current|old).{0,10}(?:值|上限|限制|cap|limit)|prior cap|current cap)/i.test(
        text
      ) &&
      /(?:新增|新设|add(?:ed|ing|ition|itions)?|new|added).{0,30}(?:无|没有|none|no prior)|(?:无|没有|none|no prior).{0,24}(?:旧值|原值|prior value|prior cap)|none.{0,20}(?:for|when) (?:a )?new/i.test(
        text
      ) &&
      /(?:(?:实际|实测).{0,6}(?:耗时|时长|时间)|(?:run|execution).{0,12}(?:duration|elapsed|time))/i.test(text) &&
      /(?:日志|阶段|步骤记录|证据|logs?|stages?|evidence)/i.test(text) &&
      /(?:依据|理由|原因|basis|rationale|reason)/i.test(text)
  },
  {
    label: 'raising a cap requires evidence it was exhausted before work finished',
    test: text =>
      /(?:延长|放宽|提高|调大|加大|上调|增加|raise|increase|extend|loosen)/i.test(text) &&
      /(?:用尽|耗尽|达到|触及|hit|exhaust).{0,20}(?:原|旧|之前|prior|old|existing)?.{0,8}(?:上限|限制|cap|limit)|(?:原|旧|之前|prior|old|existing).{0,8}(?:上限|限制|cap|limit).{0,20}(?:用尽|耗尽|达到|触及|hit|exhaust)/i.test(
        text
      ) &&
      /(?:未完成|尚未完成|仍未完成|没有完成|did not finish|unfinished|incomplete|remained incomplete)/i.test(text) &&
      /(?:上限不足|时限过短|超时限制过短|cap.{0,24}(?:too short|too low|insufficient|cause)|timeout.{0,24}(?:too short|insufficient|cause|responsible)|(?:cause|reason).{0,24}(?:cap|timeout|time limit))/i.test(
        text
      ) &&
      /(?:而非|而不是|并非|rather than|not caused by)/i.test(text) &&
      /(?:其他故障|别的原因|其他原因|other failures?|other causes?)/i.test(text) &&
      hasAffirmativeTimeoutCause(text)
  },
  {
    label: 'use the slowest comparable run',
    test: text =>
      /最慢|slowest/i.test(text) &&
      /(?:可比|同一任务路径|comparable)/i.test(text) &&
      /(?:实测耗时|实测时长|measured duration|elapsed time)/i.test(text)
  },
  {
    label: 'do not infer duration from the fastest or a warm-cache run',
    test: text => {
      const statements = text.split(/[.!?。！？;；]+/u)
      const deniesInference = phrase =>
        statements.some(
          statement =>
            phrase.test(statement) &&
            ((/(?:不得|不能|禁止|不应|不可|不要|must not|may not|shall not|should not|cannot|do not|don't)/i.test(statement) &&
              /(?:推断|估算|判断|infer|estimate|judge)/i.test(statement)) ||
              /(?:\b(?:exclud(?:e|es|ed|ing)|omit|disregard|discard|ignore|leave out|do not use|don't use)|不得采用|不采用|排除|剔除|忽略)[^.!?;；]{0,80}(?:推断|估算|判断|timeout estimate|time estimates?|duration|timing|基准|评估|估算|推断)/i.test(
                statement
              ))
        )
      return deniesInference(/(?:最快|最短|fastest|quickest)/i) &&
        deniesInference(/(?:缓存热|热缓存|缓存已热|warm[ -]?cache|cache[ -]?hot)/i)
    }
  },
  {
    label: 'lowering a limit requires a purpose and normal-path timing that preserves valid work',
    test: text =>
      /(?:收紧|缩短|下调|降低|\blower(?:ing|ed)?\b|\breduc(?:e|ed|ing|tion)\b|\btighten(?:ed|ing)?\b)/i.test(text) &&
      /(?:目的|用途|理由|purpose|reason)/i.test(text) &&
      /(?:正常路径|正常流程|常规路径|normal[ -]path)/i.test(text) &&
      /(?:实测耗时|实测时长|measured duration|elapsed time)/i.test(text) &&
      /(?:新值|新上限|拟定值|new value|new cap|proposed limit)/i.test(text) &&
      preservesValidWorkWhenLowering(text)
  }
])
const REFERENCE_MARKER = '<!-- corpus-status: reference -->'
const REFERENCE_BANNER = '状态：非权威参考'

export function countNonWhitespace(source) {
  return source.replace(/\s/gu, '').length
}

// 围栏代码块与行内 code 里的 `[label](target)` 不是链接：研究笔录常直接贴正则字面量
// （`/[?&](?:worker|raw)\b/`），朴素的行内链接模式会把 `[...](...)` 当成断链。
// 链接扫描前先剥掉这两类片段；剥掉后不再回报行号，所以偏移变化无碍。
//
// 逐行配对而不是一条跨行正则：CommonMark 的围栏只由**同字符、不短于开启行**的围栏行关闭，
// 混用 ``` 与 ~~~ 或 4 反引号里夹 ``` 都会让单条正则提前闭合，把代码泄漏成正文；
// 未闭合的围栏延续到文件尾，也要按这个语义剥。
const FENCE = /^ {0,3}(`{3,}|~{3,})/
const INLINE_CODE = /(`+)([\s\S]*?)\1/g

export function stripCodeSegments(source) {
  const kept = []
  let fence = null
  for (const line of source.split('\n')) {
    const marker = FENCE.exec(line)
    if (fence) {
      // 关闭行必须只有围栏字符（允许行尾空格），且同字符、不短于开启行。
      const closes =
        marker &&
        marker[1][0] === fence.char &&
        marker[1].length >= fence.length &&
        !line.slice(marker[0].length).trim()
      if (closes) fence = null
      kept.push('')
      continue
    }
    // 反引号围栏的 info string 里不能再出现反引号（CommonMark），这种行不是围栏开启。
    if (marker && marker[1][0] === '`' && line.slice(marker[0].length).includes('`')) {
      kept.push(line)
      continue
    }
    if (marker) {
      fence = { char: marker[1][0], length: marker[1].length }
      kept.push('')
      continue
    }
    // 行内 code 按行剥：等长反引号串配对，`` ``a ` b`` `` 这种跨反引号写法也能整段消失。
    kept.push(line.replace(INLINE_CODE, ''))
  }
  return kept.join('\n')
}

// 链接 target 归一为 `{ location, fragment }`；返回 null 表示「不需要判定文件可触达性」：
//   - 远程与协议链接（http(s)、mailto、tel、vscode…）离线无法判定，域名失效也不是本仓漂移；
//   - 纯锚点（`#foo`）只指向本文件，不存在文件可达性问题；
//   - 只有 query 没有路径（`?raw`）同样是本文件派生，不是路径。
// `file.md?raw` 的 query 在文件系统上不存在：剥掉再判可达性，否则会报成断链。
// `[x](./a.md "标题")` 的 title 不是路径的一部分，按 CommonMark 在空白处截断（`<…>` 包裹的除外）。
export function parseLocalLinkTarget(raw) {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const angleEnd = trimmed.startsWith('<') ? trimmed.indexOf('>') : -1
  const spaceStart = trimmed.search(/\s/)
  const target = angleEnd >= 0 ? trimmed.slice(1, angleEnd) : spaceStart >= 0 ? trimmed.slice(0, spaceStart) : trimmed
  if (!target) return null
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return null
  if (target.startsWith('#')) return null
  const hashIndex = target.indexOf('#')
  const fragment = hashIndex < 0 ? '' : target.slice(hashIndex + 1).trim()
  const beforeFragment = hashIndex < 0 ? target : target.slice(0, hashIndex)
  const queryIndex = beforeFragment.indexOf('?')
  const location = (queryIndex < 0 ? beforeFragment : beforeFragment.slice(0, queryIndex)).trim()
  return location ? { location, fragment } : null
}

// 从 `](` 之后的偏移读出一条行内链接的 destination。destination 里的括号是合法的
// （`./a_(b)/c.md`），正则的 `[^)]+` 会把路径切成半截，所以按平衡括号扫。
// 行内链接不跨行：到行尾仍未闭合，说明这不是一条完整链接——返回 null 跳过，
// 而不是把后文一并吞成 target。
export function readInlineLinkTarget(source, start) {
  let depth = 1
  let inAngle = false
  for (let index = start; index < source.length; index += 1) {
    const char = source[index]
    if (char === '\\') {
      index += 1
      continue
    }
    if (char === '\n') return null
    if (inAngle) {
      if (char === '>') inAngle = false
      continue
    }
    if (char === '<' && index === start) inAngle = true
    else if (char === '(') depth += 1
    else if (char === ')') {
      depth -= 1
      if (depth === 0) return source.slice(start, index)
    }
  }
  return null
}

// 相对 target 有两种解析习惯：按当前文件所在目录，或按仓库根。两者结果只在仓库根下的文档里相同，
// 更深的文档写 `docs/input.md` 会落到两个不同文件，换个查看器就跳错——所以非根文档必须显式 `./`、`../`。
// `.` 与 `..` 本身已经是显式的相对写法，不在此列。
export function isUnqualifiedRelativeTarget(location) {
  if (location === '.' || location === '..') return false
  if (location.startsWith('./') || location.startsWith('../')) return false
  return !path.posix.isAbsolute(location)
}

export function scanVolatilePhrases(entries) {
  const violations = []
  for (const { file, source } of entries) {
    for (const { pattern, label } of VOLATILE_PHRASES) {
      if (pattern.test(source)) violations.push({ file, phrase: label })
    }
  }
  return violations
}

export function findUnroutedAgentDocs(agentsSource, files) {
  return files
    .filter(file => file.startsWith('docs/agents/') && file.endsWith('.md'))
    .filter(file => !agentsSource.includes(file))
    .sort()
}

export function findMissingAuthorizationPointers(entries) {
  return (
    entries
      .filter(
        ({ file }) =>
          file === 'AGENTS.md' ||
          file.endsWith('AGENTS.md') ||
          file.startsWith('docs/agents/') ||
          file.startsWith('.agents/rules/')
      )
      // workflow.md 是授权机制的 owner；要求它指向自己会形成自指。
      .filter(({ file }) => file !== 'docs/agents/workflow.md')
      .filter(({ source }) => REMOTE_WRITE.test(source) && !source.includes(AUTHORIZATION_POINTER))
      .map(({ file }) => file)
      .sort()
  )
}

function timeoutAuthorizationBullets(source) {
  const authorizationListStart = source.indexOf('以下操作仍须逐次获得用户明确授权')
  if (authorizationListStart < 0) return []

  const followingHeading = source.slice(authorizationListStart).search(/\n#{1,3}\s/)
  const authorizationList = source.slice(
    authorizationListStart,
    followingHeading < 0 ? undefined : authorizationListStart + followingHeading
  )
  const bullets = []
  for (const line of authorizationList.split('\n')) {
    if (/^-\s/.test(line)) bullets.push([line.slice(2)])
    else if (bullets.length > 0) bullets[bullets.length - 1].push(line)
  }
  const statements = bullets.map(lines => lines.join('\n'))
  const timeoutRelated = /(?:超时|timeout|deadline|time[ -]?limit|runtime|run[ -]?time|execution time|execution[ -]budget|duration|time budget|run budget|execution cap|maximum runtime|重试|\bretry(?:[ -]?(?:caps?|limits?|count|attempts?))?\b|等待上限|\bwait(?:ing)?[ -]?(?:caps?|limits?|ceilings?|upper bounds?)\b|执行时限|收紧|缩短|下调|降低|提高|延长|放宽|裁减|削减|调低|缩减|剪短|最慢|最快|缓存热|热缓存|缓存已热|原上限|旧上限|prior[ -]cap|old[ -]cap|previous.{0,12}(?:limit|cap)|old.{0,12}(?:deadline|limit|cap)|用尽|耗尽|exhaust(?:ed|ion)?|\b(?:lower(?:ing|ed)?|reduc(?:e|es|ed|ing|tion)|tighten(?:ed|ing)?|shorten(?:ed|ing)?|cut(?:s|ting)?|trim(?:s|med|ming)?|raise|increase|extend|loosen|slowest|fastest|warm[ -]?cache)\b|(?:such|these|those|the)\s+(?:changes?|adjustments?)|\b(?:these|those|such|above|aforementioned)\s+(?:fields?|details?|items?|requirements?|information|evidence)\b|(?:这些|那些|此类|上述|前述)(?:字段|细节|项目|要求|信息|证据)|\bthey\b.{0,50}(?:approval|authorization|approved|exempt|required)|(?:这些|此等|上述|这类)\s*(?:变更|调整)|\b(?:any )?(?:changes?|adjustments?)\b[^.!?;；]{0,80}\b(?:approval|authorization)\b[^.!?;；]{0,32}(?:afterward|afterwards|later|subsequently|retroactively|retrospectively|after the fact)|\b(?:runtime|execution)\s+(?:caps?|budgets?)\b[^.!?;；]{0,48}\b(?:exempt|exception|approval|authorization))/i
  const authorizationWaiverReference =
    /(?:\b(?:authorization|approval|consent|permission) requirement(?: above)?\b|\b(?:this|that|these|such) (?:requirement|step)\b|\brequirement above\b)[^.!?;；]{0,48}(?:does not apply|doesn't apply|not apply|waiv|exempt|except|skip|omit)|(?:waiv|exempt|except|skip|omit)[^.!?;；]{0,48}(?:\b(?:authorization|approval|consent|permission) requirement\b|\b(?:this|that|these|such) (?:requirement|step)\b|\brequirement above\b)|\bemergenc(?:y|ies)\b[^.!?;；]{0,48}(?:waiv|pre[- ]?approved|pre[- ]?authori[sz]ed|skip|omit)|(?:waiv|pre[- ]?approved|pre[- ]?authori[sz]ed|skip|omit)[^.!?;；]{0,48}\bemergenc(?:y|ies)\b|(?:紧急|例外|特例)[^。.!?;；]{0,48}(?:可|可以|能够)?(?:豁免|免于|跳过|不适用|无需|不需要|不必)[^。.!?;；]{0,24}(?:上述|前述|本|该)?(?:用户)?(?:授权|批准|许可)(?:要求|步骤|规定)?|(?:紧急|例外|特例)[^。.!?;；]{0,48}(?:上述|前述|本|该)?(?:用户)?(?:授权|批准|许可)(?:要求|步骤|规定)?[^。.!?;；]{0,24}(?:不适用|豁免|免于|跳过|无需|可以不)|(?:上述|前述|本|该)(?:用户)?(?:授权|批准|许可)(?:要求|步骤|规定)[^。.!?;；]{0,48}(?:紧急|例外|特例)?[^。.!?;；]{0,24}(?:不适用|豁免|免于|跳过|无需|可以不)/i
  const referencesPriorRule =
    /\b(?:requirement|step|rule|policy) above\b|\b(?:this|that|the|these|such) (?:requirement|step|rule|policy)\b|\b(?:preceding|previous|prior|foregoing|aforementioned|above)\s+(?:(?:authorization|approval|consent|permission)\s+)?(?:requirement|step|rule|policy)\b|(?:上述|前述|本|该)(?:授权)?(?:要求|步骤|规定)/i
  const authorizationRuleWaiver =
    /\b(?:authorization|approval|consent|permission)\s+(?:rule|policy)(?: above)?\b[^.!?;；]{0,48}(?:does not apply|doesn't apply|not apply|waiv|exempt|except|skip|omit)|(?:does not apply|doesn't apply|not apply|waiv|exempt|except|skip|omit)[^.!?;；]{0,48}\b(?:authorization|approval|consent|permission)\s+(?:rule|policy)(?: above)?\b/i
  const blanketEmergencyApprovalWaiver =
    /(?:\bemergenc(?:y|ies)\b|紧急情况下|紧急时|例外情况下|特例情况下)(?:[^.!?;；]{0,64}(?:\buser\s+)?(?:approval|authorization|consent|permission|用户授权|用户批准|用户许可)[^.!?;；]{0,32}(?:not required|not needed|need not|无需|不需要|不必|免于|豁免|waiv|exempt)|[^.!?;；]{0,96}(?:\b(?:normal|regular)\s+)?(?:approval|authorization)\s+process[^.!?;；]{0,32}\b(?:may|can|could|might)\s+(?:be\s+)?(?:bypassed|circumvented|skipped|omitted))|(?:\b(?:normal|regular)\s+)?(?:approval|authorization)\s+process[^.!?;；]{0,64}\b(?:may|can|could|might)\s+(?:be\s+)?(?:bypassed|circumvented|skipped|omitted)[^.!?;；]{0,64}\bemergenc(?:y|ies)\b/i
  const priorRuleAuthorizationWaiver =
    /\b(?:preceding|previous|prior|foregoing|aforementioned|above)\s+(?:(?:authorization|approval|consent|permission)\s+)?(?:requirement|step|rule|policy)\b[^.!?;；]{0,64}(?:does not apply|doesn't apply|not apply|may be (?:waived|bypassed|skipped|omitted|set aside)|can be (?:waived|bypassed|skipped|omitted|set aside)|(?:is|are) (?:waived|bypassed|skipped|omitted|set aside)|exception|exemption)|\b(?:exception|exemption)s?\s+(?:to|from|for)\s+(?:the\s+)?(?:preceding|previous|prior|foregoing|aforementioned|above)\s+(?:(?:authorization|approval|consent|permission)\s+)?(?:requirement|step|rule|policy)\b[^.!?;；]{0,48}(?:allowed|permitted|may|can|could|might|exist|apply)/i
  const executionBudgetAuthorizationWaiver =
    /\b(?:run[ -]?budgets?|runtime\s+caps?|execution\s+(?:budgets?|caps?))\b[^.!?;；]{0,48}\b(?:are|is)\s+(?:(?:an?\s+)?exception\s+to|exempt\s+from)\s+(?:the\s+)?(?:above|preceding|previous|prior|foregoing)\b[^.!?;；]{0,32}\b(?:approval|authorization|consent|permission)\s+requirement\b/i
  const indirectAuthorizationBypass =
    /\b(?:bypass|circumvent|skip|omit|waive|set aside)\b[^.!?;；]{0,40}\b(?:this|that|the|above|foregoing) (?:requirement|step|rule)\b|\b(?:this|that|the|above|foregoing) (?:requirement|step|rule)\b[^.!?;；]{0,40}\b(?:bypass|circumvent|skip|omit|waive|set aside)/i
  return statements.filter(
    text =>
      timeoutRelated.test(text) ||
      executionBudgetAuthorizationWaiver.test(text) ||
      hasAuthorizationOverrideOutsideUnrelatedOperation(text, hasGenericAuthorizationOverride) ||
      hasAuthorizationOverrideOutsideUnrelatedOperation(text, clause =>
        blanketEmergencyApprovalWaiver.test(clause)
      ) ||
      ((authorizationWaiverReference.test(text) || authorizationRuleWaiver.test(text) || priorRuleAuthorizationWaiver.test(text) || indirectAuthorizationBypass.test(text)) &&
        referencesPriorRule.test(text))
  )
}

function findTimeoutPolicyContradictions(text) {
  const policy = text.replace(/\s+/g, ' ')
  const scope =
    /(?:CI|workflow|E2E|端到端|测试|构建|脚本|toolchain|工具链|超时|timeout|deadline|time[ -]?limit|runtime|run[ -]?time|execution time|execution[ -]budget|duration|time budget|run budget|execution cap|maximum runtime|重试|retry|收紧|缩短|下调|降低|提高|延长|放宽|裁减|削减|调低|缩减|剪短|最慢|最快|缓存热|热缓存|缓存已热|原上限|旧上限|prior[ -]cap|old[ -]cap|previous.{0,12}(?:limit|cap)|old.{0,12}(?:deadline|limit|cap)|用尽|耗尽|exhaust(?:ed|ion)?|\b(?:lower(?:ing|ed)?|reduc(?:e|es|ed|ing|tion)|tighten(?:ed|ing)?|shorten(?:ed|ing)?|cut(?:s|ting)?|trim(?:s|med|ming)?|raise|increase|extend|loosen|slowest|fastest|warm[ -]?cache)\b|(?:such|these|those|the)\s+(?:changes?|adjustments?)|\bthey\b.{0,50}(?:approval|authorization|approved|exempt|required)|(?:这些|此等|上述|这类)\s*(?:变更|调整)|(?:authorization|approval|consent|permission) requirement|requirement above|(?:this|that|these|such) (?:requirement|step)|emergenc(?:y|ies))/i.test(
      policy
    )
  const statements = policy.split(/[.!?。！？;；]+/u)
  const splitClauses = statement =>
    statement.split(/[,，]|\bexcept(?:\s+for)?\b|\bunless\b|\bbut\b|但是|但|除非|除外|除了/iu)
  const statementClauses = statements.map(statement => ({ statement, clauses: splitClauses(statement) }))
  const clauses = statementClauses.flatMap(({ clauses: statementParts }) => statementParts)
  const noRequirement =
    /(?:不须|无需|不需要|不必|无须|不用|不要求|没必要|没有必要|not required|not needed|not necessary|not mandatory|no need to|need not|(?:do|does|did) not need to|don't need to|doesn't need to|didn't need to|(?:do|does|did) not require|don't require|doesn't require|didn't require|isn't required|is not required|(?:shall|should) not be required|no (?:requirement|obligation|need) (?:to|for)|no proof (?:is )?(?:needed|required)|proof is not required|no (?:normal[- ]path )?(?:measurement|timing|duration)s? (?:is )?(?:needed|required|necessary)|no (?:supporting )?(?:evidence|proof|logs?|records?|documentation|measurements?|timing|duration) (?:is )?(?:needed|required|necessary)|there is no need for (?:supporting )?(?:evidence|proof|logs?|records?|documentation|measurements?|timing|duration)|(?:you )?can skip|(?:may|might|could) skip|optional to|(?<!not )optional\b|(?:can|may) provide no|(?:not|never) (?:obliged|obligated) to|(?:may|might|could) (?:omit|leave out)|(?:can|may) omit|(?:may|might|could) be (?:omitted|left out))/i
  const prohibitsRequiredAction = statement =>
    splitClauses(statement).some(
      clause =>
        /(?:must not|mustn't|do not|don't|should not|cannot|can't|不得|禁止|不应|不可|不要|shall not)[^.!?;；]{0,32}(?:include|including|provide|providing|state|stating|record|recording|document|documenting|submit|submitting|show|showing|prove|proving|verify|verifying|check|checking|use|using|rely on|be used|preserve|preserving|maintain|maintaining|retain|retaining|keep|keeping|保留|维持|保存|写明|说明|提供|记录|提交|包含|证明|核实|检查|使用|采用)|(?:prohibited|forbidden|barred)\s+from[^.!?;；]{0,24}(?:include|including|provide|providing|state|stating|record|recording|document|documenting|submit|submitting|show|showing|prove|proving|verify|verifying|check|checking)/i.test(
          clause
        ) &&
        !/(?:do not|don't|should not|cannot|can't|不得|不要) forget to\b/i.test(clause)
    )
  const omitsRequiredAction = (statement, requiredConcept) =>
    ((noRequirement.test(statement) || prohibitsRequiredAction(statement)) && requiredConcept.test(statement)) ||
    (/\bwithout\b[^.!?;；,，]{0,100}\b(?:stat(?:e|es|ed|ing)|provid(?:e|es|ed|ing)|measur(?:e|es|ed|ing)|verif(?:y|ies|ied|ying)|prov(?:e|es|ed|ing)|document(?:s|ed|ing)?|record(?:s|ed|ing)?|check(?:s|ed|ing)?|establish(?:es|ed|ing)?)\b/i.test(
      statement
    ) &&
      requiredConcept.test(statement))
  const weakensRequiredAction = (statement, requiredConcept) => {
    const advisory =
      /(?:建议|推荐|(?<!不)可提供|(?<!不)可说明|(?<!不)可以|能够|可选|非必须|可按|可依据|\b(?:may|can|could|might|should)(?!\s+(?:not|never)\b)\s+(?:state|write|provide|submit|record|document|prove|show|verify|measure|assess|evaluate|use|estimate|confirm)\b|\boptional\b|\brecommended\b|\bsuggested\b|\badvisory\b)/i.test(
        statement
      ) ||
      /(?:is|are)\s+(?:optional|recommended|suggested|advisory)|(?:optional|recommended|suggested|advisory)\s+(?:to|for)\b/i.test(
        statement
      )
    const action =
      /(?:写明|说明|提供|提交|记录|证明|核实|测量|评估|采用|判断|估算|确认|按|(?:to )?(?:state|write|provide|submit|record|document|prove|show|verify|measure|assess|evaluate|use|estimate|confirm))/i.test(
        statement
      )
    return requiredConcept.test(statement) && advisory && action
  }
  const hasNoAuthorizationBase = statement =>
    /(?:无需|无须|不需要|不必|不需|不须|免于|未经|未获|without|with no).{0,24}(?:用户|user )?(?:明确|explicit )?(?:prior )?(?:授权|许可|批准|同意|authorization|approval)/i.test(
      statement
    ) ||
    /without (?:the )?(?:user(?:['’]s)? )?(?:prior |explicit )?(?:authorization|approval|consent|permission)/i.test(
      statement
    ) ||
    /without (?:first )?(?:obtaining|seeking|getting|requesting|receiving) (?:the )?(?:user(?:['’]s)? )?(?:(?:prior |explicit )?)(?:authorization|approval|consent|permission)/i.test(
      statement
    ) ||
    /(?:changes?|adjustments?|authorization|approval)[^.!?;；]{0,24}(?:can|may) be skipped|(?:can|may) skip[^.!?;；]{0,24}(?:user )?(?:authorization|approval)/i.test(
      statement
    ) ||
    ((/(?:timeout|deadline|CI|workflow)[^.!?;；]{0,48}(?:approval|authorization)[^.!?;；]{0,32}(?:advisory|optional|recommended|suggested|non[- ]?binding|not binding)|(?:approval|authorization)[^.!?;；]{0,32}(?:advisory|optional|recommended|suggested|non[- ]?binding|not binding)[^.!?;；]{0,48}(?:timeout|deadline|CI|workflow)/i.test(
      statement
    ) &&
      !/(?:isn't|aren't|is not|are not|not|never|cannot|can't|不得|不能|不应|不可)[^.!?;；]{0,24}(?:advisory|optional|recommended|suggested|non[- ]?binding|not binding)/i.test(
        statement
      ))) ||
    /(?:(?:user |prior |explicit )?(?:authorization|approval|consent|permission))(?:\s+\w+){0,2}\s+(?:may|might|could|can) be omitted|(?:may|might|could|can) omit (?:obtaining |seeking )?(?:the )?(?:(?:user|prior|explicit) )?(?:authorization|approval|consent|permission)/i.test(
      statement
    ) ||
    /\b(?:the )?user (?:need not|does not need to|doesn't need to|is not required to|isn't required to|needn't) approve\b|\busers? (?:are not|required not|need not) to approve\b/i.test(
      statement
    ) ||
    /(?:approval|authorization)\s+(?:can|may|might|could) be (?:obtained|requested|sought|granted) after\b/i.test(
      statement
    ) ||
    /(?:可|可以)(?:先)?[^。.!?;；]{0,16}(?:不取得|不获|不需|无需|不需要|不必|免于)[^。.!?;；]{0,16}(?:用户|user).{0,8}(?:授权|批准|approval|authorization)/i.test(
      statement
    ) ||
    /(?:do not|don't|does not|doesn't|never|need not|needn't|not obliged|not obligated|not required|no need to|there is no need to|unnecessary to)[^.!?;；]{0,24}(?:to )?(?:ask|seek|obtain|get|request|receive)[^.!?;；]{0,16}(?:the )?(?:user|prior|explicit)?\s*(?:authorization|approval)|(?:users?|applicants?)\s+(?:do not|don't|does not|doesn't|need not|needn't|are not obligated|are not obliged)\s+(?:need to )?(?:ask|seek|obtain|get|request|receive)\s+(?:the )?(?:user's |user )?(?:approval|authorization)|(?:no need to|there is no need to|not necessary to|unnecessary to|do not need to|don't need to|need not)\s+(?:ask|seek|consult|contact)\s+(?:the )?user\b|(?:not prohibited|not forbidden|not disallowed|no prohibition (?:on|against))[^.!?;；]{0,48}(?:make|change|modify|adjust)[^.!?;；]{0,48}(?:without|before|prior to)\s+(?:(?:the )?user\s+)?(?:approval|authorization|asking)/i.test(
      statement
    ) ||
    /(?:it is|it's) permissible to (?:change|modify|adjust|raise|increase|extend)[^.!?;；]{0,40}without (?:asking|obtaining|getting) (?:the )?user/i.test(
      statement
    ) ||
    /(?:changes?|adjustments?)[^.!?;；]{0,24}(?:require|need) no (?:(?:prior|user) )?(?:consent|permission|sign[ -]?off)|(?:changes?|adjustments?)[^.!?;；]{0,24}(?:do not|don't|does not|doesn't|need not|do not need|don't need)[^.!?;；]{0,24}(?:consent|permission|sign[ -]?off)/i.test(
      statement
    ) ||
    /no (?:separate|additional|extra) (?:user )?(?:approval|authorization|consent|permission|sign[ -]?off).{0,24}(?:timeout|deadline|CI|workflow)/i.test(
      statement
    ) ||
    /(?:(?:do|does|did) not|don't|doesn't|didn't|must not|mustn't|cannot) (?:require|need)(?: (?:explicit|prior|user))* (?:authorization|approval)|(?:(?:do|does|did) not|don't|doesn't|didn't) need to be approved by (?:the )?(?:user|someone)|(?:require|need) no (?:(?:prior|user) )?(?:authorization|approval)(?:\s+\w+)?|no (?:(?:(?:prior|user|explicit) ){0,3})(?:authorization|approval)\s+(?:is\s+)?(?:required|needed|necessary)|no (?:need for |further |prior |user )?(?:authorization|approval) (?:is )?(?:required|needed|necessary)|(?:authorization|approval).{0,20}(?:not required|not needed|not necessary|not mandatory|unnecessary|isn't required|isn't necessary)|(?:not mandatory|not required|not needed|not necessary).{0,16}(?:prior |user )?(?:authorization|approval)|(?:authorization|approval)\s+(?:is\s+)?(?<!not )optional|(?:permitted|allowed) absent (?:prior )?(?:user )?(?:authorization|approval)|(?:authorized|approved) by default|(?:(?:automatically|deemed) approved|pre[- ]approved)|pre[- ]authorized|automatic approval (?:applies|is granted)|(?:approval|authorization) is assumed|assumed (?:user )?(?:approval|authorization)|assume(?:d)? (?:that )?(?:user )?(?:approval|authorization)|(?:默认为|视为|假定)(?:已经|已)?(?:获)?(?:用户)?(?:授权|批准)|(?:standing|blanket|continuing|default) (?:user )?(?:authorization|approval|consent|sign[ -]?off)/i.test(
      statement
    ) ||
    /\bno\b[^.!?;；]{0,48}(?:requirement|need|obligation) for (?:(?:prior |user |explicit ){0,3})(?:authorization|approval)|\bno\b[^.!?;；]{0,48}(?:timeout|deadline)[^.!?;；]{0,24}(?:changes?|adjustments?)[^.!?;；]{0,24}(?:require|need)[^.!?;；]{0,24}(?:authorization|approval)|\bno\b[^.!?;；]{0,40}(?:changes?|adjustments?)[^.!?;；]{0,24}(?:require|need)[^.!?;；]{0,24}(?:authorization|approval)|(?:changes?|adjustments?)[^.!?;；]{0,24}\bneed not (?:be approved|obtain|receive|get|require)(?:[^.!?;；]{0,16}(?:authorization|approval))?|(?:changes?|adjustments?)[^.!?;；]{0,24}\b(?:shall|should) not require (?:explicit |prior |user )*(?:authorization|approval)/i.test(
      statement
    ) ||
    /\bno\s+(?:requirement|obligation|need)\s+to\s+(?:obtain|get|have|seek|receive)\s+(?:(?:prior|explicit|user)\s+)*(?:authorization|approval)/i.test(
      statement
    ) ||
    /\b(?:automatically|auto(?:matically)?|deemed)\s+authori[sz]ed\b/i.test(statement) ||
    /\b(?:automatically|auto(?:matically)?|deemed)\s+authori[sz]ed\b/i.test(statement) ||
    /(?:changes?|adjustments?)[^.!?;；]{0,24}(?:do not|don't|does not|doesn't|need not|do not need|don't need)[^.!?;；]{0,20}(?:the )?(?:user(?:['’]s)? )?(?:authorization|approval)/i.test(
      statement
    ) ||
    /\b(?:may|can|allowed to|permitted to)\b[^.!?;；]{0,36}\b(?:change|modify|adjust|raise|increase|extend)\b[^.!?;；]{0,36}\b(?:before|prior to|pending)\b[^.!?;；]{0,20}(?:user )?(?:approval|authorization)|(?:changes?|adjustments?|modifications?)\s+(?:are|is)\s+(?:permitted|allowed)\b[^.!?;；]{0,32}\b(?:before|prior to|pending)\b[^.!?;；]{0,20}(?:user )?(?:approval|authorization)|(?:changes?|adjustments?)\s+(?:may|can)\s+(?:proceed|continue|be made)\b[^.!?;；]{0,24}\bpending\b[^.!?;；]{0,16}(?:user )?(?:approval|authorization)/i.test(
      statement
    ) ||
    /(?:allowed|permitted|may proceed|can proceed)[^.!?;；]{0,48}\bunless\b[^.!?;；]{0,24}(?:the )?user\s+(?:objects|vetoes|says no|rejects)/i.test(
      statement
    ) ||
    (/\bpre[- ]?authori[sz]ed\b/i.test(statement) &&
      !/(?:not|never|cannot|can't|不得|不能|不应|不可)[^.!?;；]{0,24}\bpre[- ]?authori[sz]ed\b/i.test(statement))
  const hasNoAuthorization = statement =>
    hasNoAuthorizationBase(statement) &&
    !/(?:not|never|cannot|can't|no longer|不得|不能|不应|不可)[^.!?;；]{0,32}\bpre[- ]?(?:authori[sz]ed|approved)\b/i.test(
      statement
    )
  const hasApprovalExemption = statement =>
    /(?:exempt|excepted|waived)\s+(?:from|for|of)\s+(?:(?:the )?(?:user[ -]|prior |further )?)(?:authorization|approval|consent|sign[ -]?off)|(?:exemption|exception)\s+(?:to|from|for)\s+(?:the\s+)?(?:user\s+)?(?:authorization|approval|consent|sign[ -]?off)(?:\s+requirement)?|not subject to\s+(?:the\s+)?(?:user\s+)?(?:authorization|approval|consent|sign[ -]?off)|(?:authorization|approval|consent|sign[ -]?off).{0,16}(?:exempt|excepted|waived|not required|not mandatory|not needed)|(?:(?:standing|blanket|default|continuing)\s+)?(?:user\s+)?(?:approval|sign[ -]?off)\s+(?:exception|waiver)|(?:authorization|approval) requirement(?: above)?[^.!?;；]{0,48}(?:does not apply|doesn't apply|no longer applies)|\brequirement(?: above)?\b[^.!?;；]{0,48}(?:may|can|might|could) be (?:waived|set aside)|\b(?:timeout|deadline|CI|workflow)[^.!?;；]{0,48}(?:changes?|adjustments?|modifications?)[^.!?;；]{0,32}(?:are|is)\s+(?:exempt|excepted|waived)\s+from\s+(?:this|that|the above|the foregoing)\s+(?:requirement|rule|policy)|\b(?:changes?|adjustments?|modifications?)[^.!?;；]{0,48}(?:are|is)\s+(?:exempt|excepted|waived)\s+from\s+(?:this|that|the above|the foregoing)\s+(?:requirement|rule|policy)|(?:紧急|例外|特例)[^。.!?;；]{0,48}(?:可|可以|能够)?(?:豁免|免于|跳过|不适用|无需|不需要|不必)[^。.!?;；]{0,24}(?:上述|前述|本|该)?(?:用户)?(?:授权|批准|许可)(?:要求|步骤|规定)?|(?:紧急|例外|特例)[^。.!?;；]{0,48}(?:上述|前述|本|该)?(?:用户)?(?:授权|批准|许可)(?:要求|步骤|规定)?[^。.!?;；]{0,24}(?:不适用|豁免|免于|跳过|无需|可以不)|(?:上述|前述|本|该)(?:用户)?(?:授权|批准|许可)(?:要求|步骤|规定)[^。.!?;；]{0,48}(?:紧急|例外|特例)?[^。.!?;；]{0,24}(?:不适用|豁免|免于|跳过|无需|可以不)/i.test(
      statement
    ) ||
    /\b(?:authorization|approval|consent|permission)\s+(?:rule|policy)(?: above)?\b[^.!?;；]{0,48}(?:does not apply|doesn't apply|not apply|waiv|exempt|except|skip|omit)|(?:does not apply|doesn't apply|not apply|waiv|exempt|except|skip|omit)[^.!?;；]{0,48}\b(?:authorization|approval|consent|permission)\s+(?:rule|policy)(?: above)?\b/i.test(
      statement
    ) ||
    /\b(?:preceding|previous|prior|foregoing|aforementioned|above)\s+(?:(?:authorization|approval|consent|permission)\s+)?(?:requirement|step|rule|policy)\b[^.!?;；]{0,64}(?:does not apply|doesn't apply|not apply|may be (?:waived|bypassed|skipped|omitted|set aside)|can be (?:waived|bypassed|skipped|omitted|set aside)|(?:is|are) (?:waived|bypassed|skipped|omitted|set aside))|\b(?:exception|exemption)s?\s+(?:to|from|for)\s+(?:the\s+)?(?:preceding|previous|prior|foregoing|aforementioned|above)\s+(?:(?:authorization|approval|consent|permission)\s+)?(?:requirement|step|rule|policy)\b[^.!?;；]{0,48}(?:allowed|permitted|may|can|could|might|exist|apply)|\b(?:timeout|deadline|CI|workflow|run[ -]?budget|runtime[ -]?cap|execution[ -]?(?:budget|cap))\s+(?:changes?|adjustments?|modifications?)\b[^.!?;；]{0,48}\b(?:are|is|constitute|constitutes)\s+(?:an?\s+)?exception\s+to\s+(?:the\s+)?(?:preceding|previous|prior|foregoing|aforementioned|above)\b[^.!?;；]{0,32}\b(?:approval|authorization|consent|permission)\s+requirement\b/i.test(
      statement
    )
  const allowsAuthorizationBypass = statement =>
    /\b(?:may|can|could|might|allowed|permitted)(?!\s+not)\b[^.!?;；]{0,32}\b(?:bypass|circumvent)\b[^.!?;；]{0,32}\b(?:user )?(?:authorization|approval|consent|permission)/i.test(
      statement
    ) ||
    /\b(?:user )?(?:authorization|approval|consent|permission)\b[^.!?;；]{0,32}\b(?:may|can|could|might)(?!\s+not)\s+be\s+(?:bypassed|circumvented)\b/i.test(
      statement
    )
  const hasIndirectAuthorizationBypass = statement =>
    /\b(?:this|that|the|above|foregoing|preceding|previous|prior) (?:requirement|step|rule|policy)\b[^.!?;；]{0,32}\b(?:may|can|could|might|allowed|permitted)(?!\s+not)\b[^.!?;；]{0,24}(?:be )?(?:bypassed|circumvented|skipped|omitted|waived|set aside)|\b(?:may|can|could|might|allowed|permitted)(?!\s+not)\b[^.!?;；]{0,24}(?:bypass|circumvent|skip|omit|waive|set aside)[^.!?;；]{0,32}\b(?:this|that|the|above|foregoing|preceding|previous|prior) (?:requirement|step|rule|policy)\b/i.test(
      statement
    ) ||
    /\b(?:run[ -]?budgets?|runtime\s+caps?|execution\s+(?:budgets?|caps?))\b[^.!?;；]{0,48}\b(?:are|is)\s+(?:(?:an?\s+)?exception\s+to|exempt\s+from)\s+(?:the\s+)?(?:above|preceding|previous|prior|foregoing)\b[^.!?;；]{0,32}\b(?:approval|authorization|consent|permission)\s+requirement\b/i.test(
      statement
    ) ||
    /\b(?:run[ -]?budgets?|runtime\s+caps?|execution\s+(?:budgets?|caps?))\b[^.!?;；]{0,48}\b(?:are|is)\s+(?:(?:an?\s+)?exception\s+to|exempt\s+from)\s+(?:the\s+)?(?:above|preceding|previous|prior|foregoing)\b[^.!?;；]{0,32}\b(?:approval|authorization|consent|permission)\s+requirement\b/i.test(
      statement
    )
  const deniesApprovalExemption = statement =>
    /(?:no|not|never|cannot|must not)[^.!?;；]{0,40}(?:exempt|excepted|waived|exception|exemption)[^.!?;；]{0,32}(?:from|for|of|to)\s+(?:(?:the\s+)?(?:user\s+)?(?:authorization|approval))|(?:not|no) subject to\s+(?:an?\s+)?(?:user\s+)?(?:authorization|approval)\s+exemption|no\s+(?:(?:standing|blanket|default|continuing)\s+)?(?:user\s+)?(?:authorization|approval)\s+(?:exemption|exception)\b|\b(?:changes?|adjustments?|modifications?)[^.!?;；]{0,48}(?:are|is)\s+not\s+exempt\s+from\s+(?:this|that|the above|the foregoing)\s+requirement/i.test(
      statement
    ) ||
    /\b(?:no|not|never|cannot|must not|do not|don't|is not|are not|isn't|aren't)[^.!?;；]{0,48}\b(?:exception|exemption)s?\b[^.!?;；]{0,48}\b(?:preceding|previous|prior|foregoing|aforementioned|above)\s+(?:(?:authorization|approval|consent|permission)\s+)?(?:requirement|step|rule|policy)\b|\b(?:exception|exemption)s?\s+(?:to|from|for)\s+(?:the\s+)?(?:preceding|previous|prior|foregoing|aforementioned|above)\s+(?:(?:authorization|approval|consent|permission)\s+)?(?:requirement|step|rule|policy)\b[^.!?;；]{0,48}\b(?:not allowed|not permitted|prohibited|forbidden|disallowed|cannot|must not|may not|isn't allowed|aren't allowed|doesn't apply|does not apply)/i.test(
      statement
    )
  const prohibitsUnauthorizedChangeBase = statement =>
    /(?:不得|不能|禁止|不应|不可|不要|must not|should not|cannot|do not|don't|never)[^.!?;；]{0,24}(?:无需|无须|不需要|不必|不需|免于|未经|未获|without)[^.!?;；]{0,24}(?:授权|许可|批准|同意|authorization|approval)|(?:未经|未获|未取得|without)[^.!?;；]{0,24}(?:授权|许可|批准|同意|authorization|approval)[^.!?;；]{0,20}(?:不得|不能|禁止|不应|不可|不要|must not|should not|cannot|never)[^.!?;；]{0,20}(?:调整|修改|变更|新增|改变|延长|放宽|提高|增加|change|adjust|modify|add|extend|raise|increase)|(?:cannot|can not|may not|might not|must not|should not|never|not allowed to|不得|不能|禁止|不应|不可|不要)[^.!?;；]{0,32}(?:make|made|change|adjust|increase|raise|extend|修改|调整|改变)[^.!?;；]{0,24}(?:without|unless)\s+(?:asking|obtaining|getting|prior|explicit|user|the|approval|authorization)*|(?:no|not|never|cannot|must not|do not|don't)[^.!?;；]{0,24}(?:changes?|adjustments?|increases?|extensions?)[^.!?;；]{0,24}(?:without|unless|prior to)\s+(?:(?:user )?(?:authorization|approval))/i.test(
      statement
    )
  const prohibitsUnauthorizedChange = statement =>
    prohibitsUnauthorizedChangeBase(statement) ||
    /(?:do not|don't|must not|should not|cannot|never)[^.!?;；]{0,100}(?:modify|change|adjust|add)[^.!?;；]{0,100}without (?:explicit |prior |user |the )*(?:authorization|approval)/i.test(
      statement
    )
  const requiresAuthorizationBeforeChangeBase = statement =>
    /(?:未经|未获|without)[^.!?;；]{0,24}(?:授权|许可|批准|同意|authorization|approval)[^.!?;；]{0,20}(?:不得|不能|禁止|不应|不可|不要|must not|should not|cannot)[^.!?;；]{0,20}(?:调整|修改|变更|新增|改变|延长|放宽|提高|增加|change|adjust|modify|add|extend|raise|increase)/i.test(
      statement
  )
  const requiresAuthorizationBeforeChange = statement =>
    requiresAuthorizationBeforeChangeBase(statement) ||
    /(?:do not|don't|must not|should not|cannot|never)[^.!?;；]{0,100}(?:modify|change|adjust|add)[^.!?;；]{0,100}without (?:explicit |prior |user |the )*(?:authorization|approval)/i.test(
      statement
    )
  const approvalAfterChange =
    /\b(?:make|change|modify|adjust|raise|increase|extend)(?:s|d|ed|ing)?\b[^.!?]{0,64}\bfirst\b[^.!?]{0,64}\b(?:obtain|seek|get|request|receive)(?:s|ed|ing)?\b[^.!?]{0,24}\b(?:user )?(?:approval|authorization)\b[^.!?]{0,24}\b(?:afterward|afterwards|later|subsequently)\b/i.test(
      policy
    ) ||
    /\b(?:approval|authorization)\b[^.!?]{0,32}\b(?:obtained|requested|sought|granted)\b[^.!?]{0,32}\bafter\b[^.!?]{0,32}\b(?:change|modif|adjust|rais|increas|extend)/i.test(
      policy
    ) ||
    /\b(?:timeout|deadline|CI|workflow|any )?(?:changes?|adjustments?|modifications?)\b[^.!?]{0,80}(?:may|can) be (?:made|applied|implemented)\b[^.!?]{0,80}\b(?:approval|authorization)\b[^.!?]{0,32}(?:can be )?(?:requested|obtained|sought|granted)[^.!?]{0,24}\b(?:afterward|afterwards|later|subsequently)\b/i.test(
      policy
    ) ||
    /(?:\b(?:retroactive(?:ly)?|retrospective(?:ly)?|after[- ]the[- ]fact|post[- ]hoc)\b[^.!?;；]{0,48}\b(?:approval|authorization|consent|permission|approv(?:e|ed|al)|authori[sz](?:e|ed|ation))\b|\b(?:approval|authorization|approv(?:e|ed|al)|authori[sz](?:e|ed|ation))\b[^.!?;；]{0,48}\b(?:retroactive(?:ly)?|retrospective(?:ly)?|after[- ]the[- ]fact|post[- ]hoc)\b|(?:事后|追认|补办)[^。.!?;；]{0,24}(?:授权|批准|许可|同意)|(?:授权|批准|许可|同意)[^。.!?;；]{0,24}(?:事后|追认|补办))/i.test(
      policy
    )
    ||
    /\b(?:approval|authorization)\b[^.!?;；]{0,24}\b(?:may|can|could|might)\s+be\s+(?:given|granted|provided|issued|obtained|received)[^.!?;；]{0,40}\bafter\b[^.!?;；]{0,32}\b(?:the )?(?:change|modification|adjustment|implementation)\b/i.test(
      policy
    ) ||
    /\b(?:apply|make|implement|change|modify|adjust|raise|increase|extend)(?:s|d|ed|ing)?\b[^.!?]{0,48}\bfirst\b[^.!?]{0,48}\b(?:ask|seek|obtain|get|request|receive)(?:s|ed|ing)?\b[^.!?]{0,24}\b(?:the )?user\b[^.!?]{0,24}\b(?:afterward|afterwards|later|subsequently|after the change|after the fact)\b/i.test(
      policy
    ) ||
    /\b(?:changes?|adjustments?|modifications?|increases?|extensions?)\b[^.!?;；]{0,40}\b(?:may|can)\s+be\s+(?:approved|authorized|authorised)[^.!?;；]{0,40}\b(?:after\s+(?:completion|implementation|the fact)|subsequently|later)\b|\b(?:changes?|adjustments?|modifications?|increases?|extensions?)\b[^.!?;；]{0,32}\b(?:may|can)\s+be\s+(?:made|changed|applied)[^.!?;；]{0,32}\bwith\s+(?:subsequent|later|retroactive|retrospective)\s+(?:user\s+)?(?:approval|authorization|authorisation)\b/i.test(
      policy
    )
  const approvalIsOptOut = statements.some(statement =>
    /(?:allowed|permitted|may proceed|can proceed)[^.!?;；]{0,48}\bunless\b[^.!?;；]{0,24}(?:the )?user\s+(?:objects|vetoes|says no|rejects)/i.test(
      statement
    ) ||
    /(?:timeout|deadline|CI|workflow|runtime|run[ -]?time|execution(?: time)?|wait(?:ing)?(?: cap)?|retry(?: cap)?)[^.!?;；]{0,48}(?:changes?|adjustments?|modifications?|increases?|raises?|extensions?)[^.!?;；]{0,40}(?:may|can|could|might)\s+(?:proceed|continue|be made|be applied|move forward)[^.!?;；]{0,40}(?:(?:while|pending|before|until)[^.!?;；]{0,24}(?:approval|authorization|the user responds|the user replies)|without(?: first)?\s+(?:asking|consulting|contacting)\s+(?:the )?user)|(?:if|when)\s+(?:user )?(?:approval|authorization)\s+(?:is )?(?:delayed|pending)[^.!?;；]{0,48}(?:apply|make|change|implement|raise|increase|extend)[^.!?;；]{0,32}(?:timeout|deadline|CI|workflow|runtime|run[ -]?time|execution(?: time)?|wait(?:ing)?(?: cap)?|retry(?: cap)?)|\bnever\s+(?:ask|seek|obtain|get|request|receive)\b[^.!?;；]{0,40}\b(?:user )?(?:approval|authorization)\b[^.!?;；]{0,40}\b(?:before|prior to)\b[^.!?;；]{0,24}\b(?:change|modify|adjust|raise|increase|extend|add)[a-z]*\b[^.!?;；]{0,24}\b(?:timeout|deadline|CI|workflow|runtime|run[ -]?time|execution(?: time)?|wait(?:ing)?(?: cap)?|retry(?: cap)?)/i.test(
      statement
    )
  )
  const approvalAfterImplementation =
    /(?:timeout|deadline|CI|workflow)[^.!?]{0,48}(?:changes?|adjustments?|modifications?)[^.!?]{0,32}(?:may|can) be approved after (?:implementation|being made|the change|the adjustment)/i.test(
      policy
    ) ||
    /\b(?:the )?users?\b[^.!?;；]{0,24}\b(?:may|can|could|might)\s+(?:approve|authori[sz]e)\b[^.!?;；]{0,48}\b(?:timeout|deadline|CI|workflow|runtime|run[ -]?time|execution(?: time)?)[^.!?;；]{0,24}\b(?:changes?|adjustments?|modifications?)\b[^.!?;；]{0,32}\b(?:afterward|afterwards|later|subsequently|after implementation|after the change)\b/i.test(
      policy
    )
  const implicitAuthorization = statement => {
    const affirmative =
      /\b(?:approval|authorization|consent|permission)\b[^.!?;；]{0,64}\b(?:presumed|assumed|deemed|implicit(?:ly)?|implied)\b/i.test(
        statement
      ) ||
      /\b(?:presumed|assumed|deemed|implicit(?:ly)?|implied)\b[^.!?;；]{0,32}\b(?:approval|authorization|consent|permission)\b/i.test(
        statement
      ) ||
      /\b(?:timeout|deadline|CI|workflow)[^.!?;；]{0,48}(?:changes?|adjustments?|modifications?)[^.!?;；]{0,32}\b(?:are|is)\s+(?:presumed|assumed|deemed)\s+(?:to be\s+)?(?:authorized|authorised|approved)\b/i.test(
        statement
      ) ||
      /\b(?:timeout|deadline|CI|workflow)[^.!?;；]{0,48}(?:changes?|adjustments?|modifications?)[^.!?;；]{0,32}\b(?:carry|imply|include)(?:\s+an?)?\s+(?:implied|implicit|presumed|default)\s+(?:user\s+)?(?:approval|authorization)\b/i.test(
        statement
      )
    const deniesPresumption =
      /\b(?:not|never|cannot|can't|must not|should not|不得|不能|不应|不可)\b[^.!?;；]{0,24}\b(?:presumed|assumed|deemed|implicit(?:ly)?|implied)\b/i.test(
        statement
      ) ||
      /\b(?:presumed|assumed|deemed|implicit(?:ly)?|implied)\s+(?:(?:to|be)\s+)?(?:not|never)\s+(?:authorized|authorised|approved)\b/i.test(
        statement
      )
    return affirmative && !deniesPresumption
  }
  const authorizationNotRequired = statement =>
    implicitAuthorization(statement) ||
    /(?:timeout|deadline|CI|workflow)[^.!?;；]{0,48}(?:changes?|adjustments?|modifications?|values?)[^.!?;；]{0,36}(?:do not|don't|does not|doesn't|need not|needn't|not required|not compulsory|not subject to|are exempt|is exempt|are excepted|is excepted)[^.!?;；]{0,40}(?:authorization|approval|consent|permission|sign[ -]?off|mandatory approval|compulsory approval|requirement to obtain)/i.test(
      statement
    ) ||
    /(?:timeout|deadline|CI|workflow)[^.!?;；]{0,48}(?:changes?|adjustments?|modifications?|values?)[^.!?;；]{0,36}(?:not required|need not|needn't|not necessary|not compulsory|not mandatory)[^.!?;；]{0,24}(?:to be )?(?:approved|authorized|authorised)(?: by (?:the )?user)?/i.test(
      statement
    ) ||
    /(?:timeout|deadline|CI|workflow)[^.!?;；]{0,48}(?:changes?|adjustments?|modifications?|values?)[^.!?;；]{0,32}(?:do not|does not|don't|doesn't)\s+need to be\s+(?:approved|authorized|authorised)(?: by (?:the )?user)?/i.test(
      statement
    ) ||
    /(?:users?|applicants?|the user)\s+(?:are |is )?(?:not required|need not|needn't|not obligated|not obliged)\s+(?:to\s+)?(?:approve|authorize|grant|give|provide|sign[ -]?off on)\b[^.!?;；]{0,48}(?:timeout|deadline|CI|workflow)/i.test(
      statement
    ) ||
    /(?:timeout|deadline|CI|workflow)[^.!?;；]{0,48}(?:changes?|adjustments?|modifications?|values?)[^.!?;；]{0,40}(?:can|may) be changed[^.!?;；]{0,32}without[^.!?;；]{0,24}(?:the )?user\s+(?:authori[sz]ing|approving|permitting|granting)/i.test(
      statement
    ) ||
    /(?:timeout|deadline|CI|workflow)[^.!?;；]{0,48}(?:changes?|adjustments?|modifications?|values?)[^.!?;；]{0,36}(?:may|can) be (?:made|changed|implemented|adjusted)[^.!?;；]{0,32}without(?: first)?\s+(?:the )?(?:user(?:['’]s)?\s+)?(?:approval|authorization|consent|permission|sign[ -]?off)/i.test(
      statement
    ) ||
    /(?:timeout|deadline|CI|workflow)[^.!?;；]{0,48}(?:changes?|adjustments?|modifications?)[^.!?;；]{0,36}(?:may|can)\s+(?:proceed|continue|be made|change|be changed)[^.!?;；]{0,32}without(?: first)?\s+(?:asking|consulting|contacting)\s+(?:the )?user/i.test(
      statement
    ) ||
    /(?:timeout|deadline|CI|workflow)[^.!?;；]{0,48}(?:changes?|adjustments?|modifications?)[^.!?;；]{0,40}(?:may|can)\s+(?:proceed|continue|be made|change|be changed)[^.!?;；]{0,32}\b(?:before|prior to)\b[^.!?;；]{0,28}(?:(?:receiving|obtaining|getting)\s+)?(?:explicit )?(?:user )?(?:approval|authorization)/i.test(
      statement
    ) ||
    /(?:approval|authorization)\b[^.!?;；]{0,32}(?:not compulsory|not mandatory|isn't compulsory|is not compulsory|isn't mandatory|is not mandatory)|(?:timeout|deadline|CI|workflow)[^.!?;；]{0,40}(?:changes?|adjustments?|modifications?)[^.!?;；]{0,28}not subject to[^.!?;；]{0,24}(?:mandatory|compulsory)\s+(?:user )?(?:approval|authorization)/i.test(
      statement
    ) ||
    /(?:timeout|deadline|CI|workflow)[^.!?;；]{0,48}(?:changes?|adjustments?|modifications?)[^.!?;；]{0,24}(?:exempt|excepted)\s+from\s+(?:the )?(?:requirement|obligation)\s+to\s+(?:obtain|receive|get|seek)\s+(?:user )?(?:approval|authorization)/i.test(
      statement
    ) ||
    /(?:timeout|deadline|CI|workflow)[^.!?;；]{0,40}(?:changes?|adjustments?)[^.!?;；]{0,28}need not be permitted by (?:the )?user/i.test(
      statement
    ) ||
    /(?:timeout|deadline|CI|workflow)[^.!?;；]{0,48}(?:changes?|adjustments?|modifications?|values?)[^.!?;；]{0,32}(?:may|might|could) not (?:require|need|be subject to)[^.!?;；]{0,24}(?:user )?(?:authorization|approval|consent|permission)|(?:user )?(?:authorization|approval|consent|permission)[^.!?;；]{0,32}(?:may|might|could) not be necessary[^.!?;；]{0,32}(?:timeout|deadline|CI|workflow)|(?:approval|authorization)[^.!?;；]{0,24}(?:is not|isn't) always required[^.!?;；]{0,32}(?:timeout|deadline|CI|workflow)/i.test(
      statement
    ) ||
    /\b(?:explicit\s+)?(?:prior\s+)?(?:user\s+)?(?:approval|authorization|consent|permission)\b[^.!?;；]{0,32}\b(?:is not|isn't|not a)\s+(?:a\s+)?prerequisite\s+(?:for|to)\b[^.!?;；]{0,32}\b(?:timeout|deadline|CI|workflow)\b/i.test(
      statement
    )
  const approvalBypass = statementClauses.some(({ statement, clauses: statementParts }) =>
    statementParts.some(
      clause =>
        allowsAuthorizationBypass(clause) ||
        hasIndirectAuthorizationBypass(clause) ||
        ((hasNoAuthorization(clause) || hasApprovalExemption(clause) || authorizationNotRequired(clause)) &&
        !deniesApprovalExemption(clause) &&
        !prohibitsUnauthorizedChange(clause) &&
        !requiresAuthorizationBeforeChange(statement))
    ) || approvalAfterChange || approvalAfterImplementation || approvalIsOptOut
  )
  const genericAuthorizationBypass = statements.some(
    statement =>
      hasAuthorizationOverrideOutsideUnrelatedOperation(
        statement,
        hasGenericAuthorizationOverride
      )
  )
  const canChangeWithoutAskingUser = clauses.some(statement => {
    const positivePermission =
      /\b(?:can|may|allowed to|permitted to)\b[^.!?;；]{0,24}(?:make|made|change|adjust|increase|raise|extend)[^.!?;；]{0,24}without (?:asking|obtaining|getting) (?:the )?user/i.test(
        statement
      ) ||
      /\b(?:can|may|could|might)\s+be\s+(?:changed|modified|adjusted)\b[^.!?;；]{0,48}\bwithout\s+(?:first\s+)?(?:securing|obtaining|getting|asking for)\b[^.!?;；]{0,24}\b(?:the\s+)?user(?:['’]s)?\s+(?:approval|authorization)/i.test(
        statement
      ) ||
      /(?:changes?|adjustments?)\s+(?:are|is)\s+(?:allowed|permitted)\b[^.!?;；]{0,24}without (?:asking|obtaining|getting) (?:the )?user/i.test(
        statement
      ) ||
      /(?:not prohibited|not forbidden|not disallowed|no prohibition (?:on|against))[^.!?;；]{0,48}(?:make|making|change|changing|modify|modifying|adjust|adjusting)[^.!?;；]{0,48}(?:without|before|prior to)\s+(?:(?:the )?user\s+)?(?:approval|authorization|asking)/i.test(
        statement
      ) ||
      (!/(?:not|never|cannot|can't|不得|不能|不应|不可)\s+(?:acceptable|okay|fine|permitted|allowed)\b/i.test(statement) &&
        /\b(?:acceptable|okay|fine|permitted|allowed)\s+to\s+(?:make|change|modify|adjust|raise|increase|extend)\b[^.!?;；]{0,72}(?:without\s+(?:first\s+)?(?:asking|obtaining|getting)\s+(?:the\s+)?user|\b(?:before|prior to)\s+(?:asking|obtaining|getting)\s+(?:the\s+)?user)/i.test(
          statement
        )) ||
      /\b(?:can|may|could|might)\s+(?:be\s+)?(?:changed|modified|adjusted)\b[^.!?;；]{0,56}\bwithout\s+(?:first\s+)?asking\s+(?:the\s+)?user\b/i.test(
        statement
      )
    const negativePermission =
      /\b(?:cannot|can not|may not|might not|must not|should not)\b[^.!?;；]{0,40}(?:make|made|change|adjust|increase|raise|extend)[^.!?;；]{0,24}without (?:asking|obtaining|getting) (?:the )?user/i.test(
        statement
      )

    return positivePermission && !negativePermission
  })
  const relaxationToPass = statements.some(statement => {
    const passesCheck = /(?:变绿|通过|过关|make .{0,16}(?:pass|green)|turn .{0,16}green|checks? .{0,20}(?:pass|green)|to pass (?:checks|tests)|get (?:the )?(?:CI|build|pipeline|checks?) (?:to )?green|get (?:a|the)? ?(?:failing|failed) (?:check|test|build) to pass|(?:resolve|fix) (?:a |the )?(?:failing|failed) (?:check|test|build)|(?:if|when).{0,20}(?:checks?|tests?|builds?|pipeline).{0,16}(?:fail|failing|failed|red)|(?:approved|permitted|allowed) (?:resolution|fix|workaround) for (?:the )?(?:failing|failed) (?:checks?|tests?|builds?|pipeline)|(?:CI|build|pipeline) (?:goes|turns?) green|(?:in response to|as a response to|in reaction to|because of)\s+(?:a )?(?:failed|failing)\s+(?:check|test|build)|\bafter\s+(?:a\s+)?(?:check|test|build)\s+(?:has\s+)?fail(?:ed|s)|(?:failed|failing)\s+(?:check|test|build)[^.!?;；]{0,40}(?:can|may) be (?:addressed|resolved|fixed|handled) by (?:raising|increasing|extending|loosening)|(?:针对|作为对|回应|响应)[^。.!?;；]{0,20}(?:失败|未通过)[^。.!?;；]{0,24}(?:检查|测试|构建))/i.test(
      statement
    )
    if (!passesCheck) return false

    return statement
      .split(/[,，]|\bbut\b|但是|但/iu)
      .some(clause => {
    const changesLimit =
          /(?:放宽|延长|提高|调大|上调|增加|扩大|\b(?:rais(?:e|es|ed|ing)|increas(?:e|es|ed|ing)|extend(?:s|ed|ing)?|loosen(?:s|ed|ing)?|relax(?:es|ed|ing)?)\b)/i.test(
            clause
          )
        if (!changesLimit) return false
        const statesNoProhibition =
          /(?:not|never)\s+(?:forbidden|prohibited|disallowed|banned)|no (?:prohibition|ban)\s+(?:on|against)|does not prohibit/i.test(
            clause
          )
        const prohibitsChange =
          /(?:不得|不能|禁止|不应|不可|不要|不可以|must not|should not|cannot|do not|don't|never|no need to|does not need to|forbid|ban)[^.!?;；,，]{0,48}(?:放宽|延长|提高|调大|上调|增加|扩大|raise|increase|extend|loosen|relax)|(?:放宽|延长|提高|调大|上调|增加|扩大|raise|increase|extend|loosen|relax)[^.!?;；,，]{0,20}(?:不允许|禁止|forbidden|not allowed|prohibited)/i.test(
            clause
          )
        return !prohibitsChange || statesNoProhibition
      })
  })
  const exceptionToNoRelaxation = statements.some(statement => {
    const [baseRule, ...exceptions] = statement.split(
      /\bexcept(?:\s+for)?\b|\bunless\b|\bbut\b|但是|但|除非|除外|除了/iu
    )
    if (exceptions.length === 0) return false

    const passTarget = /(?:变绿|通过|过关|make .{0,16}(?:pass|green)|turn .{0,16}green|checks? .{0,20}(?:pass|green)|to pass (?:checks|tests))/i.test(
      baseRule
    )
    const prohibitedRelaxation = /(?:放宽|延长|提高|调大|上调|增加|扩大|\b(?:rais(?:e|es|ed|ing)|increas(?:e|es|ed|ing)|extend(?:s|ed|ing)?|loosen(?:s|ed|ing)?|relax(?:es|ed|ing)?)\b)/i.test(
      baseRule
    ) && /(?:不得|不能|禁止|不应|不可|不要|不可以|must not|should not|cannot|do not|don't|never|forbid|ban)[^.!?;；,，]{0,48}(?:放宽|延长|提高|调大|上调|增加|扩大|raise|increase|extend|loosen|relax)/i.test(
      baseRule
    )
    return passTarget && prohibitedRelaxation && exceptions.length > 0
  })
  const exceptionToApprovalRule = statements.some(statement => {
    const [baseRule, ...exceptions] = statement.split(
      /\bexcept(?:\s+for)?\b|\bunless\b|\bbut\b|但是|但|除非|除外|除了/iu
    )
    const requiresApproval = part =>
      /(?:must|require|requires|need|needs|须|必须|需要|subject to|only after|once approved|if the user has already).{0,32}(?:explicit )?(?:user )?(?:authorization|approval|授权|approved)|(?:authorization|approval).{0,24}(?:required|mandatory)|approved by (?:the )?user/i.test(
        part
      )
    const baseRequiresApproval = requiresApproval(baseRule)
    const deniesApproval = /(?:no|not|never|cannot|must not)[^.!?;；]{0,48}(?:exempt|excepted|waived|exception|exemption)[^.!?;；]{0,32}(?:from|for|of|to)\s+(?:(?:the\s+)?(?:user\s+)?(?:authorization|approval))/i.test(
      baseRule
    )
    const exceptionWaivesApproval = part => {
      if (requiresApproval(part)) return false
      if (
        hasNoAuthorization(part) ||
        hasApprovalExemption(part) ||
        /(?:skip|omit|waiv|bypass|without)[^.!?;；]{0,32}(?:this|the|user|prior|explicit)?\s*(?:step|requirement|approval|authorization)|(?:this|the) (?:step|requirement) (?:may|can|might|could) be (?:skipped|waived|omitted)/i.test(
          part
        )
      )
        return true

      // A bare exception condition carves that condition out of the approval rule in the base clause.
      return baseRequiresApproval && !/(?:approval|authorization|批准|授权)/i.test(part)
    }
    return (
      (deniesApproval || baseRequiresApproval) && exceptions.some(exceptionWaivesApproval)
    )
  })
  const contradictsApplicationEvidence = statements.some(
    statement => {
      return (noRequirement.test(statement) ||
        prohibitsRequiredAction(statement) ||
        weakensRequiredAction(
          statement,
          /(?:目标值|拟申请值|target value|requested value|proposed value|当前.{0,8}上限|原(?:有)?上限|run.{0,16}(?:耗时|duration|elapsed|time)|execution duration|actual execution time|实测耗时|日志|阶段证据|evidence|logs?|basis|rationale|目标依据|documentation|supporting documents?|(?:requested|proposed|target|current|prior|original|timeout) timeout value|timeout (?:target|proposed|requested|current|prior|original) value|prior cap|run duration)/i
        )) &&
      /(?:目标值|拟申请值|target value|requested value|proposed value|当前.{0,8}上限|原(?:有)?上限|run.{0,16}(?:耗时|duration|elapsed|time)|execution duration|actual execution time|实测耗时|日志|阶段证据|evidence|logs?|basis|rationale|目标依据|documentation|supporting documents?|(?:requested|proposed|target|current|prior|original|timeout) timeout value|timeout (?:target|proposed|requested|current|prior|original) value)/i.test(
        statement
      )
    }
  ) || statements.some(
    statement =>
      /(?:no proof (?:is )?(?:needed|required)|proof is not required|无需证明|不需要证明|不必证明)[^.!?;；]{0,32}(?:timeout|deadline|超时|时限|上限)|(?:timeout|deadline|超时|时限|上限)[^.!?;；]{0,32}(?:no proof (?:is )?(?:needed|required)|proof is not required|无需证明|不需要证明|不必证明)/i.test(
        statement
      ) ||
      /(?:timeout|deadline|超时|时限|上限)[^.!?;；]{0,32}(?:do not|don't|does not|doesn't|need not|needn't|not required to|不须|无需|不必|不需要)[^.!?;；]{0,20}(?:provide|submit|include|supply|require)?\s*proof|(?:proof|证明)[^.!?;；]{0,32}(?:not required|not needed|无需|不必|不需要)[^.!?;；]{0,24}(?:timeout|deadline|超时|时限|上限)/i.test(
        statement
      )
  ) || statements.some(
    statement =>
      /(?:\b(?:timeout|deadline|CI|workflow)[^.!?;；]{0,64}\b(?:changes?|adjustments?|modifications?|requests?|applicants?)\b|\b(?:changes?|adjustments?|modifications?|requests?)\b[^.!?;；]{0,48}\b(?:timeout|deadline|CI|workflow)\b)[^.!?;；]{0,40}\b(?:may|can|could|might|allowed|permitted|acceptable)\b[^.!?;；]{0,40}\b(?:without|in the absence of)\b[^.!?;；]{0,24}\b(?:evidence|proof|logs?|records?|documentation|supporting documents?)\b/i.test(
        statement
      )
  ) || statements.some(
    statement =>
      (noRequirement.test(statement) ||
        /\b(?:fields?|details?|items?|requirements?|information|evidence)\b[^.!?;；]{0,24}\b(?:are\s+)?(?:optional|may be omitted|might be omitted|could be omitted|can be omitted|may be left out|might be left out|could be left out|need not be included|needn't be included)\b/i.test(
          statement
        )) &&
      /\b(?:these|those|such|above|aforementioned)\s+(?:fields?|details?|items?|requirements?|information|evidence)\b|(?:这些|那些|此类|上述|前述)(?:字段|细节|项目|要求|信息|证据)/i.test(
        statement
      ) &&
      /(?:目标值|拟申请值|target value|requested value|proposed value|当前.{0,8}上限|原(?:有)?上限|actual execution time|execution duration|run duration|实测耗时|日志|阶段证据|evidence|logs?|rationale|目标依据)/i.test(
        policy
      )
  )
  const contradictsRaisingProof = statements.some(statement => {
    const omitsExhaustionOrCauseProof =
      omitsRequiredAction(
        statement,
        /(?:用尽|耗尽|达到|触及|reach(?:ed)?|attain(?:ed)?|exhaust|hit|原上限|旧上限|prior[ -]cap|old[ -]cap|(?:prior|previous|old).{0,12}(?:timeout|time[ -]?limit|deadline|limit|cap)|原因是|原因在于|rather than|other failures?|timeout.{0,24}(?:caus|reason|responsible)|(?:caus|reason|responsible).{0,24}timeout)/i
      )
    const permitsRaiseDespiteAnotherCause =
      /(?:延长|放宽|提高|rais(?:e|es|ed|ing)|increas(?:e|es|ed|ing)|extend(?:s|ed|ing)?)/i.test(statement) &&
      /(?:acceptable|allowed|permitted|may|can|okay|fine)/i.test(statement) &&
      /(?:another|other) failures?.{0,24}(?:caus|responsible)|(?:caus|responsible).{0,24}(?:another|other) failures?|(?:failures?|errors?)[^.!?;；]{0,40}(?:caused? by|due to|from)[^.!?;；]{0,32}(?:network|dependency|environment|configuration|infrastructure|another issue)|(?:caused? by|due to|from)[^.!?;；]{0,32}(?:network|dependency|environment|configuration|infrastructure|another issue)[^.!?;；]{0,40}(?:failures?|errors?)|(?:network|dependency|environment|configuration|infrastructure)[^.!?;；]{0,24}(?:failure|error)[^.!?;；]{0,48}(?:caus|responsible)|(?:failure|error)[^.!?;；]{0,48}(?:unrelated to|not related to|independent of)[^.!?;；]{0,24}(?:timeout|time limit)|(?:unrelated to|not related to|independent of)[^.!?;；]{0,24}(?:timeout|time limit)|(?:failure|error) was not caused by (?:a )?(?:timeout|time limit)|(?:timeout|time limit) was not (?:the )?cause|no timeout (?:occurred|error occurred)|(?:rather than|instead of)[^.!?;；]{0,24}(?:a )?(?:timeout|time limit)|(?:when|if|because(?: of)?|due to|caused by|in response to)[^.!?;；]{0,48}(?:out[- ]of[- ]memory|\bOOM\b|memory|compiler|network|dependency|environment|configuration|infrastructure|worker|process|disk|resource)[^.!?;；]{0,32}(?:failure|error|crash|issue|problem|fault)|(?:out[- ]of[- ]memory|\bOOM\b|memory|compiler|network|dependency|environment|configuration|infrastructure|worker|process|disk|resource)[^.!?;；]{0,32}(?:failure|error|crash|issue|problem|fault)[^.!?;；]{0,40}(?:timeout|time limit) (?:was not|is not|isn't) (?:the )?cause/i.test(
        statement
      )
    const permitsIncreaseForOtherFailure =
      /(?:延长|放宽|提高|rais(?:e|es|ed|ing)|increas(?:e|es|ed|ing)|extend(?:s|ed|ing)?)/i.test(statement) &&
      /(?:acceptable|allowed|permitted|may|can|okay|fine)/i.test(statement) &&
      /(?:to address|to resolve|to fix|to handle|in response to|because of|due to|for)[^.!?;；]{0,48}(?:network|dependency|environment|configuration|infrastructure|out[- ]of[- ]memory|\bOOM\b|memory|compiler|worker|process|disk|resource)[^.!?;；]{0,24}(?:failure|error|crash|issue|problem|fault|latency|slow)?/i.test(
        statement
      ) &&
      !/(?:not|never|cannot|can't|must not|should not|不得|不能|不应|不可)[^.!?;；]{0,24}(?:permitted|allowed|acceptable|okay|fine)\b/i.test(
        statement
      )
  const prohibitsIncrease =
    /(?:may not|might not|cannot|can't|must not|should not|do not|don't|never|不得|不能|不应|不可)[^.!?;；]{0,32}(?:raise|increase|extend|提高|延长|放宽)/i.test(
      statement
    )
  const permitsRaiseBeforeExhaustion =
    !prohibitsIncrease &&
      /(?:延长|放宽|提高|rais(?:e|es|ed|ing)|increas(?:e|es|ed|ing)|extend(?:s|ed|ing)?)/i.test(statement) &&
      /\b(?:may|can|could|acceptable|allowed|permitted|okay|fine)\b/i.test(statement) &&
      /(?:prior|previous|old|existing|current|active|present|原|旧|当前|现有|之前).{0,16}(?:timeout|time[ -]?limit|cap|limit|deadline|上限|限制)|(?:timeout|time[ -]?limit|cap|limit|deadline|上限|限制).{0,16}(?:prior|previous|old|existing|current|active|present|原|旧|当前|现有|之前)/i.test(
        statement
      ) &&
      /(?:not (?:yet )?(?:been )?(?:reached|exhausted|hit|attained)|never reached|never exhausted|before reaching|before exhausting|before (?:the )?(?:(?:prior|previous|old|existing|current|active) )?(?:timeout|time[ -]?limit|deadline|limit|cap) (?:is )?(?:hit|reached|exhausted)|before (?:the )?(?:(?:prior|previous|old|existing|current) )?(?:deadline|limit|cap) expires?|without waiting for|without(?: the )?(?:(?:prior|previous|old|existing|current) )?(?:cap|limit|timeout|deadline) exhaustion|without[^.!?;；]{0,20}(?:hitting|reaching|exhausting|attaining)[^.!?;；]{0,24}(?:(?:prior|previous|old|existing|current)\s+)?(?:timeout|time[ -]?limit|deadline|cap|limit)|(?:regardless|irrespective) of whether[^.!?;；]{0,32}(?:(?:prior|previous|old|existing|current)\s+)?(?:timeout|time[ -]?limit|deadline|cap|limit)[^.!?;；]{0,24}(?:was |has been )?(?:hit|reached|exhausted|attained)|(?:prior|previous|old|existing|current)\s+(?:timeout|time[ -]?limit|deadline|cap|limit)[^.!?;；]{0,24}(?:was not|wasn't|has not been|hasn't been|not yet)\s+(?:hit|reached|exhausted|attained)|尚未(?:达到|用尽|耗尽)|未(?:达到|用尽|耗尽))/i.test(
        statement
      ) ||
      (/(?:rais(?:e|es|ed|ing)|increas(?:e|es|ed|ing)|extend(?:s|ed|ing)?|提高|延长|放宽)/i.test(statement) &&
        /(?:may|can|could|allowed|permitted|permissible|acceptable|okay|fine)/i.test(statement) &&
        /(?:timeout|deadline|cap|limit|上限|限制)/i.test(statement) &&
        /(?:not (?:yet )?(?:exhausted|reached|hit)|before exhausting|before reaching|without exhausting|without reaching|whether or not[^.!?;；]{0,32}(?:exhausted|reached|hit)|尚未(?:用尽|达到|触及)|未(?:用尽|达到|触及))/i.test(
          statement
        ) &&
        !prohibitsIncrease)
    const exhaustionIsNotRequiredForIncrease =
      /(?:prior[ -]cap exhaustion|exhaust(?:ing)? the (?:prior|previous|current|existing|old) (?:cap|limit|timeout)|用尽原上限|耗尽原上限)[^.!?;；]{0,48}(?:not a prerequisite|not required|not necessary|not needed|no need|isn't required|isn't necessary|无需|不需要|不必)[^.!?;；]{0,48}(?:increas|rais|extend|timeout)|\b(?:increas(?:e|es|ed|ing)|rais(?:e|es|ed|ing)|extend(?:s|ed|ing)?)\b[^.!?;；]{0,48}(?:does not|doesn't|need not|needn't) depend on[^.!?;；]{0,32}(?:prior[ -]cap|previous.{0,12}(?:limit|cap)|(?:current|existing|old) (?:timeout|time[ -]?limit|limit|cap))[^.!?;；]{0,32}(?:exhausted|exhaustion|hit|reached)|\b(?:timeout|deadline) changes?[^.!?;；]{0,48}(?:do not|don't|does not|doesn't|need not|needn't) depend on[^.!?;；]{0,32}(?:prior|previous|current|existing|old) (?:limit|cap)[^.!?;；]{0,32}(?:exhausted|exhaustion|hit|reached)|\b(?:timeout|deadline) changes?[^.!?;；]{0,48}(?:permitted|allowed|may|can)[^.!?;；]{0,32}without[^.!?;；]{0,24}(?:exhaust(?:ing|ed)?|hitting|reaching)[^.!?;；]{0,24}(?:the )?(?:current|prior|previous|existing|old)?\s*(?:cap|limit|timeout|deadline)|(?:no requirement|no need|not required|not necessary|无需|不需要|不必)[^.!?;；]{0,48}(?:exhaust|use up|用尽|耗尽)[^.!?;；]{0,32}(?:the )?(?:prior|previous|current|existing|old) (?:cap|limit|timeout|deadline|上限|限制)[^.!?;；]{0,48}(?:before|prior to|再|才)?[^.!?;；]{0,32}(?:increas|rais|extend|提高|延长|放宽)/i.test(
        statement
      )
    const permitsRaiseWithoutExhaustionEvidence =
      /(?:\b(?:may|can|could|might|allowed|permitted|acceptable|okay|fine)\b[^.!?;；]{0,32}(?:raise|increase|extend|loosen|raised|increased|extended|loosened)|(?:raise|increase|extend|loosen)(?:d|s|ing)?[^.!?;；]{0,32}\b(?:may|can|could|might|allowed|permitted|acceptable|okay|fine)\b|(?:可|可以|能够|允许)[^。.!?;；]{0,24}(?:提高|延长|放宽|上调|增加))/i.test(
        statement
      ) &&
      /(?:\bwithout\s+(?:(?:any|the|required|supporting)\s+)*(?:evidence|proof|logs?|records?|documentation)\b|\bwithout\s+(?:showing|proving|documenting|recording|verifying)\b|\bno\s+(?:supporting\s+)?(?:evidence|proof|logs?|records?|documentation)\b|(?:无需|无须|不需要|不必|不须|没有|缺少)[^。.!?;；]{0,12}(?:证据|证明|日志|记录|文档))/i.test(
        statement
      ) &&
      /(?:用尽|耗尽|达到|触及|reach(?:ed)?|attain(?:ed)?|exhaust|hit|原上限|旧上限|prior[ -]cap|old[ -]cap|previous.{0,12}(?:limit|cap)|old.{0,12}(?:deadline|limit|cap))/i.test(
        statement
      ) &&
      !/(?:must not|should not|do not|don't|cannot|can't|不得|不能|不应|不可|不要)[^.!?;；]{0,32}(?:raise|increase|extend|loosen|提高|延长|放宽|上调)/i.test(
        statement
      )
    const permitsRaiseWithoutCapExhaustion =
      /(?:rais(?:e|es|ed|ing)|increas(?:e|es|ed|ing)|extend(?:s|ed|ing)?|提高|延长|放宽)/i.test(statement) &&
      /\b(?:may|can|could|might|allowed|permitted|acceptable|okay|fine)\b/i.test(statement) &&
      /\bwithout\s+(?:(?:the|any)\s+)?(?:(?:prior|previous|old|existing|current)\s+)?cap\s+exhaustion\b/i.test(
        statement
      ) &&
      !/(?:must not|should not|do not|don't|cannot|can't|不得|不能|不应|不可|不要)[^.!?;；]{0,32}(?:raise|increase|extend|提高|延长|放宽)/i.test(
        statement
      )
    const permitsRaiseBeforeConfiguredDeadlineHit =
      /(?:rais(?:e|es|ed|ing)|increas(?:e|es|ed|ing)|extend(?:s|ed|ing)?|提高|延长|放宽)/i.test(statement) &&
      /\b(?:may|can|could|might|allowed|permitted|acceptable|okay|fine)\b/i.test(statement) &&
      /(?:no (?:run|job|execution) has (?:yet )?(?:hit|reached|exhausted|attained)|(?:run|job|execution) has not (?:yet )?(?:hit|reached|exhausted|attained)|deadline has not (?:yet )?(?:been )?(?:hit|reached|exhausted)|deadline was not (?:hit|reached|exhausted))/i.test(
        statement
      ) &&
      /deadline|time[ -]?limit|timeout/i.test(statement) &&
      !/(?:must not|should not|do not|don't|cannot|can't|不得|不能|不应|不可|不要)[^.!?;；]{0,32}(?:raise|increase|extend|提高|延长|放宽)/i.test(
        statement
      )
    return (
      omitsExhaustionOrCauseProof ||
      permitsRaiseDespiteAnotherCause ||
      permitsIncreaseForOtherFailure ||
      permitsRaiseBeforeExhaustion ||
      exhaustionIsNotRequiredForIncrease ||
      permitsRaiseWithoutExhaustionEvidence ||
      permitsRaiseWithoutCapExhaustion ||
      permitsRaiseBeforeConfiguredDeadlineHit ||
      weakensRequiredAction(
        statement,
        /(?:用尽|耗尽|达到|触及|reach(?:ed)?|attain(?:ed)?|exhaust|hit|原上限|旧上限|prior[ -]cap|old[ -]cap|(?:prior|previous|old).{0,12}(?:timeout|time[ -]?limit|deadline|limit|cap)|原因是|原因在于|rather than|other failures?|timeout.{0,24}(?:caus|reason|responsible)|(?:caus|reason|responsible).{0,24}timeout)/i
      )
    )
  })
  const contradictsSlowestRun = statements.some(
    statement => {
      const referencesSlowestRun = /(?:最慢|slowest).{0,40}(?:可比|comparable|实测耗时|实测时长|measured duration|elapsed time|评估|依据|使用|assess|use)/i.test(
        statement
      )
      const makesSlowestRunOptional =
        /(?:最慢|slowest)[^.!?;；]{0,48}(?:not necessarily|not always|not invariably|not consistently|need not|does not need to|doesn't need to|is not required to|isn't required to|不一定|未必|不必|无需|无须)[^.!?;；]{0,32}(?:use|used|consider|considered|assess|assessed|evaluate|evaluated|依据|采用|考虑|评估)/i.test(
          statement
        ) ||
        /(?:not necessarily|not always|not invariably|not consistently)[^.!?;；]{0,48}(?:use|used|consider|considered|assess|assessed|evaluate|evaluated)[^.!?;；]{0,32}(?:slowest|最慢)/i.test(
          statement
        )
      return (
        (referencesSlowestRun &&
          (noRequirement.test(statement) ||
            prohibitsRequiredAction(statement) ||
            weakensRequiredAction(
              statement,
              /(?:最慢|slowest).{0,32}(?:可比|comparable|实测耗时|实测时长|measured duration|elapsed time|评估|使用|assess|use)/i
            ))) ||
        makesSlowestRunOptional
      )
    }
  )
  const rejectsSlowestRun = statements.some(statement => {
    const slowestRun = /(?:slowest|最慢)/i
    const rejectsUse =
      /(?:ignore|disregard|exclude|omit|忽略|排除|不采用).{0,32}(?:slowest|最慢)|(?:slowest|最慢).{0,32}(?:ignore|disregard|exclude|omit|忽略|排除|不采用)/i.test(
        statement
      ) ||
      /(?:do not|don't|must not|should not|cannot|can't|不得|不要|不能|不应|不可)[^.!?;；]{0,24}(?:consider|take into account|factor in|include|计入|考虑|纳入)[^.!?;；]{0,32}(?:slowest|最慢)|(?:slowest|最慢)[^.!?;；]{0,32}(?:should not be considered|must not be considered|not to be considered|不应考虑|不得考虑|不可纳入)/i.test(
        statement
      )
    const prohibitsRejection = /(?:do not|don't|must not|should not|不得|不要|不能)[^.!?;；]{0,24}(?:ignore|disregard|exclude|omit|忽略|排除|不采用)/i.test(statement)
    const prefersFasterRun =
      /\b(?:faster|quicker|typical|average|median|p\d{1,2}|\d{1,2}(?:st|nd|rd|th)? percentile)\b[^.!?;；]{0,40}\b(?:instead of|rather than|over|in place of)\b[^.!?;；]{0,24}\bslowest\b/i.test(
        statement
      ) ||
      /\bslowest\b[^.!?;；]{0,40}\b(?:instead of|rather than|over|in place of)\b[^.!?;；]{0,24}\b(?:faster|quicker|typical|average|median|p\d{1,2}|\d{1,2}(?:st|nd|rd|th)? percentile)\b/i.test(
        statement
      )
    const prohibitsPreference =
      /(?:do not|don't|must not|should not|cannot|不得|不要|不能|不应)[^.!?;；]{0,40}(?:choose|select|use|prefer|base|estimate|assess|infer|采用|选择|估算|评估|推断)[^.!?;；]{0,32}(?:faster|quicker|typical|average|median|p\d{1,2}|percentile|slowest|最慢)/i.test(
        statement
      )
    const prescribesAlternativeRun =
      /(?:\b(?:faster|quicker|typical|average|median|p\d{1,2}|\d{1,2}(?:st|nd|rd|th)? percentile)\b|(?:典型|平均|中位|较快|更快))/i.test(
        statement
      ) &&
      /(?:\b(?:use|choose|select|base|estimate|assess|infer|rely on|representative|valid evidence|acceptable basis)\b|(?:采用|选择|依据|估算|评估|推断|代表性|有效证据))/i.test(
        statement
      )
    return (rejectsUse || prefersFasterRun || (prescribesAlternativeRun && !prohibitsPreference)) &&
      !prohibitsRejection &&
      !prohibitsPreference
  })
  const contradictsFastestOrWarmCache = statements.some(
    statement =>
      noRequirement.test(statement) &&
      /(?:最快|fastest|warm[ -]?cache|缓存热|热缓存|缓存已热)/i.test(statement)
  )
  const permitsFastestOrWarmCacheInference = clauses.some(statement => {
    const citesFastestOrWarmCache = /(?:最快|fastest|warm[ -]?cache|缓存热|热缓存|缓存已热)/i.test(statement)
    const infersDuration = /(?:推断|估算|判断|采用|依据|代表性|有效证据|推算|infer|estimate|judge|use|rely on|representative|valid evidence|time estimates?|timing)/i.test(statement)
    const permitsInference = /(?:可以|可|能够|允许|can|may|might|could|able to)/i.test(statement)
    const prohibitsInference = /(?:不得|不能|禁止|不应|不可|不要|must not|may not|shall not|should not|cannot|do not|don't)/i.test(
      statement
    )
    return citesFastestOrWarmCache && infersDuration && permitsInference && !prohibitsInference
  })
  const prescribesFastestOrWarmCacheRun = clauses.some(statement => {
    const citesFastestOrWarmCache = /(?:最快|fastest|quickest|缓存热|热缓存|缓存已热|warm[ -]?cache|cache[ -]?hot)/i.test(statement)
    const directsUse = /(?:\balways\s+us(?:e|es|ed|ing)\b|\bus(?:e|es|ed|ing)\b|\bchoose\b|\bselect\b|\brely on\b|\bbase\b|\bvalid\b|\breliable\b|\brepresentative\b|\bevidence\b|\btime estimates?\b|采用|选择|依据|有效证据|代表性)/i.test(
      statement
    )
    const prohibitsUse = /(?:不得|不能|禁止|不应|不可|不要|must not|may not|shall not|should not|cannot|do not|don't|never)/i.test(
      statement
    )
    return citesFastestOrWarmCache && directsUse && !prohibitsUse
  })
  const loweringApplies = /(?:收紧|缩短|下调|降低|裁减|削减|调低|缩减|剪短|更短|较短|\bshorter\b|\breductions?\b|\b(?:lower(?:ing|ed)?|reduc(?:e|es|ed|ing|tion)s?|tighten(?:ed|ing)?|shorten(?:ed|ing)?|cut(?:s|ting)?|trim(?:s|med|ming)?)\b)/i.test(policy)
  const contradictsLoweringEvidence = statements.some(
    statement => {
      const lowersLimit = /(?:收紧|缩短|下调|降低|裁减|削减|调低|缩减|剪短|更短|较短|\bshorter\b|\breductions?\b|\b(?:lower(?:ing|ed)?|reduc(?:e|es|ed|ing|tion)s?|tighten(?:ed|ing)?|shorten(?:ed|ing)?|cut(?:s|ting)?|trim(?:s|med|ming)?)\b)/i.test(
        statement
      )
      const weakensLoweringRequirement = weakensRequiredAction(
        statement,
        /(?:目的|用途|理由|正常路径|正常流程|常规路径|实测耗时|实测时长|有效工作|正常工作|有效任务|正常任务|新值|新上限|purpose|reason|normal[ -]path|measured duration|elapsed time|valid (?:work|task)|useful (?:work|task)|effective work|new value|new cap|proposed limit)/i
      )
      return lowersLimit && (omitsRequiredAction(
        statement,
        /(?:目的|用途|理由|正常路径|正常流程|常规路径|实测耗时|实测时长|测量|测算|有效工作|正常工作|有效任务|正常任务|新值|新上限|purpose|reason|normal[ -]path|measurement|measured duration|timing|elapsed time|valid (?:work|task)|useful (?:work|task)|effective work|new value|new cap|proposed limit)/i
      ) || weakensLoweringRequirement)
    }
  )
  const contradictsLoweringSafeguards =
    loweringApplies &&
    (contradictsLoweringEvidence || statements.some(
      statement =>
        noRequirement.test(statement) &&
        /(?:目的|用途|理由|正常路径|正常流程|实测耗时|实测时长|测量|测算|有效工作|正常工作|valid (?:work|task)|useful (?:work|task)|effective work|purpose|reason|normal path|measurement|measured duration|timing|elapsed time)/i.test(
          statement
        )
    ) ||
      statements.some(statement => {
        const lowersLimit = /(?:收紧|缩短|下调|降低|裁减|削减|调低|缩减|剪短|更短|较短|\bshorter\b|\breductions?\b|\b(?:lower(?:ing|ed)?|reduc(?:e|es|ed|ing|tion)s?|tighten(?:ed|ing)?|shorten(?:ed|ing)?|cut(?:s|ting)?|trim(?:s|med|ming)?)\b)/i.test(statement)
        const validWork = /(?:有效工作|正常工作|有效任务|正常任务|valid (?:work|tasks?|jobs?|runs?)|useful (?:work|tasks?|jobs?|runs?)|effective work|\bwork\b|\btask\b|\bjob\b|\brun\b)/i.test(statement)
        const interruption = /(?:中断|影响|终止|取消|停止|中止|interrupt|disrupt|break|terminat|cancel|stop|abort|kill)/i.test(statement)
        const threatensCompletion =
          /(?:may|might|could|can|will|would|可能|或许|也许|会|将)[^.!?;；]{0,32}(?:not preserve|fail(?:s|ed)? to preserve|not maintain|not keep|leave|render|无法保留|不保留|不能保留|不保证|不能保证|无法确保)[^.!?;；]{0,40}(?:valid work|valid task|valid job|有效工作|有效任务|正常工作|有效作业)/i.test(
            statement
          ) ||
          /(?:valid work|valid tasks?|valid jobs?|useful work|有效工作|有效任务|正常工作|有效作业)[^.!?;；]{0,40}(?:may|might|could|can|will|would|is|are)[^.!?;；]{0,24}(?:not complete|remain incomplete|be left incomplete|not finish|fail to complete|not be completed|无法完成|不能完成|未完成|无法继续)/i.test(
            statement
          ) ||
          /(?:may|might|could|can|will|would|acceptable|okay|fine|permitted|allowed)[^.!?;；]{0,64}(?:let|leave|render|cause|result in|prevent|keep)[^.!?;；]{0,56}(?:valid work|valid tasks?|valid jobs?|useful work|useful tasks?|useful jobs?|effective work|work|task|job|run|有效工作|有效任务|正常工作|有效作业)[^.!?;；]{0,48}(?:incomplete|unfinished|not complete|not finish|fail to complete|remain unfinished|无法完成|不能完成|未完成)/i.test(
            statement
          ) ||
          /(?:may|might|could|can|will|would)[^.!?;；]{0,48}(?:prevent|stop|keep)[^.!?;；]{0,32}(?:valid work|valid tasks?|valid jobs?|useful work|useful tasks?|useful jobs?|有效工作|有效任务|正常工作)[^.!?;；]{0,32}(?:from\s+)?(?:completing|finishing|being completed|完成)/i.test(
            statement
          )
        const permitsInterruption = candidate =>
          /(?:可以|允许|能够|可能|有可能|会|将|acceptable|okay|fine|permitted|allowed|can|may|might|could|will).{0,80}(?:中断|影响|终止|取消|停止|中止|interrupt|disrupt|break|terminat|cancel|stop|abort|kill)|(?:中断|影响|终止|取消|停止|中止|interrupt|disrupt|break|terminat|cancel|stop|abort|kill).{0,80}(?:可以|允许|能够|可能|有可能|会|将|acceptable|okay|fine|permitted|allowed|can|may|might|could|will)|(?:can|may|might|could|will) be (?:interrupted|disrupted|broken|terminated|cancelled|canceled|stopped|aborted|killed)/i.test(
            candidate
          )
        const rejectsInterruption = candidate =>
          /(?:not|never|cannot|can't|不得|不能|不会|不应|不可)[^.!?;；]{0,24}(?:中断|影响|终止|取消|停止|中止)|(?:中断|影响|终止|取消|停止|中止)[^.!?;；]{0,24}(?:不会|不能|不应|不可|不得)|(?:not|never|cannot|can't|不得|不能|不会|不应|不可)[^.!?;；]{0,24}(?:acceptable|okay|fine|permitted|allowed)|(?:acceptable|okay|fine|permitted|allowed)[^.!?;；]{0,24}(?:not|never|cannot|can't|不得|不能|不会|不应|不可)|\b(?:can never|will never|will not|won't|cannot|can not|can't|never|must not|should not|do not|don't|不得|不能|不会|不应|不可)[^.!?;；]{0,40}(?:be )?(?:interrupt|disrupt|break|terminat|cancel|stop|abort|kill)|(?:interrupt|disrupt|break|terminat|cancel|stop|abort|kill)[^.!?;；]{0,40}\b(?:cannot|can not|can't|never|will not|won't|must not|should not|do not|don't|不得|不能|不会|不应|不可)\b/i.test(
            candidate
          )
        const rejectsIncompleteOutcome =
          /(?:not|never|cannot|can't|不得|不能|不会|不应|不可)[^.!?;；]{0,32}(?:acceptable|okay|fine|permitted|allowed)[^.!?;；]{0,48}(?:leave|let|render|cause|result in|prevent|keep)[^.!?;；]{0,56}(?:valid work|valid tasks?|valid jobs?|useful work|useful tasks?|useful jobs?|有效工作|有效任务|正常工作|有效作业)[^.!?;；]{0,48}(?:incomplete|unfinished|not complete|未完成)/i.test(
            statement
          )
        const interruptionClauses = splitClauses(statement)
        const anaphoricDenial =
          /^\s*(?:this|that|it)\s+(?:is|would be)\s+(?:not|never)\s+(?:acceptable|okay|fine|permitted|allowed)\b/i
        const permitsInterruptionWithoutRetraction = interruptionClauses.some(
          (clause, index) => {
            const permits = permitsInterruption(clause)
            const rejects = rejectsInterruption(clause)
            const laterDenial = interruptionClauses
              .slice(index + 1)
              .some(laterClause => anaphoricDenial.test(laterClause))
            return permits && !rejects && !laterDenial
          }
        )
        return lowersLimit && validWork && ((interruption && permitsInterruptionWithoutRetraction) || (threatensCompletion && !rejectsIncompleteOutcome))
      }) ||
      statements.some(
        statement =>
          prohibitsRequiredAction(statement) &&
          /(?:目的|用途|理由|正常路径|正常流程|实测耗时|实测时长|有效工作|正常工作|valid (?:work|task)|useful (?:work|task)|effective work|purpose|reason|normal path|measured duration|elapsed time)/i.test(
            statement
          )
      ))

  const contradictions = []
  if (scope && (approvalBypass || genericAuthorizationBypass || canChangeWithoutAskingUser || exceptionToApprovalRule)) {
    contradictions.push('timeout adjustments must not bypass user authorization')
  }
  if (scope && (relaxationToPass || exceptionToNoRelaxation)) {
    contradictions.push('failed checks must not be made green by loosening timeout limits')
  }
  if (scope && contradictsApplicationEvidence) {
    contradictions.push('timeout applications must retain required value, duration, evidence, and rationale')
  }
  if (scope && contradictsRaisingProof) {
    contradictions.push('raising a cap requires proof it was exhausted and caused the incomplete work')
  }
  if (scope && contradictsSlowestRun) {
    contradictions.push('timeout requests must use the slowest comparable run')
  }
  if (scope && rejectsSlowestRun) {
    contradictions.push('timeout requests must use the slowest comparable run')
  }
  if (scope && contradictsFastestOrWarmCache) {
    contradictions.push('timeout requests must not rely on fastest or warm-cache runs')
  }
  if (scope && permitsFastestOrWarmCacheInference) {
    contradictions.push('timeout requests must not rely on fastest or warm-cache runs')
  }
  if (scope && prescribesFastestOrWarmCacheRun) {
    contradictions.push('timeout requests must not rely on fastest or warm-cache runs')
  }
  if (scope && contradictsLoweringSafeguards) {
    contradictions.push('lowering timeout limits must preserve measured evidence and valid work')
  }
  return contradictions
}

// This is a bounded policy guard: inspect only the authorization-list timeout bullet(s),
// accept concept-level wording variants and reject contradictions of authorization, evidence, or cap-protection rules.
// It does not score prose or infer general semantic quality (ADR-0026).
export function findTimeoutAuthorizationPolicyViolations(source) {
  const bullets = timeoutAuthorizationBullets(source)
  if (bullets.length === 0) return ['timeout authorization clause in the user-authorization list']

  const policy = bullets.join('\n')
  const violations = TIMEOUT_POLICY_CHECKS.filter(({ test }) => !test(policy)).map(({ label }) => label)
  violations.push(...findTimeoutPolicyContradictions(policy))
  return violations
}

export function findUnmarkedReferenceDocs(entries) {
  return entries
    .filter(({ source }) => !source.startsWith(REFERENCE_MARKER) || !source.includes(REFERENCE_BANNER))
    .map(({ file }) => file)
    .sort()
}

// 墓碑式提及（「ADR-0009 已删除」）是合法修订记录；只报标题或本节声明层面的退役痕迹。
const RETIRED_SECTION = [/^#{1,6}\s+.*(?:已废止|已删除)/, /(?:本节|此节|该节|以下|以上)[^\n]{0,20}(?:已废止|已删除)/]

export function findRetiredAdrMarkers(entries) {
  const markers = []
  for (const { file, source } of entries) {
    if (!file.startsWith('docs/adr/')) continue
    source.split('\n').forEach((line, index) => {
      if (!RETIRED_SECTION.some(pattern => pattern.test(line))) return
      markers.push({ file, line: index + 1, phrase: line.includes('已废止') ? '已废止' : '已删除' })
    })
  }
  return markers
}

export function contentDigest(entries) {
  const hash = crypto.createHash('sha256')
  // 码元序而非 localeCompare：指纹要跨机器可复现，不能随 ICU/locale 改变文件顺序。
  for (const { file, source } of [...entries].sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0))) {
    hash.update(file).update('\0').update(source).update('\0')
  }
  return hash.digest('hex').slice(0, 12)
}
