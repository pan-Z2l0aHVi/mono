/**
 * @description remeda debounce 废弃了，这是 remeda 官方提供的替代封装
 * @link https://github.com/remeda/remeda/blob/main/packages/remeda/src/funnel.remeda-debounce.test.ts#L10
 */
import { funnel } from 'remeda'

type StrictFunction = (...args: never) => unknown
type Debouncer<F extends StrictFunction, IsNullable extends boolean = true> = {
  readonly call: (...args: Parameters<F>) => ReturnType<F> | (true extends IsNullable ? undefined : never)
  readonly cancel: () => void
  readonly flush: () => ReturnType<F> | undefined
  readonly isPending: boolean
  readonly cachedValue: ReturnType<F> | undefined
}

type DebounceOptions = {
  readonly waitMs?: number
  readonly maxWaitMs?: number
}

export function debounce<F extends StrictFunction>(
  func: F,
  options: DebounceOptions & { readonly timing?: 'trailing' }
): Debouncer<F>
export function debounce<F extends StrictFunction>(
  func: F,
  options:
    | (DebounceOptions & { readonly timing: 'both' })
    | (Omit<DebounceOptions, 'maxWaitMs'> & { readonly timing: 'leading' })
): Debouncer<F, false /* call CAN'T return null */>
export function debounce<F extends StrictFunction>(
  func: F,
  {
    timing,
    waitMs,
    maxWaitMs
  }: DebounceOptions & {
    readonly timing?: 'both' | 'leading' | 'trailing'
  }
) {
  if (maxWaitMs !== undefined && waitMs !== undefined && maxWaitMs < waitMs) {
    throw new Error(`debounce: maxWaitMs (${maxWaitMs.toString()}) cannot be less than waitMs (${waitMs.toString()})`)
  }

  let cachedValue: ReturnType<F> | undefined

  const debouncingFunnel = funnel(
    (args: Parameters<F>) => {
      // Every time the function is invoked the cached value is updated.
      // @ts-expect-error [ts2345, ts2322] -- TypeScript infers the generic sub-
      // types too eagerly, making itself blind to the fact that the types
      // match here.
      cachedValue = func(...args)
    },
    {
      // Debounce stores the latest args it was called with for the next
      // invocation of the callback.
      reducer: (_, ...args: Parameters<F>) => args,
      minQuietPeriodMs: waitMs ?? maxWaitMs ?? 0,
      ...(maxWaitMs !== undefined && { maxBurstDurationMs: maxWaitMs }),
      ...(timing === 'leading'
        ? { triggerAt: 'start' }
        : timing === 'both'
          ? { triggerAt: 'both' }
          : { triggerAt: 'end' })
    }
  )

  return {
    call: (...args: Parameters<F>) => {
      debouncingFunnel.call(...args)
      return cachedValue
    },

    flush: () => {
      debouncingFunnel.flush()
      return cachedValue
    },

    cancel: () => {
      debouncingFunnel.cancel()
    },

    get isPending() {
      return !debouncingFunnel.isIdle
    },

    get cachedValue() {
      return cachedValue
    }
  }
}
