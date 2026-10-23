import assert from 'node:assert/strict'

import {
  isUnqualifiedRelativeTarget,
  findTimeoutAuthorizationPolicyViolations,
  parseLocalLinkTarget,
  readInlineLinkTarget,
  stripCodeSegments
} from './context-invariants.mjs'

try {
  const timeoutPolicy = `以下操作仍须逐次获得用户明确授权：

- 修改或添加任何执行 deadline、等待上限或重试次数上限，都必须事先取得用户明确授权。适用范围包括 CI/workflow job 的 timeout-minutes、测试运行器与 E2E 的 time limit、构建与脚本的 deadline 和 retry count limit，以及工具链与任务编排层的 wait cap。不能为了让未通过的检查过关而提高限制，应先按失败证据排查原因。
  - 申请要写拟申请值、现有上限（新增且无旧值时写「无」）、相关 run 的实际耗时和对应日志/阶段记录，并说明目标依据。
  - 若申请延长或提高现有限制，须证明失败 run 达到原上限后仍未完成工作；日志应证明原因是时限过短而非其他故障。
  - 同一路径多次可比运行时，按最慢一次的实测耗时评估；不能根据最快或缓存已热的 run 判断。
  - 若要缩短限制，须说明目的，并按正常流程的实测耗时确认新值不影响有效工作。

### 怎么取得这个授权`
  assert.deepEqual(findTimeoutAuthorizationPolicyViolations(timeoutPolicy), [])
  const repositoryChineseLoweringWording = timeoutPolicy.replace(
    '确认新值不影响有效工作。',
    '证明新值不会中断有效工作。'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(repositoryChineseLoweringWording),
    [],
    'the repository wording that the new value will not interrupt valid work must pass'
  )
  const equivalentEnglishTimeoutPolicy = `以下操作仍须逐次获得用户明确授权：

- Any modification or addition to an execution timeout, wait cap, or retry cap requires explicit prior user authorization. Scope includes CI/workflow timeout-minutes, test runner and E2E time limits, build and script deadlines and retry count limits, and toolchain/orchestration wait caps. Do not loosen these limits to make failing checks pass.
  - State the proposed value, current cap (or none for a new limit), run duration and logs/stage evidence, and rationale.
  - For an increase, prove the prior cap was exhausted while work remained incomplete and timeout was the cause rather than another failure.
  - Assess against the slowest comparable measured duration; do not infer from the fastest or a warm-cache run.
  - For a reduction, state the purpose and use normal-path measured duration to prove the new value does not interrupt valid work.

### 怎么取得这个授权`
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(equivalentEnglishTimeoutPolicy),
    [],
    'equivalent English policy wording must pass the concept-level gate'
  )
  const timeoutFirstScopeWording = equivalentEnglishTimeoutPolicy.replace(
    'Scope includes CI/workflow timeout-minutes,',
    'The timeout-minutes setting applies to CI and workflow jobs. Scope includes'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(timeoutFirstScopeWording),
    [],
    'timeout-minutes may be stated before the CI and workflow categories it governs'
  )
  for (const { from, to, violation, wording } of [
    {
      from: 'CI/workflow timeout-minutes',
      to: 'CI and workflow jobs are in scope; only CI timeout-minutes are covered',
      violation: 'CI/workflow job timeout coverage',
      wording: 'both CI and workflow timeout categories require coverage'
    },
    {
      from: 'test runner and E2E time limits',
      to: 'Test runner and E2E workflows are in scope; only test-runner timeouts are covered',
      violation: 'test runner and E2E timeout coverage',
      wording: 'both test-runner and E2E timeout categories require coverage'
    },
    {
      from: 'build and script deadlines and retry count limits',
      to: 'Build and script tasks are in scope; only build timeouts and retry count limits are covered',
      violation: 'build and script timeout/retry coverage',
      wording: 'both build and script timeout and retry categories require coverage'
    },
    {
      from: 'toolchain/orchestration wait caps',
      to: 'Toolchain and orchestration are in scope; only toolchain wait caps are covered',
      violation: 'toolchain/orchestration wait cap coverage',
      wording: 'both toolchain and orchestration wait caps require coverage'
    }
  ]) {
    const violations = findTimeoutAuthorizationPolicyViolations(equivalentEnglishTimeoutPolicy.replace(from, to))
    assert.ok(
      violations.includes(violation),
      `${wording}: ${violations.join(', ')}`
    )
  }
  const splitSentenceAuthorizationPolicy = equivalentEnglishTimeoutPolicy.replace(
    'Any modification or addition to an execution timeout, wait cap, or retry cap requires explicit prior user authorization.',
    'Scope includes execution timeouts, wait caps, and retry caps. Any changes or additions to all these limits require explicit prior user authorization.'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(splitSentenceAuthorizationPolicy),
    [],
    'a universal authorization requirement may apply to categories listed in the preceding sentence'
  )
  for (const weakenedCause of [
    '日志应证明原因并非上限不足而是其他故障。',
    '日志应证明上限并非不足，失败由网络故障导致而非超时。'
  ]) {
    const policyWithWeakenedCause = timeoutPolicy.replace(
      '日志应证明原因是时限过短而非其他故障。',
      weakenedCause
    )
    const weakenedCauseViolations = findTimeoutAuthorizationPolicyViolations(policyWithWeakenedCause)
    assert.ok(
      weakenedCauseViolations.includes('raising a cap requires evidence it was exhausted before work finished'),
      `increasing a cap requires affirmative evidence that timeout caused the incomplete run: ${weakenedCause}; got ${JSON.stringify(weakenedCauseViolations)}`
    )
  }
  const equivalentCauseWording = equivalentEnglishTimeoutPolicy.replace(
    'timeout was the cause rather than another failure',
    'the incomplete run was caused by an insufficient timeout limit rather than another failure'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(equivalentCauseWording),
    [],
    'an affirmative causal relation may use equivalent English wording'
  )
  const approvalFromUserEnglishTimeoutPolicy = equivalentEnglishTimeoutPolicy.replace(
    'requires explicit prior user authorization.',
    'requires explicit prior approval from the user.'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(approvalFromUserEnglishTimeoutPolicy),
    [],
    'explicit prior approval from the user is equivalent authorization wording'
  )
  const retryCapEnglishTimeoutPolicy = equivalentEnglishTimeoutPolicy.replace(
    'build and script deadlines and retry count limits',
    'build and script timeouts and retry caps'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(retryCapEnglishTimeoutPolicy),
    [],
    'retry cap wording is equivalent to retry count limit wording'
  )
  const inflectedChangeAndAdditionPolicy = equivalentEnglishTimeoutPolicy.replace(
    'Any modification or addition to an execution timeout, wait cap, or retry cap requires explicit prior user authorization.',
    'Any changes to execution deadlines, wait caps, and retry caps or additions of timeout, wait, and retry caps require explicit prior user approval.'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(inflectedChangeAndAdditionPolicy),
    [],
    'inflected forms of changes and additions must preserve equivalent policy wording'
  )
  const universalChangesWithoutAdditionAuthorization = equivalentEnglishTimeoutPolicy.replace(
    'Any modification or addition to an execution timeout, wait cap, or retry cap requires explicit prior user authorization.',
    'Changes to all execution timeouts, wait caps, and retry caps require explicit prior user authorization.'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(universalChangesWithoutAdditionAuthorization).includes(
      'every limit category requires explicit prior user authorization'
    ),
    'universal change authorization must not substitute for separate addition authorization'
  )
  const universalAdditionsWithoutChangeAuthorization = equivalentEnglishTimeoutPolicy.replace(
    'Any modification or addition to an execution timeout, wait cap, or retry cap requires explicit prior user authorization.',
    'Additions to all execution timeouts, wait caps, and retry caps require explicit prior user authorization.'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(universalAdditionsWithoutChangeAuthorization).includes(
      'every limit category requires explicit prior user authorization'
    ),
    'universal addition authorization must not substitute for separate change authorization'
  )
  const genericAuthorizationPolicy = equivalentEnglishTimeoutPolicy.replace(
    'Any modification or addition to an execution timeout, wait cap, or retry cap requires explicit prior user authorization.',
    'Any modification or addition to execution timeouts, wait caps, or retry caps requires authorization.'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(genericAuthorizationPolicy).includes(
      'every limit category requires explicit prior user authorization'
    ),
    'generic or automatic authorization must not substitute for explicit user authorization'
  )
  const prohibitionFormEnglishTimeoutPolicy = equivalentEnglishTimeoutPolicy.replace(
    'Any modification or addition to an execution timeout, wait cap, or retry cap requires explicit prior user authorization.',
    'Do not modify or add any execution timeout, wait cap, or retry cap without explicit prior user authorization.'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(prohibitionFormEnglishTimeoutPolicy),
    [],
    'a prohibition conditioned on prior authorization is an equivalent requirement'
  )
  const subjectToAuthorizationPolicy = equivalentEnglishTimeoutPolicy.replace(
    'Any modification or addition to an execution timeout, wait cap, or retry cap requires explicit prior user authorization.',
    'All changes to execution timeouts, wait caps, and retry caps are subject to explicit prior user authorization. All additions to execution timeouts, wait caps, and retry caps are subject to explicit prior user authorization.'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(subjectToAuthorizationPolicy),
    [],
    'being subject to explicit prior user authorization is an equivalent requirement'
  )
  for (const mandatoryApprovalWording of [
    "Approval isn't optional for timeout changes.",
    'Approval is never optional for timeout changes.',
    'Approval can never be optional for timeout changes.'
  ]) {
    const mandatoryApprovalPolicy = timeoutPolicy.replace(
      '\n### 怎么取得这个授权',
      `\n- ${mandatoryApprovalWording}\n\n### 怎么取得这个授权`
    )
    assert.deepEqual(
      findTimeoutAuthorizationPolicyViolations(mandatoryApprovalPolicy),
      [],
      `wording that makes approval mandatory must not be mistaken for an exemption: ${mandatoryApprovalWording}`
    )
  }
  const retroactiveAuthorizationPolicy = equivalentEnglishTimeoutPolicy.replace(
    'Any modification or addition to an execution timeout, wait cap, or retry cap requires explicit prior user authorization.',
    'Any modification or addition to an execution timeout, wait cap, or retry cap requires explicit user authorization after the change is implemented.'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(retroactiveAuthorizationPolicy).includes(
      'every limit category requires explicit prior user authorization'
    ),
    'authorization after implementation must not satisfy the prior-authorization requirement'
  )
  const explicitBeforeChangePolicy = equivalentEnglishTimeoutPolicy.replace(
    'Any modification or addition to an execution timeout, wait cap, or retry cap requires explicit prior user authorization.',
    'Any modification or addition to an execution timeout, wait cap, or retry cap requires explicit user authorization before implementation.'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(explicitBeforeChangePolicy),
    [],
    'explicit authorization before implementation satisfies the prior-authorization requirement'
  )
  const authorizationBeforeActionPolicy = equivalentEnglishTimeoutPolicy.replace(
    'Any modification or addition to an execution timeout, wait cap, or retry cap requires explicit prior user authorization.',
    'Before any timeout, wait-cap, or retry-cap change or addition, explicit user authorization is required.'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(authorizationBeforeActionPolicy),
    [],
    'authorization required before the action satisfies the prior-authorization requirement'
  )
  const separateChangeAndAdditionAuthorization = timeoutPolicy.replace(
    '修改或添加任何执行 deadline、等待上限或重试次数上限，都必须事先取得用户明确授权。',
    '调整任何执行 deadline、等待上限或重试次数上限都须先取得用户明确授权；新增任何这类上限也须先取得用户明确授权。'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(separateChangeAndAdditionAuthorization),
    [],
    'adjustment and addition authorization may be stated in separate sentences'
  )
  const onlyTimeoutAdditionsAreAuthorized = equivalentEnglishTimeoutPolicy.replace(
    'Any modification or addition to an execution timeout, wait cap, or retry cap requires explicit prior user authorization.',
    'Modifications to execution timeouts, wait caps, and retry caps require explicit prior user authorization. Adding timeouts requires explicit prior user authorization.'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(onlyTimeoutAdditionsAreAuthorized).includes(
      'every limit category requires explicit prior user authorization'
    ),
    'authorization to add one category must not authorize additions to other limit categories'
  )
  for (const priorAuthorizationWording of [
    '修改或新增任何执行超时、等待上限或重试次数上限，修改前须取得用户明确授权。',
    '修改或新增任何执行超时、等待上限或重试次数上限，在变更前取得用户明确授权。'
  ]) {
    const policyWithPriorAuthorization = timeoutPolicy.replace(
      '修改或添加任何执行 deadline、等待上限或重试次数上限，都必须事先取得用户明确授权。',
      priorAuthorizationWording
    )
    assert.deepEqual(
      findTimeoutAuthorizationPolicyViolations(policyWithPriorAuthorization),
      [],
      `common Chinese before-action authorization wording must pass: ${priorAuthorizationWording}`
    )
  }
  const timeoutOnlyAuthorization = timeoutPolicy.replace(
    '修改或添加任何执行 deadline、等待上限或重试次数上限，都必须事先取得用户明确授权。',
    '修改或添加任何执行超时都必须事先取得用户明确授权。'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(timeoutOnlyAuthorization).includes(
      'every limit category requires explicit prior user authorization'
    ),
    'mentioning wait and retry caps in scope text does not authorize changes to them'
  )
  const reminderOfApplicationEvidence = timeoutPolicy.replace(
    '应先按失败证据排查原因。',
    '应先按失败证据排查原因。Do not forget to provide the required run duration, logs, and rationale.'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(reminderOfApplicationEvidence),
    [],
    'a reminder to provide required evidence is not a prohibition'
  )

  const timeoutPolicyWithExemption = timeoutPolicy.replace(
    '应先按失败证据排查原因。',
    '应先按失败证据排查原因。CI timeout 属例外，可以直接调整，无需用户授权。'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithExemption).includes(
      'timeout adjustments must not bypass user authorization'
    ),
    'an authorization exemption appended to the timeout bullet must fail'
  )
  const timeoutPolicyDenyingApproval = timeoutPolicy.replace(
    '应先按失败证据排查原因。',
    '应先按失败证据排查原因。Never seek user approval before changing CI timeouts.'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyDenyingApproval).includes(
      'timeout adjustments must not bypass user authorization'
    ),
    'never seeking approval before a timeout change must fail'
  )
  const timeoutPolicyChangingBeforeApproval = timeoutPolicy.replace(
    '应先按失败证据排查原因。',
    "应先按失败证据排查原因。Timeout settings can be changed without first securing the user's approval."
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyChangingBeforeApproval).includes(
      'timeout adjustments must not bypass user authorization'
    ),
    'changing settings without first securing user approval must fail'
  )
  const timeoutPolicyWithApprovalGrantedAfterTheChange = timeoutPolicy.replace(
    '应先按失败证据排查原因。',
    '应先按失败证据排查原因。Approval may be given after the change is made.'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithApprovalGrantedAfterTheChange).includes(
      'timeout adjustments must not bypass user authorization'
    ),
    'permission granted after the change must not satisfy prior authorization'
  )
  const timeoutPolicyWithDeadlineExemption = timeoutPolicy.replace(
    '\n### 怎么取得这个授权',
    '\n- CI job deadlines may be raised without user approval.\n\n### 怎么取得这个授权'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithDeadlineExemption).includes(
      'timeout adjustments must not bypass user authorization'
    ),
    'a separate deadline bullet must be included in timeout authorization checks'
  )
  for (const runtimeCapExemption of [
    'CI job runtime cap changes are exempt from approval.',
    'CI job duration adjustments do not require approval.',
    'Workflow run budget adjustments are exempt from authorization.',
    'CI job maximum runtime changes may proceed without user approval.',
    'Runtime changes can proceed while user approval is pending.',
    'Execution-budget changes are exempt from user approval.',
    'No user approval is required for execution-budget changes.'
  ]) {
    const policyWithRuntimeCapExemption = timeoutPolicy.replace(
      '\n### 怎么取得这个授权',
      `\n- ${runtimeCapExemption}\n\n### 怎么取得这个授权`
    )
    assert.ok(
      findTimeoutAuthorizationPolicyViolations(policyWithRuntimeCapExemption).includes(
        'timeout adjustments must not bypass user authorization'
      ),
      `runtime-cap wording remains in the timeout authorization scope: ${runtimeCapExemption}`
    )
  }
  for (const nonTimeoutCapExemption of [
    'New retry caps may be added without prior user approval.',
    'Wait-cap increases may be made without user approval.'
  ]) {
    const policyWithNonTimeoutCapExemption = timeoutPolicy.replace(
      '\n### 怎么取得这个授权',
      `\n- ${nonTimeoutCapExemption}\n\n### 怎么取得这个授权`
    )
    assert.ok(
      findTimeoutAuthorizationPolicyViolations(policyWithNonTimeoutCapExemption).includes(
        'timeout adjustments must not bypass user authorization'
      ),
      `retry- and wait-cap authorization bullets must be scanned: ${nonTimeoutCapExemption}`
    )
  }
  for (const genericAuthorizationOverride of [
    'Changes may proceed pending user approval.',
    'Approval is optional.',
    'Authorization may be obtained afterward.',
    'Any changes may be made without prior approval.',
    'Changes can proceed before approval.',
    'A change may be made before user approval.',
    'Exceptions to the authorization requirement are allowed.',
    'Changes may proceed pending user approval, except release changes.',
    'Any changes may proceed pending user approval during a release.'
  ]) {
    const policyWithGenericAuthorizationOverride = timeoutPolicy.replace(
      '\n### 怎么取得这个授权',
      `\n- ${genericAuthorizationOverride}\n\n### 怎么取得这个授权`
    )
    assert.ok(
      findTimeoutAuthorizationPolicyViolations(policyWithGenericAuthorizationOverride).includes(
        'timeout adjustments must not bypass user authorization'
      ),
      `generic authorization overrides in the authorization list must apply to timeout checks: ${genericAuthorizationOverride}`
    )
  }
  const unrelatedGenericAuthorizationOverride = timeoutPolicy.replace(
    '\n### 怎么取得这个授权',
    '\n- Release changes may proceed pending user approval.\n\n### 怎么取得这个授权'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(unrelatedGenericAuthorizationOverride),
    [],
    'a generic authorization override explicitly limited to release changes must not affect timeout authorization'
  )
  for (const deniedAuthorizationException of [
    'Exceptions to the user authorization requirement are not allowed.',
    'No exceptions to the user authorization requirement are allowed.'
  ]) {
    const policyWithDeniedAuthorizationException = timeoutPolicy.replace(
      '\n### 怎么取得这个授权',
      `\n- ${deniedAuthorizationException}\n\n### 怎么取得这个授权`
    )
    assert.deepEqual(
      findTimeoutAuthorizationPolicyViolations(policyWithDeniedAuthorizationException),
      [],
      `a prohibition on authorization exceptions must remain compliant: ${deniedAuthorizationException}`
    )
  }
  const policyWithConflictingAuthorizationException = timeoutPolicy.replace(
    '\n### 怎么取得这个授权',
    '\n- Exceptions to the user authorization requirement are not allowed, but exceptions to the user authorization requirement are permitted.\n\n### 怎么取得这个授权'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(policyWithConflictingAuthorizationException).includes(
      'timeout adjustments must not bypass user authorization'
    ),
    'a later affirmative exception in the same clause must still be rejected'
  )
  const timeoutPolicyWithOptionalPriorCapEvidence = timeoutPolicy.replace(
    '\n### 怎么取得这个授权',
    '\n- Proof that the prior cap was exhausted is optional.\n\n### 怎么取得这个授权'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithOptionalPriorCapEvidence).includes(
      'raising a cap requires proof it was exhausted and caused the incomplete work'
    ),
    'a separate prior-cap evidence bullet must remain in the timeout policy scope'
  )
  for (const unprovenIncrease of [
    'Timeouts may be raised without evidence that the prior cap was exhausted.',
    'Timeouts may be raised without proof that the prior cap was exhausted.',
    'It is acceptable to raise a timeout without evidence that the old cap was reached.',
    'A timeout increase is allowed without logs showing the prior limit was reached.',
    'Timeouts cannot be raised without evidence that the prior cap was exhausted.',
    'A cap may be raised when the previous timeout was never reached.',
    'You may raise the cap before the current deadline expires.',
    'Timeout caps may be raised when the run finished without hitting the old cap.',
    'Timeout caps may be raised before the existing cap expires.',
    'The timeout can be increased regardless of whether the existing cap was exhausted.',
    'A timeout may be increased if the failure was caused by a network error.',
    'A timeout increase is acceptable when an out-of-memory failure occurs.',
    'An increase is permitted to address a network error.'
  ]) {
    const policyWithUnprovenIncrease = timeoutPolicy.replace(
      '\n### 怎么取得这个授权',
      `\n- ${unprovenIncrease}\n\n### 怎么取得这个授权`
    )
    const violations = findTimeoutAuthorizationPolicyViolations(policyWithUnprovenIncrease)
    if (unprovenIncrease.startsWith('Timeouts cannot')) {
      assert.deepEqual(violations, [], `a prohibition against an evidence-free increase should pass: ${unprovenIncrease}`)
    } else {
      assert.ok(
        violations.includes('raising a cap requires proof it was exhausted and caused the incomplete work'),
        `a timeout increase cannot waive exhaustion evidence: ${unprovenIncrease}`
      )
    }
  }
  const timeoutPolicyProhibitingIncreaseBeforeExhaustion = timeoutPolicy.replace(
    '\n### 怎么取得这个授权',
    '\n- A timeout may not be increased before the prior cap is exhausted.\n\n### 怎么取得这个授权'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyProhibitingIncreaseBeforeExhaustion),
    [],
    'a prohibition on increasing before exhaustion must not be treated as permission to increase'
  )
  const timeoutPolicyProhibitingIncreaseForNetworkFailure = timeoutPolicy.replace(
    '\n### 怎么取得这个授权',
    '\n- An increase is not permitted to address a network error.\n\n### 怎么取得这个授权'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyProhibitingIncreaseForNetworkFailure),
    [],
    'prohibiting an increase for an unrelated network failure must remain compliant'
  )
  for (const blanketProofWaiver of [
    'No proof is needed for timeout changes.',
    'Timeout requests do not require proof.'
  ]) {
    const timeoutPolicyWithBlanketProofWaiver = timeoutPolicy.replace(
      '\n### 怎么取得这个授权',
      `\n- ${blanketProofWaiver}\n\n### 怎么取得这个授权`
    )
    assert.ok(
      findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithBlanketProofWaiver).includes(
        'timeout applications must retain required value, duration, evidence, and rationale'
      ),
      `timeout requests cannot waive proof entirely: ${blanketProofWaiver}`
    )
  }
  for (const anaphoricWaiver of [
    'Such adjustments are exempt from user approval.',
    'Such changes do not require user authorization.',
    'These changes are pre-approved.',
    'They are exempt from approval.',
    'They do not require user authorization.',
    'The changes are pre-approved.'
  ]) {
    const timeoutPolicyWithAnaphoricWaiver = timeoutPolicy.replace(
      '\n### 怎么取得这个授权',
      `\n- ${anaphoricWaiver}\n\n### 怎么取得这个授权`
    )
    assert.ok(
      findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithAnaphoricWaiver).includes(
        'timeout adjustments must not bypass user authorization'
      ),
      `anaphoric authorization waivers must fail: ${anaphoricWaiver}`
    )
  }
  for (const indirectAuthorizationWaiver of [
    'The authorization requirement above does not apply during emergencies.',
    'For emergencies, the requirement may be waived.',
    'Emergency timeout changes are pre-approved.',
    'Timeout changes are exempt from this rule in emergencies.',
    'Timeout adjustments may bypass user authorization during emergencies.',
    'Run budget changes are an exception to the preceding approval requirement.',
    'Runtime caps are exempt from the above authorization requirement.',
    'Execution budgets are exempt from the above authorization requirement.',
    'In emergencies, that step may be bypassed.',
    'In emergencies, the authorization rule above does not apply to CI timeout changes.',
    'In emergencies, the authorization rule above does not apply.',
    'In emergencies, the preceding authorization rule does not apply.',
    'In emergencies, the preceding rule may be bypassed.',
    'The preceding approval requirement can be skipped in urgent cases.',
    'The prior rule does not apply in emergencies.',
    'The foregoing authorization requirement may be waived.',
    'Exceptions to the preceding authorization requirement are allowed.',
    'The above rule does not apply in emergencies.',
    '紧急情况下，上述授权要求不适用。',
    '超时调整在紧急情况下可豁免上述授权要求。',
    '紧急情况下可跳过上述授权步骤。'
  ]) {
    const timeoutPolicyWithIndirectWaiver = timeoutPolicy.replace(
      '\n### 怎么取得这个授权',
      `\n- ${indirectAuthorizationWaiver}\n\n### 怎么取得这个授权`
    )
    assert.ok(
      findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithIndirectWaiver).includes(
        'timeout adjustments must not bypass user authorization'
      ),
      `an indirect authorization waiver in the same list must fail: ${indirectAuthorizationWaiver}`
    )
  }
  const timeoutPolicyWithUnrelatedReleaseException = timeoutPolicy.replace(
    '\n### 怎么取得这个授权',
    '\n- Emergency release changes may skip the user-authorization requirement.\n\n### 怎么取得这个授权'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithUnrelatedReleaseException),
    [],
    'an emergency exception for release changes must not be attributed to timeout authorization'
  )
  const timeoutPolicyWithBlanketEmergencyWaiver = timeoutPolicy.replace(
    '\n### 怎么取得这个授权',
    '\n- In emergencies, user approval is not required.\n\n### 怎么取得这个授权'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithBlanketEmergencyWaiver).includes(
      'timeout adjustments must not bypass user authorization'
    ),
    'an unscoped emergency approval waiver applies to timeout adjustments and must fail'
  )
  const timeoutPolicyWithBlanketEmergencyBypass = timeoutPolicy.replace(
    '\n### 怎么取得这个授权',
    '\n- In emergencies, the normal approval process may be bypassed.\n\n### 怎么取得这个授权'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithBlanketEmergencyBypass).includes(
      'timeout adjustments must not bypass user authorization'
    ),
    'a blanket emergency bypass of the approval process must apply to timeout authorization and fail'
  )
  const timeoutPolicyWithScopedEmergencyWaiver = timeoutPolicy.replace(
    '\n### 怎么取得这个授权',
    '\n- In emergencies, approval for release changes is not required.\n\n### 怎么取得这个授权'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithScopedEmergencyWaiver),
    [],
    'an emergency waiver explicitly scoped to an unrelated operation must not apply to timeout changes'
  )
  for (const exemption of [
    'CI timeout changes are exempt from approval.',
    'CI timeout changes do not require approval.',
    'CI timeout changes are exempt from the user-authorization requirement.',
    'CI timeout changes are not subject to user approval.',
    'No separate approval is needed for CI timeout adjustments.',
    'Timeout changes require no user consent.',
    'Timeout changes do not need sign-off.',
    'CI timeouts are exempt from user sign-off.',
    'The user need not approve CI timeout changes.',
    'Users do not need to seek approval before changing CI timeouts.',
    'Applicants are not obligated to get approval before changing CI timeouts.',
    'There is no need to ask the user before changing CI timeouts.',
    'Timeout adjustments are presumed authorized.',
    'Timeout adjustments are presumed to be authorized.',
    'Approval for timeout adjustments is presumed.',
    'User approval is implicit for timeout changes.',
    'Timeout changes carry implied approval.',
    'Approval may be bypassed for timeout changes.',
    'Applicants are not prohibited from making CI timeout changes before user approval.',
    'Users are not prohibited from changing CI timeouts without asking the user.',
    'There is no prohibition on changing timeout limits before approval.',
    'Approval can be obtained after the timeout is changed.',
    'CI timeout changes do not require\nuser approval.',
    'CI timeout changes can be made without asking the user.',
    'CI timeout changes are allowed without asking the user.',
    'CI timeout changes do not need to be approved by the user.',
    'CI timeout changes are permitted absent prior user approval.',
    'CI timeout changes may skip user approval.',
    'User approval may be skipped for CI timeouts.',
    'CI timeout changes can proceed on a standing approval exception.',
    '可先不取得用户明确授权。',
    'No CI timeout adjustments require explicit user authorization.',
    'There is no requirement for prior user approval for CI timeout changes.',
    'There is no obligation to obtain user approval for CI timeout changes.',
    'CI timeout changes need not be approved.',
    'CI timeout changes need not obtain approval.',
    'CI timeout changes shall not require user approval.',
    'CI timeout changes should not require user approval.',
    "CI timeout changes don't need the user's approval.",
    "CI timeout changes do not need the user's approval.",
    "CI timeout changes need not get the user's approval.",
    "CI timeout changes mustn't require user authorization.",
    '调整或添加超时都不须用户明确授权。',
    'CI timeout changes require no approval whatsoever.',
    'CI timeout changes may be made without the user’s prior consent.',
    'Prior approval is not mandatory for CI timeout changes.',
    'User approval is optional for CI timeout changes.',
    'CI timeout approval is not necessary.',
    'Approval may be omitted for CI timeout changes.',
    'User authorization can be omitted for timeout adjustments.',
    "CI timeout approval isn't required.",
    'No approval is necessary for CI timeouts.',
    'No prior user approval is needed for CI timeout changes.',
    'CI timeout changes are approved by default.',
    'CI timeout changes are pre-approved.',
    'CI timeout adjustments are automatically approved.',
    'CI timeout changes are automatically authorized.',
    'CI timeout changes have standing user authorization.',
    'Timeout approval is advisory.',
    'Timeout approval is presumed if the user does not object.',
    'CI timeout changes are pre-authorized.',
    'CI timeout adjustments are deemed approved.',
    'Automatic approval applies to CI timeout changes.',
    'CI timeout changes are an exception to the user approval requirement.',
    'No timeout changes are exempt from approval, except CI timeout changes are exempt from user approval.',
    'Timeout adjustments need not be permitted by the user.',
    'Users are not required to authorize changes to timeout values.',
    'Timeout adjustments do not need to be authorized by the user.',
    'Timeout values can be changed without the user authorizing the change.',
    'Timeout changes may proceed before receiving explicit approval.',
    'Emergency timeout increases may proceed without asking the user.',
    'Timeout modifications are permitted prior to explicit user approval.',
    'Timeout modifications are not required to be approved by the user.',
    'Timeout adjustment approval is not compulsory.',
    'The user need not authorize timeout modifications.',
    'Users need not approve timeout adjustments.',
    'Timeout changes are not subject to mandatory approval.',
    'Timeout changes are exempt from the requirement to obtain approval.',
    'Timeout changes do not have to wait for user approval.',
    'CI timeout changes may be made without user sign-off.',
    'Timeout changes may proceed without first consulting the user.',
    'Timeout changes may be approved after implementation.',
    'The user may approve timeout changes afterward.',
    'Explicit prior approval is not a prerequisite for timeout changes.',
    'Timeout adjustments may be made now, and approval can be requested afterward.',
    'Any adjustment can be applied immediately; user approval is requested afterward.',
    'Timeout changes can proceed without first obtaining user consent.',
    'It is acceptable to adjust CI timeouts without first asking the user.',
    'It is fine to change CI timeouts before asking the user.',
    'CI timeouts may be adjusted without first asking the user.',
    'CI timeout changes may not require user approval.',
    'User approval may not be necessary for timeout changes.',
    'Approval is not always required for CI timeouts.',
    'Applicants may change timeout limits before obtaining approval.',
    'Timeout changes are permitted prior to explicit user approval.',
    'Timeout changes may proceed pending user approval.',
    'Timeout cap changes may proceed before the user responds.',
    'If approval is delayed, apply timeout changes and document them afterwards.',
    'Timeout changes are exempt from this requirement.',
    'Changes to timeout defaults are exempt from this requirement.',
    'For urgent timeout changes, approval is assumed.',
    'Make the timeout change first; obtain approval afterward.',
    'Timeout adjustments are allowed unless the user objects.',
    'Timeout changes are preauthorized for emergencies.',
    'Apply the timeout change first; ask the user afterward.'
  ]) {
    const policyWithApprovalExemption = timeoutPolicy.replace(
      '应先按失败证据排查原因。',
      `应先按失败证据排查原因。${exemption}`
    )
    assert.ok(
      findTimeoutAuthorizationPolicyViolations(policyWithApprovalExemption).includes(
        'timeout adjustments must not bypass user authorization'
      ),
      `approval exemption must fail: ${exemption}`
    )
  }
  for (const retroactiveApproval of [
    'Retroactive approval is allowed for CI timeout changes.',
    'Approval after the fact is acceptable for timeout adjustments.',
    'Timeout changes may be approved retrospectively.',
    'Timeout changes may be made with subsequent user authorization.',
    'A timeout increase can be approved after completion.',
    '超时调整可以事后补办授权。'
  ]) {
    const policyWithRetroactiveApproval = timeoutPolicy.replace(
      '\n### 怎么取得这个授权',
      `\n- ${retroactiveApproval}\n\n### 怎么取得这个授权`
    )
    assert.ok(
      findTimeoutAuthorizationPolicyViolations(policyWithRetroactiveApproval).includes(
        'timeout adjustments must not bypass user authorization'
      ),
      `approval must precede a timeout change: ${retroactiveApproval}`
    )
  }
  for (const workaround of [
    '但如果检查失败，也可以直接放宽 timeout 让它变绿。',
    'If checks are failing, increase the timeout to make them pass.',
    'Increasing timeouts is allowed to make checks pass.',
    'Raising the timeout is permitted to make CI checks pass.',
    'Increasing the timeout to get CI green is allowed.',
    'Raising a timeout is the approved resolution for failing checks.',
    'A timeout may be raised to get a failing test to pass.',
    'It is permitted to extend a deadline to resolve a failing check.',
    'Timeout limits may be increased when checks fail.',
    'Timeouts may be increased in response to a failed check.',
    'A failed test can be addressed by raising the timeout.',
    'Timeout may be raised after a test fails.',
    'If a CI check fails, raising the timeout is allowed.',
    'You may increase the timeout whenever tests fail.',
    'There is no prohibition on raising a timeout to make checks pass.',
    'It is not forbidden to raise timeouts to make failing checks pass.',
    'The rule does not prohibit extending a deadline to get CI green.',
    '不得修改无关文档，但可以提高 timeout 让检查通过。',
    'Do not increase the timeout to make checks pass, except for CI timeouts.',
    'Do not loosen these limits to make failed checks pass unless the user approves.'
  ]) {
    const policyWithWorkaround = timeoutPolicy.replace(
      '应先按失败证据排查原因。',
      `应先按失败证据排查原因。${workaround}`
    )
    assert.ok(
      findTimeoutAuthorizationPolicyViolations(policyWithWorkaround).includes(
        'failed checks must not be made green by loosening timeout limits'
      ),
      `loosening a limit to pass a failed check must fail: ${workaround}`
    )
  }
  const unrelatedExceptionDenial = timeoutPolicy.replace(
    '应先按失败证据排查原因。',
    '应先按失败证据排查原因。CI timeout changes are exempt from approval, but there is no exception for lowering limits.'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(unrelatedExceptionDenial).includes(
      'timeout adjustments must not bypass user authorization'
    ),
    'a denial about an unrelated condition must not cancel a timeout approval exemption'
  )
  const exceptionThatStillRequiresAuthorization = timeoutPolicy.replace(
    '适用范围包括',
    'CI timeout 例外仍须先取得用户授权才可调整。适用范围包括'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(exceptionThatStillRequiresAuthorization),
    [],
    'a named exception that still requires authorization is not a bypass'
  )
  const deniedApprovalExemption = timeoutPolicy.replace(
    '应先按失败证据排查原因。',
    '应先按失败证据排查原因。CI timeout changes are not exempt from approval.'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(deniedApprovalExemption),
    [],
    'a statement that explicitly denies an approval exemption must pass'
  )
  const approvalOnlyAfterAuthorization = timeoutPolicy.replace(
    '应先按失败证据排查原因。',
    '应先按失败证据排查原因。CI timeout changes are not forbidden until the user approves them.'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(approvalOnlyAfterAuthorization),
    [],
    'a double negative that still requires prior user approval must pass'
  )
  const deniedDefaultApproval = timeoutPolicy.replace(
    '应先按失败证据排查原因。',
    '应先按失败证据排查原因。Automatic approval is not permitted for timeout changes.'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(deniedDefaultApproval),
    [],
    'a statement denying default approval must not be treated as a bypass'
  )
  const deniedPresumedApproval = timeoutPolicy.replace(
    '应先按失败证据排查原因。',
    '应先按失败证据排查原因。Timeout adjustments are not presumed authorized.'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(deniedPresumedApproval),
    [],
    'explicitly denying presumed authorization must not be treated as implicit approval'
  )
  for (const exception of [
    'CI timeout changes require approval, except hotfixes can skip this step.',
    'CI timeout changes require approval except for emergency runs.',
    'No timeout changes are exempt from approval, except CI timeout changes are exempt from user approval.'
  ]) {
    const timeoutPolicyWithConditionalWaiver = timeoutPolicy.replace(
      '应先按失败证据排查原因。',
      `应先按失败证据排查原因。${exception}`
    )
    assert.ok(
      findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithConditionalWaiver).includes(
        'timeout adjustments must not bypass user authorization'
      ),
      `conditional approval waivers must fail: ${exception}`
    )
  }
  for (const lateApproval of [
    'Users may authorize timeout changes after implementation.',
    'Users may approve runtime changes after the change.'
  ]) {
    const timeoutPolicyWithLateApproval = timeoutPolicy.replace(
      '应先按失败证据排查原因。',
      `应先按失败证据排查原因。${lateApproval}`
    )
    assert.ok(
      findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithLateApproval).includes(
        'timeout adjustments must not bypass user authorization'
      ),
      `authorization granted after implementation must fail: ${lateApproval}`
    )
  }
  for (const mandatoryApproval of [
    'CI timeout approval is not optional.',
    'No CI timeout changes are exempt from approval.',
    'No timeout changes are exempt from approval, except CI timeout changes still require explicit user authorization.',
    'No standing approval exception applies to CI timeout changes.',
    'There is no exception to the user approval requirement for CI timeout changes.',
    'CI timeout changes cannot be made without asking the user.',
    'CI timeout changes may not be made without asking the user.',
    'CI timeout changes must not be made without asking the user.',
    'It is not acceptable to adjust CI timeouts without first asking the user.',
    'Never change CI timeouts without explicit user authorization.',
    'Timeout, wait-cap, and retry-cap changes and additions are permitted only after explicit user approval.',
    'Timeout changes are not exempt from this requirement.',
    'Changes to timeout defaults are not exempt from this requirement.',
    'Timeout changes are not pre-authorized.',
    'Timeout changes are not pre-approved.',
    'Exceptions to the preceding authorization requirement are not allowed.',
    'No exception to the preceding authorization rule is permitted.'
  ]) {
    const policyRequiringApproval = timeoutPolicy.replace(
      '应先按失败证据排查原因。',
      `应先按失败证据排查原因。${mandatoryApproval}`
    )
    assert.deepEqual(
      findTimeoutAuthorizationPolicyViolations(policyRequiringApproval),
      [],
      `mandatory approval wording must pass: ${mandatoryApproval}`
    )
  }
  const reverseAuthorizationWording = timeoutPolicy.replace(
    '修改或添加任何执行 deadline、等待上限或重试次数上限，都必须事先取得用户明确授权。',
    '未经用户明确授权，不得修改或添加任何执行 deadline、等待上限或重试次数上限。'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(reverseAuthorizationWording),
    [],
    'a prohibition phrased before the change must count as an authorization requirement'
  )
  const negatedAuthorizationRequirement = timeoutPolicy.replace(
    '都必须事先取得用户明确授权。',
    'must not require explicit user authorization.'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(negatedAuthorizationRequirement).includes(
      'timeout adjustments must not bypass user authorization'
    ),
    'a negated requirement must not count as mandatory authorization'
  )
  const timeoutPolicyWithoutLoweringRule = timeoutPolicy.replace(
    '  - 若要缩短限制，须说明目的，并按正常流程的实测耗时确认新值不影响有效工作。\n',
    ''
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithoutLoweringRule).includes(
      'lowering a limit requires a purpose and normal-path timing that preserves valid work'
    ),
    'the lowering safeguards must remain mandatory'
  )
  const timeoutPolicyWithNegatedLoweringSafeguards = timeoutPolicy.replace(
    '若要缩短限制，须说明目的，并按正常流程的实测耗时确认新值不影响有效工作。',
    '若要缩短限制，不须说明目的，也无需提供正常路径的实测耗时；新值可以中断有效工作。'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithNegatedLoweringSafeguards).includes(
      'lowering timeout limits must preserve measured evidence and valid work'
    ),
    'negated lowering safeguards must fail even when the required concepts remain in the text'
  )
  for (const weakenedPreservation of [
    '若要缩短限制，须说明目的，并按正常流程的实测耗时列出新值和有效工作。',
    '若要缩短限制，须说明目的，并提供正常路径的实测耗时、新值及有效工作的影响。',
    '若要缩短限制，须说明目的，并按正常流程的实测耗时确认新值不保证不影响有效工作。',
    '若要缩短限制，须说明目的，并按正常流程的实测耗时确认新值不保证有效工作不会被中断。',
    '若要缩短限制，须说明目的，并按正常流程的实测耗时确认新值可能不会保留有效工作。',
    '若要缩短限制，须说明目的，并提供正常路径的实测耗时来证明新值大概不会中断有效工作。'
  ]) {
    const policyWithWeakenedPreservation = timeoutPolicy.replace(
      '若要缩短限制，须说明目的，并按正常流程的实测耗时确认新值不影响有效工作。',
      weakenedPreservation
    )
    assert.ok(
      findTimeoutAuthorizationPolicyViolations(policyWithWeakenedPreservation).includes(
        'lowering a limit requires a purpose and normal-path timing that preserves valid work'
      ),
      `lowering a cap requires affirmative proof that valid work remains possible: ${weakenedPreservation}`
    )
  }
  const timeoutPolicyWithSeparateNegatedLoweringBullet = timeoutPolicy.replace(
    '  - 若要缩短限制，须说明目的，并按正常流程的实测耗时确认新值不影响有效工作。\n',
    ''
  ).replace(
    '\n### 怎么取得这个授权',
    '\n- 若要缩短限制，不须说明目的，也无需提供正常路径的实测耗时；新值可以中断有效工作。\n\n### 怎么取得这个授权'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithSeparateNegatedLoweringBullet).includes(
      'lowering timeout limits must preserve measured evidence and valid work'
    ),
    'a separate authorization-list bullet cannot negate the lowering safeguards'
  )
  const timeoutPolicyWithMissingLoweringPurpose = timeoutPolicy.replace(
    '应先按失败证据排查原因。',
    '应先按失败证据排查原因。When lowering a timeout, the applicant may provide no purpose or measured duration.'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithMissingLoweringPurpose).includes(
      'lowering timeout limits must preserve measured evidence and valid work'
    ),
    'allowing a lower-timeout request to omit purpose and duration evidence must fail'
  )
  for (const missingLoweringMeasurement of [
    'Cutting a timeout does not require normal-path measurements.',
    'Trimming timeout limits does not require measured normal-path duration.',
    'When trimming the limit, no measurement is needed.'
  ]) {
    const policyWithMissingLoweringMeasurement = timeoutPolicy.replace(
      '\n### 怎么取得这个授权',
      `\n- ${missingLoweringMeasurement}\n\n### 怎么取得这个授权`
    )
    assert.ok(
      findTimeoutAuthorizationPolicyViolations(policyWithMissingLoweringMeasurement).includes(
        'lowering timeout limits must preserve measured evidence and valid work'
      ),
      `shortening aliases must retain lowering evidence safeguards: ${missingLoweringMeasurement}`
    )
  }
  for (const missingSafeguard of [
    'Lowering a limit does not require preserving valid work.',
    'No proof is needed that the lower value preserves valid work.'
  ]) {
    const timeoutPolicyWithMissingWorkSafeguard = timeoutPolicy.replace(
      '应先按失败证据排查原因。',
      `应先按失败证据排查原因。${missingSafeguard}`
    )
    assert.ok(
      findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithMissingWorkSafeguard).includes(
        'lowering timeout limits must preserve measured evidence and valid work'
      ),
      `lower-cap preservation must not be optional: ${missingSafeguard}`
    )
  }
  const timeoutPolicyWithNegatedEvidence = timeoutPolicy.replace(
    '申请要写拟申请值、现有上限（新增且无旧值时写「无」）、相关 run 的实际耗时和对应日志/阶段记录，并说明目标依据。',
    '申请不必写拟申请值、现有上限（新增且无旧值时写「无」）、相关 run 的实际耗时和对应日志/阶段记录，也不必说明目标依据。'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithNegatedEvidence).includes(
      'timeout applications must retain required value, duration, evidence, and rationale'
    ),
    'required application evidence must not be negated while its concepts remain present'
  )
  const timeoutPolicyWithNegatedExhaustionProof = timeoutPolicy.replace(
    '须证明失败 run 达到原上限后仍未完成工作；日志应证明原因是时限过短而非其他故障。',
    '无需证明失败 run 用尽原上限后仍未完成工作；日志无需证明原因是时限过短而非其他故障。'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithNegatedExhaustionProof).includes(
      'raising a cap requires proof it was exhausted and caused the incomplete work'
    ),
    'a cap raise cannot negate exhaustion or cause evidence'
  )
  const advisoryRequirementCases = [
    {
      policy: timeoutPolicy.replace(
        '申请要写拟申请值、现有上限（新增且无旧值时写「无」）、相关 run 的实际耗时和对应日志/阶段记录，并说明目标依据。',
        '申请建议写拟申请值、现有上限（新增且无旧值时写「无」）、相关 run 的实际耗时和对应日志/阶段记录，并说明目标依据。'
      ),
      violation: 'timeout applications must retain required value, duration, evidence, and rationale',
      wording: 'application evidence cannot be downgraded to a suggestion'
    },
    {
      policy: timeoutPolicy.replace(
        '须证明失败 run 达到原上限后仍未完成工作；日志应证明原因是时限过短而非其他故障。',
        '可提供失败 run 达到原上限后仍未完成工作的证明；日志可以说明原因是时限过短而非其他故障。'
      ),
      violation: 'raising a cap requires proof it was exhausted and caused the incomplete work',
      wording: 'prior-cap and cause proof cannot be optional'
    },
    {
      policy: timeoutPolicy.replace(
        '按最慢一次的实测耗时评估',
        '可按最慢一次的实测耗时评估'
      ),
      violation: 'timeout requests must use the slowest comparable run',
      wording: 'use of the slowest comparable run must stay mandatory'
    },
    {
      policy: timeoutPolicy.replace(
        '须说明目的，并按正常流程的实测耗时确认新值不影响有效工作。',
        '建议说明目的，并可提供正常路径的实测耗时来证明新值不影响有效工作。'
      ),
      violation: 'lowering timeout limits must preserve measured evidence and valid work',
      wording: 'lowering safeguards cannot be downgraded to suggestions'
    }
  ]
  for (const { policy, violation, wording } of advisoryRequirementCases) {
    const violations = findTimeoutAuthorizationPolicyViolations(policy)
    assert.ok(
      violations.includes(violation),
      `${wording}: ${violations.join(', ')}`
    )
  }
  const advisoryEnglishRequirementCases = [
    {
      statement: 'Timeout applicants may provide the requested value, current cap, run duration, logs, and rationale.',
      violation: 'timeout applications must retain required value, duration, evidence, and rationale'
    },
    {
      statement: 'For a timeout increase, applicants may show proof that the prior cap was exhausted while work remained incomplete and timeout was the cause.',
      violation: 'raising a cap requires proof it was exhausted and caused the incomplete work'
    },
    {
      statement: 'Applicants may assess timeout changes using the slowest comparable measured run.',
      violation: 'timeout requests must use the slowest comparable run'
    },
    {
      statement: 'When lowering a timeout, applicants may state a purpose and use normal-path measured duration to confirm valid work remains possible.',
      violation: 'lowering timeout limits must preserve measured evidence and valid work'
    }
  ]
  for (const { statement, violation } of advisoryEnglishRequirementCases) {
    const policy = timeoutPolicy.replace(
      '\n### 怎么取得这个授权',
      `\n- ${statement}\n\n### 怎么取得这个授权`
    )
    assert.ok(
      findTimeoutAuthorizationPolicyViolations(policy).includes(violation),
      `advisory wording must not weaken a required safeguard: ${statement}`
    )
  }
  for (const omittedProof of [
    "You don't need to prove the prior cap was exhausted.",
    'It is optional to show that the prior cap was exhausted.',
    'You can skip showing that the prior cap was exhausted.',
    'No proof is needed that timeout caused the incomplete work.',
    'The timeout need not be the cause of incomplete work.',
    'It is acceptable to raise the cap even if another failure caused the incomplete run.',
    'It is permitted to increase the timeout even if the failure was unrelated to timeout.',
    'Increasing the timeout is permitted even if another failure caused the incomplete run.',
    'You may raise the cap when a network failure caused the run to fail.',
    'The cap can be raised even though no timeout occurred.',
    'Applicants need not verify that the previous limit was reached before the run ended.',
    'Proof that the old deadline was reached before work remained incomplete is optional.',
    'Applicants may omit evidence that the previous cap was hit before work was incomplete.',
    'You may raise the timeout without proving the previous cap was reached.',
    'You may raise the timeout even when the prior cap was not exhausted.',
    'Applicants may request a timeout increase before reaching the previous limit.',
    'A timeout may be raised if the prior cap was not reached.',
    'It is acceptable to raise the limit before exhausting the prior cap.',
    'Applicants may increase the cap without waiting for the prior limit to be reached.',
    'If the timeout was not exhausted, increasing it is still permitted.',
    'You may increase the cap before exhausting it.',
    'An increase is allowed whether or not the current limit was hit.',
    'Timeout changes do not depend on the previous limit being exhausted.',
    'It is permissible to increase timeout limits without exhausting the old cap.',
    'Prior-cap exhaustion is not a prerequisite for a timeout increase.',
    'An increase does not depend on the previous cap being exhausted.',
    'Timeout changes are permitted without exhausting the current cap.',
    'You may increase the timeout without prior cap exhaustion.',
    'Timeouts may be increased even when no run has hit the configured deadline.',
    'There is no requirement to exhaust the prior limit before increasing a timeout.',
    'Timeout caps may be raised before the existing cap is hit.',
    'Timeout may be extended when work is still incomplete, even if the previous limit was not exhausted.',
    'Timeout applicants may omit run duration and logs.',
    'Timeout applicants are not obliged to provide run duration and logs.',
    'Run logs are optional for timeout applications.',
    'Applicants may omit logs and run duration for timeout applications.',
    'Applicants may omit the proposed value.',
    'Applicants are not required to state execution duration.',
    'Applicants are not required to state the actual execution time.',
    'Applicants may omit the proposed timeout value.',
    'Applicants are not required to provide the target value.',
    'Applicants may skip the evidence and rationale for timeout changes.',
    'You do not need to include the requested value or evidence.',
    'There is no requirement to provide the requested value and evidence.',
    'Applicants must not include the requested value, run duration, logs, or rationale.',
    'Applicants are prohibited from providing timeout request logs or evidence.',
    'Do not include proof that the prior cap was exhausted or that the failure was caused by it.',
    'Applicants shall not be required to provide run logs or stage evidence.'
  ]) {
    const timeoutPolicyWithOmittedProof = timeoutPolicy.replace(
      '应先按失败证据排查原因。',
      `应先按失败证据排查原因。${omittedProof}`
    )
    const expectedViolation = /requested value|proposed value|timeout value|target value|evidence|duration|execution time|logs|rationale|stage/i.test(omittedProof)
      ? 'timeout applications must retain required value, duration, evidence, and rationale'
      : 'raising a cap requires proof it was exhausted and caused the incomplete work'
    assert.ok(
      findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithOmittedProof).includes(
        expectedViolation
      ),
      `omitting required evidence must fail: ${omittedProof}`
    )
  }
  for (const omittedRequiredFieldReference of [
    'These fields are optional.',
    'Those details may be omitted.'
  ]) {
    const timeoutPolicyWithOmittedRequiredFieldReference = timeoutPolicy.replace(
      '\n### 怎么取得这个授权',
      `\n- ${omittedRequiredFieldReference}\n\n### 怎么取得这个授权`
    )
    assert.ok(
      findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithOmittedRequiredFieldReference).includes(
        'timeout applications must retain required value, duration, evidence, and rationale'
      ),
      `anaphoric references must retain the timeout application requirements: ${omittedRequiredFieldReference}`
    )
  }
  for (const omittedLoweringEvidence of [
    'Applicants may lower timeout limits without stating a purpose or measuring normal-path duration.',
    'Applicants may reduce timeout caps without verifying that normal work completes within the new value.',
    'It is permissible to shorten timeout limits without providing a purpose.'
  ]) {
    const timeoutPolicyWithOmittedLoweringEvidence = timeoutPolicy.replace(
      '\n### 怎么取得这个授权',
      `\n- ${omittedLoweringEvidence}\n\n### 怎么取得这个授权`
    )
    assert.ok(
      findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithOmittedLoweringEvidence).includes(
        'lowering timeout limits must preserve measured evidence and valid work'
      ),
      `lower-limit evidence cannot be omitted: ${omittedLoweringEvidence}`
    )
  }
  const timeoutPolicyWithNegatedSlowestRun = timeoutPolicy.replace(
    '按最慢一次的实测耗时评估',
    '不必按最慢一次的实测耗时评估'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithNegatedSlowestRun).includes(
      'timeout requests must use the slowest comparable run'
    ),
    'the slowest comparable run rule must not be negated'
  )
  for (const nonMandatorySlowestRun of [
    'The slowest comparable run is not necessarily used.',
    'The slowest comparable run is not always used.',
    'The slowest comparable run need not be considered.'
  ]) {
    const timeoutPolicyWithOptionalSlowestRun = timeoutPolicy.replace(
      '\n### 怎么取得这个授权',
      `\n- ${nonMandatorySlowestRun}\n\n### 怎么取得这个授权`
    )
    assert.ok(
      findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithOptionalSlowestRun).includes(
        'timeout requests must use the slowest comparable run'
      ),
      `the slowest comparable run cannot be made optional: ${nonMandatorySlowestRun}`
    )
  }
  const timeoutPolicyWithForbiddenSlowestRun = timeoutPolicy.replace(
    '应先按失败证据排查原因。',
    '应先按失败证据排查原因。The slowest comparable run must not be used as the basis for a request.'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithForbiddenSlowestRun).includes(
      'timeout requests must use the slowest comparable run'
    ),
    'an instruction forbidding use of the slowest comparable run must fail'
  )
  const timeoutPolicyWithIgnoredSlowestRun = timeoutPolicy.replace(
    '\n### 怎么取得这个授权',
    '\n- Applicants must ignore the slowest comparable run.\n\n### 怎么取得这个授权'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithIgnoredSlowestRun).includes(
      'timeout requests must use the slowest comparable run'
    ),
    'a direct instruction to ignore the slowest comparable run must fail'
  )
  const timeoutPolicyNotConsideringSlowestRun = timeoutPolicy.replace(
    '\n### 怎么取得这个授权',
    '\n- Do not consider the slowest comparable run.\n\n### 怎么取得这个授权'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyNotConsideringSlowestRun).includes(
      'timeout requests must use the slowest comparable run'
    ),
    'a direction to disregard the slowest run by not considering it must fail'
  )
  const timeoutPolicyConsideringSlowestRun = timeoutPolicy.replace(
    '\n### 怎么取得这个授权',
    '\n- Consider the slowest comparable run when assessing a timeout request.\n\n### 怎么取得这个授权'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyConsideringSlowestRun),
    [],
    'an affirmative instruction to consider the slowest run remains valid'
  )
  for (const prohibition of [
    'Applicants may not infer from the fastest or a warm-cache run.',
    'Applicants shall not infer from the fastest or a warm-cache run.'
  ]) {
    const timeoutPolicyWithEquivalentProhibition = timeoutPolicy.replace(
      '不能根据最快或缓存已热的 run 判断。',
      prohibition
    )
    assert.deepEqual(
      findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithEquivalentProhibition),
      [],
      `equivalent prohibition wording must pass: ${prohibition}`
    )
  }
  const timeoutPolicyWithFastestInference = timeoutPolicy.replace(
    '不能根据最快或缓存已热的 run 判断。',
    '可以根据最快或缓存已热的 run 推断。'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithFastestInference).includes(
      'timeout requests must not rely on fastest or warm-cache runs'
    ),
    'allowing fastest or warm-cache estimates must fail in the same evidence clause'
  )
  for (const fastestRunInstruction of [
    'Always use the fastest run to set the timeout.',
    'Use the fastest comparable run as the timeout basis.',
    'Applicants are not prohibited from using the fastest run for timeout estimation.',
    'There is no prohibition on using the fastest run to estimate timeout duration.',
    'Fastest runs are valid evidence for time estimates.',
    'Warm-cache runs may be treated as representative for timing.',
    'Use warm-cache runs as representative timing evidence.'
  ]) {
    const timeoutPolicyWithFastestDirective = timeoutPolicy.replace(
      '\n### 怎么取得这个授权',
      `\n- ${fastestRunInstruction}\n\n### 怎么取得这个授权`
    )
    assert.ok(
      findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithFastestDirective).includes(
        'timeout requests must not rely on fastest or warm-cache runs'
      ),
      `a direct fastest-run instruction must fail: ${fastestRunInstruction}`
    )
  }
  for (const alternativeRunBasis of [
    'Applicants may choose a faster comparable run instead of the slowest run.',
    'Use a quicker comparable run rather than the slowest comparable run.',
    'Applicants can set the value using a typical run rather than the slowest comparable run.',
    'Applicants may choose a faster comparable run in place of the slowest run.',
    'Use the median comparable run instead of the slowest comparable run when estimating duration.',
    'Use the p90 run instead of the slowest comparable run when estimating duration.',
    'Use a typical comparable run to estimate the timeout.',
    'The median run is more representative than the slowest run.',
    'You may choose a quicker run when the slowest one is an outlier.'
  ]) {
    const timeoutPolicyWithAlternativeRunBasis = timeoutPolicy.replace(
      '\n### 怎么取得这个授权',
      `\n- ${alternativeRunBasis}\n\n### 怎么取得这个授权`
    )
    assert.ok(
      findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithAlternativeRunBasis).includes(
        'timeout requests must use the slowest comparable run'
      ),
      `a faster, quicker, or typical run cannot replace the slowest comparable run: ${alternativeRunBasis}`
    )
  }
  const timeoutPolicyWithContradictoryFastestInference = timeoutPolicy.replace(
    '不能根据最快或缓存已热的 run 判断。',
    '不得以最快或缓存热 run 推断，但可依据最快 run 估算。'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithContradictoryFastestInference).includes(
      'timeout requests must not rely on fastest or warm-cache runs'
    ),
    'a later permission in a separate clause must not inherit an earlier prohibition'
  )
  const timeoutPolicyWithSeparateRunProhibitions = equivalentEnglishTimeoutPolicy.replace(
    'do not infer from the fastest or a warm-cache run.',
    'Do not infer timing from the fastest comparable run. Do not infer timing from a warm-cache run.'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithSeparateRunProhibitions),
    [],
    'fastest-run and warm-cache prohibitions may be stated separately'
  )
  const timeoutPolicyExcludingFastestAndWarmCacheRuns = equivalentEnglishTimeoutPolicy.replace(
    'do not infer from the fastest or a warm-cache run.',
    'Exclude the fastest or warm-cache runs from timeout estimates.'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyExcludingFastestAndWarmCacheRuns),
    [],
    'excluding fastest and warm-cache runs from estimates is equivalent to forbidding inference from them'
  )
  for (const nonInterruptingLowering of [
    'For a reduction, state the purpose and use normal-path measured duration to prove the new value can never interrupt valid work.',
    'For a reduction, state the purpose and use normal-path measured duration to prove valid work cannot be interrupted by the new value.',
    'For a reduction, state the purpose and use normal-path measured duration to prove the new value never interrupts valid work.',
    'For a reduction, state the purpose and use normal-path measured duration to prove the new value will not interrupt valid work.',
    "For a reduction, state the purpose and use normal-path measured duration to prove the new value doesn't interrupt valid work."
  ]) {
    const policyWithNonInterruptingLowering = equivalentEnglishTimeoutPolicy.replace(
      'For a reduction, state the purpose and use normal-path measured duration to prove the new value does not interrupt valid work.',
      nonInterruptingLowering
    )
    assert.deepEqual(
      findTimeoutAuthorizationPolicyViolations(policyWithNonInterruptingLowering),
      [],
      `explicitly preventing work interruption must remain a valid lower-limit safeguard: ${nonInterruptingLowering}`
    )
  }
  const equivalentLoweringOutcome = equivalentEnglishTimeoutPolicy.replace(
    'prove the new value does not interrupt valid work',
    'show that valid jobs remain completable under the new cap'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(equivalentLoweringOutcome),
    [],
    'lower-cap preservation may use an equivalent affirmative completion condition'
  )
  const lowerCapWithNegatedGuarantee = equivalentEnglishTimeoutPolicy.replace(
    'prove the new value does not interrupt valid work',
    'show that the new cap is not guaranteed to preserve valid work'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(lowerCapWithNegatedGuarantee).includes(
      'lowering a limit requires a purpose and normal-path timing that preserves valid work'
    ),
    'a negated or uncertain preservation claim cannot satisfy the lower-cap safeguard'
  )
  const lowerCapThatPreservesOnlyTheRecord = equivalentEnglishTimeoutPolicy.replace(
    'prove the new value does not interrupt valid work',
    'prove the new value preserves the record of valid work'
  )
  assert.ok(
    findTimeoutAuthorizationPolicyViolations(lowerCapThatPreservesOnlyTheRecord).includes(
      'lowering a limit requires a purpose and normal-path timing that preserves valid work'
    ),
    'preserving a record of valid work does not prove that the work can complete'
  )
  for (const uncertainPreservation of [
    'show that the new cap may not preserve valid work',
    'show that the new cap might fail to preserve valid work',
    'show that the new cap generally preserves valid work'
  ]) {
    const policyWithUncertainPreservation = equivalentEnglishTimeoutPolicy.replace(
      'prove the new value does not interrupt valid work',
      uncertainPreservation
    )
    assert.ok(
      findTimeoutAuthorizationPolicyViolations(policyWithUncertainPreservation).includes(
        'lowering a limit requires a purpose and normal-path timing that preserves valid work'
      ),
      `uncertain preservation wording cannot satisfy the lower-cap safeguard: ${uncertainPreservation}`
    )
  }
  for (const loweringRisk of [
    'When lowering timeout limits, the new setting may interrupt valid work.',
    'Timeout reductions may interrupt valid work.',
    'For timeout reductions, valid work may be interrupted.',
    'When lowering a timeout, the new cap may not preserve valid work.',
    'Timeout reductions may not preserve valid work.',
    'Lowering timeout caps may leave valid work incomplete.',
    'It is acceptable for a reduced timeout cap to leave useful jobs incomplete.',
    'It is okay if a lower timeout leaves valid work incomplete.',
    'A shorter timeout may let a valid job remain unfinished.',
    'A reduced cap can leave work unfinished.',
    'A lower timeout may prevent valid work from completing.',
    'Lowering a timeout can interrupt valid work.',
    'Lowering a timeout may terminate valid work.',
    'A reduced timeout will terminate valid work.',
    'A lower timeout may cancel valid work.',
    'Reducing a timeout can abort valid work.',
    'When reducing a timeout, work may be aborted.',
    'A shorter timeout may kill a valid task.',
    'Do not preserve valid work when lowering timeouts.',
    'You may shorten the timeout even if valid work is interrupted.',
    'For shortened timeouts, useful work might be interrupted.',
    'It is acceptable for a lower timeout to interrupt valid work.',
    'It is okay if a lower cap stops valid jobs.',
    'For lowered timeouts, do not verify that the new value preserves valid work.',
    'For a timeout reduction, the new cap must not interrupt valid work, but the lower cap may interrupt valid work.'
  ]) {
    const timeoutPolicyWithLoweringRisk = timeoutPolicy.replace(
      '\n### 怎么取得这个授权',
      `\n- ${loweringRisk}\n\n### 怎么取得这个授权`
    )
    assert.ok(
      findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithLoweringRisk).includes(
        'lowering timeout limits must preserve measured evidence and valid work'
      ),
      `a separate bullet cannot permit lower limits to interrupt work: ${loweringRisk}`
    )
  }
  const timeoutPolicyWithUnrelatedMeasurementAdvice = timeoutPolicy.replace(
    '\n### 怎么取得这个授权',
    '\n- For context, a report may state normal-path measured duration.\n\n### 怎么取得这个授权'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(timeoutPolicyWithUnrelatedMeasurementAdvice),
    [],
    'unrelated advisory text about measurements must not weaken the lowering rule'
  )
  const acceptableRuleWithExplicitDenial = timeoutPolicy.replace(
    '\n### 怎么取得这个授权',
    '\n- It is not acceptable for a lower timeout to interrupt valid work.\n\n### 怎么取得这个授权'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(acceptableRuleWithExplicitDenial),
    [],
    'a negated acceptability statement must not be treated as permission to interrupt valid work'
  )
  const acceptableRuleWithLaterRetraction = timeoutPolicy.replace(
    '\n### 怎么取得这个授权',
    '\n- Timeout reductions may interrupt valid work, but this is not acceptable.\n\n### 怎么取得这个授权'
  )
  assert.deepEqual(
    findTimeoutAuthorizationPolicyViolations(acceptableRuleWithLaterRetraction),
    [],
    'a later anaphoric denial must retract an earlier interruption permission'
  )
  assert.deepEqual(findTimeoutAuthorizationPolicyViolations('timeout-minutes'), [
    'timeout authorization clause in the user-authorization list'
  ])

  // 远程与协议链接不判定可触达性：离线无法验证，域名失效也不是本仓漂移。
  for (const remote of [
    'https://example.com/dead',
    'http://example.com',
    'mailto:someone@example.com',
    'tel:+8610000',
    'vscode:extension/foo'
  ])
    assert.equal(parseLocalLinkTarget(remote), null, remote)

  // 纯锚点与纯 query 都指向本文件本身，没有文件可达性问题。
  assert.equal(parseLocalLinkTarget('#怎么取得这个授权'), null)
  assert.equal(parseLocalLinkTarget('?raw'), null)
  assert.equal(parseLocalLinkTarget('   '), null)

  // 相对路径按当前文件所在目录解析，因此裸文件名必须原样交给调用方去解析成兄弟目录里的文件。
  assert.deepEqual(parseLocalLinkTarget('./workflow.md'), { location: './workflow.md', fragment: '' })
  assert.deepEqual(parseLocalLinkTarget('workflow.md'), { location: 'workflow.md', fragment: '' })
  assert.deepEqual(parseLocalLinkTarget('../adr/0001-ci-pipeline.md'), {
    location: '../adr/0001-ci-pipeline.md',
    fragment: ''
  })

  // 锚点与 query 都要剥出来：`file.md?raw#x` 在文件系统上不是路径。
  assert.deepEqual(parseLocalLinkTarget('./workflow.md#怎么取得这个授权'), {
    location: './workflow.md',
    fragment: '怎么取得这个授权'
  })
  assert.deepEqual(parseLocalLinkTarget('./schema.json?raw'), { location: './schema.json', fragment: '' })
  assert.deepEqual(parseLocalLinkTarget('./schema.json?raw#top'), { location: './schema.json', fragment: 'top' })

  // 尖括号包裹的形式用于带空格的路径。
  assert.deepEqual(parseLocalLinkTarget('<./my doc.md>'), { location: './my doc.md', fragment: '' })

  // title 不是路径的一部分：`[x](./a.md "标题")` 是合法链接，截到 destination 为止。
  assert.deepEqual(parseLocalLinkTarget('./a.md "标题"'), { location: './a.md', fragment: '' })
  assert.deepEqual(parseLocalLinkTarget("./a.md 'title'"), { location: './a.md', fragment: '' })
  assert.deepEqual(parseLocalLinkTarget('./a.md#top "title"'), { location: './a.md', fragment: 'top' })
  assert.deepEqual(parseLocalLinkTarget('<./my doc.md> (title)'), { location: './my doc.md', fragment: '' })

  // destination 里的括号合法：`[p](./some(dir)/x.md)` 的路径不能被截成 `./some(dir`。
  const targetAfterLabel = text => readInlineLinkTarget(text, text.indexOf('](') + 2)
  assert.equal(targetAfterLabel('[p](./some(dir)/x.md)'), './some(dir)/x.md')
  assert.equal(targetAfterLabel('[p](./a.md (title))'), './a.md (title)')
  assert.equal(targetAfterLabel('[p](<./a b.md>)'), '<./a b.md>')
  // 跨行或不闭合的 `](` 不是完整链接：返回 null，不能把后文吞成 target。
  assert.equal(targetAfterLabel('[p](./a.md\n[q](./b.md)'), null)
  assert.equal(readInlineLinkTarget('[p](./a.md', 5), null)

  // 非根文档的 target 必须以 `./`/`../` 起头；`.` 与 `..` 本身已是显式相对写法，绝对路径另有判据。
  assert.equal(isUnqualifiedRelativeTarget('./a.md'), false)
  assert.equal(isUnqualifiedRelativeTarget('../a.md'), false)
  assert.equal(isUnqualifiedRelativeTarget('.'), false)
  assert.equal(isUnqualifiedRelativeTarget('..'), false)
  assert.equal(isUnqualifiedRelativeTarget('/abs/a.md'), false)
  assert.equal(isUnqualifiedRelativeTarget('a.md'), true)
  assert.equal(isUnqualifiedRelativeTarget('docs/a.md'), true)

  // 代码片段里的 `[...](...)` 不是链接：正则字面量常长成这样。
  assert.equal(
    stripCodeSegments('见 `/[?&](?:worker|raw)\b/` 排除清单').includes('](?:worker'),
    false,
    'inline code must be stripped'
  )
  assert.equal(
    stripCodeSegments('```js\nconst x = [/[?&](?:raw)/]\n```\n[real](./a.md)').includes('](?:raw)'),
    false,
    'fenced code must be stripped'
  )
  assert.equal(
    stripCodeSegments('```js\n[a](./dead.md)\n```\n[real](./a.md)').includes('./dead.md'),
    false,
    'links inside fences must not be scanned'
  )
  assert.equal(stripCodeSegments('[real](./a.md)').includes('](./a.md)'), true, 'real links must survive')

  // ~~~ 围栏与 ``` 同等对待，混用字符时不能互相提前闭合。
  assert.equal(
    stripCodeSegments('~~~md\n[a](./dead.md)\n~~~\n[real](./a.md)').includes('./dead.md'),
    false,
    'tilde fences must be stripped'
  )
  assert.equal(
    stripCodeSegments('~~~md\n```\n[a](./dead.md)\n~~~\n[real](./a.md)').includes('./dead.md'),
    false,
    'a ``` line must not close a ~~~ fence'
  )
  assert.equal(
    stripCodeSegments('````md\n```\n[a](./dead.md)\n````\n[real](./a.md)').includes('./dead.md'),
    false,
    'a ``` line must not close a four-backtick fence'
  )

  // CommonMark 里未闭合围栏延续到文件尾：后面的行不是正文，不能报成断链。
  assert.equal(
    stripCodeSegments('```md\n[a](./dead.md)\n[still code](./dead2.md)').includes('./dead'),
    false,
    'an unclosed fence runs to EOF'
  )

  // 行内 code 按等长反引号配对：跨单个反引号的写法要整段消失。
  assert.equal(
    stripCodeSegments('``a ` [b](./dead.md)``').includes('./dead.md'),
    false,
    'multi-backtick inline code must be stripped whole'
  )
  assert.equal(
    stripCodeSegments('[real](./a.md) 与 ``x ` y `` 并存').includes('](./a.md)'),
    true,
    'inline code stripping must not eat the surrounding text'
  )

  // 围栏外的行数不能因剥离而变化：锚点与报错按行读取时要能对上。
  assert.equal(stripCodeSegments('a\n```\nb\n```\nc').split('\n').length, 5)

  process.stdout.write('scripts/lib/context-invariants.test.mjs: all assertions passed\n')
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`)
  process.exitCode = 1
}
