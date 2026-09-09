import { definePlugin } from '@greypan/js-kit'
import type { ReactiveController, ReactiveControllerHost } from 'lit'

// Lit 官方 mixin 签名需要构造器接受任意参数（paramCount 各异的子类构造器都要能赋给
// 基座）；never[] 变体在 extends 链上会丢失 Lit 静态侧类型。any 收敛在这个类型别名内。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = new (...args: any[]) => T

type FormSubmissionValue = File | FormData | string | null
type FormStateValue = File | FormData | string | null

interface FormAssociationHost extends HTMLElement, ReactiveControllerHost {}

export interface FormAssociationOptions<State> {
  readonly host: FormAssociationHost
  readonly initialize?: () => void
  readonly getState: () => State
  readonly setState: (state: State) => void
  readonly copyState?: (state: State) => State
  readonly getFormValue: () => FormSubmissionValue
  readonly getFormState: () => FormStateValue
  readonly restoreState: (state: FormStateValue) => void
  readonly isStateManaged?: () => boolean
  readonly syncValidity?: (internals: ElementInternals) => void
}

export interface FormAssociationLifecycle {
  connect(): void
  sync(): void
  reset(): void
  restore(state: FormStateValue): void
  setDisabled(disabled: boolean): void
  isFormDisabled(): boolean
  getInternals(): ElementInternals | undefined
}

/**
 * 把原生 input 的 ValidityState 转发为 ElementInternals 的校验状态。
 * flagNames 是控件自己声明的校验契约（input 转发文本类 5 项、input-number
 * 转发范围类 4 项），这里只收敛 guard / valid 判定 / setValidity 接线。
 * disabled 元素被约束验证豁免，必须上报干净状态；isDisabled 传入控件的
 * 组合禁用态（含 formDisabled），因为 formDisabledCallback 触发时原生
 * input 的 disabled 属性可能尚未重渲染，不能依赖 input.validity.valid。
 */
export function forwardInputValidity(
  internals: ElementInternals,
  input: HTMLInputElement | HTMLTextAreaElement,
  flagNames: readonly (keyof ValidityStateFlags)[],
  isDisabled = false
): void {
  if (typeof internals.setValidity !== 'function') return
  if (isDisabled || input.validity.valid) {
    internals.setValidity({})
    return
  }
  const flags: ValidityStateFlags = {}
  for (const name of flagNames) {
    if (input.validity[name]) flags[name] = true
  }
  internals.setValidity(flags, input.validationMessage, input)
}

/**
 * 承接原生 custom element 表单生命周期，值序列化与校验语义仍由各控件组件自己表达。
 */
export function defineFormAssociation<State>(options: FormAssociationOptions<State>) {
  return definePlugin((): FormAssociationLifecycle => {
    let internals: ElementInternals | undefined
    let initialState: State | undefined
    let initialized = false
    let formDisabled = false
    const copyState = options.copyState ?? (state => state)

    const sync = () => {
      if (!internals) return
      internals.setFormValue?.(options.getFormValue(), options.getFormState())
      options.syncValidity?.(internals)
    }

    return {
      connect() {
        if (!internals) internals = options.host.attachInternals()
        if (!initialized) {
          options.initialize?.()
          initialState = copyState(options.getState())
          initialized = true
        }
        sync()
      },
      sync,
      reset() {
        if (!initialized || options.isStateManaged?.()) return
        options.setState(copyState(initialState as State))
        sync()
      },
      restore(state) {
        if (options.isStateManaged?.()) return
        options.restoreState(state)
        sync()
      },
      setDisabled(disabled) {
        if (formDisabled === disabled) return
        formDisabled = disabled
        options.host.requestUpdate()
        sync()
      },
      isFormDisabled: () => formDisabled,
      getInternals: () => internals
    }
  })
}

/**
 * 表单关联元素 mixin：安装 `formAssociated` 与三个生命周期回调。
 *
 * 生命周期实现仍由 defineFormAssociation 表达；FormAssociationController
 * 在构造时把 lifecycle 注册到实例的 provider，回调经它转发。组件可继续
 * 覆写单个回调注入自己的额外逻辑（如 autocomplete 的禁用收口）。
 * 这是字段组合（mixin），不是共享基类：除回调接线外不继承任何实现。
 */
export interface FormAssociatedLifecycleProvider {
  __formLifecycleProvider?: () => FormAssociationLifecycle
}

export function FormAssociated<T extends Constructor<HTMLElement>>(superClass: T) {
  class FormAssociatedElement extends superClass {
    static formAssociated = true

    formResetCallback(): void {
      ;(this as FormAssociatedLifecycleProvider).__formLifecycleProvider?.().reset()
    }

    formDisabledCallback(disabled: boolean): void {
      ;(this as FormAssociatedLifecycleProvider).__formLifecycleProvider?.().setDisabled(disabled)
    }

    formStateRestoreCallback(state: File | FormData | string | null): void {
      ;(this as FormAssociatedLifecycleProvider).__formLifecycleProvider?.().restore(state)
    }
  }
  return FormAssociatedElement
}

/** 把表单生命周期插件接入宿主（回调接线经 FormAssociated mixin，无需共享基类）。 */
export class FormAssociationController implements ReactiveController {
  constructor(
    private readonly host: FormAssociationHost,
    private readonly lifecycle: FormAssociationLifecycle
  ) {
    host.addController(this)
    ;(host as FormAssociationHost & FormAssociatedLifecycleProvider).__formLifecycleProvider = () => lifecycle
  }

  hostConnected() {
    this.lifecycle.connect()
  }

  hostUpdated() {
    this.lifecycle.sync()
  }
}
