/**
 * 两种队列的私有调度内核。
 *
 * 这里不直接导出。`defineQueue` 与 `defineAckQueue` 只在消费完成的判定上不同，
 * 其余的入队、暂停、恢复、持久化提交和 flush 边界应该由同一份状态机负责。
 */

type QueueMode = 'consume' | 'ack'

/** 可被队列消费的同步或异步结果。 */
export type QueueConsumeResult = void | PromiseLike<void>

/**
 * 通用队列配置。
 *
 * `onPersist` 只接收当前待消费项的浅层快照；它是同步提交接缝，
 * 这样队列才能在持久化成功后再提交内存状态。
 */
export interface QueueOptions<T> {
  initialItems?: readonly T[]
  onConsume: (item: T) => QueueConsumeResult
  onPersist?: (items: readonly T[]) => void
  onConsumeError?: (error: unknown, item: T) => unknown
}

/** 队列的调度控制面。 */
export interface QueueController<T> {
  enqueue(item: T): void
  pause(): void
  resume(): void
  flush(): Promise<void>
}

type EntryStatus = 'pending' | 'failed' | 'inFlight'

interface Entry<T> {
  id: number
  data: T
  status: EntryStatus
}

const NO_PERSISTENCE_ERROR = Symbol('no-persistence-error')
const UNDEFINED_PERSISTENCE_ERROR_MESSAGE = 'onPersist 失败时抛出了 undefined。'

interface OperationResult {
  persistenceError: unknown
}

interface Operation {
  promise: Promise<OperationResult>
  settled: boolean
}

interface QueueCoreOptions<T> extends QueueOptions<T> {
  mode: QueueMode
}

const REENTRANT_PERSISTENCE_MESSAGE = 'onPersist 必须是不可重入的同步提交函数；不要在 onPersist 内调用队列控制方法。'
const ASYNC_PERSISTENCE_MESSAGE = 'onPersist 必须同步完成；异步持久化不支持 persist-before-commit。'
const REENTRANT_CONSUME_FLUSH_MESSAGE =
  'onConsume 不能在同步执行期间调用同一队列的 flush()；请在消费者外部触发 flush()。'

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) return false
  return typeof (value as { then?: unknown }).then === 'function'
}

/**
 * 创建队列的共享实现。
 *
 * `mode === 'consume'` 时，调用 `onConsume` 后立即将条目视为消费完成；
 * `mode === 'ack'` 时，必须等 `onConsume` 返回的 Promise fulfilled 后才移除条目。
 */
