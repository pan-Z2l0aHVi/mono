import { definePlugin } from '@greypan/js-kit'
import type { ReactiveController, ReactiveControllerHost } from 'lit'

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

/** 把表单生命周期插件接入宿主，无需共享组件基类。 */
export class FormAssociationController implements ReactiveController {
  constructor(
    private readonly host: FormAssociationHost,
    private readonly lifecycle: FormAssociationLifecycle
  ) {
    host.addController(this)
  }

  hostConnected() {
    this.lifecycle.connect()
  }

  hostUpdated() {
    this.lifecycle.sync()
  }
}
