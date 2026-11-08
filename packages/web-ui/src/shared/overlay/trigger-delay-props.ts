import { LitElement } from 'lit'
import { property } from 'lit/decorators.js'

import { normalizeNumber } from '@/shared/normalize'

// Lit 官方 mixin 签名需要构造器接受任意参数（理由同 form-association 的同名别名）。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = new (...args: any[]) => T

/** hover 计时的延迟属性面：trigger-controller 直读宿主的这两个值。 */
export interface OverlayDelayHost {
  showDelay: number
  hideDelay: number
}

/**
 * `show-delay` / `hide-delay` 属性声明（tooltip / popover / dropdown / select /
 * autocomplete 五家逐字一致）：normalizeNumber 钳到 0..5000，默认 200 / 100。
 *
 * 以 mixin 字段组合下放，组件不再逐家复制访问器对；除这两个属性外不继承任何实现。
 * controller 经 `policy.host` 直读，policy 上不再有 getShowDelay / getHideDelay。
 */
export function defineOverlayDelayProps<T extends Constructor<LitElement>>(superClass: T) {
  class OverlayDelayPropsElement extends superClass {
    @property({ type: Number, attribute: 'show-delay' })
    get showDelay(): number {
      return this._showDelay
    }
    set showDelay(v: number) {
      const old = this._showDelay
      this._showDelay = normalizeNumber(v, 0, 5000, 200)
      this.requestUpdate('showDelay', old)
    }
    private _showDelay = 200

    @property({ type: Number, attribute: 'hide-delay' })
    get hideDelay(): number {
      return this._hideDelay
    }
    set hideDelay(v: number) {
      const old = this._hideDelay
      this._hideDelay = normalizeNumber(v, 0, 5000, 100)
      this.requestUpdate('hideDelay', old)
    }
    private _hideDelay = 100
  }
  return OverlayDelayPropsElement as T & Constructor<OverlayDelayHost>
}