export function createQueueCore<T>(options: QueueCoreOptions<T>): QueueController<T> {
  let nextId = 0
  const entries: Entry<T>[] = (options.initialItems ?? []).map(data => createEntry(data))
  const operations = new Map<number, Operation>()

  let isPaused = false
  let isDraining = false
  let isDrainScheduled = false
  // 初始恢复项必须等初始化 microtask 释放后再由普通 drain 消费；否则立即 enqueue()
  // 会通过 startDrain() 绕过这条边界。没有 initialItems 时仍保持 enqueue() 的即时语义。
  let isInitialDrainPending = entries.length > 0
  let isPersisting = false
  let isPersistenceBlocked = false
  let hasPersistenceError = false
  let lastPersistenceError: unknown
  let retryVersion = 0
  let consumerInvocationDepth = 0

  function createEntry(data: T): Entry<T> {
    return {
      id: nextId++,
      data,
      status: 'pending'
    }
  }

  function getItems(): T[] {
    return entries.map(entry => entry.data)
  }

  function assertNotPersisting() {
    if (isPersisting) throw new Error(REENTRANT_PERSISTENCE_MESSAGE)
  }

  /**
   * 持久化采用 persist-before-commit：外部写入成功后，才改变内存中的成员关系。
   * 给回调的数组是新的浅层快照，回调不能通过修改它直接改写队列内部状态。
   *
   * `onPersist` 故意保持同步。异步回调无法与同步的 `enqueue()` / `resume()` 契约
   * 组成可靠的提交事务，因此运行时会拒绝 thenable，并吸收它可能产生的 rejection。
   */
  function persistSnapshot(items: readonly T[]) {
    if (!options.onPersist) return
    if (isPersisting) throw new Error(REENTRANT_PERSISTENCE_MESSAGE)

    isPersisting = true
    try {
      const result = options.onPersist([...items])
      if (isPromiseLike(result)) {
        // async onPersist 可能在稍后 rejection；先接住，避免把错误变成 unhandled rejection。
        void Promise.resolve(result).catch(() => {})
        throw new TypeError(ASYNC_PERSISTENCE_MESSAGE)
      }
    } catch (error) {
      const normalizedError = normalizePersistenceError(error)
      markPersistenceError(normalizedError)
      throw normalizedError
    } finally {
      isPersisting = false
    }
  }

  function normalizePersistenceError(error: unknown) {
    // JavaScript 允许 `throw undefined`。保留 blocked 状态时必须有一个可观察的
    // Error，否则 `flush()` / `resume()` 可能再次抛出 undefined，丢失失败原因。
    return error === undefined ? new Error(UNDEFINED_PERSISTENCE_ERROR_MESSAGE) : error
  }

  function markPersistenceError(error: unknown, replace = false) {
    const normalizedError = normalizePersistenceError(error)
    isPersistenceBlocked = true
    if (!hasPersistenceError || replace) {
      hasPersistenceError = true
      lastPersistenceError = normalizedError
    }
  }

  function currentPersistenceError(): unknown {
    return hasPersistenceError && lastPersistenceError !== undefined
      ? lastPersistenceError
      : new Error('队列持久化已阻塞')
  }

  function notifyConsumeError(error: unknown, item: T) {
    if (!options.onConsumeError) return

    try {
      // 错误观察器本身不能改变队列状态，也不能制造 unhandled rejection。
      void Promise.resolve(options.onConsumeError(error, item)).catch(() => {})
    } catch {
      // 观察器是辅助能力；它抛错时忽略，不阻塞队列。
    }
  }

  function invokeConsumer(item: T): QueueConsumeResult {
    consumerInvocationDepth += 1
    try {
      return options.onConsume(item)
    } finally {
      consumerInvocationDepth -= 1
    }
  }

  function scheduleDrain() {
    if (isDrainScheduled || isPaused || isPersistenceBlocked) return

    isDrainScheduled = true
    queueMicrotask(() => {
      isDrainScheduled = false
      isInitialDrainPending = false
      startDrain()
    })
  }

  function startDrain() {
    if (isInitialDrainPending || isPaused || isPersistenceBlocked || isDraining) return
    void drain()
  }

  function findNextPendingEntry() {
    return entries.find(entry => entry.status === 'pending')
  }

  function commitEnqueue(data: T) {
    assertNotPersisting()
    if (isPersistenceBlocked) {
      throw currentPersistenceError()
    }

    const candidate = [...getItems(), data]
    persistSnapshot(candidate)
    entries.push(createEntry(data))
  }

  function commitRemoval(entry: Entry<T>) {
    // 条目已经在消费操作中时，即使另一个并发操作刚刚触发 persistence gate，
    // 仍允许它完成自己的提交；flush 需要等待这些既有 in-flight 操作 settle。
    // 新操作不会通过 startEntry 绕过 gate。
    assertNotPersisting()

    const index = entries.findIndex(candidate => candidate.id === entry.id)
    if (index < 0) return

    const candidate = entries.filter(item => item.id !== entry.id).map(item => item.data)
    persistSnapshot(candidate)
    entries.splice(index, 1)
  }

  function markFailed(entry: Entry<T>, attemptVersion: number) {
    entry.status = 'failed'

    // resume() 是显式的重试请求。若它发生在请求在途期间，失败回调也应当
    // 兑现这次请求，而不是把条目留在 failed 状态直到下一次手动操作。
    if (attemptVersion !== retryVersion && !isPaused && !isPersistenceBlocked) {
      entry.status = 'pending'
      scheduleDrain()
    }
  }

  function createOperation(entry: Entry<T>) {
    let resolveOperation!: (result: OperationResult) => void
    const record: Operation = {
      promise: new Promise<OperationResult>(resolve => {
        resolveOperation = resolve
      }),
      settled: false
    }
    operations.set(entry.id, record)

    return {
      operation: record.promise,
      settle: (result: OperationResult) => {
        if (record.settled) return
        record.settled = true
        resolveOperation(result)
        // settle 后立即释放去重记录。这样同步消费失败后紧接着调用 flush()
        // 时，可以按 flush 的语义重新尝试 failed 条目，而不会只等待已经结束的旧操作。
        if (operations.get(entry.id) === record) operations.delete(entry.id)
      }
    }
  }

  function startEntry(entry: Entry<T>, allowFailed: boolean): Promise<OperationResult> | undefined {
    const existing = operations.get(entry.id)
    if (existing && !existing.settled) return existing.promise
    if (existing?.settled) operations.delete(entry.id)
    if (isPersistenceBlocked) return undefined
    if (entry.status === 'inFlight') return undefined
    if (entry.status !== 'pending' && !(allowFailed && entry.status === 'failed')) return undefined

    entry.status = 'inFlight'
    const attemptVersion = retryVersion
    const { operation, settle } = createOperation(entry)

    if (options.mode === 'consume') {
      let result: void | PromiseLike<void> = undefined
      let didThrow = false
      let consumeError: unknown
      try {
        result = invokeConsumer(entry.data)
      } catch (error) {
        didThrow = true
        consumeError = error
      }

      if (result !== undefined) {
        // 普通队列不等待消费者 Promise，但必须观察 rejection，避免未处理拒绝。
        void Promise.resolve(result).catch(error => notifyConsumeError(error, entry.data))
      }

      // 消费错误的可观察性独立于移除持久化；即使后续提交失败，也不能漏掉通知。
      if (didThrow) notifyConsumeError(consumeError, entry.data)

      try {
        commitRemoval(entry)
        settle({ persistenceError: NO_PERSISTENCE_ERROR })
      } catch (error) {
        entry.status = 'pending'
        markPersistenceError(error)
        settle({ persistenceError: error })
      }

      return operation
    }

    let result: void | PromiseLike<void> = undefined
    try {
      result = invokeConsumer(entry.data)
    } catch (error) {
      markFailed(entry, attemptVersion)
      settle({ persistenceError: NO_PERSISTENCE_ERROR })
      notifyConsumeError(error, entry.data)
      return operation
    }

    // 确认队列等待 fulfilled；rejection 只影响当前条目，不阻塞后续条目。
    void Promise.resolve(result).then(
      () => {
        try {
          commitRemoval(entry)
          settle({ persistenceError: NO_PERSISTENCE_ERROR })
        } catch (error) {
          // 传输已经成功，但删除快照未提交；保留条目，恢复后可能重复发送。
          entry.status = 'failed'
          markPersistenceError(error)
          settle({ persistenceError: error })
        }
      },
      error => {
        markFailed(entry, attemptVersion)
        settle({ persistenceError: NO_PERSISTENCE_ERROR })
        notifyConsumeError(error, entry.data)
      }
    )

    return operation
  }

  async function drain() {
    if (isPaused || isPersistenceBlocked || isDraining) return

    isDraining = true
    try {
      while (!isPaused && !isPersistenceBlocked) {
        const entry = findNextPendingEntry()
        if (!entry) return

        const operation = startEntry(entry, false)
        if (!operation) return

        const result = await operation
        if (result.persistenceError !== NO_PERSISTENCE_ERROR) return
      }
    } finally {
      isDraining = false
      if (findNextPendingEntry() && !isPaused && !isPersistenceBlocked) scheduleDrain()
    }
  }

  function enqueue(data: T) {
    assertNotPersisting()
    commitEnqueue(data)
    // 初始恢复项仍等待既有 microtask；没有初始项时，新条目保持即时调度。
    startDrain()
  }

  function pause() {
    assertNotPersisting()
    isPaused = true
  }

  function resume() {
    assertNotPersisting()
    const wasPaused = isPaused

    if (isPersistenceBlocked) {
      try {
        // 先验证当前快照可以重新写入，再解除 queue-global gate。
        persistSnapshot(getItems())
        isPersistenceBlocked = false
        hasPersistenceError = false
        lastPersistenceError = undefined
      } catch (error) {
        // 恢复失败时保留调用前的暂停状态，避免一次失败的 resume 改变两个独立状态。
        isPaused = wasPaused
        markPersistenceError(error, true)
        throw error
      }
    }

    isPaused = false
    retryVersion += 1
    for (const entry of entries) {
      if (entry.status === 'failed') entry.status = 'pending'
    }

    scheduleDrain()
  }

  // 保持 public flush() 的重入检查同步抛出；如果直接把它声明为 async，
  // onPersist 内调用 flush() 会变成 rejected Promise，容易在同步回调中形成 unhandled rejection。
  function flush(): Promise<void> {
    assertNotPersisting()
    if (consumerInvocationDepth > 0) {
      throw new Error(REENTRANT_CONSUME_FLUSH_MESSAGE)
    }
    return flushImpl()
  }

  async function flushImpl() {
    const snapshot = [...entries]
    const operationsToWait: Promise<OperationResult>[] = []

    for (const entry of snapshot) {
      const existing = operations.get(entry.id)
      if (existing && !existing.settled) {
        operationsToWait.push(existing.promise)
        continue
      }
      if (existing?.settled) operations.delete(entry.id)

      // 持久化失败时不再启动新消费，只等待已经在途的操作收敛。
      if (isPersistenceBlocked) continue

      const operation = startEntry(entry, true)
      if (operation) operationsToWait.push(operation)
    }

    const results = await Promise.all(operationsToWait)
    const persistenceErrors = results
      .filter(result => result.persistenceError !== NO_PERSISTENCE_ERROR)
      .map(result => result.persistenceError)

    if (persistenceErrors.length === 1) throw persistenceErrors[0]
    if (persistenceErrors.length > 1) {
      throw new AggregateError(persistenceErrors, '队列持久化提交失败')
    }

    // 可能在 flush 等待期间由其他操作触发持久化失败；即使本次没有捕获到
    // 对应 operation，也不能把 queue-global 的 blocked 状态伪装成成功。
    if (isPersistenceBlocked) throw currentPersistenceError()
  }

  // 初始恢复延后到 microtask，给插件组合（例如 offline-restore）留出 pause 的接线时间。
  scheduleDrain()

  return { enqueue, flush, pause, resume }
}
