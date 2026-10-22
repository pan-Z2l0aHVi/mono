import type { WebUiRadio } from './index'

function getRadioControl(radio: WebUiRadio): HTMLElement | null {
  return radio.renderRoot?.querySelector<HTMLElement>('[role="radio"]') ?? null
}

export function focusRadio(radio: WebUiRadio): void {
  getRadioControl(radio)?.focus()
}

export function isRadioDisabled(radio: WebUiRadio): boolean {
  return radio.disabled || getRadioControl(radio)?.getAttribute('aria-disabled') === 'true'
}

export function activateRadio(radio: WebUiRadio): void {
  getRadioControl(radio)?.click()
}
